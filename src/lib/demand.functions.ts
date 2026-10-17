import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CATEGORIES, METHODS, PRIORITIES, STATUSES, SUPPLY_SOURCES, equipmentErrors, measurementErrors, profileErrors } from "@/features/demand/demand-engine";
import type { Equipment, Measurement, ProfileSlot, Supply } from "@/features/demand/demand-engine";

const SELECT = `*, localities(id, name, departments(id, name, regions(id, name, countries(id, name)))), study_sites(id, name), energy_demand_equipment(*)`;

function flatten(r: any) {
  const loc = r.localities ?? {};
  const num = (x: any) => (x == null ? null : Number(x));
  const eq = ((r.energy_demand_equipment ?? []) as any[]).sort((a, b) => a.sort_order - b.sort_order).map((e): Equipment & { id: string } => ({
    id: e.id, name: e.name, category: e.category, quantity: num(e.quantity), unit_power: num(e.unit_power), power_unit: e.power_unit,
    hours_per_day: num(e.hours_per_day), days_per_week: num(e.days_per_week), usage_factor: num(e.usage_factor),
    usage_factor_definition: e.usage_factor_definition, usage_factor_source: e.usage_factor_source, priority: e.priority, notes: e.notes,
  }));
  return {
    id: r.id as string, owner_id: r.owner_id as string, name: r.name as string, locality_id: r.locality_id as string, site_id: (r.site_id ?? null) as string | null,
    locality_name: (loc.name ?? null) as string | null, department: (loc.departments?.name ?? null) as string | null,
    department_id: (loc.departments?.id ?? null) as string | null, region: (loc.departments?.regions?.name ?? null) as string | null,
    region_id: (loc.departments?.regions?.id ?? null) as string | null, country: (loc.departments?.regions?.countries?.name ?? null) as string | null,
    country_id: (loc.departments?.regions?.countries?.id ?? null) as string | null, site_name: (r.study_sites?.name ?? null) as string | null,
    category: r.consumer_category as keyof typeof CATEGORIES, consumer_detail: r.consumer_detail as string | null, consumer_name: r.consumer_name as string | null,
    users_count: num(r.users_count), description: r.description as string | null, period_start: r.period_start as string | null, period_end: r.period_end as string | null,
    measurements: (r.measurements ?? []) as Measurement[], measured_peak_kw: num(r.measured_peak_kw), daily_profile: (r.daily_profile ?? []) as ProfileSlot[],
    weekday_variation: r.weekday_variation as string | null, seasonal_variation: r.seasonal_variation as string | null, has_history: r.has_history as boolean | null,
    criticality: r.criticality as string | null, growth_rate_pct: num(r.growth_rate_pct), assumptions: r.assumptions as string | null,
    supply: (r.supply ?? {}) as Supply, source: (r.source ?? "") as string, reference: r.reference as string | null,
    acquisition_method: r.acquisition_method as string | null, data_time_basis: r.data_time_basis as string | null, collected_by: r.collected_by as string | null,
    comments: r.comments as string | null, status: r.demand_status as keyof typeof STATUSES, created_at: r.created_at as string, updated_at: r.updated_at as string,
    equipment: eq,
  };
}
export type DemandRow = ReturnType<typeof flatten>;

async function access(sb: any, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  const isAdmin = roles.includes("admin");
  return { userId, isAdmin, canWrite: isAdmin || roles.includes("engineer") || roles.includes("analyst"), canValidate: isAdmin || roles.includes("engineer") };
}

export const getDemandAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => access(context.supabase, context.userId));

export const listDemands = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("energy_demands").select(SELECT).order("updated_at", { ascending: false });
  if (error) throw new Error("Les demandes n’ont pas pu être chargées.");
  return ((data ?? []) as any[]).map(flatten);
});

export const getDemand = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("energy_demands").select(SELECT).eq("id", data.id).maybeSingle();
    if (error) throw new Error("La demande n’a pas pu être chargée.");
    if (!row) return null;
    const { data: hist } = await sb.from("energy_demand_history").select("id, action, changes, actor_id, created_at").eq("demand_id", data.id).order("created_at", { ascending: false }).limit(50);
    return { item: flatten(row), history: ((hist ?? []) as any[]).map((h) => ({ id: h.id as string, action: h.action as string, fields: Object.keys(h.changes ?? {}) as string[], created_at: h.created_at as string })) };
  });

export const getLocalityDemands = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ localityId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any).from("energy_demands").select(SELECT).eq("locality_id", data.localityId).order("updated_at", { ascending: false });
    if (error) throw new Error("Les demandes de la localité n’ont pas pu être chargées.");
    return ((rows ?? []) as any[]).map(flatten);
  });

export const getDemandOptions = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase as any;
  const [c, r, d, l, s] = await Promise.all([
    sb.from("countries").select("id, name").order("name"), sb.from("regions").select("id, name, country_id").order("name"),
    sb.from("departments").select("id, name, region_id").order("name"), sb.from("localities").select("id, name, department_id").order("name").limit(5000),
    sb.from("study_sites").select("id, name, locality_id").order("name"),
  ]);
  if (c.error || r.error || d.error || l.error || s.error) throw new Error("Le référentiel territorial n’a pas pu être chargé.");
  return { countries: c.data as { id: string; name: string }[], regions: r.data as { id: string; name: string; country_id: string }[], departments: d.data as { id: string; name: string; region_id: string }[], localities: l.data as { id: string; name: string; department_id: string | null }[], sites: s.data as { id: string; name: string; locality_id: string | null }[] };
});

const t = (max: number) => z.string().trim().max(max).nullable();
const n = z.number().finite().nullable();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const equipmentSchema = z.object({ name: z.string().trim().max(200), category: t(200), quantity: n, unit_power: n, power_unit: z.enum(["W", "kW"]), hours_per_day: n, days_per_week: n, usage_factor: n, usage_factor_definition: t(500), usage_factor_source: t(500), priority: z.enum(Object.keys(PRIORITIES) as [keyof typeof PRIORITIES]), notes: t(1000) });
const saveSchema = z.object({
  id: z.string().uuid().nullable(), name: z.string().trim().min(2, "Le nom de l’étude est obligatoire.").max(200),
  category: z.enum(Object.keys(CATEGORIES) as [keyof typeof CATEGORIES]), consumer_detail: t(300), consumer_name: t(300),
  locality_id: z.string().uuid({ message: "Sélectionnez une localité." }), site_id: z.string().uuid().nullable(),
  users_count: z.number().int().min(0).nullable(), description: t(4000), period_start: date, period_end: date,
  equipment: z.array(equipmentSchema).max(500),
  measurements: z.array(z.object({ start: z.string(), end: z.string(), energy: z.number().finite(), unit: z.enum(["Wh", "kWh"]), peak_kw: n, notes: t(500) })).max(500),
  measured_peak_kw: z.number().finite().min(0, "La puissance maximale mesurée doit être positive ou nulle.").nullable(), daily_profile: z.array(z.object({ start_hour: z.number(), end_hour: z.number(), power_kw: z.number(), nature: z.enum(["measured", "estimated"]) })).max(96),
  weekday_variation: t(2000), seasonal_variation: t(2000), has_history: z.boolean().nullable(), criticality: t(200), growth_rate_pct: z.number().finite().gt(-100).max(1000).nullable(), assumptions: t(4000),
  supply: z.object({
    current_source: z.enum(Object.keys(SUPPLY_SOURCES) as [keyof typeof SUPPLY_SOURCES]).nullable().optional(),
    reliability: t(500).optional(), outage_hours: z.number().finite().min(0).max(24, "Les heures de coupure doivent être comprises entre 0 et 24.").nullable().optional(),
    has_genset: z.boolean().nullable().optional(), existing_installation: t(500).optional(), autonomy: t(500).optional(), load_shedding: t(500).optional(), critical_loads: t(500).optional(), site_constraints: t(2000).optional(),
  }).passthrough(), source: z.string().trim().min(2, "La source des données est obligatoire.").max(500), reference: t(500),
  acquisition_method: z.enum(Object.keys(METHODS) as [keyof typeof METHODS]).nullable(), data_time_basis: t(200), collected_by: t(200), comments: t(4000),
  status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES]),
});
export type DemandInput = z.infer<typeof saveSchema>;

export const saveDemand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const a = await access(sb, context.userId);
    if (!a.canWrite) throw new Error("Votre rôle ne permet pas de saisir des demandes.");
    if (["validated", "rejected"].includes(data.status) && !a.canValidate) throw new Error("Seuls les administrateurs et ingénieurs peuvent valider ou rejeter.");
    if (data.category === "autre" && !data.consumer_detail) throw new Error("Précisez le type de consommateur pour « Autre ».");
    if (data.period_start && data.period_end && data.period_end < data.period_start) throw new Error("La fin de la période précède son début.");
    if (data.site_id) {
      const { data: site } = await sb.from("study_sites").select("locality_id").eq("id", data.site_id).maybeSingle();
      if (!site) throw new Error("Le site d’étude sélectionné est introuvable.");
      if (site.locality_id !== data.locality_id) throw new Error("Le site d’étude n’appartient pas à la localité sélectionnée.");
    }
    const errs = [...data.equipment.flatMap((e, i) => equipmentErrors(e as Equipment, i)), ...measurementErrors(data.measurements as Measurement[]), ...profileErrors(data.daily_profile as ProfileSlot[])];
    if (data.growth_rate_pct != null && !data.assumptions) errs.push("Une croissance prévisionnelle doit être accompagnée de son hypothèse.");
    if (errs.length) throw new Error(errs.join(" "));
    const row = {
      name: data.name, consumer_category: data.category, consumer_detail: data.consumer_detail, consumer_name: data.consumer_name, sector: CATEGORIES[data.category],
      locality_id: data.locality_id, site_id: data.site_id, users_count: data.users_count, description: data.description, period_start: data.period_start, period_end: data.period_end,
      study_year: data.period_start ? Number(data.period_start.slice(0, 4)) : null, measurements: data.measurements, measured_peak_kw: data.measured_peak_kw,
      peak_power_kw: data.measured_peak_kw, daily_profile: data.daily_profile, weekday_variation: data.weekday_variation, seasonal_variation: data.seasonal_variation,
      has_history: data.has_history, criticality: data.criticality, growth_rate_pct: data.growth_rate_pct, assumptions: data.assumptions, supply: data.supply,
      source: data.source, reference: data.reference, acquisition_method: data.acquisition_method, data_time_basis: data.data_time_basis, collected_by: data.collected_by,
      comments: data.comments, demand_status: data.status,
    };
    let id = data.id, owner = context.userId;
    if (id) {
      const { data: cur } = await sb.from("energy_demands").select("owner_id").eq("id", id).maybeSingle();
      if (!cur) throw new Error("Demande introuvable.");
      owner = cur.owner_id;
      const { data: upd, error } = await sb.from("energy_demands").update(row).eq("id", id).select("id");
      if (error) throw new Error(error.message.includes("valider") ? error.message : "La demande n’a pas pu être modifiée (droits insuffisants ?).");
      if (!upd?.length) throw new Error("La demande n’a pas pu être modifiée (droits insuffisants ?).");
      const { error: de } = await sb.from("energy_demand_equipment").delete().eq("demand_id", id);
      if (de) throw new Error("Les équipements n’ont pas pu être mis à jour.");
    } else {
      const { data: ins, error } = await sb.from("energy_demands").insert({ ...row, owner_id: owner }).select("id").single();
      if (error) throw new Error("La demande n’a pas pu être enregistrée (droits insuffisants ?).");
      id = ins.id;
    }
    if (data.equipment.length) {
      const { error } = await sb.from("energy_demand_equipment").insert(data.equipment.map((e, i) => ({ ...e, demand_id: id, owner_id: owner, sort_order: i })));
      if (error) throw new Error("Les équipements n’ont pas pu être enregistrés.");
    }
    return { id: id as string };
  });

export const setDemandStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES]) }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await access(context.supabase, context.userId);
    if (!a.canWrite || (["validated", "rejected"].includes(data.status) && !a.canValidate)) throw new Error("Votre rôle ne permet pas ce changement de statut.");
    const { data: upd, error } = await (context.supabase as any).from("energy_demands").update({ demand_status: data.status }).eq("id", data.id).select("id");
    if (error || !upd?.length) throw new Error("Le statut n’a pas pu être modifié (droits insuffisants ?).");
    return { ok: true };
  });

export const deleteDemand = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const a = await access(context.supabase, context.userId);
    if (!a.canWrite) throw new Error("Votre rôle ne permet pas de supprimer des demandes.");
    const { data: del, error } = await (context.supabase as any).from("energy_demands").delete().eq("id", data.id).select("id");
    if (error || !del?.length) throw new Error("La demande n’a pas pu être supprimée (droits insuffisants ?).");
    return { ok: true };
  });
