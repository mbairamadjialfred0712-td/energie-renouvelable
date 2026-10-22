import { batteryRequestSchema, checkBatteryResponse } from "@/features/engine/battery-contract";
import { requestEvidence } from "@/lib/scenario-evidence.server";
import { simulationResponse, type SimulationRequest } from "@/features/engine/engine-contract";
import { optimizationProblemSchema, OPTIMIZATION_VERSION, type OptimizationReport, type OptimizationProblem, type CandidateAssessment } from "./stored-battery-contract";

export type StoredBatteryCandidate = {
  id: string; name: string; status: string; siteId: string | null; projectId: string | null;
  request: unknown; response: unknown; provenanceValid: boolean;
};
const num = (r: SimulationRequest, k: string) => typeof r.input_data[k]?.value === "number" ? Number(r.input_data[k]?.value) : NaN;
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const near = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b));
/** Exact finite selection, never a dispatch model or a new scientific engine. */
export function optimizeStoredBatteries(raw: OptimizationProblem, candidates: StoredBatteryCandidate[], siteId: string, projectId: string): OptimizationReport {
  const p = optimizationProblemSchema.parse(raw);
  const reference = candidates.find(c => c.id === p.referenceId);
  const referenceRequest = batteryRequestSchema.safeParse(reference?.request);
  const referenceResponse = simulationResponse.safeParse(reference?.response);
  let referenceValid = reference?.status === "completed" && reference.siteId === siteId && reference.projectId === projectId && reference.provenanceValid && referenceRequest.success && referenceResponse.success;
  if (referenceRequest.success && referenceResponse.success) {
    const out = referenceResponse.data, ev = requestEvidence(referenceRequest.data);
    referenceValid = referenceValid && ev.requestValid && referenceRequest.data.source_references.length > 0 && out.status === "completed" && out.engine === "battery" && out.simulation_id === p.referenceId && Boolean(out.completed_at) && Boolean(out.engine_version);
    try { checkBatteryResponse(referenceRequest.data, out); } catch { referenceValid = false; }
  }
  const assessments = [...p.candidateIds].sort().map((id): CandidateAssessment => {
    const c = candidates.find(c => c.id === id);
    const a: CandidateAssessment = { id, name: c?.name ?? "Référence inaccessible", value: null, capacity: null, initialEnergy: null, finalEnergy: null, admissible: false, reasons: [], verified: [], engineVersion: null, validation: "Non établie", sources: null };
    if (!c) { a.reasons.push("Simulation inaccessible ou absente."); return a; }
    if (c.status !== "completed") a.reasons.push("Simulation non terminée ; aucun résultat utilisable.");
    if (c.siteId !== siteId || c.projectId !== projectId) a.reasons.push("Site historique ou projet incompatible.");
    if (!c.provenanceValid) a.reasons.push("Instantané de stockage/PV ou provenance incomplet.");
    const r = batteryRequestSchema.safeParse(c.request), out = simulationResponse.safeParse(c.response);
    if (!r.success || !out.success) { a.reasons.push("Contrat batterie ou résultats incomplets."); return a; }
    const evidence = requestEvidence(r.data);
    if (!evidence.requestValid || !evidence.natures.length || !r.data.source_references.length) a.reasons.push("Sources ou nature des données manquantes.");
    if (out.data.status !== "completed" || out.data.engine !== "battery" || out.data.simulation_id !== id || !out.data.engine_version || !out.data.completed_at) a.reasons.push("Identité, version ou date de résultat incohérente.");
    try { checkBatteryResponse(r.data, out.data); a.verified.push("Bilans horaires, SOC, rendements et puissances selon le contrat batterie"); } catch { a.reasons.push("Résultats incohérents avec le contrat et les bilans batterie."); }
    a.engineVersion = out.data.engine_version; a.sources = r.data.source_references;
    a.validation = String(out.data.calculation_metadata["scientific_validation"] ?? "Validation scientifique non établie");
    a.capacity = num(r.data, "usable_energy_kwh");
    a.initialEnergy = a.capacity * num(r.data, "initial_soc_pct") / 100;
    const initialUsable = a.capacity * (num(r.data, "initial_soc_pct") - num(r.data, "soc_min_pct")) / 100;
    a.finalEnergy = out.data.results["final_soc"]?.value ?? null;
    const ens = out.data.results["energy_not_served"];
    if (!ens || ens.unit !== "kWh" || ens.value === null || ens.value < 0 || !ens.method.trim()) a.reasons.push("Objectif énergie non servie en kWh indisponible.");
    else a.value = ens.value;
    if (a.capacity < p.capacityMin || a.capacity > p.capacityMax) a.reasons.push("Capacité de référence hors bornes documentées.");
    else a.verified.push("Capacité de référence dans les bornes explicites (avant réduction SOC)");
    if (a.finalEnergy === null || a.finalEnergy + 1e-9 < a.initialEnergy) a.reasons.push("Stock final inférieur au stock initial ; contrainte terminale violée.");
    else a.verified.push("Stock final au moins égal au stock initial");
    if (p.maxEns !== null && (a.value === null || a.value > p.maxEns)) a.reasons.push("Énergie non servie supérieure au plafond explicite.");
    else if (p.maxEns !== null) a.verified.push("Plafond d'énergie non servie respecté");
    if (!referenceValid || !referenceRequest.success || !referenceResponse.success) a.reasons.push("Référence complète et compatible manquante.");
    else {
      const rr = referenceRequest.data, ro = referenceResponse.data;
      if (!equal(r.data.timeseries, rr.timeseries)) a.reasons.push("PV, demande, sources, périodes ou pas horaires différents de la référence.");
      if (out.data.engine_version !== ro.engine_version || ens?.method !== ro.results["energy_not_served"]?.method) a.reasons.push("Version moteur ou méthode d'objectif différente.");
      if (!equal(r.data.assumptions, rr.assumptions) || r.data.input_data["strategy"]?.value !== rr.input_data["strategy"]?.value) a.reasons.push("Stratégie ou hypothèses différentes de la référence.");
      const referenceUsable = num(rr, "usable_energy_kwh") * (num(rr, "initial_soc_pct") - num(rr, "soc_min_pct")) / 100;
      if (!near(initialUsable, referenceUsable)) a.reasons.push("Énergie initiale mobilisable différente ; comparaison biaisée.");
      else a.verified.push("Même énergie initiale mobilisable que la référence");
    }
    a.admissible = a.reasons.length === 0;
    return a;
  });
  const feasible = assessments.filter(a => a.admissible && a.value !== null);
  const min = feasible.length ? Math.min(...feasible.map(a => a.value ?? Infinity)) : null;
  const winners = feasible.filter(a => a.value === min).map(a => a.id);
  const best = feasible.find(a => a.id === winners[0]), ref = assessments.find(a => a.id === p.referenceId);
  return { version: OPTIMIZATION_VERSION, method: "exhaustive_stored_candidates", status: !referenceValid ? "blocked" : feasible.length ? "completed" : "no_feasible", optimality: feasible.length ? "finite_domain_only" : "not_established", winners,
    assessments, improvement: best && ref?.admissible && ref.value !== null && best.value !== null && ref.capacity !== null && best.capacity !== null ? { referenceId: ref.id, selectedId: best.id, ensDelta: best.value - ref.value, capacityDelta: best.capacity - ref.capacity, unit: "kWh" } : null,
    limitations: ["Optimum uniquement parmi les candidats enregistrés admissibles ; aucune recherche de nouvelles puissances ni optimum physique global.", "Énergie non servie du modèle PV + batterie, pas une garantie de fourniture ni une optimisation hybride.", "Coûts, vieillissement, autonomie, contraintes réseau et multicritère non vérifiés ; aucune économie annoncée.", "Validation scientifique de Joël requise ; les bilans vérifiés ne valident pas physiquement le modèle."] };
}