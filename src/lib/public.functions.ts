import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

/** Lecture publique du référentiel territorial (lignes marquées is_reference uniquement). */
export const getPublicTerritories = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const sb = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(input, { ...init, headers: h }); } },
  }) as any;
  const count = async (t: string) => (await sb.from(t).select("id", { count: "exact", head: true }).eq("is_reference", true)).count ?? 0;
  const [countries, regions, departments, localities] = await Promise.all([count("countries"), count("regions"), count("departments"), count("localities")]);
  const [{ data: locs }, { data: regs }] = await Promise.all([
    sb.from("localities").select("id, name, latitude, longitude, population, altitude_m, data_source, departments(name)").eq("is_reference", true).order("population", { ascending: false }).limit(1000),
    sb.from("regions").select("id, name, countries(name), departments(count)").eq("is_reference", true).order("name"),
  ]);
  return {
    countries, regions, departments, localities,
    source: "GeoNames (geonames.org) — licence CC BY 4.0",
    localityRows: (locs ?? []).map((l: any) => ({ id: l.id as string, name: l.name as string, latitude: Number(l.latitude), longitude: Number(l.longitude), population: l.population as number | null, altitude_m: l.altitude_m as number | null, department: (l.departments?.name ?? null) as string | null })),
    regionRows: (regs ?? []).map((r: any) => ({ id: r.id as string, name: r.name as string, country: (r.countries?.name ?? "") as string, departments: (r.departments?.[0]?.count ?? 0) as number })),
  };
});
