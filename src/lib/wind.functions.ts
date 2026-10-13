import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { WIND_NATURES, WIND_STATUSES, windErrors, type WindBin, type WindSample } from "@/features/resources/wind/wind-model";

const SELECT = `id, owner_id, locality_id, source, period, reference, quality, notes, validation_status, created_at, updated_at,
  localities(id, name, latitude, longitude, departments(name, regions(name, countries(name)))),
  wind_resources(*, study_sites(id, name))`;

export type WindRow = ReturnType<typeof flatten>;

function flatten(r: any) {
  const w = (Array.isArray(r.wind_resources) ? r.wind_resources[0] : r.wind_resources) ?? {};
  const loc = r.localities ?? {};
  const num = (x: any) => (x === null || x === undefined ? null : Number(x));
  return {
    id: r.id as string, owner_id: r.owner_id as string, locality_id: r.locality_id as string,
    locality_name: (loc.name ?? null) as string | null,
    department: (loc.departments?.name ?? null) as string | null,
    region: (loc.departments?.regions?.name ?? null) as string | null,
    country: (loc.departments?.regions?.countries?.name ?? null) as string | null,
    site_id: (w.site_id ?? null) as string | null, site_name: (w.study_sites?.name ?? null) as string | null,
    source: r.source as string, reference: r.reference as string | null, period: r.period as string | null,
    quality: r.quality as string | null, notes: r.notes as string | null, updated_at: r.updated_at as string,
    avg: num(w.average_speed_ms), max: num(w.maximum_speed_ms), height: num(w.measurement_height_m), direction: num(w.direction_deg),
    density: num(w.air_density_kg_m3), cf: num(w.capacity_factor_pct), cf_method: (w.capacity_factor_method ?? null) as string | null,
    timeseries: (w.timeseries ?? null) as WindSample[] | null, distribution: (w.speed_distribution ?? null) as WindBin[] | null,
    data_nature: (w.data_nature ?? "measured") as keyof typeof WIND_NATURES, acquisition_method: (w.acquisition_method ?? null) as string | null,
    collected_on: (w.collected_on ?? null) as string | null, period_start: (w.period_start ?? null) as string | null, period_end: (w.period_end ?? null) as string | null,
    status: (w.wind_status ?? "unverified") as keyof typeof WIND_STATUSES,
  };
}

async function roles(sb: any, userId: string): Promise<string[]> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  return (data ?? []).map((r: any) => r.role);
}

export const listWind = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "wind").order("updated_at", { ascending: false });
  if (error) throw new Error("Les données éoliennes n’ont pas pu être chargées.");
  return ((data ?? []) as any[]).map(flatten);
});

export const getWind = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("energy_resources").select(SELECT).eq("id", data.id).eq("resource_type", "wind").maybeSingle();
    if (error) throw new Error("Le jeu de données n’a pas pu être chargé.");
    if (!row) return null;
    const item = flatten(row);
    const { data: sib } = await sb.from("energy_resources").select(SELECT).eq("resource_type", "wind").eq("locality_id", item.locality_id).order("created_at");
    return { item, siblings: ((sib ?? []) as any[]).map(flatten) };
  });

export const getLocalityWind = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ localityId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "wind").eq("locality_id", data.localityId).order("created_at", { ascending: false });
    return ((rows ?? []) as any[]).map(flatten);
  });

const n = z.number().finite().nullable();
const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const saveSchema = z.object({
  id: z.string().uuid().nullable(),
  locality_id: z.string().uuid({ message: "Sélectionnez une localité." }),
  site_id: z.string().uuid().nullable(),
  avg: n, max: n, height: n, direction: n, density: n, cf: n,
  cf_method: z.string().trim().max(500).nullable(),
  timeseries: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}/), speed_ms: z.number().finite(), direction_deg: z.number().finite().nullable() })).max(20000),
  distribution: z.array(z.object({ min_ms: z.number().finite(), max_ms: z.number().finite(), frequency_pct: z.number().finite() })).max(200),
  source: z.string().trim().min(2, "La source est obligatoire.").max(500),
  reference: z.string().trim().max(500).nullable(),
  period_start: d, period_end: d,
  data_nature: z.enum(Object.keys(WIND_NATURES) as [keyof typeof WIND_NATURES]),
  acquisition_method: z.string().trim().max(300).nullable(),
  collected_on: d,
  quality: z.string().trim().max(200).nullable(),
  status: z.enum(Object.keys(WIND_STATUSES) as [keyof typeof WIND_STATUSES]),
  notes: z.string().trim().max(4000).nullable(),
});

const legacy = (s: string) => (s === "validated" ? "validated" : s === "rejected" ? "rejected" : "pending");

export const saveWind = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const errs = windErrors({ ...data, periodStart: data.period_start, periodEnd: data.period_end });
    if (errs.length) throw new Error(errs.join(" "));
    if (data.cf !== null && !data.cf_method) throw new Error("Indiquez la méthode et l’origine du facteur de capacité.");
    const r = await roles(sb, context.userId);
    if (!r.includes("admin") && !r.includes("engineer")) throw new Error("Votre rôle (lecture seule) ne permet pas d’enregistrer des données.");
    if (data.site_id) {
      const { data: site } = await sb.from("study_sites").select("locality_id").eq("id", data.site_id).maybeSingle();
      if (!site || (site.locality_id && site.locality_id !== data.locality_id)) throw new Error("Le site choisi n’appartient pas à cette localité.");
    }
    const period = data.period_start || data.period_end ? `${data.period_start ?? "?"} → ${data.period_end ?? "?"}` : null;
    const base = { locality_id: data.locality_id, resource_type: "wind", source: data.source, reference: data.reference, period, quality: data.quality, notes: data.notes, validation_status: legacy(data.status) };
    let id = data.id;
    if (id) {
      const { data: upd, error } = await sb.from("energy_resources").update(base).eq("id", id).select("id");
      if (error || !upd?.length) throw new Error("Modification refusée (droits insuffisants).");
    } else {
      const { data: created, error } = await sb.from("energy_resources").insert({ ...base, owner_id: context.userId }).select("id").single();
      if (error || !created) throw new Error("Création refusée.");
      id = created.id as string;
    }
    const { data: owner } = await sb.from("energy_resources").select("owner_id").eq("id", id).single();
    const detail = {
      resource_id: id, owner_id: owner.owner_id, site_id: data.site_id,
      average_speed_ms: data.avg, maximum_speed_ms: data.max, measurement_height_m: data.height, direction_deg: data.direction,
      air_density_kg_m3: data.density, capacity_factor_pct: data.cf, capacity_factor_method: data.cf_method,
      timeseries: data.timeseries.length ? data.timeseries : null, speed_distribution: data.distribution.length ? data.distribution : null,
      data_nature: data.data_nature, acquisition_method: data.acquisition_method, collected_on: data.collected_on,
      period_start: data.period_start, period_end: data.period_end, wind_status: data.status,
    };
    const { data: existing } = await sb.from("wind_resources").select("id").eq("resource_id", id).maybeSingle();
    const { error: de } = existing ? await sb.from("wind_resources").update(detail).eq("id", existing.id) : await sb.from("wind_resources").insert(detail);
    if (de) throw new Error("Les valeurs de vent n’ont pas pu être enregistrées.");
    return { id };
  });

export const setWindStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(Object.keys(WIND_STATUSES) as [keyof typeof WIND_STATUSES]) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: upd, error } = await sb.from("wind_resources").update({ wind_status: data.status }).eq("resource_id", data.id).select("id");
    if (error || !upd?.length) throw new Error("Changement de statut refusé (droits insuffisants).");
    await sb.from("energy_resources").update({ validation_status: legacy(data.status) }).eq("id", data.id);
    return { ok: true };
  });

export const deleteWind = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { count } = await sb.from("project_energy_production").select("id", { count: "exact", head: true }).eq("resource_id", data.id);
    if (count) throw new Error("Ce jeu est utilisé par une estimation de projet : archivez-le plutôt que de le supprimer.");
    await sb.from("resource_pre_analyses").delete().eq("resource_id", data.id);
    await sb.from("wind_resources").delete().eq("resource_id", data.id);
    const { data: del, error } = await sb.from("energy_resources").delete().eq("id", data.id).select("id");
    if (error || !del?.length) throw new Error("Suppression refusée (droits insuffisants).");
    return { ok: true };
  });
