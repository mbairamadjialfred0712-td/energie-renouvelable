import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { runFinanceAnalysis } from "@/lib/engine.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { financePayloadSchema, type FinancePayload, type FinanceReport } from "./python-finance-contract";

export function requiredNumber(raw: string): number {
  if (!raw.trim()) throw new Error("Toutes les valeurs requises doivent être renseignées ; saisir explicitement 0 si justifié.");
  const value = Number(raw.replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(value)) throw new Error("Nombre fini requis.");
  return value;
}
export function EconomicField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) {
  return <label className="block space-y-1 text-sm"><span className="font-medium">{label}</span><Input aria-label={label} type={type} value={value} onChange={e => onChange(e.target.value)} /></label>;
}
export function CostEvidence({ reference, date, confirmed, onReference, onDate, onConfirm }: { reference: string; date: string; confirmed: boolean; onReference: (v: string) => void; onDate: (v: string) => void; onConfirm: (v: boolean) => void }) {
  return <section className="space-y-3 border-y border-border py-4">
    <h3 className="font-semibold">Justificatifs des coûts et hypothèses</h3>
    <div className="grid gap-3 sm:grid-cols-2"><EconomicField label="Références des devis, contrats, tarifs et hypothèses" value={reference} onChange={onReference} /><EconomicField label="Date de référence des coûts" type="date" value={date} onChange={onDate} /></div>
    <Label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={e => onConfirm(e.target.checked)} />Je confirme les montants, leur devise et leurs sources ; les coûts nuls, les remplacements et les hypothèses retenues sont justifiés.</Label>
  </section>;
}
export function usePythonFinance() {
  const run = useServerFn(runFinanceAnalysis);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Awaited<ReturnType<typeof runFinanceAnalysis>> | null>(null);
  const invalidate = () => { setSaved(null); setError(null); };
  const calculate = async (name: string, projectId: string | null, build: () => unknown) => {
    setSaved(null); setError(null); setBusy(true);
    try { const payload = financePayloadSchema.parse(build()); setSaved(await run({ data: { name, projectId, payload } })); }
    catch (e) { setError(e instanceof Error ? e.message : "Calcul économique indisponible."); }
    finally { setBusy(false); }
  };
  return { busy, error, saved, invalidate, calculate };
}
const fmt = (v: number) => v.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
export function PythonFinanceResults({ report, payload }: { report: FinanceReport; payload: FinancePayload }) {
  const result = report.result;
  const cur = payload.input.currency;
  return <div className="space-y-5">
    <div className="grid gap-4 border-y border-border py-4 sm:grid-cols-3">
      <div><p className="text-sm text-muted-foreground">LCOE</p><p className="text-xl font-semibold">{fmt(result.lcoePerKwh)} {cur}/kWh</p></div>
      <div><p className="text-sm text-muted-foreground">CAPEX brut</p><p className="text-xl font-semibold">{fmt(result.totalCapex)} {cur}</p></div>
      {report.mode === "lcoe" && <div><p className="text-sm text-muted-foreground">Coûts actualisés</p><p className="text-xl font-semibold">{fmt(report.result.totalDiscountedCost)} {cur}</p></div>}
      {report.mode === "cashflow" && <><div><p className="text-sm text-muted-foreground">VAN</p><p className="text-xl font-semibold">{fmt(report.result.npv)} {cur}</p></div><p>TRI : {report.result.irr.status === "ok" ? `${fmt(report.result.irr.ratePct)} %` : `Indisponible — ${report.result.irr.reason}`}</p><p>Retour simple : {report.result.simplePaybackYears === null ? "Non atteint" : `${fmt(report.result.simplePaybackYears)} ans`}</p><p>Retour actualisé : {report.result.discountedPaybackYears === null ? "Non atteint" : `${fmt(report.result.discountedPaybackYears)} ans`}</p></>}
    </div>
    <p className="text-sm text-muted-foreground">Python finance v1.0.0 · coûts déclarés, non vérifiés automatiquement · monnaie constante, avant impôts et financement. Le LCOE exclut subvention, recettes et résiduel. Modèle et données à valider par l’ingénieur.</p>
    <section className="space-y-1 text-sm"><h3 className="font-semibold">Sources de l’analyse enregistrée</h3><p>{payload.evidence.reference} · {payload.evidence.date}</p><p>Production : {payload.production.source} · {payload.production.simulationId ? "simulation enregistrée" : payload.production.nature} · {fmt(payload.input.yearOneProductionKwh)} kWh, année 1.</p></section>
    <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Année</TableHead><TableHead>Production kWh</TableHead><TableHead>OPEX {cur}</TableHead><TableHead>Remplacements {cur}</TableHead><TableHead>{report.mode === "lcoe" ? `Coût actualisé ${cur}` : `Flux net ${cur}`}</TableHead><TableHead>{report.mode === "lcoe" ? "Énergie actualisée kWh" : `Cumul actualisé ${cur}`}</TableHead></TableRow></TableHeader><TableBody>
      {report.mode === "lcoe" ? report.result.rows.map(r => <TableRow key={r.year}>{[r.year, r.productionKwh, r.opex, r.replacementCost, r.discountedCost, r.discountedEnergyKwh].map((v, i) => <TableCell key={i}>{fmt(v)}</TableCell>)}</TableRow>) : report.result.rows.map(r => <TableRow key={r.year}>{[r.year, r.productionKwh, r.opex, r.replacement, r.net, r.cumulativeDiscounted].map((v, i) => <TableCell key={i}>{fmt(v)}</TableCell>)}</TableRow>)}
    </TableBody></Table></div>
    {report.mode === "cashflow" && <><div className="space-y-1">{report.result.warnings.map(w => <p key={w} className="text-sm text-muted-foreground">{w}</p>)}</div>{report.sensitivity.length > 0 && <section><h3 className="font-semibold">Sensibilité — hypothèses, pas nouvelles simulations physiques</h3><Table><TableHeader><TableRow><TableHead>Variation %</TableHead><TableHead>VAN {cur}</TableHead><TableHead>LCOE {cur}/kWh</TableHead></TableRow></TableHeader><TableBody>{report.sensitivity.map((v, i) => <TableRow key={i}><TableCell>{v.deltaPct}</TableCell><TableCell>{fmt(v.npv)}</TableCell><TableCell>{fmt(v.lcoePerKwh)}</TableCell></TableRow>)}</TableBody></Table></section>}</>}
    <details><summary className="cursor-pointer text-sm font-medium">Entrées et coûts figés du calcul</summary><pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(payload, null, 2)}</pre></details>
  </div>;
}
export function FinanceOutcome({ state }: { state: ReturnType<typeof usePythonFinance> }) {
  return <>{state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}{state.saved && <section className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Analyse économique enregistrée</h2><Button asChild variant="outline"><Link to="/simulations/$id/results" params={{ id: state.saved.id }}>Ouvrir le résultat enregistré</Link></Button></div><PythonFinanceResults report={state.saved.report} payload={state.saved.payload} /></section>}</>;
}
