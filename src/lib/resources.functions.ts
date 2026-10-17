import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RESOURCE_DETAILS, type ResourceType } from "@/features/resources/resource-types";
import { recordedDate } from "@/services/simulation/solar-pv-engine";

const typeSchema = z.enum(["solar", "wind", "biomass", "waste"]);
const MODEL = "openai/gpt-6-astra";

export type ResourceRow = {
  id: string;
  locality_id: string;
  resource_type: ResourceType;
  source: string;
  period: string | null;
  reference: string | null;
  quality: string | null;
  potential_level: string | null;
  validation_status: "pending" | "validated" | "rejected";
  notes: string | null;
  updated_at: string;
  locality_name: string | null;
  detail: Record<string, string | number | null>;
  latest_analysis: AnalysisRow | null;
};

export type AnalysisItem = { title: string; explanation: string; fieldReferences: string[] };
export type AnalysisRow = {
  id: string;
  status: "running" | "completed" | "failed";
  model: string;
  missing_information: AnalysisItem[];
  declared_assumptions: AnalysisItem[];
  verification_points: AnalysisItem[];
  scope_note: string;
  error_message: string | null;
  created_at: string;
};

const ANALYSIS_COLUMNS = "id, status, model, missing_information, declared_assumptions, verification_points, scope_note, error_message, created_at";

export const listResources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ type: typeSchema }).parse(input))
  .handler(async ({ data, context }): Promise<ResourceRow[]> => {
    const sb = context.supabase as any;
    const table = RESOURCE_DETAILS[data.type].table;
    const { data: rows, error } = await sb
      .from("energy_resources")
      .select(`id, locality_id, resource_type, source, period, reference, quality, potential_level, validation_status, notes, updated_at, localities(name), ${table}(*)`)
      .eq("resource_type", data.type)
      .order("updated_at", { ascending: false });
    if (error) throw new Error("Les ressources n’ont pas pu être chargées.");
    const ids = (rows ?? []).map((r: any) => r.id);
    const latest = new Map<string, AnalysisRow>();
    if (ids.length) {
      const { data: analyses } = await sb.from("resource_pre_analyses").select(`resource_id, ${ANALYSIS_COLUMNS}`).in("resource_id", ids).order("created_at", { ascending: false });
      for (const a of analyses ?? []) if (!latest.has(a.resource_id)) latest.set(a.resource_id, a);
    }
    return (rows ?? []).map((r: any) => {
      const detailRaw = Array.isArray(r[table]) ? r[table][0] : r[table];
      return {
        id: r.id, locality_id: r.locality_id, resource_type: r.resource_type, source: r.source, period: r.period, reference: r.reference,
        quality: r.quality, potential_level: r.potential_level, validation_status: r.validation_status, notes: r.notes, updated_at: r.updated_at,
        locality_name: r.localities?.name ?? null, detail: detailRaw ?? {}, latest_analysis: latest.get(r.id) ?? null,
      };
    });
  });

export const listLocalityOptions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("localities").select("id, name, code").order("name").limit(2000);
    if (error) throw new Error("Les localités n’ont pas pu être chargées.");
    return data ?? [];
  });

const saveSchema = z.object({
  id: z.string().uuid().nullable(),
  type: typeSchema,
  locality_id: z.string().uuid({ message: "Sélectionnez une localité." }),
  source: z.string().trim().min(2, "La source est obligatoire.").max(500),
  period: z.string().trim().max(200).nullable(),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
  reference: z.string().trim().max(500).nullable(),
  quality: z.string().trim().max(200).nullable(),
  validation_status: z.enum(["pending", "validated", "rejected"]),
  notes: z.string().trim().max(4000).nullable(),
  detail: z.record(z.string(), z.string()),
});

export const saveResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (data.type === "biomass") throw new Error("La biomasse s’enregistre via le module dédié (Ressources → Biomasse), qui applique ses validations complètes (unités, base du PCI, niveaux de disponibilité).");
    const config = RESOURCE_DETAILS[data.type];
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError || !roles?.some((r) => r.role === "admin" || r.role === "engineer")) throw new Error("Votre rôle ne permet pas de modifier les ressources.");
    const start = recordedDate(data.period_start), end = recordedDate(data.period_end);
    if ((data.period_start && start === null) || (data.period_end && end === null) || (start !== null && end !== null && end < start)) throw new Error("Les dates de la période sont invalides.");
    const detail: Record<string, string | number | null> = {};
    for (const field of config.fields) {
      const raw = (data.detail[field.key] ?? "").trim();
      if (!raw) { detail[field.key] = null; continue; }
      if (field.kind === "text") { detail[field.key] = raw.slice(0, 300); continue; }
      const value = Number(raw.replace(",", "."));
      if (!Number.isFinite(value)) throw new Error(`${field.label} : valeur numérique invalide.`);
      if (field.min !== undefined && value < field.min) throw new Error(`${field.label} doit être ≥ ${field.min}${field.unit ? ` ${field.unit}` : ""}.`);
      if (field.max !== undefined && value > field.max) throw new Error(`${field.label} doit être ≤ ${field.max}${field.unit ? ` ${field.unit}` : ""}.`);
      detail[field.key] = value;
    }
    if (data.type === "biomass" && !detail["biomass_type"]) throw new Error("Le type de biomasse est obligatoire.");
    if (data.type === "waste" && !detail["waste_type"]) throw new Error("Le type de déchet est obligatoire.");
    if (data.type !== "solar") {
      detail["period_start"] = data.period_start ?? null;
      detail["period_end"] = data.period_end ?? null;
    }

    const base = { locality_id: data.locality_id, resource_type: data.type, source: data.source, period: data.period, reference: data.reference, quality: data.quality, validation_status: data.validation_status, notes: data.notes };
    let resourceId = data.id;
    if (resourceId) {
      const { error } = await sb.from("energy_resources").update(base).eq("id", resourceId);
      if (error) throw new Error("La ressource n’a pas pu être modifiée.");
    } else {
      const { data: created, error } = await sb.from("energy_resources").insert({ ...base, owner_id: context.userId }).select("id").single();
      if (error || !created) throw new Error("La ressource n’a pas pu être créée.");
      resourceId = created.id as string;
    }
    const { data: resourceOwner } = await sb.from("energy_resources").select("owner_id").eq("id", resourceId).single();
    if (!resourceOwner) throw new Error("La ressource est inaccessible.");
    const { error: detailError } = await sb.from(config.table).upsert({ ...detail, resource_id: resourceId, owner_id: resourceOwner.owner_id }, { onConflict: "resource_id" });
    if (detailError) throw new Error("Les paramètres techniques n’ont pas pu être enregistrés.");
    return { id: resourceId };
  });

export const deleteResource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), type: typeSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await sb.from(RESOURCE_DETAILS[data.type].table).delete().eq("resource_id", data.id);
    const { error } = await sb.from("energy_resources").delete().eq("id", data.id);
    if (error) throw new Error("La suppression a échoué.");
    return { ok: true };
  });

export const runResourcePreAnalysis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: resource, error } = await sb.from("energy_resources").select("*, localities(name, latitude, longitude, altitude_m, population, data_source)").eq("id", data.id).single();
    if (error || !resource) throw new Error("Ressource introuvable.");
    const config = RESOURCE_DETAILS[resource.resource_type as ResourceType];
    const { data: detail } = await sb.from(config.table).select("*").eq("resource_id", data.id).maybeSingle();
    const units = Object.fromEntries(config.fields.map((f) => [f.key, f.unit ?? null]));
    const snapshot = {
      type: config.label,
      localite: resource.localities,
      tracabilite: { source: resource.source, periode: resource.period, reference: resource.reference, qualite: resource.quality, statut_validation: resource.validation_status, notes: resource.notes },
      parametres_fournis: Object.fromEntries(config.fields.map((f) => [f.key, detail?.[f.key] ?? null])),
      unites: units,
    };
    const { data: run, error: insertError } = await sb.from("resource_pre_analyses").insert({ resource_id: data.id, owner_id: resource.owner_id, requested_by: context.userId, model: MODEL, input_snapshot: snapshot }).select("id").single();
    if (insertError || !run) throw new Error("La pré-analyse n’a pas pu démarrer.");
    try {
      const { runProjectPreAnalysis } = await import("@/lib/ai/project-pre-analysis.server");
      const { output, runId } = await runProjectPreAnalysis(snapshot, "resource");
      await sb.from("resource_pre_analyses").update({
        status: "completed", missing_information: output.missingInformation, declared_assumptions: output.declaredAssumptions,
        verification_points: output.verificationPoints, scope_note: output.scopeNote, gateway_run_id: runId ?? null, completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return { ok: true };
    } catch (err) {
      console.error("resource pre-analysis failed", err);
      await sb.from("resource_pre_analyses").update({ status: "failed", error_message: "Le service d’analyse n’a pas répondu.", completed_at: new Date().toISOString() }).eq("id", run.id);
      throw new Error("La pré-analyse a échoué. Réessayez dans un instant.");
    }
  });
