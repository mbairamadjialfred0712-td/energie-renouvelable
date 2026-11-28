import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";

export type Provider = "pvgis" | "nasa" | "nominatim";
export type ProviderFetch = { provider: Provider; version: string; key: string; type: string; params: Record<string, string | number>; url: URL; ttlSeconds: number };
export class ProviderError extends Error { constructor(public readonly code: string, message: string) { super(message); } }
const ALLOWED = { pvgis: "re.jrc.ec.europa.eu", nasa: "power.larc.nasa.gov", nominatim: "nominatim.openstreetmap.org" };

export async function fetchProvider(admin: SupabaseClient<Database>, ownerId: string, input: ProviderFetch, fetcher: typeof fetch = fetch) {
  if (input.url.protocol !== "https:" || input.url.hostname !== ALLOWED[input.provider]) throw new ProviderError("url", "Adresse fournisseur refusée.");
  const lease = await admin.rpc("claim_site_provider", { _owner: ownerId, _provider: input.provider, _version: input.version, _key: input.key, _type: input.type, _params: input.params, _url: input.url.href, _ttl_seconds: input.ttlSeconds });
  if (lease.error) throw new ProviderError("journal", "Le contrôle du quota est indisponible ; aucun appel envoyé.");
  const claim = lease.data as { state?: string; id?: string } | null;
  if (claim?.state === "quota") throw new ProviderError("quota", "Quota quotidien atteint (20 récupérations par fournisseur et compte). Réessayez demain.");
  if (claim?.state === "throttled") throw new ProviderError("throttled", "Un appel fournisseur vient de démarrer. Patientez quelques secondes avant de réessayer.");
  if (claim?.state === "busy") throw new ProviderError("busy", "Cette récupération est déjà en cours. Patientez puis rechargez le dossier.");
  if (claim?.state === "failed") throw new ProviderError("failed", "Ce fournisseur a récemment échoué pour cette demande. Réessayez dans cinq minutes.");
  const id = claim?.id;
  if (!id || !["cache", "claimed"].includes(claim?.state ?? "")) throw new ProviderError("journal", "Réponse de contrôle du quota invalide.");
  if (claim?.state === "cache") {
    const row = await admin.from("provider_requests").select("payload,retrieved_at,request_url").eq("id", id).eq("owner_id", ownerId).single();
    if (row.error || !row.data?.payload) throw new ProviderError("cache", "Cache fournisseur illisible.");
    return { id, raw: row.data.payload as unknown, retrievedAt: row.data.retrieved_at, url: row.data.request_url ?? input.url.href, cached: true };
  }
  try {
    const response = await fetcher(input.url, { redirect: "manual", signal: AbortSignal.timeout(55000), headers: { Accept: "application/json", "User-Agent": "EnergieRenouvelable/1.0 (+https://energie-renouvelable.lovable.app)" } });
    if (response.status === 429) throw new ProviderError("429", "Le fournisseur limite momentanément les requêtes. Réessayez plus tard.");
    if (!response.ok) throw new ProviderError("http", "Le fournisseur est indisponible pour cette demande.");
    // Bounded streaming read, including responses that omit Content-Length.
    const reader = response.body?.getReader(); if (!reader) throw new ProviderError("body", "Réponse fournisseur vide.");
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > 15 * 1024 * 1024) { await reader.cancel(); throw new ProviderError("size", "Réponse fournisseur trop volumineuse."); } chunks.push(part.value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.byteLength; }
    const raw: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const retrievedAt = new Date().toISOString();
    const saved = await admin.from("provider_requests").update({ status: "ok", payload: raw as Json, retrieved_at: retrievedAt, completed_at: retrievedAt }).eq("id", id).eq("owner_id", ownerId).select("id").single();
    if (saved.error) throw new ProviderError("save", "Réponse reçue mais non conservée ; aucun succès confirmé.");
    return { id, raw, retrievedAt, url: input.url.href, cached: false };
  } catch (e) {
    const safe = e instanceof ProviderError ? e : new ProviderError("network", "La récupération a échoué (connexion, délai ou format). Réessayez plus tard.");
    const saved = await admin.from("provider_requests").update({ status: "error", error: safe.code + ": " + safe.message, completed_at: new Date().toISOString() }).eq("id", id).eq("owner_id", ownerId).select("id").single();
    if (saved.error) throw new ProviderError("journal", "La récupération a échoué et son journal n’a pas pu être enregistré.");
    throw safe;
  }
}
