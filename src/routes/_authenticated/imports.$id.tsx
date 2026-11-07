import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileText, Play, Trash2, XCircle } from "lucide-react";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getImport, updateImportMeta, saveExtraction, saveCorrections, setImportStatus, deleteImport } from "@/lib/imports.functions";
import { listProjects } from "@/lib/projects.functions";
import { listLocalities } from "@/lib/geography.functions";
import {
  IMPORT_CATEGORIES, IMPORT_STATUS_LABELS, detectImportFormat, formatBytes, importStatus,
  parseCorrectedData, parseExtractedData, type CorrectedField, type ImportCategory,
} from "@/features/imports/import-model";
import { extractDocument } from "@/features/imports/extract";

const searchSchema = z.object({ category: z.string().optional(), status: z.string().optional(), q: z.string().optional });

export const Route = createFileRoute("/_authenticated/imports/$id")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({ meta: [
    { title: "Document importé — Énergie Renouvelable" },
    { name: "description", content: "Prévisualisation, extraction, vérification et validation humaine d'un document importé." },
    { property: "og:title", content: "Document importé — Énergie Renouvelable" },
    { property: "og:description", content: "Prévisualisation, extraction, vérification et validation humaine d'un document importé." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ImportDetailPage,
});

function ImportDetailPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [corrections, setCorrections] = useState<CorrectedField[] | null>(null);
  const [meta, setMeta] = useState<{ category: ImportCategory; project_id: string; locality_id: string } | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["imports", "detail", id], queryFn: () => getImport({ data: { id } }) });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const { data: localities } = useQuery({ queryKey: ["localities"], queryFn: () => listLocalities() });

  const backSearch = { category: search.category, status: search.status, q: search.q };

  if (isLoading) return <WorkspacePage eyebrow="Données / Importations" title="Chargement…" description=""><p className="text-sm text-muted-foreground">Chargement du document…</p></WorkspacePage>;
  if (!data) return <WorkspacePage eyebrow="Données / Importations" title="Document introuvable" description="Ce document n'existe pas ou n'est pas accessible."><Link to="/imports" search={backSearch} className="text-primary">← Retour aux importations</Link></WorkspacePage>;

  const item = data.item as {
    id: string; file_name: string; mime_type: string; size_bytes: number; category: string;
    project_id: string | null; locality_id: string | null; workflow_step: string; validation_status: string;
    extracted_data: unknown; corrected_data: unknown; error_message: string | null; created_at: string;
    projects: { name: string } | null; localities: { name: string } | null;
  };
  const format = detectImportFormat(item.file_name, item.mime_type);
  const status = importStatus(item);
  const extracted = parseExtractedData(item.extracted_data);
  const savedCorrections = parseCorrectedData(item.corrected_data);
  const editedCorrections = corrections ?? savedCorrections;
  const editedMeta = meta ?? { category: (item.category in IMPORT_CATEGORIES ? item.category : "autre") as ImportCategory, project_id: item.project_id ?? "", locality_id: item.locality_id ?? "" };
  const metaDirty = meta !== null && (meta.category !== item.category || (meta.project_id || null) !== item.project_id || (meta.locality_id || null) !== item.locality_id);
  const pending = item.validation_status === "pending";

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true); setError("");
    try { await fn(); await queryClient.invalidateQueries({ queryKey: ["imports"] }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  };

  const runExtraction = () => run(async () => {
    if (!format) throw new Error("Format non pris en charge pour l'extraction.");
    if (!data.signedUrl) throw new Error("Le fichier n'est pas accessible pour la lecture.");
    setExtracting(true);
    try {
      const response = await fetch(data.signedUrl);
      if (!response.ok) throw new Error("Le fichier n'a pas pu être téléchargé pour l'extraction.");
      const result = await extractDocument(format, await response.blob(), item.file_name);
      await saveExtraction({ data: { id, extracted_data: result } });
    } finally { setExtracting(false); }
  });

  const saveMeta = () => run(async () => {
    await updateImportMeta({ data: { id, category: editedMeta.category, project_id: editedMeta.project_id || null, locality_id: editedMeta.locality_id || null } });
    setMeta(null);
  });

  const saveCorr = () => run(async () => {
    await saveCorrections({ data: { id, corrected_data: editedCorrections } });
    setCorrections(null);
  });

  return (
    <WorkspacePage
      eyebrow="Données / Importations"
      title={item.file_name}
      description={`${IMPORT_CATEGORIES[editedMeta.category]} · ${formatBytes(item.size_bytes)} · importé le ${new Date(item.created_at).toLocaleString("fr-FR")} · statut : ${IMPORT_STATUS_LABELS[status]}`}
      action={<Button asChild variant="outline" size="sm"><Link to="/imports" search={backSearch}><ArrowLeft />Retour</Link></Button>}
    >
      {error && <p className="mb-4 border border-destructive bg-background px-4 py-3 text-sm text-destructive">{error}</p>}
      {item.error_message && <p className="mb-4 border border-border bg-muted px-4 py-3 text-sm">{item.error_message}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="min-w-0 space-y-4">
          <section className="border border-border bg-background p-5">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Document original</h2>
            {data.signedUrl && format === "pdf" ? (
              <iframe title="Prévisualisation du document" src={data.signedUrl} className="h-[480px] w-full border border-border" />
            ) : data.signedUrl ? (
              <a href={data.signedUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary underline-offset-2 hover:underline">
                <FileText className="h-4 w-4" />Ouvrir le fichier (lien signé, 5 minutes)
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Le fichier n'est pas accessible.</p>
            )}
          </section>

          <section className="border border-border bg-background p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Extraction — proposition de lecture</h2>
              {pending && (
                <Button variant="outline" size="sm" disabled={busy || extracting || !data.signedUrl} onClick={() => void runExtraction()}>
                  <Play />{extracting ? "Extraction…" : extracted ? "Relire le document" : "Extraire le contenu"}
                </Button>
              )}
            </div>
            {!extracted && <p className="text-sm text-muted-foreground">Aucune extraction enregistrée. L'extraction restitue le texte ou le tableau lu, sans deviner de valeurs ni d'unités.</p>}
            {extracted?.kind === "text" && (
              <>
                {extracted.ocr_needed && <p className="mb-2 border border-border bg-muted px-3 py-2 text-sm">Document probablement scanné ou sans texte lisible : un traitement OCR externe serait nécessaire. Aucune valeur n'a été devinée.</p>}
                {extracted.truncated && <p className="mb-2 text-xs text-muted-foreground">Texte tronqué à la limite de sécurité.</p>}
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap border border-border bg-muted p-3 text-xs leading-5">{extracted.text || "(aucun texte lisible)"}</pre>
                {extracted.pages !== null && <p className="mt-2 text-xs text-muted-foreground">{extracted.pages} page(s).</p>}
              </>
            )}
            {extracted?.kind === "table" && (
              <>
                <p className="mb-2 text-xs text-muted-foreground">{extracted.total_rows} ligne(s) lue(s){extracted.truncated ? ` — affichage limité aux ${extracted.rows.length} premières` : ""}. Première ligne lue comme en-têtes.</p>
                <div className="max-h-[420px] overflow-auto border border-border">
                  <table className="w-full min-w-[600px] text-xs">
                    <thead className="sticky top-0 bg-muted text-left uppercase tracking-wide text-muted-foreground">
                      <tr>{extracted.columns.map((c, i) => <th key={i} className="whitespace-nowrap px-3 py-2">{c}</th>)}</tr>
                    </thead>
                    <tbody>
                      {extracted.rows.map((r, i) => <tr key={i} className="border-t border-border">{extracted.columns.map((_, j) => <td key={j} className="px-3 py-1.5">{r[j] || "—"}</td>)}</tr>)}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="border border-border bg-background p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Valeurs relues et corrigées</h2>
              {pending && (
                <Button variant="outline" size="sm" onClick={() => setCorrections([...editedCorrections, { label: "", value: "", unit: "", note: "" }])}>Ajouter une valeur</Button>
              )}
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Saisissez uniquement des valeurs relues dans le document, avec leur unité telle qu'écrite et leur emplacement (page, tableau). N'écrivez rien qui ne figure pas dans le document.</p>
            {editedCorrections.length === 0 && <p className="text-sm text-muted-foreground">Aucune valeur saisie.</p>}
            <div className="space-y-2">
              {editedCorrections.map((field, i) => (
                <div key={i} className="grid gap-2 border border-border p-3 sm:grid-cols-[1fr_1fr_120px_1fr_auto]">
                  <Input aria-label="Libellé" placeholder="Libellé (ex. GHI)" value={field.label} disabled={!pending} onChange={(e) => setCorrections(editedCorrections.map((f, j) => (j === i ? { ...f, label: e.target.value } : f)))} />
                  <Input aria-label="Valeur" placeholder="Valeur" value={field.value} disabled={!pending} onChange={(e) => setCorrections(editedCorrections.map((f, j) => (j === i ? { ...f, value: e.target.value } : f)))} />
                  <Input aria-label="Unité" placeholder="Unité" value={field.unit} disabled={!pending} onChange={(e) => setCorrections(editedCorrections.map((f, j) => (j === i ? { ...f, unit: e.target.value } : f)))} />
                  <Input aria-label="Provenance" placeholder="Provenance (page, tableau)" value={field.note} disabled={!pending} onChange={(e) => setCorrections(editedCorrections.map((f, j) => (j === i ? { ...f, note: e.target.value } : f)))} />
                  {pending && <Button variant="ghost" size="icon" title="Retirer" onClick={() => setCorrections(editedCorrections.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
            </div>
            {pending && corrections !== null && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" disabled={busy} onClick={() => void saveCorr()}>Enregistrer les corrections</Button>
                <Button size="sm" variant="outline" onClick={() => setCorrections(null)}>Annuler</Button>
              </div>
            )}
          </section>
        </section>

        <aside className="h-fit space-y-4">
          <section className="border border-border bg-background p-5 text-sm">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Classification</h2>
            <div className="space-y-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Catégorie</span>
                <select className="h-9 border border-input bg-background px-2" value={editedMeta.category} disabled={!pending} onChange={(e) => setMeta({ ...editedMeta, category: e.target.value as ImportCategory })}>
                  {Object.entries(IMPORT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Projet associé</span>
                <select className="h-9 border border-input bg-background px-2" value={editedMeta.project_id} disabled={!pending} onChange={(e) => setMeta({ ...editedMeta, project_id: e.target.value })}>
                  <option value="">Aucun</option>
                  {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">Localité associée</span>
                <select className="h-9 border border-input bg-background px-2" value={editedMeta.locality_id} disabled={!pending} onChange={(e) => setMeta({ ...editedMeta, locality_id: e.target.value })}>
                  <option value="">Aucune</option>
                  {(localities ?? []).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </label>
              {metaDirty && <Button size="sm" disabled={busy} onClick={() => void saveMeta()}>Enregistrer la classification</Button>}
            </div>
          </section>

          <section className="border border-border bg-background p-5 text-sm">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Validation humaine</h2>
            <p className="mb-3 text-xs leading-5 text-muted-foreground">La validation confirme que les valeurs relues correspondent au document. Elle ne valide pas scientifiquement les données elles-mêmes.</p>
            {data.canValidate && pending && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={busy} onClick={() => void run(() => setImportStatus({ data: { id, status: "validated" } }))}><CheckCircle2 />Valider</Button>
                <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => setImportStatus({ data: { id, status: "rejected" } }))}><XCircle />Rejeter</Button>
              </div>
            )}
            {data.canValidate && item.validation_status === "rejected" && (
              <Button size="sm" variant="outline" disabled={busy} onClick={() => void run(() => setImportStatus({ data: { id, status: "pending" } }))}>Remettre en vérification</Button>
            )}
            {!data.canValidate && <p className="text-xs text-muted-foreground">La validation est réservée aux ingénieurs et administrateurs.</p>}
            {pending && (
              <Button size="sm" variant="ghost" className="mt-3 text-destructive" disabled={busy} onClick={() => void run(async () => { await deleteImport({ data: { id } }); window.history.back(); })}><Trash2 />Supprimer le document</Button>
            )}
          </section>

          <section className="border border-border bg-background p-5 text-sm">
            <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Historique</h2>
            {data.history.length === 0 && <p className="text-xs text-muted-foreground">Aucun événement enregistré.</p>}
            <ul className="space-y-2 text-xs">
              {data.history.map((h) => (
                <li key={h.id} className="border-l-2 border-border pl-3">
                  <span className="font-medium">{h.action === "created" ? "Import" : h.action === "status" ? "Changement de statut" : "Modification"}</span>
                  <span className="ml-2 text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
                  {h.changes && h.action !== "created" && (
                    <span className="block text-muted-foreground">{Object.keys(h.changes).filter((k) => !["extracted_data", "corrected_data"].includes(k)).join(", ") || "données d'extraction / corrections"}</span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </aside>
      </div>
    </WorkspacePage>
  );
}
