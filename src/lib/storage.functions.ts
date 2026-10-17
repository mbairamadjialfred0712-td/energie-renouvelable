import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { APPLICATIONS, CHEMISTRIES, FIELDS, METHODS, STATUSES, configErrors, sheetErrors, statusChangeErrors, type Sheet } from "@/features/storage/battery-model";

async function access(sb: any, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  const isAdmin = roles.includes("admin");
  return { userId, isAdmin, canWrite: isAdmin || roles.includes("engineer") };
}
const norm = (r: any) => { const o: Record<string, string | number | boolean | null> = {}; for (const [k, x] of Object.entries(r)) if (typeof x !== "object" || x === null) o[k] = x as any; return o as Sheet & { id: string; owner_id: string; created_at: string; updated_at: string }; };

export const getStorageAccess = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => access(context.supabase, context.userId));

export const listDatasheets = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("battery_datasheets").select("*").order("updated_at", { ascending: false });
  if (error) throw new Error("La bibliothèque n’a pas pu être chargée.");
  return ((data ?? []) as any[]).map(norm);
});

export const getDatasheet = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("battery_datasheets").select("*").eq("id", data.id).maybeSingle();
    if (error) throw new Error("La fiche n’a pas pu être chargée.");
    if (!row) return null;
    const { data: hist } = await sb.from("battery_datasheet_history").select("id, action, fields, created_at").eq("datasheet_id", data.id).order("created_at", { ascending: false }).limit(50);
    return { item: norm(row), history: (hist ?? []) as { id: string; action: string; fields: string[]; created_at: string }[] };
  });

const fieldShape: Record<string, z.ZodTypeAny> = {};
for (const f of FIELDS) fieldShape[f.key] = f.kind === "bool" ? z.boolean().nullable() : ["num", "int", "pct"].includes(f.kind) ? z.number().nullable() : z.string().trim().max(4000).nullable();
const sheetSchema = z.object({
  id: z.string().uuid().nullable(), name: z.string().trim().max(200), manufacturer: z.string().trim().max(200),
  chemistry: z.enum(Object.keys(CHEMISTRIES) as [keyof typeof CHEMISTRIES]), application: z.enum(Object.keys(APPLICATIONS) as [keyof typeof APPLICATIONS]).nullable(),
  source: z.string().trim().max(500), acquisition_method: z.enum(Object.keys(METHODS) as [keyof typeof METHODS]).nullable(),
  status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES]), ...fieldShape,
});

export const saveDatasheet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => sheetSchema.parse(i) as Sheet & { id: string | null })
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await access(sb, context.userId)).canWrite) throw new Error("Seuls les administrateurs et ingénieurs peuvent saisir des fiches.");
    const errs = sheetErrors(data); if (errs.length) throw new Error(errs.join(" "));
    const { id, ...row } = data;
    if (id) {
      const { data: up, error } = await sb.from("battery_datasheets").update(row).eq("id", id).select("id");
      if (error || !up?.length) throw new Error("La fiche n’a pas pu être modifiée (droits insuffisants ?).");
      return { id: id as string };
    }
    const { data: tech } = await sb.from("technologies").select("id").eq("code", "BATTERY").maybeSingle();
    const { data: ins, error } = await sb.from("battery_datasheets").insert({ ...row, owner_id: context.userId, technology_id: tech?.id ?? null }).select("id").single();
    if (error) throw new Error("La fiche n’a pas pu être enregistrée.");
    return { id: ins.id as string };
  });

const statusSchema = z.object({ id: z.string().uuid(), status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES]) });
/** Changement de statut dédié : réservé admin/ingénieur, « validé » exige la fiche complète (source + méthode + caractéristique électrique). */
export const setDatasheetStatus = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => statusSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await access(sb, context.userId)).canWrite) throw new Error("Seuls les administrateurs et ingénieurs peuvent changer le statut d’une fiche.");
    const { data: row, error } = await sb.from("battery_datasheets").select("*").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("La fiche est introuvable ou inaccessible.");
    const errs = statusChangeErrors(norm(row), row.status, data.status);
    if (errs.length) throw new Error(errs.join(" "));
    const { data: up, error: e2 } = await sb.from("battery_datasheets").update({ status: data.status }).eq("id", data.id).select("id");
    if (e2 || !up?.length) throw new Error(e2?.message || "Le statut n’a pas pu être modifié (droits insuffisants ?).");
    return { ok: true };
  });

export const deleteDatasheet = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: d, error } = await (context.supabase as any).from("battery_datasheets").delete().eq("id", data.id).select("id");
    if (error?.code === "23503") throw new Error("Cette fiche est utilisée par une configuration de projet : archivez-la plutôt.");
    if (error || !d?.length) throw new Error("La fiche n’a pas pu être supprimée (droits insuffisants ?).");
    return { ok: true };
  });

export const getProjectStorage = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: project }, { data: cfgs, error }] = await Promise.all([
      sb.from("projects").select("id, name, owner_id").eq("id", data.projectId).maybeSingle(),
      sb.from("project_storage_configs").select("*, battery_datasheets(*)").eq("project_id", data.projectId).order("created_at"),
    ]);
    if (error) throw new Error("Les configurations n’ont pas pu être chargées.");
    if (!project) return null;
    return { project: project as { id: string; name: string; owner_id: string }, configs: ((cfgs ?? []) as any[]).map((c) => ({ config: norm(c), sheet: norm(c.battery_datasheets) })) };
  });

const n = z.number().finite().nullable();
const cfgSchema = z.object({
  id: z.string().uuid().nullable(), project_id: z.string().uuid(), datasheet_id: z.string().uuid({ message: "Sélectionnez une fiche technique." }),
  module_count: n, series_count: n, parallel_count: n, usable_energy_limit_kwh: n, soc_min_pct: n, soc_max_pct: n, rte_pct: n, charge_eff_pct: n, discharge_eff_pct: n,
  reference_temp_c: n, aging_assumption: z.string().trim().max(2000).nullable(), retained_cost: n, currency: z.string().trim().max(10).nullable(),
  justification: z.string().trim().max(4000).nullable(), status: z.enum(Object.keys(STATUSES) as [keyof typeof STATUSES]),
});
export const saveStorageConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => cfgSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (!(await access(sb, context.userId)).canWrite) throw new Error("Seuls les administrateurs et ingénieurs peuvent configurer le stockage.");
    const errs = configErrors(data as any);
    const adjusted = ["soc_min_pct", "soc_max_pct", "rte_pct", "charge_eff_pct", "discharge_eff_pct", "usable_energy_limit_kwh", "aging_assumption", "retained_cost"].some((k) => (data as any)[k] != null);
    if (adjusted && !data.justification) errs.push("Justifiez les paramètres retenus pour le projet (source ou raison).");
    if (errs.length) throw new Error(errs.join(" "));
    const { data: project } = await sb.from("projects").select("owner_id").eq("id", data.project_id).maybeSingle();
    if (!project) throw new Error("Projet introuvable.");
    const { id, ...row } = data;
    const q = id ? sb.from("project_storage_configs").update(row).eq("id", id).select("id") : sb.from("project_storage_configs").insert({ ...row, owner_id: project.owner_id, created_by: context.userId }).select("id");
    const { data: r, error } = await q;
    if (error || !r?.length) throw new Error("La configuration n’a pas pu être enregistrée (droits insuffisants ?).");
    return { id: r[0].id as string };
  });
export const deleteStorageConfig = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: d, error } = await (context.supabase as any).from("project_storage_configs").delete().eq("id", data.id).select("id");
    if (error || !d?.length) throw new Error("La configuration n’a pas pu être supprimée.");
    return { ok: true };
  });

export const listTechnologyCatalog = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await (context.supabase as any).from("technologies").select("id, code, name, category, description, active").order("name");
  if (error) throw new Error("Le catalogue n’a pas pu être chargé.");
  return (data ?? []) as { id: string; code: string; name: string; category: string; description: string; active: boolean }[];
});
