// Client HTTP centralisé vers le moteur scientifique Python (exécuté côté serveur uniquement).
// L'URL et la clé partagée viennent des variables serveur SCIENTIFIC_ENGINE_URL / SCIENTIFIC_ENGINE_KEY.
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { capabilitiesResponse, errorResponse, healthResponse, simulationRequest, validationResponse, type EngineStatus } from "@/features/engine/engine-contract";

const TIMEOUT_MS = 10_000;

class EngineCallError extends Error {
  constructor(public kind: "not_configured" | "unreachable" | "error", message: string) { super(message); }
}

async function callEngine<T>(path: string, schema: z.ZodType<T>, init?: { method: "POST"; body: unknown; auth: boolean }): Promise<T> {
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
    res = await fetch(`${base}/api/v1${path}`, { method: init?.method ?? "GET", headers, body: init ? JSON.stringify(init.body) : null, signal: AbortSignal.timeout(TIMEOUT_MS) });
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
