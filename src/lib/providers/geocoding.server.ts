import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { NOMINATIM_ADAPTER, nominatimPrecision, type PlaceResult } from "@/features/site-reference/site-reference";
import { fetchProvider } from "./provider-cache.server";
const row = z.object({ place_id: z.number(), display_name: z.string(), name: z.string().optional(), lat: z.string(), lon: z.string(), type: z.string().optional(), addresstype: z.string().optional(), address: z.record(z.string()).optional() });
export function parseGeocoding(payload: unknown): Omit<PlaceResult, "homonym">[] {
  return z.array(row).max(10).parse(payload).map((r) => {
    const latitude = Number(r.lat), longitude = Number(r.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error("Coordonnées de géocodage invalides.");
    return { key: `nominatim:${r.place_id}`, name: r.name || r.display_name.split(",")[0] || r.display_name, country: r.address?.["country"] ?? null, region: r.address?.["state"] ?? r.address?.["region"] ?? null, latitude, longitude, precision: nominatimPrecision(r.type, r.addresstype), source: "OpenStreetMap / Nominatim — ODbL", localityId: null };
  });
}
export async function retrieveGeocoding(db: SupabaseClient<Database>, ownerId: string, query: string, countryCode: string) {
  const params: Record<string, string> = { q: query, format: "jsonv2", addressdetails: "1", limit: "8", "accept-language": "fr" };
  if (countryCode) params["countrycodes"] = countryCode.toLowerCase();
  const url = new URL("https://nominatim.openstreetmap.org/search"); url.search = new URLSearchParams(params).toString();
  const result = await fetchProvider(db, ownerId, { provider: "nominatim", version: NOMINATIM_ADAPTER, key: `nominatim|${NOMINATIM_ADAPTER}|${query.trim().toLowerCase()}|${countryCode.toLowerCase()}`, type: "geocoding", params, url, ttlSeconds: 2592000 });
  return { ...result, places: parseGeocoding(result.raw) };
}
