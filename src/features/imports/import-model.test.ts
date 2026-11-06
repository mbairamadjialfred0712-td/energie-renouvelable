import { describe, expect, it } from "vitest";
import {
  detectImportFormat, importFileError, importStatus, parseExtractedData, parseCorrectedData,
  importStoragePath, MAX_IMPORT_BYTES, MAX_EXTRACTED_ROWS, MAX_EXTRACTED_TEXT_CHARS,
} from "./import-model";

describe("detectImportFormat", () => {
  it("reconnaît les extensions prises en charge", () => {
    expect(detectImportFormat("rapport.PDF", "")).toBe("pdf");
    expect(detectImportFormat("mesures.xlsx", "")).toBe("xlsx");
    expect(detectImportFormat("serie.csv", "")).toBe("csv");
    expect(detectImportFormat("notes.txt", "")).toBe("csv");
    expect(detectImportFormat("etude.docx", "")).toBe("docx");
  });
  it("refuse les formats non pris en charge, y compris les anciens .xls", () => {
    expect(detectImportFormat("ancien.xls", "")).toBeNull();
    expect(detectImportFormat("script.exe", "")).toBeNull();
    expect(detectImportFormat("image.png", "")).toBeNull();
  });
  it("utilise le type MIME en repli", () => {
    expect(detectImportFormat("sans_extension", "application/pdf")).toBe("pdf");
  });
});

describe("importFileError", () => {
  it("refuse un fichier vide, trop volumineux ou interdit", () => {
    expect(importFileError("a.pdf", 0, "")).toMatch(/vide/);
    expect(importFileError("a.pdf", MAX_IMPORT_BYTES + 1, "")).toMatch(/volumineux/);
    expect(importFileError("a.exe", 100, "")).toMatch(/non pris en charge/);
  });
  it("accepte un fichier conforme", () => {
    expect(importFileError("etude.pdf", 1024, "application/pdf")).toBeNull();
  });
});

describe("importStatus", () => {
  it("dérive les trois statuts métier sans extraction inventée", () => {
    expect(importStatus({ validation_status: "pending", extracted_data: null })).toBe("imported");
    expect(importStatus({ validation_status: "pending", extracted_data: { kind: "text" } })).toBe("extraction_review");
    expect(importStatus({ validation_status: "validated", extracted_data: null })).toBe("validated");
    expect(importStatus({ validation_status: "rejected", extracted_data: null })).toBe("rejected");
  });
});

describe("parseExtractedData", () => {
  it("accepte une table bien formée", () => {
    const t = parseExtractedData({ kind: "table", columns: ["a"], rows: [["1"]], total_rows: 1, truncated: false });
    expect(t).toMatchObject({ kind: "table", columns: ["a"] });
  });
  it("accepte un texte avec signal OCR", () => {
    const t = parseExtractedData({ kind: "text", text: "contenu", pages: 3, truncated: false, ocr_needed: true });
    expect(t).toMatchObject({ kind: "text", ocr_needed: true });
  });
  it("refuse les formes invalides ou hors limites", () => {
    expect(parseExtractedData(null)).toBeNull();
    expect(parseExtractedData({ kind: "table", columns: ["a"], rows: [[1]] })).toBeNull();
    expect(parseExtractedData({ kind: "text", text: "x".repeat(MAX_EXTRACTED_TEXT_CHARS + 1) })).toBeNull();
    expect(parseExtractedData({ kind: "table", columns: ["a"], rows: Array.from({ length: MAX_EXTRACTED_ROWS + 1 }, () => ["x"]) })).toBeNull();
  });
});

describe("parseCorrectedData", () => {
  it("conserve uniquement les champs étiquetés, bornés en longueur", () => {
    const out = parseCorrectedData([
      { label: "GHI", value: "5,2", unit: "kWh/m²/j", note: "page 4" },
      { label: "  ", value: "ignoré" },
      "invalide",
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ label: "GHI", unit: "kWh/m²/j" });
  });
  it("retourne un tableau vide pour une donnée absente", () => {
    expect(parseCorrectedData(undefined)).toEqual([]);
  });
});

describe("importStoragePath", () => {
  it("reste sous le dossier de l'utilisateur et nettoie le nom", () => {
    const p = importStoragePath("u1", "f1", "rapport final (v2).pdf");
    expect(p.startsWith("u1/f1-")).toBe(true);
    expect(p).not.toContain(" ");
    expect(p.endsWith(".pdf")).toBe(true);
  });
});
