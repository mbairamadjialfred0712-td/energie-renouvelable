import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
      sb.from("energy_resources").select("resource_type, validation_status, locality_id"),
      sb.from("energy_demands").select("sector, annual_demand_kwh, peak_power_kw, validation_status"),
      sb.from("projects").select("id, name, status, updated_at").order("updated_at", { ascending: false }),
      sb.from("localities").select("id, name, latitude, longitude, population").not("latitude", "is", null).not("longitude", "is", null).limit(2000),
      sb.from("study_sites").select("id, name, latitude, longitude, site_type").not("latitude", "is", null).not("longitude", "is", null),
    ]);
    const resourcesByType: Record<string, number> = { solar: 0, wind: 0, biomass: 0, waste: 0 };
    const resourcesValidated = (res ?? []).filter((r: any) => r.validation_status === "validated").length;
    for (const r of res ?? []) resourcesByType[r.resource_type] = (resourcesByType[r.resource_type] ?? 0) + 1;
    const localitiesWithResources = new Set((res ?? []).map((r: any) => r.locality_id)).size;

    const demandBySector: Record<string, { count: number; annualKwh: number; withValue: number }> = {};
    for (const d of dem ?? []) {
      const s = (demandBySector[d.sector] ??= { count: 0, annualKwh: 0, withValue: 0 });
      s.count += 1;
      if (d.annual_demand_kwh != null) { s.annualKwh += Number(d.annual_demand_kwh); s.withValue += 1; }
    }
    const projectsByStatus: Record<string, number> = {};
    for (const p of proj ?? []) projectsByStatus[p.status] = (projectsByStatus[p.status] ?? 0) + 1;
    const population = (locs ?? []).reduce((sum: number, l: any) => sum + (l.population ? Number(l.population) : 0), 0);

    return {
      localities, simulations, projects, scenarios, resources, countries, sites, regions, departments,
      resourcesByType, resourcesValidated, localitiesWithResources,
      demands: (dem ?? []).length, demandBySector,
      projectsByStatus, recentProjects: (proj ?? []).slice(0, 5),
      populationGeolocated: population,
      localityPoints: (locs ?? []).map((l: any) => ({ id: l.id, name: l.name, latitude: Number(l.latitude), longitude: Number(l.longitude) })),
      sitePoints: (sitePts ?? []).map((s: any) => ({ id: s.id, name: s.name, latitude: Number(s.latitude), longitude: Number(s.longitude), site_type: s.site_type })),
    };
  });
