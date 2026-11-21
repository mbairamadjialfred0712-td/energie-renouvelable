import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LCOE_FORMULA } from "./finance-engine";
import { CostEvidence, EconomicField, FinanceOutcome, requiredNumber, usePythonFinance } from "./python-finance-ui";

type FieldState = { currency: string; capex: string; annualOpex: string; lifetimeYears: string; discountRatePct: string; yearOneProductionKwh: string; degradationPctPerYear: string };
type ReplacementRow = { year: string; cost: string };
export function FinanceCalculator({ initial, initialReplacements, projectId = null, productionSimulationId = null }: { initial?: Partial<FieldState>; initialReplacements?: ReplacementRow[]; projectId?: string | null; productionSimulationId?: string | null }) {
  const [fields, setFields] = useState<FieldState>({ currency: "", capex: "", annualOpex: "", lifetimeYears: "", discountRatePct: "", yearOneProductionKwh: "", degradationPctPerYear: "", ...initial });
  const [replacements, setReplacements] = useState<ReplacementRow[]>(initialReplacements ?? []);
  const [reference, setReference] = useState(""); const [date, setDate] = useState(""); const [confirmed, setConfirmed] = useState(false); const [prodSource, setProdSource] = useState("");
  const state = usePythonFinance();
  const edit = (fn: () => void) => { state.invalidate(); fn(); };
  const set = (key: keyof FieldState) => (v: string) => edit(() => setFields(f => ({ ...f, [key]: v })));
  const labels: Record<keyof FieldState, string> = { currency: "Devise", capex: "CAPEX", annualOpex: "OPEX annuel", lifetimeYears: "Durée d’étude (ans)", discountRatePct: "Taux réel d’actualisation (%)", yearOneProductionKwh: "Production année 1 (kWh)", degradationPctPerYear: "Dégradation annuelle (%)" };
  return <section className="space-y-5 border-t border-border pt-5"><h2 className="text-xl font-semibold">LCOE — coûts documentés</h2>
    <fieldset disabled={state.busy} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{(Object.keys(labels) as (keyof FieldState)[]).map(key => <div key={key}>{key === "yearOneProductionKwh" && productionSimulationId ? <p className="text-sm">Production liée : valeur enregistrée relue au calcul ; aucune saisie ne la remplace.</p> : <EconomicField label={`${labels[key]}${key === "capex" || key === "annualOpex" ? ` (${fields.currency || "devise"})` : ""}`} value={fields[key]} onChange={set(key)} />}</div>)}</div>
      {!productionSimulationId && <EconomicField label="Source et nature de la production manuelle (hypothèse)" value={prodSource} onChange={v => edit(() => setProdSource(v))} />}
      <CostEvidence reference={reference} date={date} confirmed={confirmed} onReference={v => edit(() => setReference(v))} onDate={v => edit(() => setDate(v))} onConfirm={v => edit(() => setConfirmed(v))} />
      <div className="space-y-2"><div className="flex items-center justify-between"><h3 className="font-semibold">Remplacements prévus</h3><Button variant="outline" size="sm" onClick={() => edit(() => setReplacements(r => [...r, { year: "", cost: "" }]))}>Ajouter un remplacement</Button></div>{replacements.map((r, i) => <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><EconomicField label={`Année remplacement ${i + 1}`} value={r.year} onChange={v => edit(() => setReplacements(rows => rows.map((x, j) => i === j ? { ...x, year: v } : x)))} /><EconomicField label={`Coût remplacement ${i + 1}`} value={r.cost} onChange={v => edit(() => setReplacements(rows => rows.map((x, j) => i === j ? { ...x, cost: v } : x)))} /><Button variant="ghost" onClick={() => edit(() => setReplacements(rows => rows.filter((_, j) => i !== j)))}>Retirer</Button></div>)}</div>
      <Button disabled={state.busy} onClick={() => state.calculate("LCOE — coûts documentés", projectId, () => ({ mode: "lcoe", input: { ...Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, k === "currency" ? v.trim() : requiredNumber(v)])), replacements: replacements.map(r => ({ year: requiredNumber(r.year), cost: requiredNumber(r.cost) })) }, evidence: { reference, date, costsConfirmed: confirmed }, production: { simulationId: productionSimulationId, source: productionSimulationId ? "Production annuelle enregistrée" : prodSource, nature: "assumption" } }))}>{state.busy ? "Calcul Python en cours…" : "Calculer et enregistrer le LCOE"}</Button>
    </fieldset>
    <p className="text-xs text-muted-foreground">{LCOE_FORMULA}. Monnaie constante, CAPEX an 0, remplacements fin d’année ; ni fiscalité ni dette.</p>
    <FinanceOutcome state={state} />
  </section>;
}
