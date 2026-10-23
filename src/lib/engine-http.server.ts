// Server-only transport. Imported dynamically inside authenticated handlers.
import { z } from "zod";
import { errorResponse } from "@/features/engine/engine-contract";

export class EngineCallError extends Error {
  constructor(public kind: "not_configured" | "unreachable" | "error", message: string) { super(message); }
}
type CallOptions = { method: "POST"; body: unknown; auth: boolean; timeoutMs?: number };
export async function requestEngine<T>(config: { base?: string | undefined; key?: string | undefined; authorization?: string | undefined }, path: string, schema: z.ZodType<T>, init?: CallOptions): Promise<T> {
  if (!config.base) throw new EngineCallError("not_configured", "Moteur photovoltaïque indisponible : service non configuré.");
  let url: URL;
  try { url = new URL(config.base); } catch { throw new EngineCallError("not_configured", "URL du moteur invalide."); }
  if (url.username || url.password || url.search || url.hash || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) throw new EngineCallError("not_configured", "L’URL du moteur doit utiliser HTTPS sans identifiants.");
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (init?.auth) {
    if (!config.key) throw new EngineCallError("not_configured", "Clé du moteur de calcul non configurée.");
    if (!config.authorization?.toLowerCase().startsWith("bearer ")) throw new EngineCallError("error", "Session utilisateur absente.");
    headers["X-Engine-Key"] = config.key;
    headers["Authorization"] = config.authorization;
  }
  let res: Response;
  try {
    res = await fetch(`${config.base.replace(/\/+$/, "")}/api/v1${path}`, { method: init?.method ?? "GET", headers, body: init ? JSON.stringify(init.body) : null, signal: AbortSignal.timeout(init?.timeoutMs ?? 60_000), redirect: "error" });
  } catch (e) {
    throw new EngineCallError("unreachable", e instanceof Error && ["TimeoutError", "AbortError"].includes(e.name) ? `Délai d’attente dépassé (${Math.round((init?.timeoutMs ?? 60_000) / 1000)} s) : le service hébergé est peut-être en cours de réveil, réessayez dans une minute.` : "Erreur réseau : le serveur de l’application n’a pas pu joindre le moteur (DNS, TLS ou service arrêté). Il ne s’agit pas d’une erreur CORS : l’appel part du serveur, jamais du navigateur.");
  }
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = errorResponse.safeParse(json);
    const label = res.status === 401 || res.status === 403 ? `Accès refusé par le moteur (HTTP ${res.status}) : clé partagée ou session utilisateur refusée.`
      : res.status === 404 ? `Route du moteur introuvable (HTTP 404) : ${url.pathname.replace(/\/+$/, "")}/api/v1${path}.`
      : res.status === 422 ? "Données refusées par la validation du moteur (HTTP 422)."
      : res.status >= 500 ? `Erreur interne du moteur (HTTP ${res.status}).` : `Erreur HTTP ${res.status} du moteur.`;
    const detail = err.success ? `${label} ${err.data.error.message}` : label;
    // Never relay a credential accidentally included by an upstream error.
    const safe = [config.key, config.authorization, config.authorization?.slice(7)].filter((v): v is string => Boolean(v)).reduce((text, secret) => text.split(secret).join("[masqué]"), detail);
    throw new EngineCallError("error", safe);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new EngineCallError("error", "Réponse du moteur non conforme au contrat v1.");
  return parsed.data;
}
export async function callEngine<T>(path: string, schema: z.ZodType<T>, init?: CallOptions): Promise<T> {
  const { getRequestHeader } = await import("@tanstack/react-start/server");
  return requestEngine({ base: process.env["SCIENTIFIC_ENGINE_URL"], key: process.env["SCIENTIFIC_ENGINE_KEY"], authorization: init?.auth ? getRequestHeader("authorization") : undefined }, path, schema, init);
}