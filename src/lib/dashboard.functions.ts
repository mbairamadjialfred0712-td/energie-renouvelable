import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { summarizeDemands } from "@/features/dashboard/demand-summary";

const countTable = async (client: any, table: string) => {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`Impossible de compter ${table}.`);
  return count ?? 0;
};

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase as any;
    const [localities, simulations, projects, scenarios, resources, countries, sites, regions, departments] = await Promise.all([
      countTable(sb, "localities"), countTable(sb, "simulations"), countTable(sb, "projects"), countTable(sb, "scenarios"),
      countTable(sb, "energy_resources"), countTable(sb, "countries"), countTable(sb, "study_sites"), countTable(sb, "regions"), countTable(sb, "departments"),
    ]);
    const [{ data: res }, { data: dem }, { data: proj }, { data: locs }, { data: sitePts }] = await Promise.all([
      sb.from("energy_resources").select("resource_type, validation_status, locality_id, source, solar_resources(solar_status)"),
      sb.from("energy_demands").select("sector, consumer_category, demand_status, measured_peak_kw, measurements, period_start, period_end, energy_demand_equipment(name, category, quantity, unit_power, power_unit, hours_per_day, days_per_week, usage_factor, usage_factor_definition, usage_factor_source, priority, notes)"),
      sb.from("projects").select("id, name, status, updated_at").order("updated_at", { ascending: false }),
      sb.from("localities").select("id, name, latitude, longitude, population").not("latitude", "is", null).not("longitude", "is", null).limit(2000),
      sb.from("study_sites").select("id, name, latitude, longitude, site_type").not("latitude", "is", null).not("longitude", "is", null),
    ]);
    const resourcesByType: Record<string, number> = { solar: 0, wind: 0, biomass: 0, waste: 0 };
    const resourcesValidated = (res ?? []).filter((r: any) => r.validation_status === "validated").length;
    for (const r of res ?? []) resourcesByType[r.resource_type] = (resourcesByType[r.resource_type] ?? 0) + 1;
    const solarRows = (res ?? []).filter((r: any) => r.resource_type === "solar");
    const solarStatus = (r: any) => (Array.isArray(r.solar_resources) ? r.solar_resources[0] : r.solar_resources)?.solar_status ?? "unverified";
    const solar = {
      datasets: solarRows.length,
      localities: new Set(solarRows.map((r: any) => r.locality_id)).size,
      validated: solarRows.filter((r: any) => solarStatus(r) === "validated").length,
      pending: solarRows.filter((r: any) => ["unverified", "in_review"].includes(solarStatus(r))).length,
      sources: new Set(solarRows.map((r: any) => String(r.source).trim().toLowerCase())).size,
    };
    const { count: biomassReferences, error: biomassError } = await context.supabase.from("biomass_reference_observations").select("id", { count: "exact", head: true });
    if (biomassError) throw new Error("Référentiel biomasse indisponible.");
    const resourceLocations = new Map<string, string[]>();
    for (const r of res ?? []) { const types = resourceLocations.get(r.locality_id) ?? []; if (!types.includes(r.resource_type)) types.push(r.resource_type); resourceLocations.set(r.locality_id, types); }
    const resourcePoints = (locs ?? []).filter((l: any) => resourceLocations.has(l.id)).map((l: any) => ({ id: l.id, name: l.name, latitude: Number(l.latitude), longitude: Number(l.longitude), detail: resourceLocations.get(l.id)?.map(t => ({ solar: "Solaire", wind: "Éolien", biomass: "Biomasse", waste: "Déchets" }[t] ?? t)).join(" · ") }));
    const localitiesWithResources = new Set((res ?? []).map((r: any) => r.locality_id)).size;

    // Demande : valeurs mesurées (table measurements) et estimées (inventaire d'équipements)
    // agrégées par le même moteur pur que le module Demande — jamais lues depuis les
    // champs historiques daily_demand_kwh / annual_demand_kwh, que le formulaire n'alimente plus.
    const { demandBySector, demandByStatus } = summarizeDemands((dem ?? []) as any[]);
    const projectsByStatus: Record<string, number> = {};
    for (const p of proj ?? []) projectsByStatus[p.status] = (projectsByStatus[p.status] ?? 0) + 1;
    const population = (locs ?? []).reduce((sum: number, l: any) => sum + (l.population ? Number(l.population) : 0), 0);

    return {
      localities, simulations, projects, scenarios, resources, countries, sites, regions, departments,
      resourcesByType, resourcesValidated, solar, localitiesWithResources, biomassReferences: biomassReferences ?? 0, resourcePoints,
      demands: (dem ?? []).length, demandBySector, demandByStatus,
      projectsByStatus, recentProjects: (proj ?? []).slice(0, 5),
      populationGeolocated: population,
      localityPoints: ((locs ?? []) as any[]).map((l): { id: string; name: string; latitude: number; longitude: number } => ({ id: l.id, name: l.name, latitude: Number(l.latitude), longitude: Number(l.longitude) })),
      sitePoints: ((sitePts ?? []) as any[]).map((s): { id: string; name: string; latitude: number; longitude: number; site_type: string } => ({ id: s.id, name: s.name, latitude: Number(s.latitude), longitude: Number(s.longitude), site_type: s.site_type })),
    };
  });
