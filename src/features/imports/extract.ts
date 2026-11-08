/**
 * Extraction déterministe du contenu d'un document importé (navigateur uniquement).
 * Restitue le texte ou le tableau lu, sans deviner de valeurs ni d'unités.
 */
import { MAX_EXTRACTED_ROWS, MAX_EXTRACTED_TEXT_CHARS, type ExtractedData, type ImportFormat } from "./import-model";

function parseCsvText(content: string): string[][] {
  const text = content.replace(/^﻿/, "");
  const firstLine = text.split(/\r?\n/)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);
  return rows;
}

function toTable(cells: string[][]): ExtractedData {
  const columns = (cells[0] ?? []).map((c, i) => c.trim() || `Colonne ${i + 1}`);
  const allRows = cells.slice(1);
  return {
    kind: "table",
    columns: columns.slice(0, 100),
    rows: allRows.slice(0, MAX_EXTRACTED_ROWS).map((r) => r.slice(0, 100)),
    total_rows: allRows.length,
    truncated: allRows.length > MAX_EXTRACTED_ROWS,
  };
}

async function extractPdf(blob: Blob): Promise<ExtractedData> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise;
  const parts: string[] = [];
  let chars = 0;
  let truncated = false;
  for (let page = 1; page <= doc.numPages; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent();
    const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim();
    if (chars + text.length > MAX_EXTRACTED_TEXT_CHARS) { parts.push(text.slice(0, MAX_EXTRACTED_TEXT_CHARS - chars)); truncated = true; break; }
    parts.push(text);
    chars += text.length;
  }
  const text = parts.join("\n\n").trim();
  return { kind: "text", text, pages: doc.numPages, truncated, ocr_needed: text.length < 20 };
}

async function extractDocx(blob: Blob): Promise<ExtractedData> {
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await blob.arrayBuffer() });
  const text = result.value.trim();
  return { kind: "text", text: text.slice(0, MAX_EXTRACTED_TEXT_CHARS), pages: null, truncated: text.length > MAX_EXTRACTED_TEXT_CHARS, ocr_needed: text.length < 20 };
}

/** Extrait le contenu lisible du fichier. Lève une erreur compréhensible si le fichier est corrompu. */
export async function extractDocument(format: ImportFormat, blob: Blob, fileName: string): Promise<ExtractedData> {
  try {
    if (format === "csv") return toTable(parseCsvText(await blob.text()));
    if (format === "xlsx") {
      const { readSheet } = await import("read-excel-file/browser");
      const sheet = await readSheet(new File([blob], fileName), 1);
      if (sheet.length === 0) throw new Error("Classeur vide.");
      return toTable(sheet.map((r) => r.map((c) => (c === null || c === undefined ? "" : c instanceof Date ? c.toISOString().slice(0, 10) : String(c)))));
    }
    if (format === "pdf") return await extractPdf(blob);
    return await extractDocx(blob);
  } catch (err) {
    if (err instanceof Error && err.message === "Classeur vide.") throw err;
    throw new Error("Le fichier n’a pas pu être lu : il est peut-être corrompu ou protégé.");
  }
}
