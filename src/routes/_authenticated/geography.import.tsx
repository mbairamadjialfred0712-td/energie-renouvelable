import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Download, FileUp, TriangleAlert } from "lucide-react";
import { importTerritories, LOCALITY_TYPES, type ImportLevel } from "@/lib/geography.functions";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { metaFor } from "@/features/geography/form-helpers";

export const Route = createFileRoute("/_authenticated/geography/import")({
  head: () => metaFor("Import territorial", "Import contrôlé CSV/Excel des pays, régions, départements et localités avec prévisualisation et validation humaine."),
  component: ImportPage,
});

type Column = { key: string; header: string; aliases: string[]; unit?: string; required?: boolean; numeric?: [number, number] };

const C = {
  name: { key: "name", header: "nom", aliases: ["name", "libelle", "nom_officiel"], required: true },
  code: { key: "code", header: "code", aliases: ["code_officiel"] },
  description: { key: "description", header: "description", aliases: [] },
  lat: { key: "latitude", header: "latitude", aliases: ["lat"], unit: "°", numeric: [-90, 90] },
  lon: { key: "longitude", header: "longitude", aliases: ["lon", "lng", "long"], unit: "°", numeric: [-180, 180] },
} satisfies Record<string, Column>;

const LEVELS: Record<ImportLevel, { label: string; parent: string | null; columns: Column[]; hint: string }> = {
  countries: {
    label: "Pays",
    parent: null,
    hint: "Le code est obligatoire et unique. Utilisez de préférence les codes ISO 3166-1.",
    columns: [
      C.name,
      { ...C.code, required: true },
      { key: "iso2", header: "iso2", aliases: ["iso_2", "alpha2", "iso_alpha2"] },
      { key: "iso3", header: "iso3", aliases: ["iso_3", "alpha3", "iso_alpha3"] },
      { key: "currency", header: "devise", aliases: ["currency", "monnaie"] },
      C.lat,
      C.lon,
      C.description,
    ],
  },
  regions: {
    label: "Régions",
    parent: "Pays",
    hint: "La colonne « pays » doit contenir le nom ou le code d’un pays déjà enregistré.",
    columns: [C.name, C.code, { key: "parent", header: "pays", aliases: ["country", "code_pays"], required: true }, C.description],
  },
  departments: {
    label: "Départements",
    parent: "Régions",
    hint: "La colonne « region » doit contenir le nom ou le code d’une région déjà enregistrée (code conseillé si le nom existe dans plusieurs pays).",
    columns: [C.name, C.code, { key: "parent", header: "region", aliases: ["code_region", "province"], required: true }, C.description],
  },
  localities: {
    label: "Localités",
    parent: "Départements",
    hint: "La colonne « departement » est facultative ; si elle est renseignée, le département doit déjà exister.",
    columns: [
      C.name,
      C.code,
      { key: "parent", header: "departement", aliases: ["department", "code_departement"] },
      { key: "localityType", header: "type", aliases: ["type_zone", "locality_type"] },
      C.lat,
      C.lon,
      { key: "altitudeM", header: "altitude_m", aliases: ["altitude"], unit: "m", numeric: [-500, 9000] },
      { key: "population", header: "population", aliases: ["habitants"], unit: "hab.", numeric: [0, 5e9] },
      { key: "annualDemandKwh", header: "demande_kwh_an", aliases: ["demande_annuelle_kwh"], unit: "kWh/an", numeric: [0, 1e15] },
      { key: "gridAccess", header: "acces_reseau", aliases: ["reseau", "grid_access"], unit: "oui/non" },
      { key: "dataSource", header: "source", aliases: ["data_source"] },
      { key: "dataPeriod", header: "periode", aliases: ["annee", "data_period"] },
      { key: "dataQuality", header: "qualite", aliases: ["data_quality"] },
      C.description,
    ],
  },
};

type ParsedRow = { values: Record<string, string>; errors: string[]; duplicate: boolean };

function parseCsv(content: string): string[][] {
  const text = content.replace(/^\uFEFF/, "");
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

const normalize = (v: string) => v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_");
const cellText = (v: unknown) => (v === null || v === undefined ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

function validate(values: Record<string, string>, columns: Column[]): string[] {
  const errors: string[] = [];
  for (const col of columns) {
    const raw = values[col.key]?.trim() ?? "";
    if (col.required && !raw) errors.push(`${col.header} manquant`);
    if (raw && col.numeric) {
      const n = Number(raw.replace(/\s/g, "").replace(",", "."));
      if (!Number.isFinite(n)) errors.push(`${col.header} non numérique`);
      else if (n < col.numeric[0] || n > col.numeric[1]) errors.push(`${col.header} hors bornes`);
    }
  }
  if (values["name"] && values["name"].trim().length < 2) errors.push("nom trop court");
  const type = values["localityType"]?.trim().toLowerCase();
  if (type && !LOCALITY_TYPES.some((t) => t.value === type)) errors.push(`type « ${values["localityType"]} » inconnu`);
  const grid = values["gridAccess"]?.trim().toLowerCase();
  if (grid && !["oui", "non", "true", "false", "1", "0", "yes", "no"].includes(grid)) errors.push("acces_reseau illisible");
  if (values["iso2"] && values["iso2"].length !== 2) errors.push("iso2 ≠ 2 lettres");
  if (values["iso3"] && values["iso3"].length !== 3) errors.push("iso3 ≠ 3 lettres");
  return errors;
}

function ImportPage() {
  const queryClient = useQueryClient();
  const [level, setLevel] = useState<ImportLevel>("countries");
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<Array<{ sheet: string; data: unknown[][] }>>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [table, setTable] = useState<string[][]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [batchSource, setBatchSource] = useState("");
  const [batchPeriod, setBatchPeriod] = useState("");

  const columns = LEVELS[level].columns;

  // Analyse des colonnes
  const headers = (table[0] ?? []).map((h) => normalize(h));
  const mapping = headers.map((h) => columns.find((c) => c.header === h || c.key.toLowerCase() === h || c.aliases.includes(h))?.key ?? null);
  const unknownHeaders = (table[0] ?? []).filter((_, i) => mapping[i] === null && table[0]![i]!.trim() !== "");
  const missingRequired = table.length > 0 ? columns.filter((c) => c.required && !mapping.includes(c.key)).map((c) => c.header) : [];

  const seen = new Set<string>();
  const rows: ParsedRow[] = missingRequired.length > 0 ? [] : table.slice(1, 5001).map((cells) => {
    const values: Record<string, string> = {};
    mapping.forEach((key, i) => { if (key) values[key] = (cells[i] ?? "").trim(); });
    const dupKey = `${(values["parent"] ?? "").toLowerCase()}|${(values["name"] ?? "").toLowerCase()}`;
    const duplicate = seen.has(dupKey);
    seen.add(dupKey);
    return { values, errors: validate(values, columns), duplicate };
  });
  const valid = rows.filter((r) => r.errors.length === 0 && !r.duplicate);

  const reset = () => { setConfirmed(false); importMutation.reset(); };

  const onFile = async (file: File) => {
    setParseError(null); reset(); setSheets([]); setTable([]); setSheetIndex(0);
    if (file.size > 10 * 1024 * 1024) { setParseError("Fichier trop volumineux (10 Mo maximum)."); return; }
    try {
      if (/\.xlsx$/i.test(file.name)) {
        const { default: readXlsxFile } = await import("read-excel-file/browser");
        const result = await readXlsxFile(file);
        if (result.length === 0) throw new Error("Classeur vide.");
        setSheets(result as never);
        setTable(result[0]!.data.map((r) => r.map(cellText)));
      } else if (/\.(csv|txt)$/i.test(file.name)) {
        setTable(parseCsv(await file.text()));
      } else {
        throw new Error("Format non pris en charge : utilisez .csv ou .xlsx (les anciens .xls doivent être réenregistrés en .xlsx).");
      }
      setFileName(file.name);
    } catch (err) {
      setParseError((err as Error).message || "Le fichier n’a pas pu être lu.");
    }
  };

  const chooseSheet = (index: number) => { setSheetIndex(index); reset(); setTable((sheets[index]?.data ?? []).map((r) => r.map(cellText))); };

  const downloadTemplate = () => {
    const csv = "\uFEFF" + columns.map((c) => c.header).join(";") + "\n";
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `modele-import-${level}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const importMutation = useMutation({
    mutationFn: () =>
      importTerritories({
        data: {
          level,
          rows: valid.map(({ values }) => {
            const grid = values["gridAccess"]?.toLowerCase();
            const out: Record<string, unknown> = { ...values };
            for (const col of columns) if (col.numeric && values[col.key]) out[col.key] = values[col.key]!.replace(/\s/g, "").replace(",", ".");
            if (level === "localities") {
              out["gridAccess"] = grid ? ["oui", "true", "1", "yes"].includes(grid) : null;
              out["localityType"] = values["localityType"]?.toLowerCase() || undefined;
              if (!values["dataSource"] && batchSource.trim()) out["dataSource"] = batchSource.trim();
              if (!values["dataPeriod"] && batchPeriod.trim()) out["dataPeriod"] = batchPeriod.trim();
            }
            return out;
          }),
        } as never,
      }),
    onSuccess: async () => {
      await Promise.all(["countries", "regions", "departments", "localities", "territory-summary"].map((k) => queryClient.invalidateQueries({ queryKey: [k] })));
    },
  });

  return (
    <WorkspacePage eyebrow="Territoires / Import contrôlé" title="Import CSV / Excel" description="Fichier → analyse des colonnes → contrôle des valeurs et doublons → prévisualisation → validation humaine → insertion en brouillon.">
      <div className="mb-5 flex flex-wrap gap-2">
        {(Object.keys(LEVELS) as ImportLevel[]).map((key, i) => (
          <Button key={key} variant={level === key ? "default" : "outline"} size="sm" onClick={() => { setLevel(key); reset(); }}>
            {i + 1}. {LEVELS[key].label}
          </Button>
        ))}
      </div>
      <p className="mb-5 border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
        Ordre recommandé : Pays → Régions → Départements → Localités. {LEVELS[level].hint}
      </p>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background px-6 py-10 text-center hover:border-primary">
            <FileUp className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">{fileName ?? `Choisir un fichier CSV ou Excel — ${LEVELS[level].label}`}</span>
            <span className="text-xs text-muted-foreground">.csv (séparateur « ; » ou « , », UTF-8) ou .xlsx — 5 000 lignes, 10 Mo maximum. Première ligne = en-têtes.</span>
            <input type="file" accept=".csv,.txt,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
          </label>

          {sheets.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="font-medium">Feuille :</span>
              <select className="h-9 border border-input bg-background px-2" value={sheetIndex} onChange={(e) => chooseSheet(Number(e.target.value))}>
                {sheets.map((s, i) => <option key={s.sheet} value={i}>{s.sheet}</option>)}
              </select>
            </label>
          )}
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {missingRequired.length > 0 && <p className="text-sm text-destructive">Colonne(s) obligatoire(s) introuvable(s) pour {LEVELS[level].label.toLowerCase()} : {missingRequired.join(", ")}.</p>}
          {unknownHeaders.length > 0 && <p className="text-sm text-muted-foreground">Colonnes ignorées (non reconnues) : {unknownHeaders.join(", ")}</p>}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="border border-border bg-background px-3 py-1.5">{rows.length} ligne(s) lue(s)</span>
                <span className="border border-border bg-background px-3 py-1.5">{valid.length} prête(s)</span>
                <span className="border border-border bg-background px-3 py-1.5">{rows.filter((r) => r.duplicate).length} doublon(s) dans le fichier</span>
                <span className="border border-border bg-background px-3 py-1.5">{rows.filter((r) => r.errors.length > 0).length} en erreur</span>
              </div>
              <div className="max-h-[520px] overflow-auto border border-border bg-background">
                <table className="w-full min-w-[900px] text-xs">
                  <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Ligne</th>
                      <th className="px-3 py-2">État</th>
                      {columns.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2">{c.header}{c.unit ? ` (${c.unit})` : ""}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-muted-foreground">{i + 2}</td>
                        <td className="whitespace-nowrap px-3 py-2">
                          {row.errors.length > 0 ? (
                            <span className="flex items-center gap-1 text-destructive"><TriangleAlert className="h-3.5 w-3.5" />{row.errors.join(" · ")}</span>
                          ) : row.duplicate ? (
                            <span className="text-muted-foreground">Doublon ignoré</span>
                          ) : (
                            <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Valide</span>
                          )}
                        </td>
                        {columns.map((c) => <td key={c.key} className="px-3 py-2">{row.values[c.key] || "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="h-fit space-y-4 border border-border bg-background p-5">
          <h2 className="text-sm font-semibold">Validation humaine — {LEVELS[level].label}</h2>
          {level === "localities" && (
            <>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Source commune (si la colonne est vide)</span>
                <input className="h-9 border border-input bg-background px-3" placeholder="Ex. Recensement national, INS" value={batchSource} onChange={(e) => setBatchSource(e.target.value)} />
              </label>
              <label className="grid gap-1.5 text-sm">
                <span className="font-medium">Période commune (si la colonne est vide)</span>
                <input className="h-9 border border-input bg-background px-3" placeholder="Ex. 2021" value={batchPeriod} onChange={(e) => setBatchPeriod(e.target.value)} />
              </label>
            </>
          )}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>J’ai vérifié les valeurs, leurs unités et leur provenance. Les lignes seront enregistrées en statut « Brouillon ».</span>
          </label>
          <Button className="w-full" disabled={!confirmed || valid.length === 0 || importMutation.isPending || importMutation.isSuccess} onClick={() => importMutation.mutate()}>
            {importMutation.isPending ? "Import en cours…" : `Importer ${valid.length} ligne(s)`}
          </Button>
          {importMutation.isError && <p className="text-sm text-destructive">{(importMutation.error as Error).message}</p>}
          {importMutation.data && (
            <div className="text-sm">
              <p className="font-medium text-primary">{importMutation.data.inserted} enregistrement(s) inséré(s).</p>
              {importMutation.data.skipped.length > 0 && (
                <>
                  <p className="mt-2 font-medium">{importMutation.data.skipped.length} ligne(s) refusée(s) :</p>
                  <ul className="mt-1 max-h-48 list-disc overflow-auto pl-5 text-muted-foreground">
                    {importMutation.data.skipped.map((s, i) => <li key={i}>Ligne {s.line} — {s.name} : {s.reason}</li>)}
                  </ul>
                </>
              )}
            </div>
          )}
          <div className="space-y-2 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Colonnes attendues</p>
            <p>{columns.map((c) => `${c.header}${c.required ? " *" : ""}`).join(", ")}</p>
            {level === "localities" && <p>Types de zone : {LOCALITY_TYPES.map((t) => t.value).join(", ")}.</p>}
            <Button variant="outline" size="sm" className="w-full" onClick={downloadTemplate}><Download />Télécharger le modèle</Button>
          </div>
        </aside>
      </div>
    </WorkspacePage>
  );
}
