import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, Search, Trash2 } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listImports, registerImport, deleteImport } from "@/lib/imports.functions";
import { listProjects } from "@/lib/projects.functions";
import {
  IMPORT_CATEGORIES, IMPORT_STATUS_LABELS, IMPORT_FORMATS, MAX_IMPORT_BYTES,
  detectImportFormat, formatBytes, importFileError, importStatus, importStoragePath,
  type ImportCategory, type ImportStatus,
} from "@/features/imports/import-model";

const searchSchema = z.object({
  category: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/imports")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({ meta: [
    { title: "Importation des documents — Énergie Renouvelable" },
    { name: "description", content: "Importez PDF, Excel, CSV ou Word, extrayez les données puis vérifiez-les avant toute utilisation." },
    { property: "og:title", content: "Importation des documents — Énergie Renouvelable" },
    { property: "og:description", content: "Importez PDF, Excel, CSV ou Word, extrayez les données puis vérifiez-les avant toute utilisation." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ImportsPage,
});

type UploadState = { fileName: string; progress: number; error: string | null } | null;

function ImportsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [upload, setUpload] = useState<UploadState>(null);
  const [category, setCategory] = useState<ImportCategory>("autre");
  const [projectId, setProjectId] = useState<string>("");

  const filters = {
    category: search.category && search.category in IMPORT_CATEGORIES ? (search.category as ImportCategory) : undefined,
    status: search.status && search.status in IMPORT_STATUS_LABELS ? (search.status as ImportStatus) : undefined,
    projectId: search.q ? undefined : undefined,
    query: search.q || undefined,
  };

  const { data: imports, isLoading } = useQuery({
    queryKey: ["imports", filters],
    queryFn: () => listImports({ data: filters }),
  });
  const { data: projects } = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });

  const setFilter = (patch: Record<string, string | undefined>) => {
    void navigate({ to: "/imports", search: { ...search, ...patch }, replace: true });
  };

  const uploadFile = (file: File) => {
    const error = importFileError(file.name, file.size, file.type);
    if (error) { setUpload({ fileName: file.name, progress: 0, error }); return; }
    setUpload({ fileName: file.name, progress: 0, error: null });
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Session expirée : reconnectez-vous.");
        const fileId = crypto.randomUUID();
        const path = importStoragePath(session.user.id, fileId, file.name);
        const url = `${import.meta.env["VITE_SUPABASE_URL"]}/storage/v1/object/project-imports/${path}`;
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhrRef.current = xhr;
          xhr.open("POST", url);
          xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
          xhr.setRequestHeader("apikey", import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]);
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) setUpload((u) => (u ? { ...u, progress: Math.round((e.loaded / e.total) * 100) } : u));
          };
          xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Dépôt refusé (${xhr.status}).`)));
          xhr.onerror = () => reject(new Error("Le dépôt a échoué (réseau)."));
          xhr.onabort = () => reject(new Error("Import annulé."));
          xhr.send(file);
        });
        await registerImport({
          data: {
            file_name: file.name, storage_path: path, mime_type: file.type || "application/octet-stream",
            size_bytes: file.size, category, project_id: projectId || null, locality_id: null,
          },
        });
        setUpload(null);
        await queryClient.invalidateQueries({ queryKey: ["imports"] });
      } catch (err) {
        setUpload({ fileName: file.name, progress: 0, error: (err as Error).message });
      } finally {
        xhrRef.current = null;
      }
    })();
  };

  const removeMutation = async (id: string) => {
    await deleteImport({ data: { id } });
    await queryClient.invalidateQueries({ queryKey: ["imports"] });
  };

  const formatsLabel = Object.values(IMPORT_FORMATS).map((f) => f.label).join(", ");

  return (
    <WorkspacePage eyebrow="Données / Importations" title="Importation des documents" description="Déposez un rapport ou un tableau de mesures, extrayez son contenu, puis vérifiez et validez les données avant toute utilisation. Aucune valeur extraite n'est validée automatiquement.">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          <div
            role="button"
            tabIndex={0}
            aria-label="Zone de dépôt de fichier"
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 border border-dashed px-6 py-10 text-center ${dragOver ? "border-primary bg-muted" : "border-border bg-background hover:border-primary"}`}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileRef.current?.click(); }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
          >
            <FileUp className="h-6 w-6 text-primary" />
            <span className="text-sm font-medium">Glissez un fichier ici ou cliquez pour le choisir</span>
            <span className="text-xs text-muted-foreground">{formatsLabel} — {Math.round(MAX_IMPORT_BYTES / 1024 / 1024)} Mo maximum. Le document reste privé.</span>
            <input ref={fileRef} type="file" className="sr-only" accept=".pdf,.xlsx,.csv,.txt,.docx" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />
          </div>

          <div className="flex flex-wrap items-end gap-3 border border-border bg-background p-3 text-sm">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Catégorie du prochain import</span>
              <select className="h-9 border border-input bg-background px-2" value={category} onChange={(e) => setCategory(e.target.value as ImportCategory)}>
                {Object.entries(IMPORT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-muted-foreground">Projet associé (facultatif)</span>
              <select className="h-9 border border-input bg-background px-2" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">Aucun</option>
                {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
          </div>

          {upload && (
            <div className="border border-border bg-background p-4 text-sm" role="status">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate font-medium">{upload.fileName}</span>
                {!upload.error && upload.progress < 100 && (
                  <Button variant="outline" size="sm" onClick={() => xhrRef.current?.abort()}>Annuler</Button>
                )}
              </div>
              {upload.error ? (
                <p className="mt-2 text-destructive">{upload.error}</p>
              ) : (
                <div className="mt-2 h-2 w-full bg-muted">
                  <div className="h-2 bg-primary transition-all" style={{ width: `${upload.progress}%` }} />
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 border border-border bg-background p-3">
            <div className="relative min-w-48 flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Rechercher un document" value={search.q ?? ""} onChange={(e) => setFilter({ q: e.target.value || undefined })} />
            </div>
            <select aria-label="Filtrer par catégorie" className="h-9 border border-input bg-background px-2 text-sm" value={filters.category ?? ""} onChange={(e) => setFilter({ category: e.target.value || undefined })}>
              <option value="">Toutes catégories</option>
              {Object.entries(IMPORT_CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select aria-label="Filtrer par statut" className="h-9 border border-input bg-background px-2 text-sm" value={filters.status ?? ""} onChange={(e) => setFilter({ status: e.target.value || undefined })}>
              <option value="">Tous statuts</option>
              {Object.entries(IMPORT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>

          {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!isLoading && (imports ?? []).length === 0 && (
            <p className="border border-dashed border-border bg-background px-6 py-10 text-center text-sm text-muted-foreground">Aucun document importé pour ces filtres.</p>
          )}
          {(imports ?? []).length > 0 && (
            <div className="overflow-auto border border-border bg-background">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Document</th>
                    <th className="px-3 py-2">Catégorie</th>
                    <th className="px-3 py-2">Projet</th>
                    <th className="px-3 py-2">Taille</th>
                    <th className="px-3 py-2">Statut</th>
                    <th className="px-3 py-2">Importé le</th>
                    <th className="px-3 py-2" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {(imports ?? []).map((row) => {
                    const status = importStatus({ validation_status: row.validation_status, extracted_data: row.has_extraction ? {} : null });
                    return (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <Link to="/imports/$id" params={{ id: row.id }} search={{ category: search.category, status: search.status, q: search.q }} className="font-medium text-primary underline-offset-2 hover:underline">
                            {row.file_name}
                          </Link>
                          <span className="ml-2 text-xs text-muted-foreground">{IMPORT_FORMATS[detectImportFormat(row.file_name, row.mime_type) ?? "pdf"]?.label}</span>
                        </td>
                        <td className="px-3 py-2">{IMPORT_CATEGORIES[(row.category as ImportCategory) ?? "autre"] ?? row.category}</td>
                        <td className="px-3 py-2">{(row.projects as { name: string } | null)?.name ?? "—"}</td>
                        <td className="px-3 py-2">{formatBytes(row.size_bytes)}</td>
                        <td className="px-3 py-2">{IMPORT_STATUS_LABELS[status]}</td>
                        <td className="px-3 py-2 text-muted-foreground">{new Date(row.created_at).toLocaleDateString("fr-FR")}</td>
                        <td className="px-3 py-2 text-right">
                          {row.validation_status !== "validated" && (
                            <Button variant="ghost" size="icon" title="Supprimer" onClick={() => void removeMutation(row.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="h-fit space-y-3 border border-border bg-background p-5 text-sm leading-6 text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">Pipeline d'importation</h2>
          <p>Fichier → stockage privé → extraction (proposition de lecture) → vérification et correction humaines → validation par un ingénieur ou un administrateur.</p>
          <p>L'extraction automatique ne devine aucune valeur : elle restitue le texte ou le tableau lu. Les unités ambiguës et les documents scannés sont signalés, jamais corrigés silencieusement.</p>
          <p>Aucune simulation ni analyse financière n'est déclenchée par un import.</p>
        </aside>
      </div>
    </WorkspacePage>
  );
}
