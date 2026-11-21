"""Port of the audited annual constant-money formulas; no inferred costs or physical production."""
import json
import math
from copy import deepcopy
from datetime import date
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, ValidationError, model_validator
from app.api.schemas.contract import Issue, ResultValue
from app.engines.base import EngineOutput

VERSION = "1.0.0"
METHOD = "Monnaie constante ; CAPEX an 0 ; flux fin d’année ; actualisation réelle ; modèle annuel v1"

class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True, allow_inf_nan=False)

class Replacement(StrictModel):
    year: int = Field(ge=1, le=100)
    cost: float = Field(ge=0)

class Cost(StrictModel):
    label: str = Field(min_length=1, max_length=200)
    amount: float = Field(ge=0)
    source: str = Field(min_length=3, max_length=500)
    includedInOther: bool = False
    @model_validator(mode="after")
    def documented(self):
        if not self.label.strip() or len(self.source.strip()) < 3:
            raise ValueError("Poste et source documentaire requis pour chaque coût.")
        return self

class Inputs(StrictModel):
    currency: str = Field(min_length=1, max_length=10)
    lifetimeYears: int = Field(ge=1, le=100)
    yearOneProductionKwh: float = Field(gt=0)
    degradationPctPerYear: float = Field(ge=0, le=100)
    replacements: list[Replacement] = Field(max_length=50)
    @model_validator(mode="after")
    def bounds(self):
        if not self.currency.strip() or any(r.year > self.lifetimeYears for r in self.replacements):
            raise ValueError("Devise requise et remplacements dans la durée d’étude.")
        return self

class LcoeInput(Inputs):
    capex: float = Field(gt=0)
    annualOpex: float = Field(ge=0)
    discountRatePct: float = Field(gt=-100)

class CashInput(Inputs):
    realDiscountRatePct: float = Field(gt=-100)
    capexItems: list[Cost] = Field(min_length=1, max_length=100)
    opexItems: list[Cost] = Field(min_length=1, max_length=100)
    soldShare: float = Field(ge=0, le=1)
    substitutedShare: float = Field(ge=0, le=1)
    saleTariffPerKwh: float | None
    referenceCostPerKwh: float | None
    subsidy: float = Field(ge=0)
    residualValue: float = Field(ge=0)
    @model_validator(mode="after")
    def shares(self):
        if self.soldShare + self.substitutedShare > 1:
            raise ValueError("Vente et substitution ne peuvent dépasser 100 %.")
        for share, tariff in [(self.soldShare, self.saleTariffPerKwh), (self.substitutedShare, self.referenceCostPerKwh)]:
            if share > 0 and tariff is None: raise ValueError("Tarif/coût évité documenté requis pour une part positive.")
            if tariff is not None and tariff < 0: raise ValueError("Tarif/coût évité négatif refusé.")
        return self

class Evidence(StrictModel):
    reference: str = Field(min_length=3, max_length=1000)
    date: str
    costsConfirmed: Literal[True]
    @model_validator(mode="after")
    def valid_date(self):
        if len(self.reference.strip()) < 3 or date.fromisoformat(self.date).isoformat() != self.date:
            raise ValueError("Référence documentaire et date valide requises.")
        return self

class Production(StrictModel):
    simulationId: str | None
    source: str = Field(min_length=3, max_length=500)
    nature: Literal["measured", "external", "estimate", "assumption"]
    @model_validator(mode="after")
    def source_present(self):
        if len(self.source.strip()) < 3: raise ValueError("Source de production obligatoire.")
        return self

class Sensitivity(StrictModel):
    variable: Literal["capex", "opex", "discount", "production", "tariff"]
    deltasPct: list[float] = Field(min_length=1, max_length=9)
    @model_validator(mode="after")
    def bounded(self):
        if any(abs(d) > 90 for d in self.deltasPct): raise ValueError("Sensibilité bornée à ±90 %.")
        return self

class LcoePayload(StrictModel):
    mode: Literal["lcoe"]
    input: LcoeInput
    evidence: Evidence
    production: Production

class CashPayload(StrictModel):
    mode: Literal["cashflow"]
    input: CashInput
    evidence: Evidence
    production: Production
    sensitivity: Sensitivity | None = None

def finite_tree(value):
    if isinstance(value, float) and not math.isfinite(value): raise ValueError("Débordement numérique : aucun résultat partiel.")
    if isinstance(value, dict):
        for v in value.values(): finite_tree(v)
    if isinstance(value, list):
        for v in value: finite_tree(v)

def lcoe(x):
    repl = {}
    for r in x.replacements: repl[r.year] = repl.get(r.year, 0) + r.cost
    rows, cost, energy = [], x.capex, 0
    for t in range(1, x.lifetimeYears + 1):
        prod = x.yearOneProductionKwh * (1 - x.degradationPctPerYear / 100) ** (t - 1)
        f = (1 + x.discountRatePct / 100) ** t
        if not math.isfinite(f) or f <= 0: raise ValueError("Facteur d’actualisation hors plage numérique.")
        rc = repl.get(t, 0)
        rows.append(dict(year=t, productionKwh=prod, opex=x.annualOpex, replacementCost=rc,
                         totalCost=x.annualOpex+rc, discountedCost=(x.annualOpex+rc)/f, discountedEnergyKwh=prod/f))
        cost += (x.annualOpex+rc)/f
        energy += prod/f
    if not math.isfinite(energy) or energy <= 0: raise ValueError("Énergie actualisée invalide.")
    result = dict(rows=rows, totalDiscountedCost=cost, totalDiscountedEnergyKwh=energy, lcoePerKwh=cost/energy,
                  totalCapex=x.capex, totalReplacementCost=sum(repl.values()), totalOpex=x.annualOpex*x.lifetimeYears)
    finite_tree(result)
    return result

def irr(flows):
    signs = [1 if f > 0 else -1 for f in flows if f != 0]
    changes = sum(a != b for a,b in zip(signs, signs[1:]))
    if changes != 1:
        return dict(status="unavailable", reason="Aucun changement de signe." if changes == 0 else "Plusieurs changements de signe : TRI potentiellement multiple.")
    def npv(rate): return sum(cf / (1 + rate/100)**t for t,cf in enumerate(flows))
    lo,hi=-99.0,1000.0
    flo,fhi=npv(lo),npv(hi)
    if not math.isfinite(flo) or not math.isfinite(fhi): return dict(status="unavailable", reason="TRI hors plage numérique.")
    if (flo > 0) == (fhi > 0): return dict(status="unavailable", reason="Aucune racine encadrée entre −99 % et 1000 %.")
    for _ in range(200):
        mid=(lo+hi)/2; fm=npv(mid)
        if abs(fm)<1e-9 or hi-lo<1e-10:return dict(status="ok",ratePct=mid)
        if (fm>0)==(flo>0):lo,flo=mid,fm
        else:hi=mid
    return dict(status="ok",ratePct=(lo+hi)/2)

def payback(values):
    if values[0]>=0:return 0
    for t in range(1,len(values)):
        if values[t]>=0:
            gain=values[t]-values[t-1]
            return t-1+(-values[t-1]/gain if gain>0 else 1)
    return None

def cashflow(x):
    capex=sum(i.amount for i in x.capexItems if not i.includedInOther)
    opex=sum(i.amount for i in x.opexItems if not i.includedInOther)
    if capex <= 0: raise ValueError("CAPEX total strictement positif requis.")
    lc=lcoe(LcoeInput(currency=x.currency,lifetimeYears=x.lifetimeYears,yearOneProductionKwh=x.yearOneProductionKwh,
                      degradationPctPerYear=x.degradationPctPerYear,replacements=x.replacements,
                      capex=capex,annualOpex=opex,discountRatePct=x.realDiscountRatePct))
    initial=-capex+x.subsidy
    rows=[dict(year=0,productionKwh=0,capex=capex,opex=0,replacement=0,revenue=0,savings=0,subsidy=x.subsidy,residual=0,net=initial,discounted=initial,cumulative=initial,cumulativeDiscounted=initial)]
    for row in lc['rows']:
        t=row['year'];prod=row['productionKwh'];rev=prod*x.soldShare*(x.saleTariffPerKwh or 0);savings=prod*x.substitutedShare*(x.referenceCostPerKwh or 0)
        residual=x.residualValue if t==x.lifetimeYears else 0
        net=rev+savings+residual-opex-row['replacementCost'];dc=net/(1+x.realDiscountRatePct/100)**t;prev=rows[-1]
        rows.append(dict(year=t,productionKwh=prod,capex=0,opex=opex,replacement=row['replacementCost'],revenue=rev,savings=savings,subsidy=0,residual=residual,net=net,discounted=dc,cumulative=prev['cumulative']+net,cumulativeDiscounted=prev['cumulativeDiscounted']+dc))
    has_income=(x.soldShare>0 and (x.saleTariffPerKwh or 0)>0) or (x.substitutedShare>0 and (x.referenceCostPerKwh or 0)>0)
    result=dict(rows=rows,totalCapex=capex,annualOpex=opex,npv=rows[-1]['cumulativeDiscounted'],irr=irr([r['net'] for r in rows]),simplePaybackYears=payback([r['cumulative'] for r in rows]),discountedPaybackYears=payback([r['cumulativeDiscounted'] for r in rows]),lcoePerKwh=lc['lcoePerKwh'],hasIncome=has_income,warnings=[] if has_income else ['Aucun revenu ni économie : résultats limités aux coûts.'])
    finite_tree(result)
    return result

class FinanceEngine:
    name="finance"
    version=VERSION
    description="LCOE, flux, VAN, TRI, retours et sensibilité ; coûts documentés, monnaie constante"
    required_inputs={"finance_payload":{"-"}}
    def payload(self,request):
        if request.timeseries is not None or request.assumptions or set(request.input_data)!={'finance_payload'}:
            raise ValueError("Entrées financières isolées requises, pas de série physique recalculée.")
        item=request.input_data['finance_payload']
        if item.unit != '-' or not item.source or not isinstance(item.value,str):raise ValueError("Document financier et unité explicite requis.")
        raw=json.loads(item.value)
        payload=(LcoePayload if raw.get('mode')=='lcoe' else CashPayload).model_validate(raw)
        if item.source != payload.evidence.reference:raise ValueError("Référence documentaire incohérente.")
        return raw,payload
    def validate(self,request):
        try:self.payload(request)
        except (ValueError,TypeError,KeyError,ValidationError) as e:return [Issue(field="finance_payload",code="finance_invalid",message=str(e))],[]
        return [],[Issue(code="scientific_validation_pending",message="Coûts déclarés par l’utilisateur, non vérifiés par le logiciel ; monnaie constante, avant impôts et financement. Production/hypothèses à valider.")]
    def run(self,request):
        raw,p=self.payload(request)
        try:
            if p.mode=='lcoe':report=dict(mode='lcoe',result=lcoe(p.input))
            else:
                variants=[]
                if p.sensitivity:
                    for delta in p.sensitivity.deltasPct:
                        x=deepcopy(p.input);k=1+delta/100;v=p.sensitivity.variable
                        if v in ('capex','opex'):
                            for it in (x.capexItems if v=='capex' else x.opexItems):it.amount*=k
                        if v=='discount':x.realDiscountRatePct*=k
                        if v=='production':x.yearOneProductionKwh*=k
                        if v=='tariff':
                            if x.saleTariffPerKwh is not None:x.saleTariffPerKwh*=k
                            if x.referenceCostPerKwh is not None:x.referenceCostPerKwh*=k
                        x=CashInput.model_validate(x.model_dump());r=cashflow(x)
                        variants.append(dict(deltaPct=delta,npv=r['npv'],irr=r['irr'],lcoePerKwh=r['lcoePerKwh'],simplePaybackYears=r['simplePaybackYears']))
                report=dict(mode='cashflow',result=cashflow(p.input),sensitivity=variants)
        except (OverflowError,ZeroDivisionError) as e:raise ValueError("Débordement numérique : aucun résultat partiel.") from e
        finite_tree(report)
        results={'lcoe':ResultValue(value=report['result']['lcoePerKwh'],unit=p.input.currency+'/kWh',method=METHOD)}
        if p.mode=='cashflow':results['npv']=ResultValue(value=report['result']['npv'],unit=p.input.currency,method=METHOD)
        return EngineOutput(results=results,timeseries={},metadata={'payload':raw,'report':report,'scientific_validation':'pending','cost_verification':'user_declared','money_convention':'constant','tax_and_debt':False})
