// Client HTTP centralisé vers le moteur scientifique Python (exécuté côté serveur uniquement).
// L'URL et la clé partagée viennent des variables serveur SCIENTIFIC_ENGINE_URL / SCIENTIFIC_ENGINE_KEY.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { capabilitiesResponse, healthResponse, simulationRequest, simulationResponse, validationResponse, type EngineStatus } from "@/features/engine/engine-contract";
import { assertCompletedResponse } from "@/features/engine/engine-response";
import type { Json } from "@/integrations/supabase/types";
import { cspRequestSchema } from "@/features/engine/csp-contract";
import { windRequestSchema } from "@/features/engine/wind-contract";

export const getEngineStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async (): Promise<EngineStatus> => {
  const { callEngine, EngineCallError } = await import("./engine-http.server");
  try {
    const [health, capabilities] = await Promise.all([callEngine("/health", healthResponse), callEngine("/capabilities", capabilitiesResponse)]);
    if (!health.auth_configured) return { state: "error", message: "Service joignable, mais authentification du moteur non configurée." };
    return { state: "online", health, capabilities };
  } catch (e) {
    if (e instanceof EngineCallError) return { state: e.kind, message: e.message };
    return { state: "error", message: "État du moteur indéterminé." };
  }
});

export const validateSimulationRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = z.object({ engine: z.string() }).passthrough().parse(input);
    if (raw.engine === "csp") cspRequestSchema.parse(input);
    if (raw.engine === "wind") windRequestSchema.parse(input);
    return simulationRequest.parse(input);
  })
  .handler(async ({ data }) => {
    const { callEngine, EngineCallError } = await import("./engine-http.server");
    try {
      return { ok: true as const, result: await callEngine("/simulations/validate", validationResponse, { method: "POST", body: data, auth: true }) };
    } catch (e) {
      return { ok: false as const, state: e instanceof EngineCallError ? e.kind : "error", message: e instanceof Error ? e.message : "Erreur." };
    }
  });

// ---------- Simulations PV : persistance dans simulations / simulation_results (RLS propriétaire/admin) ----------
const runInput = z.object({
  name: z.string().trim().min(3).max(200),
  description: z.string().trim().max(4000).optional(),
  project_id: z.string().uuid().nullable().optional(),
  locality_id: z.string().uuid().nullable().optional(),
  request: simulationRequest,
  weather_dataset_id: z.string().uuid().optional(),
  confirm_hourly_mean: z.boolean().optional(),
  confirm_radiation_conversion: z.boolean().optional(),
}).strict();

async function assertCanRun(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Rôles indisponibles.");
  if (!data?.some((r: { role: string }) => r.role === "admin" || r.role === "engineer")) throw new Error("Seuls les administrateurs et ingénieurs peuvent lancer une simulation.");
}

const ENGINES: Record<string, string> = { photovoltaic: "Production photovoltaïque horaire", battery: "Stockage batterie horaire (réservoir + rendements)", csp: "CSP cylindro-parabolique — bilan prescrit", wind: "Éolien — ressource / flux cinétique / courbe documentée" };

const runEngine = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => {
    const raw = z.object({ request: z.object({ engine: z.string() }).passthrough() }).passthrough().parse(input);
    if (raw.request.engine === "csp") cspRequestSchema.extend({ timeseries: z.null() }).parse(raw.request);
    return runInput.parse(input);
  })
  .handler(async ({ data, context }) => {
    const { callEngine } = await import("./engine-http.server");
    const supabase = context.supabase as any;
    await assertCanRun(supabase, context.userId);
    const objective = ENGINES[data.request.engine];
    if (!objective) throw new Error("Moteur non disponible.");
    let sourceSnapshot: Json = null;
    if (data.request.engine === "wind") {
      if (data.request.timeseries != null) throw new Error("Vent navigateur refusé : choisir un jeu enregistré.");
      const { prepareWindSource } = await import("./wind-source.server");
      const prepared = await prepareWindSource(context.supabase, data.request, data.weather_dataset_id, data.confirm_hourly_mean === true);
      if (data.locality_id && data.locality_id !== prepared.localityId) throw new Error("Localité éolienne incohérente.");
      data.locality_id = prepared.localityId; data.request = prepared.request; sourceSnapshot = prepared.provenance as Json;
    }
    if (data.request.engine === "csp") {
      const { prepareCspSource } = await import("./csp-source.server");
      const prepared = await prepareCspSource(context.supabase, data.request, data.weather_dataset_id, data.confirm_radiation_conversion === true, data.confirm_hourly_mean === true);
      if (data.locality_id && data.locality_id !== prepared.localityId) throw new Error("Localité CSP incohérente.");
      data.locality_id = prepared.localityId;
      data.request = prepared.request;
      sourceSnapshot = prepared.provenance as Json;
    }
    for (const [table, id] of [["projects", data.project_id], ["localities", data.locality_id]] as const) {
      if (id) {
        const { data: linked, error: accessError } = await supabase.from(table).select("id").eq("id", id).maybeSingle();
        if (accessError || !linked) throw new Error("Projet ou localité inaccessible.");
      }
    }
    if (data.request.project_id && data.request.project_id !== data.project_id) throw new Error("Projet incohérent dans la requête.");
    // Privileged persistence only after user-RLS role and linked-entity access checks.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ts = data.request.timeseries;
    const { data: sim, error } = await supabaseAdmin.from("simulations").insert({
      owner_id: context.userId, name: data.name, description: data.description ?? null,
      project_id: data.project_id ?? null, locality_id: data.locality_id ?? null,
      period_start: ts?.timestamps[0]?.slice(0, 10) ?? null, period_end: ts?.timestamps.at(-1)?.slice(0, 10) ?? null,
      objective, status: "running",
      parameters: { request: data.request, source_snapshot: sourceSnapshot } as unknown as Json, assumptions: data.request.assumptions as unknown as Json,
    }).select("id").single();
    if (error || !sim) throw new Error("La simulation n’a pas pu être créée.");
    type Detail = { field?: string | null; code: string; message: string };
    const fail = async (message: string, details: Detail[] = []) => {
      const saved = await supabaseAdmin.from("simulations").update({ status: "failed", parameters: { request: data.request, source_snapshot: sourceSnapshot, error: { message, details } } as unknown as Json }).eq("id", sim.id).eq("owner_id", context.userId).select("id").single();
      if (saved.error || !saved.data) throw new Error("Échec du calcul ; son statut n’a pas pu être enregistré. Aucun succès confirmé.");
      return { id: sim.id as string, status: "failed" as const, message, details };
    };
    try {
      const v = await callEngine("/simulations/validate", validationResponse, { method: "POST", body: data.request, auth: true, timeoutMs: 60_000 });
      if (v.engine !== data.request.engine || !v.engine_available) return await fail("Moteur demandé indisponible ou réponse de validation incohérente.");
      if (!v.valid) return await fail("Données refusées par le moteur.", v.validation_errors.map((e) => ({ field: e.field ?? null, code: e.code, message: e.message })));
      const out = await callEngine("/simulations", simulationResponse, { method: "POST", body: { ...data.request, simulation_id: sim.id }, auth: true, timeoutMs: 60_000 });
      assertCompletedResponse(data.request, out, sim.id);
      const snapshot = { schema_version: out.schema_version, engine_version: out.engine_version, metadata: { ...out.calculation_metadata, completed_at: out.completed_at }, warnings: out.warnings } as unknown as Json;
      const rows = [
        ...Object.entries(out.results).map(([k, r]) => ({ owner_id: context.userId, simulation_id: sim.id, result_type: k, value: r.value, unit: r.unit, calculation_method: r.method, input_snapshot: snapshot, assumptions_snapshot: data.request.assumptions as unknown as Json, source_references: data.request.source_references as unknown as Json })),
        ...Object.entries(out.timeseries).map(([k, s]) => ({ owner_id: context.userId, simulation_id: sim.id, result_type: `series_${k}`, value: null, unit: s.unit, timeseries: { values: s.values, timestamps_ref: "parameters.request.timeseries.timestamps" } as unknown as Json, calculation_method: s.method, input_snapshot: snapshot, assumptions_snapshot: data.request.assumptions as unknown as Json, source_references: data.request.source_references as unknown as Json })),
      ];
      const ins = await supabaseAdmin.from("simulation_results").insert(rows);
      if (ins.error) return await fail("Résultats non enregistrés : la simulation est marquée en échec.");
      const saved = await supabaseAdmin.from("simulations").update({ status: "completed", engine_version: `${data.request.engine} ${out.engine_version}` }).eq("id", sim.id).eq("owner_id", context.userId).select("id").single();
      if (saved.error || !saved.data) {
        await supabaseAdmin.from("simulation_results").delete().eq("simulation_id", sim.id).eq("owner_id", context.userId);
        return await fail("Statut final non enregistré : aucun succès confirmé.");
      }
      return { id: sim.id as string, status: "completed" as const, message: "Simulation terminée.", details: out.warnings.map((e) => ({ field: e.field ?? null, code: e.code, message: e.message })) };
    } catch (e) {
      return await fail(e instanceof Error ? e.message : "Erreur du moteur.");
    }
  });

export const runPvSimulation = runEngine;
export const runBatterySimulation = runEngine;
export const runCspSimulation = runEngine;
export const runWindSimulation = runEngine;

/** Séries horaires de résultats d'une simulation terminée (ex. ac_energy PV pour alimenter le moteur batterie). */
export const getSimulationSeries = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), resultType: z.string().regex(/^series_[a-z_]+$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sim, error: simError } = await context.supabase.from("simulations").select("id,name,status").eq("id", data.id).maybeSingle();
    if (simError) throw new Error("Lecture de la simulation indisponible.");
    if (!sim) throw new Error("Simulation introuvable.");
    if (sim.status !== "completed") throw new Error("Seules les simulations terminées fournissent des séries.");
    const { data: row, error } = await context.supabase.from("simulation_results").select("timeseries,unit").eq("simulation_id", data.id).eq("result_type", data.resultType).maybeSingle();
    if (error) throw new Error("Série indisponible.");
    const t = row?.timeseries as { values?: number[] } | null;
    if (!row || !t?.values?.length) return null;
    const { data: full, error: fullError } = await context.supabase.from("simulations").select("parameters").eq("id", data.id).single();
    if (fullError || !full) throw new Error("Lecture des paramètres indisponible.");
    const ts = (full?.parameters as { request?: { timeseries?: { timestamps?: string[]; utc_offset_hours?: number } } } | null)?.request?.timeseries;
    if (!ts?.timestamps?.length || ts.timestamps.length !== t.values.length || typeof ts.utc_offset_hours !== "number") throw new Error("Série enregistrée incomplète : horodatages ou fuseau manquants.");
    return { name: sim.name as string, values: t.values, unit: row.unit as string, timestamps: ts?.timestamps ?? [], utcOffset: ts?.utc_offset_hours ?? null };
  });

export const listSimulations = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.from("simulations").select("id,name,status,engine_version,period_start,period_end,created_at").order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error("Simulations indisponibles.");
  return data ?? [];
});

export const getSimulation = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const [sim, res] = await Promise.all([
      context.supabase.from("simulations").select("*").eq("id", data.id).maybeSingle(),
      context.supabase.from("simulation_results").select("result_type,value,unit,calculation_method,timeseries,input_snapshot,source_references,assumptions_snapshot").eq("simulation_id", data.id),
    ]);
    if (sim.error || res.error) throw new Error("Simulation indisponible.");
    if (!sim.data) return null;
    const params = (sim.data.parameters ?? {}) as { request?: { input_data?: Record<string, { value: string | number | boolean | null; unit?: string | null; nature: string }>; timeseries?: { timestamps?: string[]; utc_offset_hours?: number; series?: Record<string, { unit: string; nature: string; source?: string | null }> } }; error?: { message: string; details?: { field?: string | null; message: string }[] } };
    const series = params.request?.timeseries?.series ?? {};
    return {
      simulation: { id: sim.data.id, name: sim.data.name, status: sim.data.status, engine_version: sim.data.engine_version, created_at: sim.data.created_at },
      inputs: params.request?.input_data ?? {},
      windMetadata: (sim.data.parameters as { request?: { engine?: string } } | null)?.request?.engine === "wind" && sim.data.status === "completed" ? JSON.stringify({ metadata: (res.data?.[0]?.input_snapshot as { metadata?: Json } | null)?.metadata, source: (sim.data.parameters as { source_snapshot?: Json } | null)?.source_snapshot }, null, 2) : null,
      windSeries: (sim.data.parameters as { request?: { engine?: string } } | null)?.request?.engine === "wind" && sim.data.status === "completed" ? (res.data ?? []).filter((r) => r.result_type.startsWith("series_")).map((r) => ({ key: r.result_type.slice(7), unit: r.unit, values: ((r.timeseries as { values?: number[] } | null)?.values ?? []), method: r.calculation_method })) : [],
      cspLimits: params.request?.input_data?.["technology"]?.value === "parabolic_trough" && sim.data.status === "completed" ? String((res.data?.[0]?.input_snapshot as { metadata?: { limits?: string } } | null)?.metadata?.limits ?? "Bilan prescrit ; température et fluide documentés, non simulés. Pertes constantes à chaque heure, nuit incluse ; validation scientifique en attente.") : null,
      cspSeries: params.request?.input_data?.["technology"]?.value === "parabolic_trough" && sim.data.status === "completed" ? (res.data ?? []).filter((r) => r.result_type.startsWith("series_")).map((r) => ({ key: r.result_type.slice(7), unit: r.unit, values: ((r.timeseries as { values?: number[] } | null)?.values ?? []), method: r.calculation_method })) : [],
      sourceSnapshot: params.request?.input_data?.["technology"]?.value === "parabolic_trough" ? JSON.stringify((sim.data.parameters as { source_snapshot?: Json } | null)?.source_snapshot ?? null, null, 2) : null,
      seriesMeta: Object.fromEntries(Object.entries(series).map(([k, v]) => [k, { unit: v.unit, nature: v.nature, source: v.source ?? null }])),
      assumptions: Object.fromEntries(Object.entries((params.request as { assumptions?: Record<string, { value: Json; unit?: string; nature: string }> } | undefined)?.assumptions ?? {}).map(([k, v]) => [k, { value: String(v.value), unit: v.unit ?? null, nature: String(v.nature) }])),
      lastTimestamp: params.request?.timeseries?.timestamps?.at(-1) ?? null,
      calculatedAt: (res.data?.[0]?.input_snapshot as { metadata?: { completed_at?: string } } | null)?.metadata?.completed_at ?? null,
      firstTimestamp: params.request?.timeseries?.timestamps?.[0] ?? null,
      utcOffset: params.request?.timeseries?.utc_offset_hours ?? null,
      error: params.error ? { message: String(params.error.message), details: (Array.isArray(params.error.details) ? params.error.details : []).map((d) => ({ field: d.field ?? null, message: String(d.message) })) } : null,
      results: (sim.data.status === "completed" ? res.data ?? [] : []).map((r) => ({ result_type: r.result_type, value: r.value, unit: r.unit, calculation_method: r.calculation_method, warnings: ((r.input_snapshot as { warnings?: { code: string; message: string }[] } | null)?.warnings ?? []).map((w) => ({ code: String(w.code), message: String(w.message) })) })),
    };
  });
