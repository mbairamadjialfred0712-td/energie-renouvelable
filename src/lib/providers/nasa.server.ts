import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { cacheKey, NASA_ADAPTER } from "@/features/site-reference/site-reference";
import { NASA_FIELDS, parseNasaWeather } from "@/features/weather/weather-model";
import { fetchProvider } from "./provider-cache.server";
export async function retrieveNasa(db: SupabaseClient<Database>, ownerId: string, lat: number, lon: number, start: string, end: string) {
  const params = { parameters: Object.values(NASA_FIELDS).join(","), community: "RE", latitude: lat.toFixed(4), longitude: lon.toFixed(4), start: start.replaceAll("-", ""), end: end.replaceAll("-", ""), format: "JSON", "time-standard": "UTC" };
  const url = new URL("https://power.larc.nasa.gov/api/temporal/hourly/point"); url.search = new URLSearchParams(params).toString();
  const result = await fetchProvider(db, ownerId, { provider: "nasa", version: NASA_ADAPTER, key: cacheKey("nasa", NASA_ADAPTER, "hourly", lat, lon, { start, end, parameters: params.parameters }), type: "hourly", params, url, ttlSeconds: 604800 });
  return { ...result, samples: parseNasaWeather(result.raw, start, end) };
}
