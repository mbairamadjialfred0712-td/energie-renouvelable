import { useState } from "react";
import { Search, SlidersHorizontal, Plus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePage, EmptyState } from "./page";

export type ModuleField = { label: string; unit?: string; required?: boolean };
export function ModulePage({ eyebrow, title, description, fields, note }: { eyebrow: string; title: string; description: string; fields: ModuleField[]; note?: string }) {
  const [creating, setCreating] = useState(false);
  return <WorkspacePage eyebrow={eyebrow} title={title} description={description} action={<Button className="shrink-0" onClick={() => setCreating(true)}><Plus />Nouveau</Button>}>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="min-w-0"><div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border border-border bg-background p-3"><div className="relative min-w-0"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/><Input className="pl-9" placeholder={`Rechercher dans ${title.toLowerCase()}`} /></div><Button size="icon" variant="outline" title="Filtres"><SlidersHorizontal /></Button></div>
        <div className="mt-4"><EmptyState title={`Aucune donnée — ${title}`} description="Les données validées apparaîtront ici avec leur source, leur période et leur niveau de qualité." onAction={() => setCreating(true)} /></div></section>
      <aside className="border border-border bg-background p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary"/>Traçabilité requise</div><p className="mt-3 text-sm leading-6 text-muted-foreground">{note ?? "Toute donnée doit conserver son unité, sa source, sa période et son statut de validation."}</p></aside>
    </div>
    {creating && <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onMouseDown={() => setCreating(false)}><form className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border border-border bg-background shadow-panel" onMouseDown={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); setCreating(false); }}><div className="border-b border-border px-6 py-5"><h2 className="text-lg font-semibold">Nouvel enregistrement</h2><p className="mt-1 text-sm text-muted-foreground">Renseignez uniquement des valeurs vérifiables. Les champs scientifiques ne sont pas préremplis.</p></div><div className="grid gap-4 p-6 sm:grid-cols-2">{fields.map((field) => <label key={field.label} className="grid gap-1.5 text-sm font-medium"><span>{field.label}{field.unit ? ` (${field.unit})` : ""}</span><Input required={field.required} placeholder="À renseigner" /></label>)}</div><div className="flex justify-end gap-2 border-t border-border px-6 py-4"><Button type="button" variant="outline" onClick={() => setCreating(false)}>Annuler</Button><Button type="submit">Enregistrer comme brouillon</Button></div></form></div>}
  </WorkspacePage>;
}
