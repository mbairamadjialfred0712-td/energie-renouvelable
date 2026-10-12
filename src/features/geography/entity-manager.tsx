import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { WorkspacePage, EmptyState } from "@/components/app/page";

export type FormValues = Record<string, string>;

export type FieldDef = {
  key: string;
  label: string;
  unit?: string;
  required?: boolean;
  type: "text" | "number" | "date" | "textarea" | "select" | "boolean";
  options?: ReadonlyArray<{ value: string; label: string }>;
  help?: string;
  colSpan?: 1 | 2;
};

export type ColumnDef<Row> = { label: string; render: (row: Row) => ReactNode };

export const STATUS_FIELD: FieldDef = {
  key: "status",
  label: "Statut de l’enregistrement",
  type: "select",
  options: [
    { value: "draft", label: "Brouillon" },
    { value: "active", label: "Actif" },
    { value: "archived", label: "Archivé" },
  ],
};

export const STATUS_LABELS: Record<string, string> = { draft: "Brouillon", active: "Actif", archived: "Archivé" };

export function text(value: unknown, fallback = "—") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

export function numberText(value: unknown, unit?: string) {
  if (value === null || value === undefined || value === "") return "—";
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 4 }).format(Number(value));
  return unit ? `${formatted} ${unit}` : formatted;
}

type Props<Row> = {
  eyebrow: string;
  title: string;
  description: string;
  note?: string;
  queryKey: string[];
  fetcher: () => Promise<Row[]>;
  saver: (values: FormValues, editingId: string | null) => Promise<unknown>;
  remover: (row: Row) => Promise<unknown>;
  fields: FieldDef[];
  columns: ColumnDef<Row>[];
  toForm: (row: Row) => FormValues;
  emptyForm: FormValues;
  searchText: (row: Row) => string;
  rowId: (row: Row) => string;
  rowLabel: (row: Row) => string;
  disabled?: { reason: string } | null;
  invalidate?: string[][];
  rowActions?: (row: Row) => ReactNode;
  children?: ReactNode;
};

export function EntityManager<Row>({
  eyebrow,
  title,
  description,
  note,
  queryKey,
  fetcher,
  saver,
  remover,
  fields,
  columns,
  toForm,
  emptyForm,
  searchText,
  rowId,
  rowLabel,
  disabled,
  invalidate = [],
  rowActions,
  children,
}: Props<Row>) {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey, queryFn: fetcher });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Row | null>(null);

  const refresh = async () => {
    await Promise.all([queryClient.invalidateQueries({ queryKey }), ...invalidate.map((key) => queryClient.invalidateQueries({ queryKey: key }))]);
  };

  const saveMutation = useMutation({
    mutationFn: () => saver(form, editingId),
    onSuccess: async () => {
      setOpen(false);
      setFormError(null);
      await refresh();
    },
    onError: (err: Error) => setFormError(err.message || "L’enregistrement a échoué."),
  });

  const deleteMutation = useMutation({
    mutationFn: (row: Row) => remover(row),
    onSuccess: async () => {
      setConfirming(null);
      await refresh();
    },
    onError: (err: Error) => setFormError(err.message || "La suppression a échoué."),
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return data ?? [];
    return (data ?? []).filter((row) => searchText(row).toLowerCase().includes(needle));
  }, [data, search, searchText]);

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormError(null);
    setOpen(true);
  };

  const startEdit = (row: Row) => {
    setEditingId(rowId(row));
    setForm(toForm(row));
    setFormError(null);
    setOpen(true);
  };

  return (
    <WorkspacePage
      eyebrow={eyebrow}
      title={title}
      description={description}
      action={
        <Button className="shrink-0" onClick={startCreate} disabled={Boolean(disabled)}>
          <Plus />
          Nouveau
        </Button>
      }
    >
      {disabled && <p className="mb-5 border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">{disabled.reason}</p>}
      {error && <p className="mb-5 text-sm text-destructive">{(error as Error).message}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
        <section className="min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border border-border bg-background p-3">
            <div className="relative min-w-0">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={`Rechercher dans ${title.toLowerCase()}`} value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
            <Badge variant="outline" className="self-center">{rows.length} enregistrement(s)</Badge>
          </div>

          <div className="mt-4">
            {isLoading && <div className="border border-border bg-background p-8 text-sm text-muted-foreground">Chargement…</div>}
            {!isLoading && rows.length === 0 && (
              <EmptyState
                title={`Aucune donnée — ${title}`}
                description="Aucune valeur n’est préremplie. Saisissez uniquement des données vérifiables, avec leur source et leur période."
                actionLabel="Ajouter un enregistrement"
                {...(disabled ? {} : { onAction: startCreate })}
              />
            )}
            {!isLoading && rows.length > 0 && (
              <div className="overflow-x-auto border border-border bg-background">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      {columns.map((column) => (
                        <th key={column.label} className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>
                      ))}
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={rowId(row)} className="border-t border-border align-top">
                        {columns.map((column) => (
                          <td key={column.label} className="px-4 py-3">{column.render(row)}</td>
                        ))}
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            {rowActions?.(row)}
                            <Button size="icon" variant="ghost" title="Modifier" onClick={() => startEdit(row)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" title="Supprimer" onClick={() => { setFormError(null); setConfirming(row); }}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        <aside className="border border-border bg-background p-5">
          <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Traçabilité requise</div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {note ?? "Chaque donnée conserve son unité, sa source, sa période et son niveau de qualité. Aucune valeur n’est estimée automatiquement."}
          </p>
        </aside>
      </div>

      {children}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onMouseDown={() => setOpen(false)}>
          <form
            className="max-h-[85vh] w-full max-w-3xl overflow-y-auto border border-border bg-background shadow-panel"
            onMouseDown={(event) => event.stopPropagation()}
            onSubmit={(event) => { event.preventDefault(); saveMutation.mutate(); }}
          >
            <div className="border-b border-border px-6 py-5">
              <h2 className="text-lg font-semibold">{editingId ? "Modifier l’enregistrement" : "Nouvel enregistrement"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">Les champs scientifiques ne sont jamais préremplis. Laissez vide ce qui n’est pas connu.</p>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className={`grid gap-1.5 text-sm font-medium ${field.colSpan === 2 ? "sm:col-span-2" : ""}`}>
                  <span>
                    {field.label}
                    {field.unit ? ` (${field.unit})` : ""}
                    {field.required ? " *" : ""}
                  </span>
                  {field.type === "textarea" ? (
                    <Textarea rows={3} value={form[field.key] ?? ""} onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))} />
                  ) : field.type === "select" || field.type === "boolean" ? (
                    <select
                      className="h-10 border border-input bg-background px-3 text-sm"
                      required={field.required}
                      value={form[field.key] ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    >
                      <option value="">{field.type === "boolean" ? "Non renseigné" : "— Sélectionner —"}</option>
                      {(field.type === "boolean"
                        ? [{ value: "true", label: "Oui" }, { value: "false", label: "Non" }]
                        : field.options ?? []
                      ).map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      type={field.type}
                      step="any"
                      required={field.required}
                      placeholder="À renseigner"
                      value={form[field.key] ?? ""}
                      onChange={(event) => setForm((prev) => ({ ...prev, [field.key]: event.target.value }))}
                    />
                  )}
                  {field.help && <span className="text-xs font-normal text-muted-foreground">{field.help}</span>}
                </label>
              ))}
            </div>
            {formError && <p className="px-6 pb-2 text-sm text-destructive">{formError}</p>}
            <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          </form>
        </div>
      )}

      {confirming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onMouseDown={() => setConfirming(null)}>
          <div className="w-full max-w-md border border-border bg-background p-6 shadow-panel" onMouseDown={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold">Confirmer la suppression</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              « {rowLabel(confirming)} » sera supprimé définitivement. La suppression est refusée si des enregistrements dépendants existent encore.
            </p>
            {formError && <p className="mt-3 text-sm text-destructive">{formError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)}>Annuler</Button>
              <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(confirming)}>
                {deleteMutation.isPending ? "Suppression…" : "Supprimer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </WorkspacePage>
  );
}
