import { selectCspDni } from "@/features/engine/csp-weather";
import { cspRequestSchema } from "@/features/engine/csp-contract";
import type { SimulationRequest } from "@/features/engine/engine-contract";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export async function prepareCspSource(sb: SupabaseClient<Database>, request: SimulationRequest, datasetId: string | undefined, conversion: boolean, mean: boolean) {
  if (!datasetId) throw new Error("Jeu météo enregistré requis.");
  const { data: weather, error } = await sb.from("site_weather_datasets").select("*").eq("id", datasetId).maybeSingle();
  if (error || !weather || weather.status !== "validated" || weather.time_standard !== "UTC") throw new Error("Jeu météo inaccessible, non validé ou non UTC.");
  if (weather.site_id !== request.input_data["site_id"]?.value) throw new Error("Le jeu DNI n’appartient pas au site sélectionné.");
  const { data: site } = await sb.from("study_sites").select("id,locality_id").eq("id", weather.site_id).maybeSingle();
  const { data: project } = await sb.from("projects").select("id,locality_id").eq("id", request.project_id ?? "").maybeSingle();
  if (!site || !project || !site.locality_id || site.locality_id !== weather.locality_id || project.locality_id !== site.locality_id) throw new Error("Site, jeu météo et localité du projet incohérents ou inaccessibles.");
  const selected = selectCspDni(weather.samples, weather.radiation_unit, conversion, mean);
  const prepared = cspRequestSchema.parse({ ...request,
    input_data: { ...request.input_data,
      period_start: { value: selected.start, unit: "-", nature: "external", source: weather.source },
      period_end: { value: selected.end, unit: "-", nature: "external", source: weather.source },
    },
    timeseries: { timestamps: selected.timestamps, utc_offset_hours: 0, timestamp_convention: "period_start", series: {
      dni: { values: selected.values, unit: "W/m²", nature: weather.data_nature === "measured" ? "measured" : weather.data_nature === "estimate" ? "estimate" : weather.data_nature === "assumption" ? "assumption" : "external", source: `${weather.source} ; ${selected.transformation}` },
    } },
    source_references: [...request.source_references, { label: `${weather.source} — ${weather.data_nature} — statut ${weather.status}`.slice(0, 300), table: "site_weather_datasets", record_id: weather.id, url: weather.reference, period: `${selected.start} / ${selected.end}` }],
  });
  const input_data: SimulationRequest["input_data"] = {};
  for (const [k, v] of Object.entries(prepared.input_data)) if (v !== undefined) input_data[k] = v;
  return { request: { ...prepared, input_data } satisfies SimulationRequest, localityId: site.locality_id,
    provenance: { dataset_id: weather.id, site_id: weather.site_id, source: weather.source, reference: weather.reference, status: weather.status,
      native_unit: weather.radiation_unit, nature: weather.data_nature, original_provenance: weather.provenance,
      dataset_created_at: weather.created_at, captured_at: new Date().toISOString(), transformation: selected.transformation, time_standard: "UTC" },
  };
}