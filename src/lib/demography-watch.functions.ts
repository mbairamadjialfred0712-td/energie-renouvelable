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
