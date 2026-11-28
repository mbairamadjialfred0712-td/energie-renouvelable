import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { cacheKey, parsePvgisTmy, PVGIS_ADAPTER } from "@/features/site-reference/site-reference";
import { fetchProvider } from "./provider-cache.server";
import { weatherIssues } from "@/features/weather/weather-model";

export async function retrievePvgis(db: SupabaseClient<Database>, ownerId: string, lat: number, lon: number) {
  const url = new URL("https://re.jrc.ec.europa.eu/api/v5_3/tmy");
  const params = { lat: lat.toFixed(4), lon: lon.toFixed(4), outputformat: "json" };
  url.search = new URLSearchParams(params).toString();
  const result = await fetchProvider(db, ownerId, { provider: "pvgis", version: PVGIS_ADAPTER, key: cacheKey("pvgis", PVGIS_ADAPTER, "tmy", lat, lon), type: "tmy", params, url, ttlSeconds: 2592000 });
  const tmy = parsePvgisTmy(result.raw); const issues = weatherIssues(tmy.rows);
  if (issues.errors.length) throw new Error("La série PVGIS contient des valeurs invalides.");
  return { ...result, tmy };
}
