import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { decodeHybridEnvelope, type HybridData, type HybridSimulation } from "@/features/hybrid/hybrid-model";
const object = (v: unknown): Record<string, any> => v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, any> : {};

export async function loadHybridData(sb: SupabaseClient<Database>, userId: string): Promise<HybridData> {
  const [configs, projects, sites, demands, weather, storage, biomass, simulations, roles] = await Promise.all([
    sb.from("scenarios").select("id,objectives,updated_at").eq("archived", false).order("updated_at", { ascending: false }),
    sb.from("projects").select("id,name,locality_id"), sb.from("study_sites").select("id,name,locality_id"),
    sb.from("energy_demands").select("id,name,site_id,locality_id,demand_status,source,period_start,period_end"),
    sb.from("site_weather_datasets").select("id,name,site_id,status,source,period_start,period_end"),
    sb.from("project_storage_configs").select("id,project_id,status,snapshot"),
    sb.from("biomass_resources").select("id,site_id,biomass_type,biomass_status,resource_id,period_start,period_end"),
    sb.from("simulations").select("id,name,project_id,status,engine_version,period_start,period_end,parameters,assumptions").order("created_at", { ascending: false }).limit(100),
    sb.from("user_roles").select("role").eq("user_id", userId),
  ]);
  if ([configs, projects, sites, demands, weather, storage, biomass, simulations, roles].some(x => x.error)) throw new Error("Les configurations et leurs références n'ont pas pu être chargées.");
  const ids = (simulations.data ?? []).map(s => s.id);
  const results = ids.length ? await sb.from("simulation_results").select("simulation_id,result_type,value,unit,calculation_method,timeseries,input_snapshot,source_references").in("simulation_id", ids) : { data: [], error: null };
  if (results.error) throw new Error("Les résultats individuels n'ont pas pu être chargés.");
  const sims: HybridSimulation[] = (simulations.data ?? []).map(s => {
    const params = object(s.parameters), request = object(params["request"]), ts = object(request["timeseries"]), snapshot = object(params["source_snapshot"]);
    const rows = s.status === "completed" ? (results.data ?? []).filter(r => r.simulation_id === s.id) : [];
    const metadata = object(object(rows[0]?.input_snapshot)["metadata"]);
    return { id: s.id, name: s.name, projectId: s.project_id, siteId: typeof snapshot["site_id"] === "string" ? snapshot["site_id"] : typeof object(snapshot["weather"])["site_id"] === "string" ? object(snapshot["weather"])["site_id"] : null,
      engine: typeof request["engine"] === "string" ? request["engine"] : "unknown", version: s.engine_version, status: s.status, periodStart: s.period_start, periodEnd: s.period_end,
      timestamps: Array.isArray(ts["timestamps"]) ? ts["timestamps"] : [], utcOffset: typeof ts["utc_offset_hours"] === "number" ? ts["utc_offset_hours"] : null, convention: typeof ts["timestamp_convention"] === "string" ? ts["timestamp_convention"] : null,
      sources: request["source_references"] ?? [], assumptions: s.assumptions, limits: typeof metadata["limits"] === "string" ? metadata["limits"] : "Résultat individuel ; aucune interaction hybride calculée.",
      results: rows.filter(r => !r.result_type.startsWith("series_")).map(r => ({ key: r.result_type, value: r.value, unit: r.unit, method: r.calculation_method })),
      series: rows.filter(r => r.result_type.startsWith("series_")).map(r => ({ key: r.result_type, unit: r.unit, values: Array.isArray(object(r.timeseries)["values"]) ? object(r.timeseries)["values"] : [] })),
    };
  });
  return {
    configs: (configs.data ?? []).flatMap(r => { const env = decodeHybridEnvelope(r.objectives); return env ? [{ config: { ...env.config, id: r.id }, updatedAt: r.updated_at, history: env.history }] : []; }),
    projects: (projects.data ?? []).map(p => ({ id: p.id, name: p.name, localityId: p.locality_id })), sites: (sites.data ?? []).map(s => ({ id: s.id, name: s.name, localityId: s.locality_id })),
    demands: (demands.data ?? []).map(d => ({ id: d.id, name: d.name, siteId: d.site_id, localityId: d.locality_id, status: d.demand_status, source: d.source, period: `${d.period_start ?? "?"} → ${d.period_end ?? "?"}` })),
    weather: (weather.data ?? []).map(w => ({ id: w.id, name: w.name, siteId: w.site_id, status: w.status, source: w.source, period: `${w.period_start} → ${w.period_end}` })),
    equipment: [...(storage.data ?? []).map(c => ({ id: c.id, name: `Stockage ${c.id.slice(0, 8)}`, projectId: c.project_id, status: c.status, technology: "battery", snapshot: c.snapshot })), ...(biomass.data ?? []).map(b => ({ id: b.id, name: b.biomass_type, siteId: b.site_id, status: b.biomass_status, technology: "biomass", period: `${b.period_start ?? "?"} → ${b.period_end ?? "?"}` }))],
    simulations: sims, canWrite: (roles.data ?? []).some(r => r.role === "admin" || r.role === "engineer"),
  };
}