import { parseWorldBankPopulation, planPopulationImport, WORLD_BANK_SOURCE_LABEL } from "@/features/geography/demography-watch";

const WB_URL = "https://api.worldbank.org/v2/country/all/indicator/SP.POP.TOTL?format=json&per_page=400&mrnev=1";

export async function runPopulationImport(trigger: "schedule" | "manual", userId: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sb = supabaseAdmin as any;
  const { data: run, error: runErr } = await sb.from("population_import_runs")
    .insert({ trigger, triggered_by: userId, status: "running" }).select("id").single();
  if (runErr) throw new Error("Impossible d’ouvrir l’import.");
  const fail = async (msg: string) => {
    await sb.from("population_import_runs").update({ status: "failed", error: msg, finished_at: new Date().toISOString() }).eq("id", run.id);
    return { runId: run.id, status: "failed" as const, error: msg };
  };
  let parsed;
  try {
    const res = await fetch(WB_URL, { redirect: "manual", signal: AbortSignal.timeout(25_000) });
    if (!res.ok) return fail(`Banque mondiale : réponse HTTP ${res.status}.`);
    parsed = parseWorldBankPopulation(await res.json());
  } catch {
    return fail("Banque mondiale injoignable (réseau ou délai dépassé).");
  }
  if (parsed.byIso3.size === 0) return fail("Banque mondiale : réponse vide ou illisible, aucune valeur modifiée.");

  const { data: countries, error } = await sb.from("countries").select("id, name, iso3, population, population_year, population_source, population_method");
  if (error) return fail("Les pays n’ont pas pu être chargés.");
  const decisions = planPopulationImport(countries ?? [], parsed.byIso3);
  const source = WORLD_BANK_SOURCE_LABEL(parsed.lastUpdated);
  const now = new Date().toISOString();
  for (const d of decisions.filter((x) => x.action === "updated")) {
    const { error: upErr } = await sb.from("countries").update({
      population: d.observation!.value, population_year: d.observation!.year,
      population_source: source, population_method: "estimation", population_updated_at: now,
    }).eq("id", d.country.id);
    if (upErr) return fail(`Échec de mise à jour pour ${d.country.name}.`);
  }
  const history = decisions.map((d) => ({
    run_id: run.id, country_id: d.country.id, action: d.action,
    previous_population: d.country.population, previous_year: d.country.population_year,
    previous_source: d.country.population_source, previous_method: d.country.population_method,
    observed_population: d.observation?.value ?? null, observed_year: d.observation?.year ?? null,
  }));
  if (history.length) await sb.from("country_population_history").insert(history);
  const count = (a: string) => decisions.filter((d) => d.action === a).length;
  const missing = decisions.filter((d) => d.action === "missing").map((d) => ({ id: d.country.id, name: d.country.name, iso3: d.country.iso3, has_value: d.country.population != null }));
  await sb.from("population_import_runs").update({
    status: "success", finished_at: new Date().toISOString(), source_last_updated: parsed.lastUpdated,
    countries_total: decisions.length, updated_count: count("updated"), unchanged_count: count("unchanged"),
    kept_other_source_count: count("kept_other_source"), missing_countries: missing,
  }).eq("id", run.id);
  return { runId: run.id, status: "success" as const, error: null };
}
