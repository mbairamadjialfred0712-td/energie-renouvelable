import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, TriangleAlert } from "lucide-react";
import { importLocalities, listDepartments, listLocalities, LOCALITY_TYPES } from "@/lib/geography.functions";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { metaFor } from "@/features/geography/form-helpers";

export const Route = createFileRoute("/_authenticated/geography/import")({
  head: () => metaFor("Import de localités", "Import contrôlé de localités depuis un fichier CSV avec prévisualisation et validation humaine."),
  component: ImportPage,
});

const COLUMNS = [
  { key: "name", label: "nom", unit: "", required: true },
  { key: "code", label: "code", unit: "" },
  { key: "localityType", label: "type", unit: "" },
  { key: "latitude", label: "latitude", unit: "°" },
  { key: "longitude", label: "longitude", unit: "°" },
  { key: "altitudeM", label: "altitude_m", unit: "m" },
  { key: "population", label: "population", unit: "hab." },
  { key: "annualDemandKwh", label: "demande_kwh_an", unit: "kWh/an" },
  { key: "gridAccess", label: "acces_reseau", unit: "oui/non" },
  { key: "dataSource", label: "source", unit: "" },
  { key: "dataPeriod", label: "periode", unit: "" },
  { key: "dataQuality", label: "qualite", unit: "" },
] as const;

type ParsedRow = { values: Record<string, string>; errors: string[]; duplicate: boolean };

function parseCsv(content: string): string[][] {
  const firstLine = content.split(/\r?\n/)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]!;
    if (quoted) {
      if (char === '"' && content[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === delimiter) { row.push(cell); cell = ""; }
    else if (char === "\n" || char === "\r") {
      if (char === "\r" && content[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

const normalizeHeader = (value: string) => value.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");

function validate(values: Record<string, string>): string[] {
  const errors: string[] = [];
  if (!values["name"] || values["name"].trim().length < 2) errors.push("Nom manquant");
  const num = (key: string, min: number, max: number, label: string) => {
    const raw = values[key]?.trim();
    if (!raw) return;
    const parsed = Number(raw.replace(",", "."));
    if (!Number.isFinite(parsed)) errors.push(`${label} non numérique`);
    else if (parsed < min || parsed > max) errors.push(`${label} hors bornes`);
  };
  num("latitude", -90, 90, "Latitude");
  num("longitude", -180, 180, "Longitude");
  num("altitudeM", -500, 9000, "Altitude");
  num("population", 0, 5e9, "Population");
  num("annualDemandKwh", 0, 1e15, "Demande");
  const type = values["localityType"]?.trim().toLowerCase();
  if (type && !LOCALITY_TYPES.some((t) => t.value === type)) errors.push(`Type « ${values["localityType"]} » inconnu`);
  const grid = values["gridAccess"]?.trim().toLowerCase();
  if (grid && !["oui", "non", "true", "false", "1", "0"].includes(grid)) errors.push("Accès réseau illisible");
  return errors;
}

function ImportPage() {
  const queryClient = useQueryClient();
  const { data: departments = [] } = useQuery({ queryKey: ["departments"], queryFn: () => listDepartments() });
  const { data: localities = [] } = useQuery({ queryKey: ["localities"], queryFn: () => listLocalities() });
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [unknownHeaders, setUnknownHeaders] = useState<string[]>([]);
  const [departmentId, setDepartmentId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const known = useMemo(() => new Set(localities.map((l) => l.name.trim().toLowerCase())), [localities]);

  const onFile = async (file: File) => {
    setParseError(null);
    setConfirmed(false);
    importMutation.reset();
    if (file.size > 5 * 1024 * 1024) { setParseError("Fichier trop volumineux (5 Mo maximum)."); return; }
    const content = await file.text();
    const table = parseCsv(content);
    if (table.length < 2) { setParseError("Le fichier doit contenir une ligne d’en-têtes et au moins une ligne de données."); return; }
    const headers = table[0]!.map(normalizeHeader);
    const mapping = headers.map((header) => COLUMNS.find((column) => column.label === header || column.key.toLowerCase() === header)?.key ?? null);
    if (!mapping.includes("name")) { setParseError("Colonne obligatoire « nom » introuvable."); return; }
    setUnknownHeaders(table[0]!.filter((_, index) => mapping[index] === null));
    const seen = new Set<string>();
    setRows(
      table.slice(1).slice(0, 2000).map((cells) => {
        const values: Record<string, string> = {};
        mapping.forEach((key, index) => { if (key) values[key] = (cells[index] ?? "").trim(); });
        const nameKey = (values["name"] ?? "").toLowerCase();
        const duplicate = known.has(nameKey) || seen.has(nameKey);
        seen.add(nameKey);
        return { values, errors: validate(values), duplicate };
      }),
    );
    setFileName(file.name);
  };

  const valid = rows.filter((row) => row.errors.length === 0 && !row.duplicate);

  const importMutation = useMutation({
    mutationFn: () =>
      importLocalities({
        data: {
          departmentId: departmentId || null,
          rows: valid.map(({ values }) => {
            const grid = values["gridAccess"]?.toLowerCase();
            return {
              ...values,
              localityType: values["localityType"]?.toLowerCase() || null,
              gridAccess: grid ? ["oui", "true", "1"].includes(grid) : null,
            };
          }),
        } as never,
      }),
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["localities"] }), queryClient.invalidateQueries({ queryKey: ["territory-summary"] })]);
    },
  });

  return (
    <WorkspacePage eyebrow="Territoires / Import contrôlé" title="Import de localités (CSV)" description="Téléversement → analyse des colonnes → détection des doublons → prévisualisation → validation humaine → insertion en brouillon.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-border bg-background px-6 py-10 text-center hover:border-primary">
            <FileUp className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">{fileName ?? "Choisir un fichier CSV"}</span>
            <span className="text-xs text-muted-foreground">Séparateur « ; » ou « , » — UTF-8 — 2 000 lignes maximum. Depuis Excel : « Enregistrer sous → CSV UTF-8 ».</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />
          </label>
          {parseError && <p className="text-sm text-destructive">{parseError}</p>}
          {unknownHeaders.length > 0 && <p className="text-sm text-muted-foreground">Colonnes ignorées (non reconnues) : {unknownHeaders.join(", ")}</p>}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-3 text-sm">
                <span className="border border-border bg-background px-3 py-1.5">{rows.length} ligne(s) lue(s)</span>
                <span className="border border-border bg-background px-3 py-1.5">{valid.length} prête(s) à importer</span>
                <span className="border border-border bg-background px-3 py-1.5">{rows.filter((r) => r.duplicate).length} doublon(s)</span>
                <span className="border border-border bg-background px-3 py-1.5">{rows.filter((r) => r.errors.length > 0).length} en erreur</span>
              </div>
              <div className="max-h-[520px] overflow-auto border border-border bg-background">
                <table className="w-full min-w-[900px] text-xs">
                  <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">État</th>
                      {COLUMNS.map((c) => <th key={c.key} className="whitespace-nowrap px-3 py-2">{c.label}{c.unit ? ` (${c.unit})` : ""}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t border-border">
                        <td className="whitespace-nowrap px-3 py-2">
                          {row.errors.length > 0 ? (
                            <span className="flex items-center gap-1 text-destructive"><TriangleAlert className="h-3.5 w-3.5" />{row.errors.join(" · ")}</span>
                          ) : row.duplicate ? (
                            <span className="text-muted-foreground">Doublon ignoré</span>
                          ) : (
                            <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-3.5 w-3.5" />Valide</span>
                          )}
                        </td>
                        {COLUMNS.map((c) => <td key={c.key} className="px-3 py-2">{row.values[c.key] || "—"}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>

        <aside className="h-fit space-y-4 border border-border bg-background p-5">
          <h2 className="text-sm font-semibold">Validation humaine</h2>
          <label className="grid gap-1.5 text-sm">
            <span className="font-medium">Rattacher au département (facultatif)</span>
            <select className="h-10 border border-input bg-background px-3 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Aucun rattachement</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            <span>J’ai vérifié les valeurs, leurs unités et leurs sources. Les lignes seront enregistrées en statut « Brouillon ».</span>
          </label>
          <Button className="w-full" disabled={!confirmed || valid.length === 0 || importMutation.isPending || importMutation.isSuccess} onClick={() => importMutation.mutate()}>
            {importMutation.isPending ? "Import en cours…" : `Importer ${valid.length} localité(s)`}
          </Button>
          {importMutation.isError && <p className="text-sm text-destructive">{(importMutation.error as Error).message}</p>}
          {importMutation.data && (
            <div className="text-sm">
              <p className="font-medium text-primary">{importMutation.data.inserted} localité(s) insérée(s).</p>
              {importMutation.data.skipped.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-muted-foreground">{importMutation.data.skipped.map((s, i) => <li key={i}>{s.name} : {s.reason}</li>)}</ul>
              )}
            </div>
          )}
          <div className="border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
            <p className="font-semibold text-foreground">Colonnes reconnues</p>
            <p className="mt-1">{COLUMNS.map((c) => c.label).join(", ")}. Seule « nom » est obligatoire.</p>
            <p className="mt-1">Types de zone : {LOCALITY_TYPES.map((t) => t.value).join(", ")}.</p>
          </div>
        </aside>
      </div>
    </WorkspacePage>
  );
}
