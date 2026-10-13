import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { AnalysisItem, ProjectAnalysisResult, ProjectDataField } from "@/features/projects/project-record";
import type { Json } from "@/integrations/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const projectStatusSchema = z.enum(["draft", "preliminary_study", "feasibility", "design", "financing", "procurement", "implementation", "completed"]);
const fieldSchema = z.object({
  id: z.string().uuid().optional(),
  section: z.string().trim().min(1).max(100),
  fieldKey: z.string().trim().min(1).max(100),
  label: z.string().trim().min(1).max(160),
  value: z.string().trim().max(4000),
  unit: z.string().trim().max(80),
  fieldKind: z.enum(["provided", "assumption"]),
  source: z.string().trim().max(1000),
  dataPeriod: z.string().trim().max(160),
  quality: z.string().trim().max(240),
  notes: z.string().trim().max(2000),
  sortOrder: z.number().int(),
});
const projectSchema = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(4000),
  status: projectStatusSchema,
  startDate: z.string().nullable(),
  targetDate: z.string().nullable(),
  fields: z.array(fieldSchema),
});
const projectIdSchema = z.object({ projectId: z.string().uuid() });

type ProjectStatus = z.infer<typeof projectStatusSchema>;

export type ProjectListItem = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  targetDate: string | null;
  updatedAt: string;
  fieldCount: number;
  analysisCount: number;
};

export type ProjectHistoryEvent = {
  id: string;
  action: string;
  summary: string;
  changes: Json;
  createdAt: string;
};

export type ProjectAnalysis = ProjectAnalysisResult & {
  id: string;
  status: "running" | "completed" | "failed";
  model: string;
  createdAt: string;
  completedAt: string | null;
  errorMessage: string | null;
};

export type ProjectRecord = {
  project: {
    id: string;
    name: string;
    description: string;
    status: ProjectStatus;
    startDate: string | null;
    targetDate: string | null;
    createdAt: string;
    updatedAt: string;
    localityId: string | null;
  };
  fields: ProjectDataField[];
  history: ProjectHistoryEvent[];
  analyses: ProjectAnalysis[];
  energyProductions: Database["public"]["Tables"]["project_energy_production"]["Row"][];
  productions: Database["public"]["Tables"]["project_solar_production"]["Row"][];
};

const asItems = (value: unknown): AnalysisItem[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    if (typeof candidate["title"] !== "string" || typeof candidate["explanation"] !== "string") return [];
    return [{
      title: candidate["title"],
      explanation: candidate["explanation"],
      fieldReferences: Array.isArray(candidate["fieldReferences"]) ? candidate["fieldReferences"].filter((reference): reference is string => typeof reference === "string") : [],
    }];
  });
};

async function loadProjectRecord(client: SupabaseClient<Database>, projectId: string): Promise<ProjectRecord> {
  const [projectResult, fieldsResult, historyResult, analysesResult, productionsResult, energyResult] = await Promise.all([
    client.from("projects").select("id,name,description,status,start_date,target_date,created_at,updated_at,locality_id").eq("id", projectId).single(),
    client.from("project_data_fields").select("*").eq("project_id", projectId).order("sort_order"),
    client.from("project_change_history").select("id,action,summary,changes,created_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    client.from("project_pre_analyses").select("id,status,model,missing_information,declared_assumptions,verification_points,scope_note,error_message,created_at,completed_at").eq("project_id", projectId).order("created_at", { ascending: false }),
    client.from("project_solar_production").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    client.from("project_energy_production").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);
  if (projectResult.error || !projectResult.data) throw new Error("Ce projet est introuvable ou inaccessible.");
  if (fieldsResult.error || historyResult.error || analysesResult.error || productionsResult.error || energyResult.error) throw new Error("Le dossier complet n’a pas pu être chargé.");
  const project = projectResult.data;
  return {
    project: { id: project.id, name: project.name, description: project.description ?? "", status: project.status, startDate: project.start_date, targetDate: project.target_date, createdAt: project.created_at, updatedAt: project.updated_at, localityId: project.locality_id },
    productions: productionsResult.data ?? [],
    energyProductions: energyResult.data ?? [],
    fields: (fieldsResult.data ?? []).map((field) => ({ id: field.id, section: field.section, fieldKey: field.field_key, label: field.label, value: field.value_text, unit: field.unit ?? "", fieldKind: field.field_kind, source: field.source ?? "", dataPeriod: field.data_period ?? "", quality: field.quality ?? "", notes: field.notes ?? "", sortOrder: field.sort_order })),
    history: (historyResult.data ?? []).map((event) => ({ id: event.id, action: event.action, summary: event.summary, changes: event.changes, createdAt: event.created_at })),
    analyses: (analysesResult.data ?? []).map((analysis) => ({ id: analysis.id, status: analysis.status, model: analysis.model, missingInformation: asItems(analysis.missing_information), declaredAssumptions: asItems(analysis.declared_assumptions), verificationPoints: asItems(analysis.verification_points), scopeNote: analysis.scope_note, errorMessage: analysis.error_message, createdAt: analysis.created_at, completedAt: analysis.completed_at })),
  };
}

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProjectListItem[]> => {
    const { data, error } = await context.supabase.from("projects").select("id,name,description,status,start_date,target_date,updated_at,project_data_fields(count),project_pre_analyses(count)").order("updated_at", { ascending: false });
    if (error) throw new Error("Les projets n’ont pas pu être chargés.");
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? "",
      status: row.status,
      startDate: row.start_date,
      targetDate: row.target_date,
      updatedAt: row.updated_at,
      fieldCount: row.project_data_fields[0]?.count ?? 0,
      analysisCount: row.project_pre_analyses[0]?.count ?? 0,
    }));
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => projectSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: project, error: projectError } = await context.supabase.from("projects").insert({
      owner_id: context.userId,
      name: data.name,
      description: data.description || null,
      status: data.status,
      start_date: data.startDate,
      target_date: data.targetDate,
      metadata: { record_version: 1 },
    }).select("id").single();
    if (projectError || !project) throw new Error("Le projet n’a pas pu être créé.");

    const populatedFields = data.fields.filter((field) => field.value || field.source || field.notes);
    if (populatedFields.length > 0) {
      const { error: fieldsError } = await context.supabase.from("project_data_fields").insert(populatedFields.map((field) => ({
        project_id: project.id, owner_id: context.userId, section: field.section, field_key: field.fieldKey, label: field.label,
        value_text: field.value, unit: field.unit || null, field_kind: field.fieldKind, source: field.source || null,
        data_period: field.dataPeriod || null, quality: field.quality || null, notes: field.notes || null, sort_order: field.sortOrder,
      })));
      if (fieldsError) throw new Error("Le projet a été créé, mais ses données n’ont pas pu être enregistrées.");
    }
    await context.supabase.from("project_change_history").insert({
      project_id: project.id, owner_id: context.userId, actor_id: context.userId, action: "Création",
      summary: "Création de la fiche projet.", changes: { fields_recorded: populatedFields.length },
    });
    return { id: project.id };
  });

export const getProjectRecord = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => projectIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<ProjectRecord> => loadProjectRecord(context.supabase, data.projectId));

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => projectIdSchema.extend(projectSchema.shape).parse(input))
  .handler(async ({ data, context }) => {
    const { data: current, error: currentError } = await context.supabase.from("projects").select("name,description,status,start_date,target_date").eq("id", data.projectId).single();
    if (currentError || !current) throw new Error("Ce projet est introuvable ou inaccessible.");
    const { error: updateError } = await context.supabase.from("projects").update({ name: data.name, description: data.description || null, status: data.status, start_date: data.startDate, target_date: data.targetDate }).eq("id", data.projectId);
    if (updateError) throw new Error("La fiche projet n’a pas pu être mise à jour.");

    const incomingKeys = data.fields.filter((field) => field.value || field.source || field.notes).map((field) => field.fieldKey);
    if (incomingKeys.length > 0) {
      const { error: upsertError } = await context.supabase.from("project_data_fields").upsert(data.fields.filter((field) => field.value || field.source || field.notes).map((field) => ({
        project_id: data.projectId, owner_id: context.userId, section: field.section, field_key: field.fieldKey, label: field.label,
        value_text: field.value, unit: field.unit || null, field_kind: field.fieldKind, source: field.source || null,
        data_period: field.dataPeriod || null, quality: field.quality || null, notes: field.notes || null, sort_order: field.sortOrder,
      })), { onConflict: "project_id,field_key" });
      if (upsertError) throw new Error("Certaines données du projet n’ont pas pu être enregistrées.");
    }
    const { data: existingFields } = await context.supabase.from("project_data_fields").select("field_key").eq("project_id", data.projectId);
    const removedKeys = (existingFields ?? []).map((field) => field.field_key).filter((key) => !incomingKeys.includes(key));
    if (removedKeys.length > 0) await context.supabase.from("project_data_fields").delete().eq("project_id", data.projectId).in("field_key", removedKeys);

    const changedIdentity = Object.entries({ name: data.name, description: data.description || null, status: data.status, start_date: data.startDate, target_date: data.targetDate }).filter(([key, value]) => current[key as keyof typeof current] !== value).map(([key]) => key);
    await context.supabase.from("project_change_history").insert({ project_id: data.projectId, owner_id: context.userId, actor_id: context.userId, action: "Modification", summary: `Mise à jour de la fiche : ${changedIdentity.length} champ(s) général(aux), ${incomingKeys.length} donnée(s) structurée(s).`, changes: { general_fields: changedIdentity, structured_fields: incomingKeys, removed_fields: removedKeys } });
    return { ok: true };
  });

function safeGatewayError(error: unknown) {
  if (error && typeof error === "object") {
    const candidate = error as { statusCode?: unknown; responseBody?: unknown; message?: unknown };
    if (typeof candidate.responseBody === "string") {
      try { const parsed = JSON.parse(candidate.responseBody) as { message?: unknown; error?: { message?: unknown } }; const message = parsed.message ?? parsed.error?.message; if (typeof message === "string") return message; } catch { /* keep the safe fallback */ }
    }
    if (candidate.statusCode === 401) return "Le service de pré-analyse n’est pas configuré correctement.";
    if (candidate.statusCode === 402) return "Les crédits Lovable AI sont insuffisants. Rechargez les crédits pour lancer une nouvelle analyse.";
    if (candidate.statusCode === 429) return "Le service reçoit trop de demandes. Réessayez plus tard.";
    if (typeof candidate.message === "string" && candidate.message.length < 240 && !candidate.message.includes("key")) return candidate.message;
  }
  return "La pré-analyse n’a pas pu être produite. Les données sauvegardées restent inchangées.";
}

export const analyzeProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => projectIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    const record = await loadProjectRecord(context.supabase, data.projectId);
    const snapshot = { project: record.project, fields: record.fields, solar_production_estimates: record.productions, wind_biomass_production_estimates: record.energyProductions };
    const { data: analysis, error: createError } = await context.supabase.from("project_pre_analyses").insert({ project_id: data.projectId, owner_id: context.userId, requested_by: context.userId, status: "running", model: "openai/gpt-6-astra", input_snapshot: snapshot, scope_note: "Pré-analyse de complétude et de vérification uniquement. Aucun résultat énergétique ou financier n’est calculé." }).select("id").single();
    if (createError || !analysis) throw new Error("La pré-analyse n’a pas pu être initialisée.");
    try {
      const { runProjectPreAnalysis } = await import("@/lib/ai/project-pre-analysis.server");
      const { output, runId } = await runProjectPreAnalysis(snapshot);
      const { error: updateError } = await context.supabase.from("project_pre_analyses").update({ status: "completed", missing_information: output.missingInformation, declared_assumptions: output.declaredAssumptions, verification_points: output.verificationPoints, scope_note: output.scopeNote, gateway_run_id: runId ?? null, completed_at: new Date().toISOString() }).eq("id", analysis.id);
      if (updateError) throw new Error("La pré-analyse a été produite mais n’a pas pu être enregistrée.");
      await context.supabase.from("project_change_history").insert({ project_id: data.projectId, owner_id: context.userId, actor_id: context.userId, action: "Pré-analyse", summary: "Nouvelle pré-analyse enregistrée à partir de l’instantané sauvegardé.", changes: { analysis_id: analysis.id } });
      return { id: analysis.id };
    } catch (error) {
      const message = safeGatewayError(error);
      await context.supabase.from("project_pre_analyses").update({ status: "failed", error_message: message, completed_at: new Date().toISOString() }).eq("id", analysis.id);
      throw new Error(message);
    }
  });

export const logProjectExport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => projectIdSchema.parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase.from("project_change_history").insert({ project_id: data.projectId, owner_id: context.userId, actor_id: context.userId, action: "Export PDF", summary: "Export PDF de la fiche projet généré à partir des données enregistrées.", changes: {} });
    return { ok: true };
  });