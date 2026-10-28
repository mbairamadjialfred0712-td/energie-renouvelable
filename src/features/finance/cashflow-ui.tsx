import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { listFinanceProductionSources } from "@/lib/finance-production.functions";
import { computeCashflows, runSensitivity, type CashflowResult, type CostItem, type SensitivityVariable } from "./cashflow-engine";

const fmt = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 });
const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
const opt = (s: string) => (s.trim() === "" ? null : num(s));
type Item = { label: string; amount: string; source: string; included: boolean };

function Items({ title, items, setItems, currency }: { title: string; items: Item[]; setItems: (f: (i: Item[]) => Item[]) => void; currency: string }) {
  return <div className="space-y-2">
    <div className="flex items-center justify-between"><Label>{title}</Label><Button size="sm" variant="outline" onClick={() => setItems((i) => [...i, { label: "", amount: "", source: "", included: false }])}>Ajouter un poste</Button></div>
    {items.length === 0 && <p className="text-sm text-muted-foreground">Aucun poste saisi.</p>}
    {items.map((it, k) => {
      const up = (p: Partial<Item>) => setItems((rows) => rows.map((r, j) => (j === k ? { ...r, ...p } : r)));
      return <div key={k} className="grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto_auto] items-center">
        <Input placeholder="Poste" value={it.label} onChange={(e) => up({ label: e.target.value })} />
        <Input placeholder={`Montant (${currency})`} inputMode="decimal" value={it.amount} onChange={(e) => up({ amount: e.target.value })} />
        <Input placeholder="Source ou « hypothèse utilisateur »" value={it.source} onChange={(e) => up({ source: e.target.value })} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={it.included} onChange={(e) => up({ included: e.target.checked })} />Déjà inclus ailleurs</label>
        <Button size="sm" variant="ghost" onClick={() => setItems((rows) => rows.filter((_, j) => j !== k))}>Retirer</Button>
      </div>;
    })}
  </div>;
}

export function CashflowAnalysis() {
  const [f, setF] = useState({ currency: "", years: "", rate: "", prod: "", degr: "", sold: "", subst: "", tariff: "", refCost: "", subsidy: "", residual: "", repl: "" });
  const [capex, setCapex] = useState<Item[]>([]);
  const [opex, setOpex] = useState<Item[]>([]);
  const [res, setRes] = useState<CashflowResult | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [sensVar, setSensVar] = useState<SensitivityVariable>("capex");
  const [deltas, setDeltas] = useState("");
  const [sens, setSens] = useState<ReturnType<typeof runSensitivity> | null>(null);
  const [prodSource, setProdSource] = useState<{ kind: "user" } | { kind: "sim"; id: string; name: string }>({ kind: "user" });
  const [prodRef, setProdRef] = useState("");
  const { data: sources = [], isLoading: srcLoading } = useQuery({ queryKey: ["finance-production-sources"], queryFn: () => listFinanceProductionSources() });
  const invalidate = () => { setRes(null); setSens(null); };
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => { invalidate(); if (k === "prod") setProdSource({ kind: "user" }); setF((s) => ({ ...s, [k]: e.target.value })); };
  const pickSim = (id: string) => { invalidate(); const c = sources.find((x) => x.simulationId === id); if (!c || !c.eligible) { setProdSource({ kind: "user" }); return; } setProdSource({ kind: "sim", id, name: c.name }); setF((s) => ({ ...s, prod: String(c.valueKwh) })); };
  const setCapexI: typeof setCapex = (v) => { invalidate(); setCapex(v); };
  const setOpexI: typeof setOpex = (v) => { invalidate(); setOpex(v); };
  const toItems = (l: Item[]): CostItem[] => l.map((i) => ({ label: i.label || "(sans nom)", amount: num(i.amount), source: i.source, includedInOther: i.included }));
  const buildInput = () => ({
    currency: f.currency.trim(), lifetimeYears: num(f.years), realDiscountRatePct: num(f.rate), capexItems: toItems(capex), opexItems: toItems(opex),
    replacements: f.repl.split(";").map((s) => s.trim()).filter(Boolean).map((s) => { const [y, c] = s.split(":"); return { year: num(y ?? ""), cost: num(c ?? "") }; }),
    yearOneProductionKwh: num(f.prod), degradationPctPerYear: num(f.degr), soldShare: (opt(f.sold) ?? 0) / 100, substitutedShare: (opt(f.subst) ?? 0) / 100,
    saleTariffPerKwh: opt(f.tariff), referenceCostPerKwh: opt(f.refCost), subsidy: opt(f.subsidy) ?? 0, residualValue: opt(f.residual) ?? 0,
  });
  const run = () => { setErr(null); if (prodSource.kind === "user" && !prodRef.trim()) { setRes(null); setErr("Production saisie manuellement : indiquez sa source (ou « hypothèse utilisateur »)."); return; } setSens(null); try { setRes(computeCashflows(buildInput())); } catch (e) { setRes(null); setErr(e instanceof Error ? e.message : "Entrées invalides."); } };
  const runSens = () => { setErr(null); try { setSens(runSensitivity(buildInput(), sensVar, deltas.split(";").map((s) => num(s.trim())).filter((x) => !Number.isNaN(x)))); } catch (e) { setSens(null); setErr(e instanceof Error ? e.message : "Sensibilité invalide."); } };
  const cur = f.currency || "devise";
  const fld = (k: keyof typeof f, label: string, unit?: string) => <div className="space-y-1.5"><Label>{label}{unit && <span className="text-muted-foreground"> ({unit})</span>}</Label><Input value={f[k]} onChange={set(k)} /></div>;
  const yrs = (v: number | null) => (v == null ? "Non atteint" : `${fmt.format(v)} ans`);

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Flux de trésorerie, VAN, TRI et temps de retour</CardTitle></CardHeader><CardContent className="space-y-4">
      <div className="border border-border bg-muted/40 p-3 text-sm space-y-1">
        <p className="font-medium">Conventions de calcul</p>
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>Flux en monnaie constante ; taux d'actualisation réel (aucune inflation).</li>
          <li>Année 0 : CAPEX brut et subvention, non actualisés. Années 1…N : flux en fin d'année.</li>
          <li>Devise : {f.currency || "à renseigner"} · Durée d'analyse : {f.years ? `${f.years} ans` : "à renseigner"}.</li>
          <li>Avant impôts et financement (ni fiscalité, ni dette). Champs de revenu vides = aucun revenu.</li>
          <li>Champs obligatoires : devise, durée, taux, production, dégradation, au moins un poste CAPEX.</li>
        </ul>
      </div>
      <div className="space-y-2 border border-border p-3">
        <Label>Production de référence (année 1)</Label>
        {srcLoading ? <p className="text-sm text-muted-foreground">Chargement des simulations…</p> : sources.length === 0 ? <p className="text-sm text-muted-foreground">Aucune simulation terminée avec production annuelle enregistrée : saisie manuelle uniquement.</p> :
          <select className="h-9 w-full border border-border bg-background px-2 text-sm" value={prodSource.kind === "sim" ? prodSource.id : ""} onChange={(e) => pickSim(e.target.value)}>
            <option value="">Saisie manuelle (hypothèse utilisateur)</option>
            {sources.map((s) => <option key={s.simulationId} value={s.simulationId} disabled={!s.eligible}>{s.name} — {s.valueKwh != null ? `${fmt.format(s.valueKwh)} ${s.unit}` : "—"} ({s.periodStart} → {s.periodEnd}){s.eligible ? "" : ` — non utilisable : ${s.reason}`}</option>)}
          </select>}
        {prodSource.kind === "sim"
          ? <p className="text-xs text-muted-foreground">Source : simulation terminée « {prodSource.name} », valeur enregistrée relue, non recalculée. Les années 2…N sont des projections : E₁ × (1 − dégradation)^(t−1).</p>
          : <><Input placeholder="Source de la production saisie (ou « hypothèse utilisateur »)" value={prodRef} onChange={(e) => { invalidate(); setProdRef(e.target.value); }} /><p className="text-xs text-muted-foreground">Valeur saisie : hypothèse utilisateur, jamais présentée comme simulée. Années 2…N projetées par dégradation.</p></>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {fld("currency", "Devise")}{fld("years", "Durée d'analyse", "ans")}{fld("rate", "Taux d'actualisation réel", "%")}{fld("prod", "Production année 1", "kWh")}
        {fld("degr", "Dégradation", "%/an")}{fld("sold", "Part vendue", "% production")}{fld("tariff", "Tarif de vente", `${cur}/kWh`)}{fld("subst", "Part substituée", "% production")}
        {fld("refCost", "Coût de référence évité", `${cur}/kWh`)}{fld("subsidy", "Subvention année 0", cur)}{fld("residual", "Valeur résiduelle année N", cur)}{fld("repl", "Remplacements « année:coût; … »")}
      </div>
      <Items title="Postes CAPEX" items={capex} setItems={setCapexI} currency={cur} />
      <Items title="Postes OPEX annuels (constants)" items={opex} setItems={setOpexI} currency={cur} />
      <Button onClick={run}>Calculer les flux</Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </CardContent></Card>

    {res && <>
      <Card><CardHeader><CardTitle>Indicateurs</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3 text-sm">
          <div>CAPEX brut (coût total) : <b>{fmt.format(res.totalCapex)} {cur}</b></div>
          <div>Subvention année 0 : <b>{fmt.format(res.rows[0]!.subsidy)} {cur}</b></div>
          <div>Investissement net (après subvention) : <b>{fmt.format(res.totalCapex - res.rows[0]!.subsidy)} {cur}</b></div>
          <div>OPEX annuel : <b>{fmt.format(res.annualOpex)} {cur}/an</b></div>
          <div>VAN : <b>{fmt.format(res.npv)} {cur}</b></div>
          <div>TRI : <b>{res.irr.status === "ok" ? `${fmt.format(res.irr.ratePct)} %` : `Indisponible — ${res.irr.reason}`}</b></div>
          <div>Retour simple : <b>{yrs(res.simplePaybackYears)}</b></div>
          <div>Retour actualisé : <b>{yrs(res.discountedPaybackYears)}</b></div>
          <div>LCOE (CAPEX brut + OPEX + remplacements, hors subvention et revenus) : <b>{fmt.format(res.lcoePerKwh)} {cur}/kWh</b></div>
          <div className="sm:col-span-3 text-xs text-muted-foreground">Production : {prodSource.kind === "sim" ? `simulation « ${prodSource.name} »` : `hypothèse utilisateur (${prodRef})`} ; {f.years} années projetées avec {f.degr} %/an de dégradation.</div>
        </div>
        {res.warnings.map((w) => <p key={w} className="text-sm text-muted-foreground">⚠ {w}</p>)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Tableau des flux ({cur})</CardTitle></CardHeader><CardContent className="overflow-x-auto">
        <Table><TableHeader><TableRow>{["Année", "Production kWh", "CAPEX", "OPEX", "Rempl.", "Revenus", "Économies", "Subv./résid.", "Net", "Actualisé", "Cumul", "Cumul actualisé"].map((h) => <TableHead key={h}>{h}</TableHead>)}</TableRow></TableHeader>
          <TableBody>{res.rows.map((r) => <TableRow key={r.year}>{[r.year, r.productionKwh, -r.capex, -r.opex, -r.replacement, r.revenue, r.savings, r.subsidy + r.residual, r.net, r.discounted, r.cumulative, r.cumulativeDiscounted].map((v, i) => <TableCell key={i}>{i === 0 ? v : fmt.format(v)}</TableCell>)}</TableRow>)}</TableBody></Table>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Sensibilité (bornée : ±90 %, 9 variantes max.)</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <select className="h-9 border border-border bg-background px-2 text-sm" value={sensVar} onChange={(e) => setSensVar(e.target.value as SensitivityVariable)}>
            <option value="capex">CAPEX</option><option value="opex">OPEX</option><option value="discount">Taux d'actualisation</option><option value="production">Production</option><option value="tariff">Tarif / coût de référence</option>
          </select>
          <Input className="w-64" placeholder="Variations % ex. -20;-10;10;20" value={deltas} onChange={(e) => setDeltas(e.target.value)} />
          <Button variant="outline" onClick={runSens}>Lancer</Button>
        </div>
        <p className="text-xs text-muted-foreground">Variantes d'hypothèse, pas des prévisions. Les hypothèses de base ne sont pas modifiées.</p>
        {sens && <Table><TableHeader><TableRow><TableHead>Variation</TableHead><TableHead>VAN ({cur})</TableHead><TableHead>TRI</TableHead><TableHead>LCOE ({cur}/kWh)</TableHead><TableHead>Retour simple</TableHead></TableRow></TableHeader>
          <TableBody>{sens.map((s) => <TableRow key={s.deltaPct}><TableCell>{s.deltaPct} %</TableCell><TableCell>{fmt.format(s.npv)}</TableCell><TableCell>{s.irr.status === "ok" ? `${fmt.format(s.irr.ratePct)} %` : "Indisponible"}</TableCell><TableCell>{fmt.format(s.lcoePerKwh)}</TableCell><TableCell>{yrs(s.simplePaybackYears)}</TableCell></TableRow>)}</TableBody></Table>}
      </CardContent></Card>
    </>}
  </div>;
}
