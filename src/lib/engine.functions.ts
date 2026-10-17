// Client HTTP centralisé vers le moteur scientifique Python (exécuté côté serveur uniquement).
// L'URL et la clé partagée viennent des variables serveur SCIENTIFIC_ENGINE_URL / SCIENTIFIC_ENGINE_KEY.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { capabilitiesResponse, errorResponse, healthResponse, simulationRequest, simulationResponse, validationResponse, type EngineStatus } from "@/features/engine/engine-contract";
import type { Json } from "@/integrations/supabase/types";

const TIMEOUT_MS = 10_000;

class EngineCallError extends Error {
  constructor(public kind: "not_configured" | "unreachable" | "error", message: string) { super(message); }
}

async function callEngine<T>(path: string, schema: z.ZodType<T>, init?: { method: "POST"; body: unknown; auth: boolean; timeoutMs?: number }): Promise<T> {
  const base = process.env["SCIENTIFIC_ENGINE_URL"]?.replace(/\/+$/, "");
  const key = process.env["SCIENTIFIC_ENGINE_KEY"];
  if (!base) throw new EngineCallError("not_configured", "Moteur de calcul non configuré.");
  if (!/^https:\/\//.test(base) && !/^http:\/\/(localhost|127\.0\.0\.1)/.test(base)) throw new EngineCallError("not_configured", "L’URL du moteur doit utiliser HTTPS.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init?.auth) {
    if (!key) throw new EngineCallError("not_configured", "Clé du moteur de calcul non configurée.");
    const auth = getRequestHeader("authorization");
    if (!auth) throw new EngineCallError("error", "Session utilisateur absente.");
    headers["X-Engine-Key"] = key;
    headers["Authorization"] = auth; // jeton vérifié par FastAPI auprès du service d'identité
  }
  let res: Response;
  try {
    res = await fetch(`${base}/api/v1${path}`, { method: init?.method ?? "GET", headers, body: init ? JSON.stringify(init.body) : null, signal: AbortSignal.timeout(init?.timeoutMs ?? TIMEOUT_MS) });
  } catch (e) {
    const timeout = e instanceof Error && e.name === "TimeoutError";
    throw new EngineCallError("unreachable", timeout ? "Délai d’attente dépassé du moteur de calcul." : "Moteur de calcul injoignable.");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = errorResponse.safeParse(json);
    throw new EngineCallError("error", err.success ? err.data.error.message : `Erreur HTTP ${res.status} du moteur.`);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new EngineCallError("error", "Réponse du moteur non conforme au contrat v1.");
  return parsed.data;
}

export const getEngineStatus = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async (): Promise<EngineStatus> => {
  try {
    const [health, capabilities] = await Promise.all([callEngine("/health", healthResponse), callEngine("/capabilities", capabilitiesResponse)]);
    return { state: "online", health, capabilities };
  } catch (e) {
    if (e instanceof EngineCallError) return { state: e.kind, message: e.message };
    return { state: "error", message: "État du moteur indéterminé." };
  }
});

export const validateSimulationRequest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => simulationRequest.parse(input))
  .handler(async ({ data }) => {
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
});

async function assertCanRun(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Rôles indisponibles.");
  if (!data?.some((r: { role: string }) => r.role === "admin" || r.role === "engineer")) throw new Error("Seuls les administrateurs et ingénieurs peuvent lancer une simulation.");
}

const ENGINES: Record<string, string> = { photovoltaic: "Production photovoltaïque horaire", battery: "Stockage batterie horaire (réservoir + rendements)" };

const runEngine = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => runInput.parse(input))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase as any;
    await assertCanRun(supabase, context.userId);
    const objective = ENGINES[data.request.engine];
    if (!objective) throw new Error("Moteur non disponible.");
    const ts = data.request.timeseries;
    const { data: sim, error } = await supabase.from("simulations").insert({
      owner_id: context.userId, name: data.name, description: data.description ?? null,
      project_id: data.project_id ?? null, locality_id: data.locality_id ?? null,
      period_start: ts?.timestamps[0]?.slice(0, 10) ?? null, period_end: ts?.timestamps.at(-1)?.slice(0, 10) ?? null,
      objective, status: "running",
      parameters: { request: data.request } as unknown as Json, assumptions: data.request.assumptions as unknown as Json,
    }).select("id").single();
    if (error || !sim) throw new Error("La simulation n’a pas pu être créée.");
    type Detail = { field?: string | null; code: string; message: string };
    const fail = async (message: string, details: Detail[] = []) => {
      await supabase.from("simulations").update({ status: "failed", parameters: { request: data.request, error: { message, details } } as unknown as Json }).eq("id", sim.id);
      return { id: sim.id as string, status: "failed" as const, message, details };
    };
    try {
      const v = await callEngine("/simulations/validate", validationResponse, { method: "POST", body: data.request, auth: true, timeoutMs: 60_000 });
      if (!v.valid) return await fail("Données refusées par le moteur.", v.validation_errors.map((e) => ({ field: e.field ?? null, code: e.code, message: e.message })));
      const out = await callEngine("/simulations", simulationResponse, { method: "POST", body: { ...data.request, simulation_id: sim.id }, auth: true, timeoutMs: 60_000 });
      if (out.status !== "completed") return await fail("Le moteur n’a pas terminé le calcul.");
      const snapshot = { schema_version: out.schema_version, engine_version: out.engine_version, metadata: out.calculation_metadata, warnings: out.warnings } as unknown as Json;
      const rows = [
        ...Object.entries(out.results).map(([k, r]) => ({ owner_id: context.userId, simulation_id: sim.id, result_type: k, value: r.value, unit: r.unit, calculation_method: r.method, input_snapshot: snapshot, assumptions_snapshot: data.request.assumptions as unknown as Json, source_references: data.request.source_references as unknown as Json })),
        ...Object.entries(out.timeseries).map(([k, s]) => ({ owner_id: context.userId, simulation_id: sim.id, result_type: `series_${k}`, value: null, unit: s.unit, timeseries: { values: s.values, timestamps_ref: "parameters.request.timeseries.timestamps" } as unknown as Json, calculation_method: s.method, input_snapshot: snapshot, assumptions_snapshot: data.request.assumptions as unknown as Json, source_references: data.request.source_references as unknown as Json })),
      ];
      const ins = await supabase.from("simulation_results").insert(rows);
      if (ins.error) return await fail("Résultats non enregistrés : la simulation est marquée en échec.");
      await supabase.from("simulations").update({ status: "completed", engine_version: `${data.request.engine} ${out.engine_version}` }).eq("id", sim.id);
      return { id: sim.id as string, status: "completed" as const, message: "Simulation terminée.", details: out.warnings.map((e) => ({ field: e.field ?? null, code: e.code, message: e.message })) };
    } catch (e) {
      return await fail(e instanceof Error ? e.message : "Erreur du moteur.");
    }
  });

export const runPvSimulation = runEngine;
export const runBatterySimulation = runEngine;

/** Séries horaires de résultats d'une simulation terminée (ex. ac_energy PV pour alimenter le moteur batterie). */
export const getSimulationSeries = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), resultType: z.string().regex(/^series_[a-z_]+$/) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: sim } = await context.supabase.from("simulations").select("id,name,status").eq("id", data.id).maybeSingle();
    if (!sim) throw new Error("Simulation introuvable.");
    if (sim.status !== "completed") throw new Error("Seules les simulations terminées fournissent des séries.");
    const { data: row, error } = await context.supabase.from("simulation_results").select("timeseries,unit").eq("simulation_id", data.id).eq("result_type", data.resultType).maybeSingle();
    if (error) throw new Error("Série indisponible.");
    const t = row?.timeseries as { values?: number[] } | null;
    if (!t?.values?.length) return null;
    const { data: full } = await context.supabase.from("simulations").select("parameters").eq("id", data.id).single();
    const ts = (full?.parameters as { request?: { timeseries?: { timestamps?: string[]; utc_offset_hours?: number } } } | null)?.request?.timeseries;
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
      seriesMeta: Object.fromEntries(Object.entries(series).map(([k, v]) => [k, { unit: v.unit, nature: v.nature, source: v.source ?? null }])),
      firstTimestamp: params.request?.timeseries?.timestamps?.[0] ?? null,
      utcOffset: params.request?.timeseries?.utc_offset_hours ?? null,
      error: params.error ? { message: String(params.error.message), details: (Array.isArray(params.error.details) ? params.error.details : []).map((d) => ({ field: d.field ?? null, message: String(d.message) })) } : null,
      results: (res.data ?? []).map((r) => ({ result_type: r.result_type, value: r.value, unit: r.unit, calculation_method: r.calculation_method, warnings: ((r.input_snapshot as { warnings?: { code: string; message: string }[] } | null)?.warnings ?? []).map((w) => ({ code: String(w.code), message: String(w.message) })) })),
    };
  });
