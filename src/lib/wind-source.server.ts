import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SimulationRequest } from "@/features/engine/engine-contract";
import { windRequestSchema, selectWindWeather } from "@/features/engine/wind-contract";
export async function prepareWindSource(sb: SupabaseClient<Database>, request: SimulationRequest, datasetId: string | undefined, mean: boolean) {
  if (!datasetId) throw new Error("Jeu météo enregistré requis.");
  const { data: w, error } = await sb.from("site_weather_datasets").select("*").eq("id", datasetId).maybeSingle();
  if (error || !w || w.status !== "validated" || w.time_standard !== "UTC" || w.wind_height_m <= 0) throw new Error("Jeu météo inaccessible, non validé, hauteur absente ou non UTC.");
  if (request.input_data["site_id"]?.value !== w.site_id) throw new Error("Site éolien incohérent.");
  const [site, project] = await Promise.all([sb.from("study_sites").select("id,locality_id").eq("id", w.site_id).maybeSingle(), sb.from("projects").select("id,locality_id").eq("id", request.project_id ?? "").maybeSingle()]);
  if (site.error || project.error || !site.data?.locality_id || site.data.locality_id !== w.locality_id || project.data?.locality_id !== w.locality_id) throw new Error("Site, météo et projet incohérents ou inaccessibles.");
  const selected = selectWindWeather(w.samples, mean);
  const nature = w.data_nature === "measured" ? "measured" : w.data_nature === "estimate" ? "estimate" : w.data_nature === "assumption" ? "assumption" : "external";
  const input_data: SimulationRequest["input_data"] = { ...request.input_data };
  for (const [k,value,unit] of [["measurement_height",w.wind_height_m,"m"],["period_start",selected.start,"-"],["period_end",selected.end,"-"]] as const) input_data[k] = { value, unit, nature, source: w.source };
  const prepared = windRequestSchema.parse({ ...request, input_data, timeseries: { timestamps: selected.timestamps, utc_offset_hours: 0, timestamp_convention: "period_start", series: { wind_speed: { values: selected.values, unit: "m/s", nature, source: w.source } } }, source_references: [...request.source_references, { label: `${w.source} — ${w.data_nature} — validé`.slice(0,300), table: "site_weather_datasets", record_id: w.id, url: w.reference, period: `${selected.start} / ${selected.end}` }] });
  return { request: prepared, localityId: w.locality_id, provenance: { dataset_id: w.id, site_id: w.site_id, source: w.source, reference: w.reference, nature: w.data_nature, status: w.status, wind_height_m: w.wind_height_m, native_unit: "m/s", time_standard: "UTC", original_provenance: w.provenance, captured_at: new Date().toISOString(), dataset_created_at: w.created_at } };
}