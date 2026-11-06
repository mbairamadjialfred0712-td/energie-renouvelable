/**
 * Modèle métier du module d'importation de documents techniques.
 * Règles absolues : l'extraction automatique est une proposition de lecture,
 * jamais une validation scientifique ; aucune valeur absente n'est inventée ;
 * aucune unité non identifiable n'est déduite.
 */

export const IMPORT_CATEGORIES = {
  solaire: "Étude de ressources solaires",
  eolien: "Étude de ressources éoliennes",
  biomasse: "Étude de biomasse",
  dechets: "Étude des déchets",
  demande: "Étude de demande énergétique",
  photovoltaïque: "Étude photovoltaïque",
  batterie: "Étude de stockage par batterie",
  csp: "Étude CSP",
  hybride: "Étude de systèmes hybrides",
  financier: "Étude économique et financière",
  faisabilite: "Étude de faisabilité",
  rapport_simulation: "Rapport de simulation",
  rapport_technique: "Rapport technique général",
  autre: "Autre document",
} as const;
export type ImportCategory = keyof typeof IMPORT_CATEGORIES;

export const IMPORT_FORMATS = {
  pdf: { label: "PDF", mime: "application/pdf", extensions: [".pdf"] },
  xlsx: { label: "Excel .xlsx", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extensions: [".xlsx"] },
  csv: { label: "CSV", mime: "text/csv", extensions: [".csv", ".txt"] },
  docx: { label: "Word .docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extensions: [".docx"] },
} as const;
export type ImportFormat = keyof typeof IMPORT_FORMATS;

export const MAX_IMPORT_BYTES = 20 * 1024 * 1024; // 20 Mo
export const MAX_EXTRACTED_TEXT_CHARS = 100_000;
export const MAX_EXTRACTED_ROWS = 500;
export const MAX_CORRECTED_FIELDS = 100;

/** Détection par extension d'abord (le type MIME navigateur est souvent vide ou générique). */
export function detectImportFormat(fileName: string, mimeType: string): ImportFormat | null {
  const lower = fileName.toLowerCase();
  for (const [key, fmt] of Object.entries(IMPORT_FORMATS)) {
    if (fmt.extensions.some((ext) => lower.endsWith(ext))) return key as ImportFormat;
  }
  for (const [key, fmt] of Object.entries(IMPORT_FORMATS)) {
    if (mimeType === fmt.mime) return key as ImportFormat;
  }
  return null;
}

/** Contrôle appliqué côté navigateur ET côté serveur avant enregistrement. */
export function importFileError(fileName: string, sizeBytes: number, mimeType: string): string | null {
  if (!fileName.trim()) return "Nom de fichier vide.";
  if (sizeBytes <= 0) return "Le fichier est vide.";
  if (sizeBytes > MAX_IMPORT_BYTES) return `Fichier trop volumineux (${Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} Mo maximum).`;
  if (!detectImportFormat(fileName, mimeType)) return "Format non pris en charge : PDF, Excel .xlsx, CSV ou Word .docx uniquement. Les anciens .xls doivent être réenregistrés en .xlsx.";
  return null;
}

export type ImportStatus = "imported" | "extraction_review" | "validated" | "rejected";
export const IMPORT_STATUS_LABELS: Record<ImportStatus, string> = {
  imported: "Importé",
  extraction_review: "Extraction à vérifier",
  validated: "Validé",
  rejected: "Rejeté",
};

/** Trois statuts métier dérivés du statut de validation et de la présence d'une extraction. */
export function importStatus(row: { validation_status: string; extracted_data: unknown }): ImportStatus {
  if (row.validation_status === "validated") return "validated";
  if (row.validation_status === "rejected") return "rejected";
  return row.extracted_data ? "extraction_review" : "imported";
}

export type ExtractedTable = { kind: "table"; columns: string[]; rows: string[][]; total_rows: number; truncated: boolean };
export type ExtractedText = { kind: "text"; text: string; pages: number | null; truncated: boolean; ocr_needed: boolean };
export type ExtractedData = ExtractedTable | ExtractedText;

/** Validation stricte de la forme avant persistance : aucune donnée arbitraire n'est acceptée. */
export function parseExtractedData(raw: unknown): ExtractedData | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o["kind"] === "table") {
    const columns = o["columns"], rows = o["rows"];
    if (!Array.isArray(columns) || !columns.every((c) => typeof c === "string")) return null;
    if (!Array.isArray(rows) || !rows.every((r) => Array.isArray(r) && r.every((c) => typeof c === "string"))) return null;
    if (columns.length > 100 || rows.length > MAX_EXTRACTED_ROWS) return null;
    return { kind: "table", columns, rows, total_rows: typeof o["total_rows"] === "number" ? o["total_rows"] : rows.length, truncated: o["truncated"] === true };
  }
  if (o["kind"] === "text") {
    if (typeof o["text"] !== "string" || o["text"].length > MAX_EXTRACTED_TEXT_CHARS) return null;
    return { kind: "text", text: o["text"], pages: typeof o["pages"] === "number" ? o["pages"] : null, truncated: o["truncated"] === true, ocr_needed: o["ocr_needed"] === true };
  }
  return null;
}

export type CorrectedField = { label: string; value: string; unit: string; note: string };

export function parseCorrectedData(raw: unknown): CorrectedField[] {
  if (!Array.isArray(raw)) return [];
  const out: CorrectedField[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o["label"] !== "string" || !o["label"].trim()) continue;
    out.push({
      label: o["label"].slice(0, 200),
      value: typeof o["value"] === "string" ? o["value"].slice(0, 500) : "",
      unit: typeof o["unit"] === "string" ? o["unit"].slice(0, 50) : "",
      note: typeof o["note"] === "string" ? o["note"].slice(0, 1000) : "",
    });
    if (out.length >= MAX_CORRECTED_FIELDS) break;
  }
  return out;
}

/** Chemin de stockage privé : toujours sous le dossier de l'utilisateur importateur. */
export function importStoragePath(ownerId: string, fileId: string, fileName: string): string {
  const safe = fileName.normalize("NFC").replace(/[^\w.-]+/g, "_").slice(-120);
  return `${ownerId}/${fileId}-${safe}`;
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} Mo`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${bytes} o`;
}
