import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PROJECT_FIELD_TEMPLATES, PROJECT_SECTIONS, type ProjectDataField } from "./project-record";

export type ProjectEditorValue = {
  name: string;
  description: string;
  status: "draft" | "preliminary_study" | "feasibility" | "design" | "financing" | "procurement" | "implementation" | "completed";
  startDate: string | null;
  targetDate: string | null;
  fields: ProjectDataField[];
};

const STATUS_OPTIONS = [
  ["draft", "Brouillon"], ["preliminary_study", "Étude préliminaire"], ["feasibility", "Faisabilité"], ["design", "Conception"],
  ["financing", "Financement"], ["procurement", "Approvisionnement"], ["implementation", "Mise en œuvre"], ["completed", "Terminé"],
] as const;

export function createEditorValue(initial?: Partial<ProjectEditorValue>): ProjectEditorValue {
  const existing = new Map((initial?.fields ?? []).map((field) => [field.fieldKey, field]));
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    status: initial?.status ?? "draft",
    startDate: initial?.startDate ?? null,
    targetDate: initial?.targetDate ?? null,
    fields: PROJECT_FIELD_TEMPLATES.map((template) => ({ ...template, ...existing.get(template.fieldKey) })),
  };
}

export function ProjectEditor({ initialValue, submitLabel, busy, onSubmit }: { initialValue: ProjectEditorValue; submitLabel: string; busy: boolean; onSubmit: (value: ProjectEditorValue) => void }) {
  const [value, setValue] = useState(initialValue);
  const updateField = (fieldKey: string, patch: Partial<ProjectDataField>) => setValue((current) => ({ ...current, fields: current.fields.map((field) => field.fieldKey === fieldKey ? { ...field, ...patch } : field) }));
  const fieldGroups = useMemo(() => PROJECT_SECTIONS.map((section) => ({ section, fields: value.fields.filter((field) => field.section === section) })), [value.fields]);
  const canSave = value.name.trim().length >= 2;

  return <form onSubmit={(event) => { event.preventDefault(); if (canSave) onSubmit(value); }} className="space-y-7">
    <section className="border-b border-border pb-7">
      <div className="mb-5"><h2 className="text-lg font-semibold">Identité du projet</h2><p className="mt-1 text-sm text-muted-foreground">Les informations générales servent à identifier le dossier. Elles ne constituent pas des résultats d’étude.</p></div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2"><Label htmlFor="project-name">Nom du projet *</Label><Input id="project-name" value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} placeholder="Ex. Étude solaire du site Nord" required /></div>
        <div className="space-y-2 md:col-span-2"><Label htmlFor="project-description">Description</Label><Textarea id="project-description" value={value.description} onChange={(event) => setValue({ ...value, description: event.target.value })} rows={3} placeholder="Contexte et périmètre de l’étude" /></div>
        <div className="space-y-2"><Label>Statut</Label><Select value={value.status} onValueChange={(status: ProjectEditorValue["status"]) => setValue({ ...value, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STATUS_OPTIONS.map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="start-date">Début</Label><Input id="start-date" type="date" value={value.startDate ?? ""} onChange={(event) => setValue({ ...value, startDate: event.target.value || null })} /></div><div className="space-y-2"><Label htmlFor="target-date">Échéance</Label><Input id="target-date" type="date" value={value.targetDate ?? ""} onChange={(event) => setValue({ ...value, targetDate: event.target.value || null })} /></div></div>
      </div>
    </section>

    <section>
      <div className="mb-5"><h2 className="text-lg font-semibold">Données d’étude</h2><p className="mt-1 text-sm text-muted-foreground">Chaque valeur garde son unité, sa nature, sa source, sa période et son niveau de qualité.</p></div>
      <Tabs defaultValue={PROJECT_SECTIONS[0]}>
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted p-1">{PROJECT_SECTIONS.map((section) => <TabsTrigger key={section} value={section}>{section}</TabsTrigger>)}</TabsList>
        {fieldGroups.map(({ section, fields }) => <TabsContent key={section} value={section} className="mt-5 space-y-4">
          {fields.map((field) => <div key={field.fieldKey} className="border-b border-border pb-5 last:border-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><Label htmlFor={`${field.fieldKey}-value`}>{field.label}</Label><Select value={field.fieldKind} onValueChange={(fieldKind: ProjectDataField["fieldKind"]) => updateField(field.fieldKey, { fieldKind })}><SelectTrigger className="w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="provided">Donnée fournie</SelectItem><SelectItem value="assumption">Hypothèse</SelectItem></SelectContent></Select></div>
            <div className="grid gap-3 lg:grid-cols-[minmax(180px,1.4fr)_110px_minmax(160px,1fr)_150px_minmax(140px,0.8fr)]">
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Valeur</span><Input id={`${field.fieldKey}-value`} value={field.value} onChange={(event) => updateField(field.fieldKey, { value: event.target.value })} /></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Unité</span><Input value={field.unit} onChange={(event) => updateField(field.fieldKey, { unit: event.target.value })} /></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Source</span><Input value={field.source} onChange={(event) => updateField(field.fieldKey, { source: event.target.value })} placeholder="Organisme, fichier…" /></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Période</span><Input value={field.dataPeriod} onChange={(event) => updateField(field.fieldKey, { dataPeriod: event.target.value })} placeholder="2024 ou 2019–2024" /></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">Qualité</span><Input value={field.quality} onChange={(event) => updateField(field.fieldKey, { quality: event.target.value })} placeholder="Mesurée, estimée…" /></div>
            </div>
            <Textarea className="mt-3 min-h-16" value={field.notes} onChange={(event) => updateField(field.fieldKey, { notes: event.target.value })} placeholder="Notes de vérification ou limites connues" />
          </div>)}
        </TabsContent>)}
      </Tabs>
    </section>
    <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 py-4 backdrop-blur"><Button type="submit" disabled={!canSave || busy}><Save />{busy ? "Enregistrement…" : submitLabel}</Button></div>
  </form>;
}