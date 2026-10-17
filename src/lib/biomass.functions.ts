import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { AVAILABILITY_LEVELS, BIOMASS_NATURES, BIOMASS_STATUSES, BIOMASS_TYPES, QUANTITY_UNITS, biomassErrors, type AvailabilityKey } from "@/features/resources/biomass/biomass-model";

const SELECT = `id, owner_id, locality_id, source, period, reference, quality, notes, validation_status, created_at, updated_at,
  localities(id, name, departments(name, regions(name, countries(name)))),
  biomass_resources(*, study_sites(id, name))`;

export type BiomassRow = ReturnType<typeof flatten>;

function flatten(r: any) {
  const b = (Array.isArray(r.biomass_resources) ? r.biomass_resources[0] : r.biomass_resources) ?? {};
  const loc = r.localities ?? {};
  const num = (x: any) => (x === null || x === undefined ? null : Number(x));
  return {
    id: r.id as string, owner_id: r.owner_id as string, locality_id: r.locality_id as string,
    locality_name: (loc.name ?? null) as string | null, department: (loc.departments?.name ?? null) as string | null,
    region: (loc.departments?.regions?.name ?? null) as string | null, country: (loc.departments?.regions?.countries?.name ?? null) as string | null,
    site_id: (b.site_id ?? null) as string | null, site_name: (b.study_sites?.name ?? null) as string | null,
    source: r.source as string, reference: r.reference as string | null, period: r.period as string | null,
    quality: r.quality as string | null, notes: r.notes as string | null, updated_at: r.updated_at as string, created_at: r.created_at as string,
    type: (b.biomass_type ?? "Autre") as string, type_detail: (b.biomass_type_detail ?? null) as string | null,
    quantity: num(b.annual_quantity_t), unit: (b.quantity_unit ?? "t/an") as string, availability_period: (b.availability_period ?? null) as string | null,
    levels: (b.availability_levels ?? {}) as Partial<Record<AvailabilityKey, number | null>>, seasonal: (b.seasonal_availability ?? null) as number[] | null,
    constraints: (b.constraints ?? null) as string | null, fraction: num(b.exploitable_fraction_pct),
    moisture: num(b.moisture_pct), lhv: num(b.calorific_value_mj_kg), lhv_basis: (b.lhv_basis ?? null) as "as_received" | "dry" | null, lhv_method: (b.lhv_method ?? null) as string | null,
    potential: num(b.energy_potential_mwh), potential_source: (b.energy_potential_source ?? null) as string | null,
    data_nature: (b.data_nature ?? "measured") as keyof typeof BIOMASS_NATURES, acquisition_method: (b.acquisition_method ?? null) as string | null,
    collected_on: (b.collected_on ?? null) as string | null, period_start: (b.period_start ?? null) as string | null, period_end: (b.period_end ?? null) as string | null,
    status: (b.biomass_status ?? "unverified") as keyof typeof BIOMASS_STATUSES,
  };
}

export const listBiomass = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "biomass").order("updated_at", { ascending: false });
  if (error) throw new Error("Les données de biomasse n’ont pas pu être chargées.");
  return ((data ?? []) as any[]).map(flatten);
});

export const getBiomass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("energy_resources").select(SELECT).eq("id", data.id).eq("resource_type", "biomass").maybeSingle();
    if (error) throw new Error("Le jeu de données n’a pas pu être chargé.");
    if (!row) return null;
    const item = flatten(row);
    const { data: sib } = await sb.from("energy_resources").select(SELECT).eq("resource_type", "biomass").eq("locality_id", item.locality_id).order("created_at");
    return { item, siblings: ((sib ?? []) as any[]).map(flatten) };
  });

export const getLocalityBiomass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ localityId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows } = await (context.supabase as any).from("energy_resources").select(SELECT).eq("resource_type", "biomass").eq("locality_id", data.localityId).order("created_at", { ascending: false });
    return ((rows ?? []) as any[]).map(flatten);
  });

const n = z.number().finite().nullable();
const d = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable();
const t = (max: number) => z.string().trim().max(max).nullable();
const saveSchema = z.object({
  id: z.string().uuid().nullable(),
  locality_id: z.string().uuid({ message: "Sélectionnez une localité." }),
  site_id: z.string().uuid().nullable(),
  type: z.enum(BIOMASS_TYPES), type_detail: t(300),
  quantity: n, unit: z.enum(QUANTITY_UNITS), availability_period: t(300),
  levels: z.object(Object.fromEntries(Object.keys(AVAILABILITY_LEVELS).map((k) => [k, n.optional()])) as Record<AvailabilityKey, z.ZodOptional<typeof n>>),
  seasonal: z.array(z.number().int().min(1).max(12)).max(12),
  constraints: t(4000), fraction: n, moisture: n, lhv: n, lhv_basis: z.enum(["as_received", "dry"]).nullable(), lhv_method: t(500),
  potential: n, potential_source: t(500),
  source: z.string().trim().min(2, "La source est obligatoire.").max(500), reference: t(500),
  period_start: d, period_end: d,
  data_nature: z.enum(Object.keys(BIOMASS_NATURES) as [keyof typeof BIOMASS_NATURES]),
  acquisition_method: t(300), collected_on: d, quality: t(200),
  status: z.enum(Object.keys(BIOMASS_STATUSES) as [keyof typeof BIOMASS_STATUSES]),
  notes: t(4000),
});

const legacy = (s: string) => (s === "validated" ? "validated" : s === "rejected" ? "rejected" : "pending");

export const saveBiomass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => saveSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const errs = biomassErrors({ quantity: data.quantity, unit: data.unit, moisture: data.moisture, lhv: data.lhv, lhvBasis: data.lhv_basis, fraction: data.fraction, potential: data.potential, potentialSource: data.potential_source, periodStart: data.period_start, periodEnd: data.period_end, levels: data.levels, seasonal: data.seasonal });
    if (errs.length) throw new Error(errs.join(" "));
    const { data: roles } = await sb.from("user_roles").select("role").eq("user_id", context.userId);
    const r = (roles ?? []).map((x: any) => x.role);
    if (!r.includes("admin") && !r.includes("engineer")) throw new Error("Votre rôle (lecture seule) ne permet pas d’enregistrer des données.");
    const { data: loc } = await sb.from("localities").select("id").eq("id", data.locality_id).maybeSingle();
    if (!loc) throw new Error("La localité choisie n’existe pas.");
    if (data.site_id) {
      const { data: site } = await sb.from("study_sites").select("locality_id").eq("id", data.site_id).maybeSingle();
      if (!site || (site.locality_id && site.locality_id !== data.locality_id)) throw new Error("Le site choisi n’appartient pas à cette localité.");
    }
    const period = data.period_start || data.period_end ? `${data.period_start ?? "?"} → ${data.period_end ?? "?"}` : null;
    const base = { locality_id: data.locality_id, resource_type: "biomass", source: data.source, reference: data.reference, period, quality: data.quality, notes: data.notes, validation_status: legacy(data.status) };
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
    const levels = Object.fromEntries(Object.entries(data.levels).filter(([, v]) => v !== null && v !== undefined));
    const detail = {
      resource_id: id, owner_id: owner.owner_id, site_id: data.site_id, biomass_type: data.type, biomass_type_detail: data.type_detail,
      annual_quantity_t: data.quantity, quantity_unit: data.unit, availability_period: data.availability_period, availability_levels: levels,
      seasonal_availability: data.seasonal.length ? [...new Set(data.seasonal)].sort((a, b) => a - b) : null, constraints: data.constraints,
      exploitable_fraction_pct: data.fraction, moisture_pct: data.moisture, calorific_value_mj_kg: data.lhv, lhv_basis: data.lhv_basis, lhv_method: data.lhv_method,
      energy_potential_mwh: data.potential, energy_potential_source: data.potential_source, data_nature: data.data_nature, acquisition_method: data.acquisition_method,
      collected_on: data.collected_on, period_start: data.period_start, period_end: data.period_end, biomass_status: data.status,
    };
    const { data: existing } = await sb.from("biomass_resources").select("id").eq("resource_id", id).maybeSingle();
    const { error: de } = existing ? await sb.from("biomass_resources").update(detail).eq("id", existing.id) : await sb.from("biomass_resources").insert(detail);
    if (de) {
      console.error("biomass detail", de);
      // Compensation : ne pas laisser un parent créé sans ses caractéristiques.
      if (!data.id) await sb.from("energy_resources").delete().eq("id", id);
      throw new Error("Les caractéristiques de biomasse n’ont pas pu être enregistrées.");
    }
    return { id };
  });

export const setBiomassStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(Object.keys(BIOMASS_STATUSES) as [keyof typeof BIOMASS_STATUSES]) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (data.status === "validated") {
      const { data: row } = await sb.from("energy_resources").select(SELECT).eq("id", data.id).eq("resource_type", "biomass").maybeSingle();
      const item = row ? flatten(row) : null;
      if (!item) throw new Error("Le jeu de données est introuvable.");
      const missing: string[] = [];
      if (!item.source || item.source.trim().length < 2) missing.push("la source");
      if (!item.period_start || !item.period_end) missing.push("la période des données (début et fin)");
      if (item.quantity === null) missing.push("la quantité disponible");
      if (item.lhv !== null && !item.lhv_basis) missing.push("la base de mesure du PCI");
      if (missing.length) throw new Error(`Validation refusée : renseignez d’abord ${missing.join(", ")}. Une ressource ne peut pas être validée sans ces éléments.`);
    }
    const { data: upd, error } = await sb.from("biomass_resources").update({ biomass_status: data.status }).eq("resource_id", data.id).select("id");
    if (error || !upd?.length) throw new Error("Changement de statut refusé (droits insuffisants).");
    await sb.from("energy_resources").update({ validation_status: legacy(data.status) }).eq("id", data.id);
    return { ok: true };
  });

export const deleteBiomass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { count } = await sb.from("project_energy_production").select("id", { count: "exact", head: true }).eq("resource_id", data.id);
    if (count) throw new Error("Ce jeu est utilisé par une estimation de projet : archivez-le plutôt que de le supprimer.");
    await sb.from("resource_pre_analyses").delete().eq("resource_id", data.id);
    await sb.from("biomass_resources").delete().eq("resource_id", data.id);
    const { data: del, error } = await sb.from("energy_resources").delete().eq("id", data.id).select("id");
    if (error || !del?.length) throw new Error("Suppression refusée (droits insuffisants).");
    return { ok: true };
  });
