import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  IMPORT_CATEGORIES, importFileError, parseCorrectedData, parseExtractedData,
  type ImportCategory,
} from "@/features/imports/import-model";

const BUCKET = "project-imports";
const categoryEnum = z.enum(Object.keys(IMPORT_CATEGORIES) as [ImportCategory, ...ImportCategory[]]);

async function canValidate(sb: any, userId: string): Promise<boolean> {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  return roles.includes("admin") || roles.includes("engineer");
}

const listSchema = z.object({
  category: categoryEnum.optional(),
  status: z.enum(["imported", "extraction_review", "validated", "rejected"]).optional(),
  projectId: z.string().uuid().optional(),
  query: z.string().trim().max(200).optional(),
});

export const listImports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => listSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    let q = sb.from("imported_files")
      .select("id, file_name, mime_type, size_bytes, category, workflow_step, validation_status, project_id, locality_id, error_message, extracted_data, created_at, projects(name), localities(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.category) q = q.eq("category", data.category);
    if (data.projectId) q = q.eq("project_id", data.projectId);
    if (data.query) q = q.ilike("file_name", `%${data.query}%`);
    const { data: rows, error } = await q;
    if (error) throw new Error("Les importations n’ont pas pu être chargées.");
    let list = (rows ?? []) as any[];
    if (data.status === "validated") list = list.filter((r) => r.validation_status === "validated");
    else if (data.status === "rejected") list = list.filter((r) => r.validation_status === "rejected");
    else if (data.status === "imported") list = list.filter((r) => r.validation_status === "pending" && !r.extracted_data);
    else if (data.status === "extraction_review") list = list.filter((r) => r.validation_status === "pending" && r.extracted_data);
    return list.map(({ extracted_data, ...r }) => ({ ...r, has_extraction: Boolean(extracted_data) }));
  });

export type ImportItem = {
  id: string; file_name: string; mime_type: string; size_bytes: number; category: string;
  project_id: string | null; locality_id: string | null; workflow_step: string; validation_status: string;
  extracted_data: unknown; corrected_data: unknown; error_message: string | null; created_at: string;
  projects: { name: string } | null; localities: { name: string } | null;
};

export type ImportDetail = {
  item: ImportItem;
  history: { id: string; action: string; changes: Record<string, unknown> | null; created_at: string }[];
  signedUrl: string | null;
  canValidate: boolean;
};

export const getImport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }): Promise<ImportDetail | null> => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("imported_files").select("*, projects(name), localities(name)").eq("id", data.id).maybeSingle();
    if (error) throw new Error("Le document n’a pas pu être chargé.");
    if (!row) return null;
    const { data: history } = await sb.from("imported_file_history").select("id, action, changes, created_at").eq("file_id", data.id).order("created_at", { ascending: false }).limit(100);
    const { data: signed } = await sb.storage.from(BUCKET).createSignedUrl(row.storage_path, 300);
    return {
      item: row as ImportItem,
      history: (history ?? []) as { id: string; action: string; changes: Record<string, unknown> | null; created_at: string }[],
      signedUrl: (signed?.signedUrl as string | undefined) ?? null,
      canValidate: await canValidate(sb, context.userId),
    };
  });

const registerSchema = z.object({
  file_name: z.string().trim().min(1).max(300),
  storage_path: z.string().trim().min(1).max(500),
  mime_type: z.string().trim().max(200),
  size_bytes: z.number().int().positive(),
  category: categoryEnum,
  project_id: z.string().uuid().nullable(),
  locality_id: z.string().uuid().nullable(),
});

/** Enregistre un fichier déjà déposé dans le bucket privé. Revérifie format, taille et appartenance du chemin côté serveur. */
export const registerImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => registerSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const fileError = importFileError(data.file_name, data.size_bytes, data.mime_type);
    if (fileError) throw new Error(fileError);
    if (!data.storage_path.startsWith(`${context.userId}/`)) throw new Error("Chemin de stockage non autorisé.");
    if (data.project_id) {
      const { data: p } = await sb.from("projects").select("id").eq("id", data.project_id).maybeSingle();
      if (!p) throw new Error("Projet associé introuvable ou inaccessible.");
    }
    if (data.locality_id) {
      const { data: l } = await sb.from("localities").select("id").eq("id", data.locality_id).maybeSingle();
      if (!l) throw new Error("Localité associée introuvable ou inaccessible.");
    }
    const { data: row, error } = await sb.from("imported_files").insert({
      owner_id: context.userId,
      file_name: data.file_name,
      storage_path: data.storage_path,
      mime_type: data.mime_type || "application/octet-stream",
      size_bytes: data.size_bytes,
      category: data.category,
      project_id: data.project_id,
      locality_id: data.locality_id,
      workflow_step: "imported",
      validation_status: "pending",
    }).select("id").single();
    if (error || !row) throw new Error("L’importation n’a pas pu être enregistrée.");
    return { id: row.id as string };
  });

const metaSchema = z.object({
  id: z.string().uuid(),
  category: categoryEnum,
  project_id: z.string().uuid().nullable(),
  locality_id: z.string().uuid().nullable(),
});

export const updateImportMeta = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => metaSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: up, error } = await sb.from("imported_files")
      .update({ category: data.category, project_id: data.project_id, locality_id: data.locality_id })
      .eq("id", data.id).select("id");
    if (error || !up?.length) throw new Error("Les associations n’ont pas pu être modifiées (droits insuffisants ?).");
    return { ok: true };
  });

/** Enregistre une extraction (proposition de lecture). Jamais une validation. */
export const saveExtraction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), extracted_data: z.unknown() }).parse(i))
  .handler(async ({ data, context }) => {
    const parsed = parseExtractedData(data.extracted_data);
    if (!parsed) throw new Error("Extraction illisible ou hors limites : elle n’a pas été enregistrée.");
    const sb = context.supabase as any;
    const { data: up, error } = await sb.from("imported_files")
      .update({ extracted_data: parsed, workflow_step: "extracted", error_message: null })
      .eq("id", data.id).eq("validation_status", "pending").select("id");
    if (error || !up?.length) throw new Error("L’extraction n’a pas pu être enregistrée (document déjà validé ou droits insuffisants).");
    return { ok: true };
  });

/** Corrections humaines : valeurs relues, unités et notes de provenance saisies par l'utilisateur. */
export const saveCorrections = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), corrected_data: z.unknown() }).parse(i))
  .handler(async ({ data, context }) => {
    const parsed = parseCorrectedData(data.corrected_data);
    const sb = context.supabase as any;
    const { data: up, error } = await sb.from("imported_files")
      .update({ corrected_data: parsed })
      .eq("id", data.id).select("id");
    if (error || !up?.length) throw new Error("Les corrections n’ont pas pu être enregistrées (droits insuffisants ?).");
    return { ok: true, count: parsed.length };
  });

/** Validation humaine : réservée aux ingénieurs et administrateurs ; exige une extraction ou des corrections. */
export const setImportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), status: z.enum(["validated", "rejected", "pending"]) }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    if (data.status !== "pending" && !(await canValidate(sb, context.userId))) {
      throw new Error("Seuls les administrateurs et ingénieurs peuvent valider ou rejeter un document.");
    }
    const { data: row, error } = await sb.from("imported_files").select("validation_status, extracted_data, corrected_data").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Le document est introuvable ou inaccessible.");
    if (data.status === "validated" && !row.extracted_data && !(Array.isArray(row.corrected_data) && row.corrected_data.length > 0)) {
      throw new Error("Aucune extraction ni correction à valider : lancez d’abord une extraction ou saisissez des valeurs relues.");
    }
    const { data: up, error: e2 } = await sb.from("imported_files").update({ validation_status: data.status }).eq("id", data.id).select("id");
    if (e2 || !up?.length) throw new Error("Le statut n’a pas pu être modifié (droits insuffisants ?).");
    return { ok: true };
  });

export const deleteImport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const { data: row, error } = await sb.from("imported_files").select("storage_path, validation_status").eq("id", data.id).maybeSingle();
    if (error || !row) throw new Error("Le document est introuvable ou inaccessible.");
    if (row.validation_status === "validated" && !(await canValidate(sb, context.userId))) {
      throw new Error("Seuls les administrateurs et ingénieurs peuvent supprimer un document validé.");
    }
    const { data: d, error: e2 } = await sb.from("imported_files").delete().eq("id", data.id).select("id");
    if (e2 || !d?.length) throw new Error("Le document n’a pas pu être supprimé (droits insuffisants ?).");
    // Suppression du fichier privé : possible uniquement depuis le dossier du propriétaire (politique de stockage).
    await sb.storage.from(BUCKET).remove([row.storage_path]);
    return { ok: true };
  });
