import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EntityManager, numberText, text, type FieldDef, type FormValues } from "@/features/geography/entity-manager";
import { deleteResource, listLocalityOptions, listResources, runResourcePreAnalysis, saveResource, type AnalysisItem, type ResourceRow } from "@/lib/resources.functions";
import { RESOURCE_DETAILS, type ResourceType } from "./resource-types";

const VALIDATION_LABELS: Record<string, string> = { pending: "À vérifier", validated: "Validée", rejected: "Rejetée" };
const nullable = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

export function ResourceManager({ type, title, description }: { type: ResourceType; title: string; description: string }) {
  const config = RESOURCE_DETAILS[type];
  const queryClient = useQueryClient();
  const queryKey = ["resources", type];
  const { data: localities } = useQuery({ queryKey: ["locality-options"], queryFn: () => listLocalityOptions() });
  const [viewing, setViewing] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const analyse = useMutation({
    mutationFn: (id: string) => runResourcePreAnalysis({ data: { id } }),
    onMutate: (id) => { setAnalysisError(null); setViewing(id); },
    onError: (err: Error) => setAnalysisError(err.message),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  const fields: FieldDef[] = [
    { key: "locality_id", label: "Localité", type: "select", required: true, options: (localities ?? []).map((l) => ({ value: l.id, label: l.name })) },
    { key: "validation_status", label: "Statut de validation", type: "select", required: true, options: Object.entries(VALIDATION_LABELS).map(([value, label]) => ({ value, label })) },
    ...config.fields.map<FieldDef>((f) => ({ key: `d_${f.key}`, label: f.label, ...(f.unit ? { unit: f.unit } : {}), type: f.kind })),
    { key: "source", label: "Source", type: "text", required: true, help: "Ex. station de mesure, base satellitaire, rapport — avec organisme." },
    { key: "period", label: "Période des données", type: "text" },
    { key: "reference", label: "Référence (lien, document)", type: "text" },
    { key: "quality", label: "Qualité (mesure, estimation, modèle…)", type: "text" },
    { key: "notes", label: "Notes et hypothèses déclarées", type: "textarea", colSpan: 2 },
  ];

  const empty: FormValues = { validation_status: "pending" };
  const toForm = (row: ResourceRow): FormValues => ({
    locality_id: row.locality_id, validation_status: row.validation_status, source: row.source, period: row.period ?? "", reference: row.reference ?? "",
    quality: row.quality ?? "", notes: row.notes ?? "",
    ...Object.fromEntries(config.fields.map((f) => [`d_${f.key}`, row.detail[f.key] == null ? "" : String(row.detail[f.key])])),
  });

  const save = (values: FormValues, id: string | null) =>
    saveResource({
      data: {
        id, type, locality_id: values["locality_id"] ?? "", source: values["source"] ?? "", period: nullable(values["period"]), reference: nullable(values["reference"]),
        quality: nullable(values["quality"]), notes: nullable(values["notes"]), validation_status: (values["validation_status"] as "pending") || "pending",
        detail: Object.fromEntries(config.fields.map((f) => [f.key, values[`d_${f.key}`] ?? ""])),
      },
    });

  const rowsQuery = useQuery({ queryKey, queryFn: () => listResources({ data: { type } }) });
  const viewed = rowsQuery.data?.find((r) => r.id === viewing) ?? null;
  const shown = config.fields.slice(0, 3);

  return (
    <EntityManager<ResourceRow>
      eyebrow={`Ressources / ${config.label}`}
      title={title}
      description={description}
      note="Chaque valeur conserve son unité, sa source et sa période. La pré-analyse IA signale les manques et points à vérifier ; elle ne calcule aucun résultat et ne modifie aucune donnée."
      queryKey={queryKey}
      fetcher={() => listResources({ data: { type } })}
      saver={save}
      remover={(row) => deleteResource({ data: { id: row.id, type } })}
      fields={fields}
      columns={[
        { label: "Localité", render: (r) => <span className="font-medium">{text(r.locality_name)}</span> },
        ...shown.map((f) => ({ label: `${f.label}${f.unit ? ` (${f.unit})` : ""}`, render: (r: ResourceRow) => (f.kind === "number" ? numberText(r.detail[f.key]) : text(r.detail[f.key])) })),
        { label: "Source / période", render: (r) => <span className="text-muted-foreground">{r.source}{r.period ? ` · ${r.period}` : ""}</span> },
        { label: "Validation", render: (r) => <Badge variant={r.validation_status === "validated" ? "default" : "outline"}>{VALIDATION_LABELS[r.validation_status]}</Badge> },
        { label: "Pré-analyse", render: (r) => r.latest_analysis ? <button className="text-primary underline-offset-2 hover:underline" onClick={() => setViewing(r.id)}>{r.latest_analysis.status === "completed" ? "Voir" : r.latest_analysis.status === "running" ? "En cours" : "Échec"}</button> : <span className="text-muted-foreground">—</span> },
      ]}
      rowActions={(row) => (
        <Button size="icon" variant="ghost" title="Lancer la pré-analyse IA" disabled={analyse.isPending} onClick={() => analyse.mutate(row.id)}><Sparkles className="h-4 w-4" /></Button>
      )}
      toForm={toForm}
      emptyForm={empty}
      searchText={(r) => `${r.locality_name ?? ""} ${r.source} ${r.period ?? ""}`}
      rowId={(r) => r.id}
      rowLabel={(r) => `${config.label} — ${r.locality_name ?? ""}`}
      disabled={localities && localities.length === 0 ? { reason: "Enregistrez d’abord une localité dans Territoires." } : null}
    >
      {viewing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onMouseDown={() => setViewing(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-border bg-background shadow-panel" onMouseDown={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
              <div>
                <h2 className="text-lg font-semibold">Pré-analyse IA — {config.label} · {viewed?.locality_name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Analyse de complétude des données enregistrées. Aucun résultat énergétique n’est calculé ni inventé.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setViewing(null)} aria-label="Fermer"><X /></Button>
            </div>
            <div className="space-y-5 p-6 text-sm">
              {analyse.isPending && analyse.variables === viewing && <p className="text-muted-foreground">Analyse en cours… (quelques dizaines de secondes)</p>}
              {analysisError && <p className="text-destructive">{analysisError}</p>}
              {!analyse.isPending && viewed?.latest_analysis?.status === "completed" && (
                <>
                  <AnalysisList title="Informations manquantes" items={viewed.latest_analysis.missing_information} />
                  <AnalysisList title="Hypothèses déclarées" items={viewed.latest_analysis.declared_assumptions} />
                  <AnalysisList title="Points à vérifier" items={viewed.latest_analysis.verification_points} />
                  <p className="border-t border-border pt-4 text-xs text-muted-foreground">{viewed.latest_analysis.scope_note} — Modèle : {viewed.latest_analysis.model} · {new Date(viewed.latest_analysis.created_at).toLocaleString("fr-FR")}</p>
                </>
              )}
              {!analyse.isPending && viewed?.latest_analysis?.status === "failed" && <p className="text-destructive">{viewed.latest_analysis.error_message}</p>}
            </div>
          </div>
        </div>
      )}
    </EntityManager>
  );
}

function AnalysisList({ title, items }: { title: string; items: AnalysisItem[] }) {
  return (
    <section>
      <h3 className="font-semibold">{title} <span className="text-muted-foreground">({items.length})</span></h3>
      {items.length === 0 ? <p className="mt-1 text-muted-foreground">Aucun élément signalé.</p> : (
        <ul className="mt-2 space-y-2">
          {items.map((item, i) => (
            <li key={i} className="border-l-2 border-primary pl-3">
              <p className="font-medium">{item.title}</p>
              <p className="text-muted-foreground">{item.explanation}</p>
              {item.fieldReferences.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Champs : {item.fieldReferences.join(", ")}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
