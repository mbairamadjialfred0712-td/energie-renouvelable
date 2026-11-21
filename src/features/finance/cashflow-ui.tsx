import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listFinanceProductionSources } from "@/lib/finance-production.functions";
import { CostEvidence, EconomicField, FinanceOutcome, requiredNumber, usePythonFinance } from "./python-finance-ui";

type Item = { label: string; amount: string; source: string; includedInOther: boolean };
function Items({ title, items, onChange }: { title: string; items: Item[]; onChange: (items: Item[]) => void }) {
  const blank = (): Item => ({ label: "", amount: "", source: "", includedInOther: false });
  return <section className="space-y-3"><div className="flex justify-between gap-2"><h3 className="font-semibold">{title}</h3><Button variant="outline" size="sm" onClick={() => onChange([...items, blank()])}>Ajouter un poste</Button></div>{items.map((it, i) => {
    const up = (patch: Partial<Item>) => onChange(items.map((v, j) => i === j ? { ...v, ...patch } : v));
    return <div key={i} className="grid items-end gap-2 border-b border-border pb-3 sm:grid-cols-3"><EconomicField label={`${title} — poste ${i + 1}`} value={it.label} onChange={label => up({ label })} /><EconomicField label={`${title} — montant ${i + 1}`} value={it.amount} onChange={amount => up({ amount })} /><EconomicField label={`${title} — source ${i + 1}`} value={it.source} onChange={source => up({ source })} /><label className="flex gap-2 text-sm"><input type="checkbox" checked={it.includedInOther} onChange={e => up({ includedInOther: e.target.checked })} />Déjà inclus dans un autre poste</label><Button variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => i !== j))}>Retirer</Button></div>;
  })}</section>;
}
export function CashflowAnalysis({ projectId = null }: { projectId?: string | null }) {
  const [f, setF] = useState({ currency: "", years: "", rate: "", prod: "", degr: "", sold: "", subst: "", tariff: "", refCost: "", subsidy: "", residual: "", repl: "" });
  const [capex, setCapex] = useState<Item[]>([{ label: "", amount: "", source: "", includedInOther: false }]);
  const [opex, setOpex] = useState<Item[]>([{ label: "", amount: "", source: "", includedInOther: false }]);
  const [reference, setReference] = useState(""); const [date, setDate] = useState(""); const [confirmed, setConfirmed] = useState(false);
  const [prodId, setProdId] = useState(""); const [prodRef, setProdRef] = useState(""); const [variable, setVariable] = useState("capex"); const [deltas, setDeltas] = useState("");
  const state = usePythonFinance();
  const { data: sources = [], isPending } = useQuery({ queryKey: ["finance-production-sources"], queryFn: () => listFinanceProductionSources() });
  const edit = (fn: () => void) => { state.invalidate(); fn(); };
  const set = (k: keyof typeof f) => (v: string) => edit(() => setF(x => ({ ...x, [k]: v })));
  const optional = (v: string) => v.trim() ? requiredNumber(v) : null;
  const labels: Record<keyof typeof f, string> = { currency: "Devise des flux", years: "Durée des flux (ans)", rate: "Actualisation réelle des flux (%)", prod: "Production de référence (kWh)", degr: "Dégradation des flux (%/an)", sold: "Part vendue (%)", subst: "Part substituée (%)", tariff: "Tarif de vente (devise/kWh)", refCost: "Coût évité (devise/kWh)", subsidy: "Subvention année 0", residual: "Valeur résiduelle", repl: "Remplacements année:coût;…" };
  const calculate = () => state.calculate("Flux économiques — coûts documentés", projectId, () => ({ mode: "cashflow", input: {
    currency: f.currency, lifetimeYears: requiredNumber(f.years), realDiscountRatePct: requiredNumber(f.rate),
    capexItems: capex.map(i => ({ ...i, amount: requiredNumber(i.amount) })), opexItems: opex.map(i => ({ ...i, amount: requiredNumber(i.amount) })),
    replacements: f.repl.split(";").map(v => v.trim()).filter(Boolean).map(v => { const [year, cost, ...extra] = v.split(":"); if (extra.length) throw new Error("Remplacement invalide."); return { year: requiredNumber(year ?? ""), cost: requiredNumber(cost ?? "") }; }),
    yearOneProductionKwh: prodId ? sources.find(s => s.simulationId === prodId)?.valueKwh : requiredNumber(f.prod), degradationPctPerYear: requiredNumber(f.degr),
    soldShare: requiredNumber(f.sold) / 100, substitutedShare: requiredNumber(f.subst) / 100, saleTariffPerKwh: optional(f.tariff), referenceCostPerKwh: optional(f.refCost), subsidy: requiredNumber(f.subsidy), residualValue: requiredNumber(f.residual),
  }, evidence: { reference, date, costsConfirmed: confirmed }, production: { simulationId: prodId || null, source: prodId ? "Production annuelle enregistrée" : prodRef, nature: "assumption" },
    ...(deltas.trim() ? { sensitivity: { variable, deltasPct: deltas.split(";").map(requiredNumber) } } : {}),
  }));
  return <section className="space-y-5 border-t border-border pt-5"><h2 className="text-xl font-semibold">Flux de trésorerie, VAN, TRI et temps de retour</h2><fieldset disabled={state.busy} className="space-y-5">
    <label className="block space-y-1 text-sm"><span className="font-medium">Simulation annuelle de référence</span><select aria-label="Simulation annuelle de référence" className="h-10 w-full rounded-md border bg-background px-3" value={prodId} disabled={isPending} onChange={e => edit(() => setProdId(e.target.value))}><option value="">Saisie manuelle — hypothèse</option>{sources.filter(s => !projectId || s.projectId === projectId).map(s => <option key={s.simulationId} value={s.simulationId} disabled={!s.eligible}>{s.name}{!s.eligible ? ` — ${s.reason}` : ""}</option>)}</select></label>
    {!prodId && <EconomicField label="Source de la production manuelle des flux" value={prodRef} onChange={v => edit(() => setProdRef(v))} />}
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(labels) as (keyof typeof f)[]).filter(k => k !== "prod" || !prodId).map(k => <EconomicField key={k} label={labels[k]} value={f[k]} onChange={set(k)} />)}</div>
    <Items title="CAPEX" items={capex} onChange={v => edit(() => setCapex(v))} /><Items title="OPEX annuel" items={opex} onChange={v => edit(() => setOpex(v))} />
    <CostEvidence reference={reference} date={date} confirmed={confirmed} onReference={v => edit(() => setReference(v))} onDate={v => edit(() => setDate(v))} onConfirm={v => edit(() => setConfirmed(v))} />
    <section className="space-y-3"><h3 className="font-semibold">Sensibilité facultative — ±90 %, 9 variantes maximum</h3><select aria-label="Variable de sensibilité" className="h-10 rounded-md border bg-background px-3 text-sm" value={variable} onChange={e => edit(() => setVariable(e.target.value))}><option value="capex">CAPEX</option><option value="opex">OPEX</option><option value="discount">Actualisation</option><option value="production">Production</option><option value="tariff">Tarif / coût évité</option></select><EconomicField label="Variations relatives (% séparés par ; )" value={deltas} onChange={v => edit(() => setDeltas(v))} /></section>
    <Button onClick={calculate} disabled={state.busy || isPending}>{state.busy ? "Calcul Python en cours…" : "Calculer et enregistrer les flux"}</Button>
  </fieldset><p className="text-xs text-muted-foreground">Monnaie constante ; avant impôts et financement. Montants et parts nuls à saisir explicitement. Tarifs requis pour les parts positives. Les années suivantes sont des projections, pas des mesures.</p><FinanceOutcome state={state} /></section>;
}
