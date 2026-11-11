import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { compareObservation, parseWorldBankPopulation, type WatchStatus } from "@/features/geography/demography-watch";

const WB_URL = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&mrnev=1";

export type WatchRow = {
  id: string; name: string; iso3: string | null;
  stored: { value: number | null; year: number | null; source: string | null; method: string | null };
  external: { value: number; year: number; source: string } | null;
  status: WatchStatus; relativeGap: number | null;
};

/** Lecture seule : aucune valeur n'est écrite en base. */
export const checkDemographySources = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: countries, error } = await sb.from("countries")
      .select("id, name, iso3, population, population_year, population_source, population_method").order("name");
    if (error) throw new Error("Les pays n’ont pas pu être chargés.");

    let sourceError: string | null = null;
    let parsed = parseWorldBankPopulation(null);
    try {
      const res = await fetch(WB_URL, { redirect: "manual", signal: AbortSignal.timeout(20_000) });
      if (!res.ok) sourceError = `Banque mondiale : réponse HTTP ${res.status}.`;
      else parsed = parseWorldBankPopulation(await res.json());
      if (!sourceError && parsed.byIso3.size === 0) sourceError = "Banque mondiale : réponse vide ou illisible.";
    } catch {
      sourceError = "Banque mondiale injoignable (réseau ou délai dépassé).";
    }

    const rows: WatchRow[] = (countries ?? []).map((c: any) => {
      const ext = c.iso3 ? parsed.byIso3.get(String(c.iso3).toUpperCase()) ?? null : null;
      const cmp = compareObservation(c, ext);
      return {
        id: c.id, name: c.name, iso3: c.iso3,
        stored: { value: c.population, year: c.population_year, source: c.population_source, method: c.population_method },
        external: ext, ...cmp,
      };
    });
    return { checkedAt: new Date().toISOString(), sourceLastUpdated: parsed.lastUpdated, sourceError, rows };
  });

export const runPopulationImportNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: roles } = await (context.supabase as any).from("user_roles").select("role").eq("user_id", context.userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin")) throw new Error("Seuls les administrateurs peuvent lancer l’import.");
    const { runPopulationImport } = await import("@/lib/population-import.server");
    return runPopulationImport("manual", context.userId);
  });

export const listPopulationImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const { data: runs } = await sb.from("population_import_runs").select("*").order("started_at", { ascending: false }).limit(20);
    const lastId = runs?.[0]?.id;
    const { data: history } = lastId
      ? await sb.from("country_population_history").select("*, countries(name, iso3)").eq("run_id", lastId).neq("action", "unchanged")
      : { data: [] };
    return { runs: (runs ?? []) as any[], history: (history ?? []) as any[] };
  });
