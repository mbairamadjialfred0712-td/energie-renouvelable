import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { DATA_NATURES, IRRADIANCE_UNITS, SOLAR_STATUSES, SUNSHINE_UNITS, solarErrors, type SolarResourceInput } from "@/features/resources/solar/solar-model";

const SELECT = `id, owner_id, locality_id, source, period, reference, quality, notes, validation_status, created_at, updated_at,
  localities(id, name, latitude, longitude, departments(name, regions(name, countries(name)))),
  solar_resources(*, study_sites(id, name, latitude, longitude))`;

export type SolarRow = ReturnType<typeof flatten>;

function flatten(r: any) {
  const s = (Array.isArray(r.solar_resources) ? r.solar_resources[0] : r.solar_resources) ?? {};
  const loc = r.localities ?? {};
  const num = (x: any) => (x === null || x === undefined ? null : Number(x));
  return {
    id: r.id as string, owner_id: r.owner_id as string, locality_id: r.locality_id as string,
    locality_name: (loc.name ?? null) as string | null,
    department: (loc.departments?.name ?? null) as string | null,
    region: (loc.departments?.regions?.name ?? null) as string | null,
    country: (loc.departments?.regions?.countries?.name ?? null) as string | null,
    latitude: num(loc.latitude), longitude: num(loc.longitude),
    site_id: (s.site_id ?? null) as string | null, site_name: (s.study_sites?.name ?? null) as string | null,
    site_latitude: num(s.study_sites?.latitude), site_longitude: num(s.study_sites?.longitude),
    source: r.source as string, reference: r.reference as string | null, period: r.period as string | null,
    quality: r.quality as string | null, notes: r.notes as string | null, created_at: r.created_at as string, updated_at: r.updated_at as string,
    ghi: num(s.ghi_kwh_m2_day), dni: num(s.dni_kwh_m2_day), dhi: num(s.dhi_kwh_m2_day), annual: num(s.annual_irradiation_kwh_m2),
    tavg: num(s.avg_temperature_c), tmin: num(s.min_temperature_c), tmax: num(s.max_temperature_c), sunshine: num(s.sunshine_hours),
    ghiUnit: (s.ghi_unit ?? "kWh/m²/jour") as (typeof IRRADIANCE_UNITS)[number], dniUnit: (s.dni_unit ?? "kWh/m²/jour") as (typeof IRRADIANCE_UNITS)[number],
    dhiUnit: (s.dhi_unit ?? "kWh/m²/jour") as (typeof IRRADIANCE_UNITS)[number], sunshineUnit: (s.sunshine_unit ?? "h/an") as (typeof SUNSHINE_UNITS)[number],
    data_nature: (s.data_nature ?? "measured") as keyof typeof DATA_NATURES, acquisition_method: (s.acquisition_method ?? null) as string | null,
    collected_on: (s.collected_on ?? null) as string | null, period_start: (s.period_start ?? null) as string | null, period_end: (s.period_end ?? null) as string | null,
    status: (s.solar_status ?? "unverified") as keyof typeof SOLAR_STATUSES,
  };
}

async function myRoles(sb: any, userId: string): Promise<string[]> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role);
}

export const getSolarAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const roles = await myRoles(context.supabase, context.userId);
  return { userId: context.userId, roles, canWrite: roles.includes("admin") || roles.includes("engineer"), isAdmin: roles.includes("admin") };
});

export const listSolar = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "solar").order("updated_at", { ascending: false });
  if (error) throw new Error("Les données solaires n’ont pas pu être chargées.");
  return ((data ?? []) as any[]).map(flatten);
});

export const getSolar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("energy_resources").select(SELECT).eq("id", data.id).eq("resource_type", "solar").maybeSingle();
    if (error) throw new Error("Le jeu de données n’a pas pu être chargé.");
    if (!row) return null;
    const item = flatten(row);
    const { data: sib } = await sb.from("energy_resources").select(SELECT).eq("resource_type", "solar").eq("locality_id", item.locality_id).order("created_at");
    return { item, siblings: ((sib ?? []) as any[]).map(flatten) };
  });

export const getLocalitySolar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ localityId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: loc } = await sb.from("localities").select("id, name, code, latitude, longitude, altitude_m, population, data_source, departments(name, regions(name, countries(name)))").eq("id", data.localityId).maybeSingle();
    const { data: rows } = await sb.from("energy_resources").select(SELECT).eq("resource_type", "solar").eq("locality_id", data.localityId).order("created_at", { ascending: false });
    const { data: sites } = await sb.from("study_sites").select("id, name, site_type").eq("locality_id", data.localityId);
    return { locality: loc, datasets: ((rows ?? []) as any[]).map(flatten), sites: sites ?? [] };
  });

export const listSolarLocationOptions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase as any;
  const [{ data: locs }, { data: sites }] = await Promise.all([
    sb.from("localities").select("id, name, department_id, departments(id, name, region_id, regions(id, name, country_id, countries(id, name)))").order("name").limit(5000),
    sb.from("study_sites").select("id, name, locality_id").order("name"),
  ]);
  return {
    localities: (locs ?? []).map((l: any) => ({
      id: l.id as string, name: l.name as string,
      departmentId: (l.departments?.id ?? null) as string | null, departmentName: (l.departments?.name ?? null) as string | null,
      regionId: (l.departments?.regions?.id ?? null) as string | null, regionName: (l.departments?.regions?.name ?? null) as string | null,
      countryId: (l.departments?.regions?.countries?.id ?? null) as string | null, countryName: (l.departments?.regions?.countries?.name ?? null) as string | null,
    })),
    sites: (sites ?? []) as { id: string; name: string; locality_id: string | null }[],
  };
});

const n = z.number().finite().nullable();
const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const saveSchema = z.object({
  id: z.string().uuid().nullable(),
  locality_id: z.string().uuid({ message: "Sélectionnez une localité." }),
  site_id: z.string().uuid().nullable(),
  ghi: n, dni: n, dhi: n, annual: n, tavg: n, tmin: n, tmax: n, sunshine: n,
  ghiUnit: z.enum(IRRADIANCE_UNITS), dniUnit: z.enum(IRRADIANCE_UNITS), dhiUnit: z.enum(IRRADIANCE_UNITS), sunshineUnit: z.enum(SUNSHINE_UNITS),
  source: z.string().trim().min(2, "La source est obligatoire.").max(500),
  reference: z.string().trim().max(500).nullable(),
  period_start: d, period_end: d, period: z.string().trim().max(200).nullable(),
  data_nature: z.enum(Object.keys(DATA_NATURES) as [keyof typeof DATA_NATURES]),
  acquisition_method: z.string().trim().max(300).nullable(),
  collected_on: d,
  quality: z.string().trim().max(200).nullable(),
  status: z.enum(Object.keys(SOLAR_STATUSES) as [keyof typeof SOLAR_STATUSES]),
  notes: z.string().trim().max(4000).nullable(),
});

const legacyStatus = (s: string) => (s === "validated" ? "validated" : s === "rejected" ? "rejected" : "pending");

export const saveSolar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const errs = solarErrors({ ...data, periodStart: data.period_start, periodEnd: data.period_end });
    if (errs.length) throw new Error(errs.join(" "));
    const roles = await myRoles(sb, context.userId);
    if (!roles.includes("admin") && !roles.includes("engineer")) throw new Error("Votre rôle (lecture seule) ne permet pas d’enregistrer des données.");
    if (data.site_id) {
      const { data: site } = await sb.from("study_sites").select("locality_id").eq("id", data.site_id).maybeSingle();
      if (!site || (site.locality_id && site.locality_id !== data.locality_id)) throw new Error("Le site choisi n’appartient pas à cette localité.");
    }
    const periodLabel = data.period ?? (data.period_start || data.period_end ? `${data.period_start ?? "?"} → ${data.period_end ?? "?"}` : null);
    const base = { locality_id: data.locality_id, resource_type: "solar", source: data.source, reference: data.reference, period: periodLabel, quality: data.quality, notes: data.notes, validation_status: legacyStatus(data.status) };
    let id = data.id;
    if (id) {
      const { error } = await sb.from("energy_resources").update(base).eq("id", id);
      if (error) throw new Error("Modification refusée.");
    } else {
      const { data: created, error } = await sb.from("energy_resources").insert({ ...base, owner_id: context.userId }).select("id, owner_id").single();
      if (error || !created) throw new Error("Création refusée.");
      id = created.id as string;
    }
    const { data: owner } = await sb.from("energy_resources").select("owner_id").eq("id", id).single();
    const detail = {
      resource_id: id, owner_id: owner.owner_id, site_id: data.site_id,
      ghi_kwh_m2_day: data.ghi, dni_kwh_m2_day: data.dni, dhi_kwh_m2_day: data.dhi, annual_irradiation_kwh_m2: data.annual,
      avg_temperature_c: data.tavg, min_temperature_c: data.tmin, max_temperature_c: data.tmax, sunshine_hours: data.sunshine,
      ghi_unit: data.ghiUnit, dni_unit: data.dniUnit, dhi_unit: data.dhiUnit, sunshine_unit: data.sunshineUnit,
      data_nature: data.data_nature, acquisition_method: data.acquisition_method, collected_on: data.collected_on,
      period_start: data.period_start, period_end: data.period_end, solar_status: data.status,
    };
    const { error: de } = await sb.from("solar_resources").upsert(detail, { onConflict: "resource_id" });
    if (de) throw new Error("Les valeurs solaires n’ont pas pu être enregistrées.");
    return { id };
  });

export const setSolarStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(Object.keys(SOLAR_STATUSES) as [keyof typeof SOLAR_STATUSES]) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: upd, error } = await sb.from("solar_resources").update({ solar_status: data.status }).eq("resource_id", data.id).select("id");
    if (error || !upd?.length) throw new Error("Changement de statut refusé (droits insuffisants).");
    await sb.from("energy_resources").update({ validation_status: legacyStatus(data.status) }).eq("id", data.id);
    return { ok: true };
  });

export const deleteSolar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await sb.from("resource_pre_analyses").delete().eq("resource_id", data.id);
    await sb.from("solar_resources").delete().eq("resource_id", data.id);
    const { data: del, error } = await sb.from("energy_resources").delete().eq("id", data.id).select("id");
    if (error || !del?.length) throw new Error("Suppression refusée (droits insuffisants).");
    return { ok: true };
  });

/** Standardised inputs for the future engine. Validated datasets only by default. */
export const getSolarEngineInputs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ localityId: z.string().uuid(), includeProvisional: z.boolean().default(false) }).parse(i))
  .handler(async ({ data, context }): Promise<SolarResourceInput[]> => {
    const { data: rows } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "solar").eq("locality_id", data.localityId);
    return ((rows ?? []) as any[]).map(flatten).filter((r: SolarRow) => data.includeProvisional ? r.status !== "rejected" && r.status !== "archived" : r.status === "validated").map((r: SolarRow) => ({
      datasetId: r.id, localityId: r.locality_id, siteId: r.site_id,
      latitude: r.site_latitude ?? r.latitude, longitude: r.site_longitude ?? r.longitude,
      ghi: { value: r.ghi, unit: r.ghiUnit }, dni: { value: r.dni, unit: r.dniUnit }, dhi: { value: r.dhi, unit: r.dhiUnit },
      temperatureC: { avg: r.tavg, min: r.tmin, max: r.tmax },
      period: { start: r.period_start, end: r.period_end, label: r.period },
      source: r.source, reference: r.reference, dataNature: r.data_nature, quality: r.quality, status: r.status,
    }));
  });
