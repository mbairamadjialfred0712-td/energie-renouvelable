import { z } from "zod";
import type { HybridConfig, HybridData, HybridSimulation } from "./hybrid-model";

export const comparisonSelectionSchema = z.object({ name: z.string().trim().max(200), scenarioIds: z.array(z.string().uuid()).max(12).refine(ids => new Set(ids).size === ids.length, "Scénarios dupliqués.") }).strict();
export type ComparisonSelection = z.infer<typeof comparisonSelectionSchema>;
export type ComparisonCell = { value: number | null; unit: string; method: string; reasons: string[]; simulationId: string | null; validation: string; period: string };
export type ScenarioTable = { columns: { id: string; name: string; site: string; objective: string; assumptions: string; prepared: boolean }[]; rows: { key: string; label: string; cells: ComparisonCell[] }[]; warnings: string[] };
const labels: Record<string, string> = { annual_ac_energy: "Production PV — période enregistrée", turbine_energy: "Énergie turbine brute", primary_energy: "Énergie primaire recensée (non électrique)", energy_not_served: "Énergie non servie", demand_total_energy: "Demande sur la période", energy_served_by_battery: "Énergie délivrée par la batterie", final_soc: "SOC final (énergie)", capacity_factor: "Facteur de capacité", net_electric_energy: "Électricité nette", useful_thermal_energy: "Chaleur utile" };
function evidenceIssues(s: HybridSimulation, c: HybridConfig): string[] {
  const issues: string[] = [];
  if (s.status !== "completed") issues.push("Simulation non terminée.");
  if (!c.siteId || s.siteId !== c.siteId) issues.push("Site historique absent ou incompatible.");
  if (!s.periodStart || !s.periodEnd) issues.push("Période absente.");
  if (c.periodStart && c.periodStart !== s.periodStart || c.periodEnd && c.periodEnd !== s.periodEnd) issues.push("Période du scénario incompatible avec le résultat.");
  if (!s.version) issues.push("Version moteur absente.");
  if (!Array.isArray(s.sources) || !s.sources.length) issues.push("Sources absentes.");
  if (!s.evidence?.requestValid) issues.push("Paramètres requis ou contrat moteur incomplets.");
  if (!s.evidence?.natures.length) issues.push("Nature des données absente.");
  if (!s.evidence?.calculatedAt) issues.push("Date du calcul absente.");
  if (s.engine !== "biomass" && (!s.timestamps.length || s.utcOffset === null || s.convention !== "period_start")) issues.push("Chronologie horaire documentée absente.");
  return issues;
}
/** Stored scalar values only. No sum, conversion, ranking, extrapolation or dispatch. */
export function buildScenarioComparison(ids: string[], data: HybridData): ScenarioTable {
  const configs = ids.map(id => data.configs.find(r => r.config.id === id)?.config);
  if (configs.some(c => !c)) throw new Error("Scénario inaccessible ou illisible.");
  const selected = configs.filter((c): c is HybridConfig => Boolean(c));
  const siteId = selected[0]?.siteId;
  if (!siteId || selected.some(c => c.siteId !== siteId)) throw new Error("Comparaison inter-sites non autorisée ou site absent.");
  if (!data.sites.some(s => s.id === siteId)) throw new Error("Site inaccessible.");
  if (selected.some(c => !data.projects.some(p => p.id === c.projectId))) throw new Error("Projet inaccessible.");
  const keys = new Set<string>();
  for (const c of selected) for (const component of c.components) {
    const sim = data.simulations.find(s => s.id === component.simulationId && s.engine === component.technology && s.projectId === c.projectId);
    for (const r of sim?.results ?? []) keys.add(`${component.technology}:${r.key}`);
  }
  const rows = [...keys].sort().map(key => {
    const [engine, metric] = key.split(":");
    const sims = selected.map(c => data.simulations.find(s => s.id === c.components.find(x => x.technology === engine)?.simulationId && s.engine === engine && s.projectId === c.projectId));
    const base = sims.find(s => Boolean(s));
    const cells = selected.map((c, i): ComparisonCell => {
      const s = sims[i], r = s?.results.find(x => x.key === metric);
      const reasons = s ? evidenceIssues(s, c) : ["Aucun résultat individuel associé à cette technologie."];
      if (!r || r.value === null || !Number.isFinite(r.value)) reasons.push(r?.method || "Indicateur non calculé.");
      if (r && (!r.unit || !r.method.trim())) reasons.push("Unité ou méthode absente.");
      if (s && base) {
        if (s.siteId !== base.siteId) reasons.push("Comparaison inter-sites non autorisée.");
        if (s.periodStart !== base.periodStart || s.periodEnd !== base.periodEnd || s.utcOffset !== base.utcOffset || s.convention !== base.convention || s.timestamps.length !== base.timestamps.length || s.timestamps.some((t, j) => t !== base.timestamps[j])) reasons.push("Période ou couverture temporelle incompatible ; aucune annualisation.");
        if (s.version !== base.version) reasons.push("Versions moteur différentes : compatibilité non établie.");
        if (s.evidence?.boundary !== base.evidence?.boundary) reasons.push("Périmètres de calcul incompatibles.");
        if (JSON.stringify(s.evidence?.natures) !== JSON.stringify(base.evidence?.natures)) reasons.push("Natures des données différentes : comparaison exclue.");
        const br = base.results.find(x => x.key === metric);
        if (r && br && r.unit !== br.unit) reasons.push("Unités incompatibles ; aucune conversion.");
        if (r && br && r.method !== br.method) reasons.push("Méthodes différentes : indicateur exclu.");
      }
      return { value: reasons.length ? null : r?.value ?? null, unit: r?.unit ?? "—", method: [r?.method ?? "Non disponible", `Nature des entrées : ${s?.evidence?.natures.join(", ") ?? "absente"}`, `Calcul : ${s?.evidence?.calculatedAt ?? "date absente"}`, s?.limits ?? "", JSON.stringify(s?.sources ?? []), ...(s?.evidence?.warnings ?? [])].join(" · "), reasons: [...new Set(reasons)], simulationId: s?.id ?? null, validation: s?.evidence?.validation ?? "Non établie", period: `${s?.periodStart ?? "?"} → ${s?.periodEnd ?? "?"}` };
    });
    // Compatibility is bilateral: never leave one side looking comparable when its peer is excluded.
    if (cells.some(c => c.reasons.some(r => /incompatible|différentes|inter-sites/.test(r)))) for (const cell of cells) { cell.value = null; cell.reasons.push("Comparabilité non établie pour cet indicateur entre les scénarios sélectionnés."); }
    return { key, label: `${engine} · ${labels[metric ?? ""] ?? metric}`, cells };
  });
  return { columns: selected.map(c => ({ id: c.id ?? "", name: c.name, site: data.sites.find(s => s.id === c.siteId)?.name ?? "Site non établi", objective: c.objective, assumptions: c.assumptions, prepared: !c.components.some(x => data.simulations.some(s => s.id === x.simulationId && s.status === "completed")) })), rows, warnings: rows.length ? [] : ["Aucun résultat individuel enregistré : scénarios préparés uniquement."] };
}