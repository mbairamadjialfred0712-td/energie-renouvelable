import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import { decodeHybridEnvelope } from "@/features/hybrid/hybrid-model";
import { optimizeStoredBatteries, type StoredBatteryCandidate } from "@/services/optimization/stored-battery-optimizer";
import type { OptimizationReport, OptimizationProblem } from "@/services/optimization/stored-battery-contract";
import { assertHybridWriter } from "./hybrid-access.server";

const obj = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};
export async function prepareOptimization(sb: SupabaseClient<Database>, userId: string, configId: string, expectedRevision: string) {
  const [row, roles] = await Promise.all([
    sb.from("scenarios").select("id,name,owner_id,objectives,updated_at,archived").eq("id", configId).maybeSingle(),
    sb.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if (row.error || !row.data || row.data.archived || roles.error) throw new Error("Configuration ou permissions indisponibles.");
  assertHybridWriter((roles.data ?? []).map(r => r.role), userId, row.data.owner_id);
  if (row.data.updated_at !== expectedRevision) throw new Error("Configuration modifiée ; rechargez avant de lancer.");
  const config = decodeHybridEnvelope(row.data.objectives)?.config;
  if (!config?.optimization || !config.siteId || !config.projectId) throw new Error("Projet, site et problème enregistré requis.");
  const [site, project] = await Promise.all([sb.from("study_sites").select("id,locality_id").eq("id", config.siteId).maybeSingle(), sb.from("projects").select("id,locality_id").eq("id", config.projectId).maybeSingle()]);
  if (site.error || project.error || !site.data || !project.data || !site.data.locality_id || site.data.locality_id !== project.data.locality_id) throw new Error("Site/projet inaccessible ou incompatible.");
  const ids = config.optimization.candidateIds;
  const [sims, results] = await Promise.all([
    sb.from("simulations").select("id,name,project_id,status,engine_version,parameters,created_at").in("id", ids),
    sb.from("simulation_results").select("simulation_id,result_type,value,unit,calculation_method,timeseries,input_snapshot").in("simulation_id", ids),
  ]);
  if (sims.error || results.error) throw new Error("Lecture des candidats indisponible.");
  // Missing IDs are rejected, not reported with another user's metadata.
  if (ids.some(id => !sims.data?.some(s => s.id === id))) throw new Error("Un candidat est inaccessible ou absent.");
  const candidates: StoredBatteryCandidate[] = (sims.data ?? []).map(s => {
    const params = obj(s.parameters), source = obj(params["source_snapshot"]), storage = obj(source["configuration"]), snapshot = obj(source["snapshot"]);
    const rows = (results.data ?? []).filter(r => r.simulation_id === s.id);
    const input = obj(rows[0]?.input_snapshot), metadata = obj(input["metadata"]);
    return { id: s.id, name: s.name, status: s.status, projectId: s.project_id, siteId: obj(params["source_snapshot"])["site_id"] ?? obj(obj(source["pv_source_snapshot"])["weather"])["site_id"] ?? null,
      provenanceValid: storage["status"] === "validated" && storage["project_id"] === config.projectId && Boolean(source["pv_simulation_id"]) && Boolean(snapshot["sheet"]) && source["demand_project_confirmed"] === true,
      request: params["request"], response: { simulation_id: s.id, status: s.status, engine: "battery", engine_version: input["engine_version"], schema_version: input["schema_version"], created_at: s.created_at, completed_at: metadata["completed_at"] ?? null,
        results: Object.fromEntries(rows.filter(r => !r.result_type.startsWith("series_")).map(r => [r.result_type, { value: r.value, unit: r.unit, method: r.calculation_method, nature: "calculated" }])),
        timeseries: Object.fromEntries(rows.filter(r => r.result_type.startsWith("series_")).map(r => [r.result_type.slice(7), { values: obj(r.timeseries)["values"], unit: r.unit, method: r.calculation_method }])),
        warnings: input["warnings"] ?? [], validation_errors: [], calculation_metadata: metadata },
    };
  });
  // Site is established from the linked completed PV's saved provenance, not today's editable association.
  for (const c of candidates) {
    const sim = sims.data?.find(s => s.id === c.id), source = obj(obj(sim?.parameters)["source_snapshot"]);
    const pvId = source["pv_simulation_id"];
    if (typeof pvId !== "string") continue;
    const pv = await sb.from("simulations").select("id,status,project_id,parameters").eq("id", pvId).maybeSingle();
    if (pv.error || !pv.data || pv.data.status !== "completed" || pv.data.project_id !== config.projectId) { c.provenanceValid = false; continue; }
    const pvSource = obj(obj(pv.data.parameters)["source_snapshot"]);
    c.siteId = typeof pvSource["site_id"] === "string" ? pvSource["site_id"] : obj(pvSource["weather"])["site_id"] ?? null;
  }
  return { report: optimizeStoredBatteries(config.optimization, candidates, config.siteId, config.projectId), problem: config.optimization, configId, revision: row.data.updated_at, name: row.data.name, projectId: config.projectId, localityId: site.data.locality_id,
    sourceSnapshot: candidates.map(c => ({ id: c.id, request: c.request, response: c.response, siteId: c.siteId, provenanceValid: c.provenanceValid })) };
}

export async function persistOptimization(admin: SupabaseClient<Database>, userId: string, prepared: Awaited<ReturnType<typeof prepareOptimization>>, startedAt: string) {
  const finishedAt = new Date().toISOString();
  // One INSERT holds the complete input/output snapshot; no partial result finalization.
  const saved = await admin.from("simulations").insert({ owner_id: userId, project_id: prepared.projectId, locality_id: prepared.localityId,
    name: `Optimisation — ${prepared.name}`.slice(0, 200), objective: "Minimiser énergie non servie — candidats batterie enregistrés", status: prepared.report.status === "completed" ? "completed" : "failed", engine_version: prepared.report.version,
    parameters: { kind: "stored_battery_optimization", config_id: prepared.configId, revision: prepared.revision, problem: prepared.problem, report: prepared.report, source_snapshot: prepared.sourceSnapshot, started_at: startedAt, finished_at: finishedAt } as unknown as Json,
    assumptions: { initial_policy: prepared.problem.initialPolicy, terminal_policy: prepared.problem.terminalPolicy } as Json,
  }).select("id,parameters,status").single();
  if (saved.error || !saved.data) throw new Error("Optimisation non enregistrée ; aucun succès confirmé.");
  return saved.data.id;
}
export type OptimizationRun = { id: string; at: string; revision: string; problem: OptimizationProblem; report: OptimizationReport };
export async function readOptimizationRuns(sb: SupabaseClient<Database>, configId: string): Promise<OptimizationRun[]> {
  const rows = await sb.from("simulations").select("id,parameters,created_at").contains("parameters", { kind: "stored_battery_optimization", config_id: configId }).order("created_at", { ascending: false }).limit(30);
  if (rows.error) throw new Error("Historique d'optimisation indisponible.");
  return (rows.data ?? []).map(r => { const p = obj(r.parameters); return { id: r.id, at: r.created_at, revision: p["revision"], problem: p["problem"], report: p["report"] }; });
}