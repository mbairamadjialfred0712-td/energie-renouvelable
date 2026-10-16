import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { saveDatasheet } from "@/lib/storage.functions";
import { APPLICATIONS, CHEMISTRIES, FIELDS, GROUPS, METHODS, STATUSES, sheetErrors, sheetWarnings, type Sheet } from "./battery-model";

export const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const blank = (): Sheet => ({ name: "", manufacturer: "", chemistry: "lfp", source: "", status: "unverified", application: null, acquisition_method: null });

export function BatteryForm({ row, onSaved, onCancel }: { row: (Sheet & { id: string }) | null; onSaved: (id: string) => void; onCancel: () => void }) {
  const save = useServerFn(saveDatasheet);
  const [s, setS] = useState<Sheet>(() => (row ? { ...row } : blank()));
  const [errors, setErrors] = useState<string[]>([]); const [busy, setBusy] = useState(false);
  const set = (k: string, x: unknown) => setS((p) => ({ ...p, [k]: x }));
  const warnings = sheetWarnings(s);
  const submit = async () => {
    const e = sheetErrors(s); setErrors(e); if (e.length) return;
    const payload: Record<string, unknown> = { id: row?.id ?? null, name: s.name, manufacturer: s.manufacturer, chemistry: s.chemistry, application: s.application ?? null, source: s.source, acquisition_method: s.acquisition_method ?? null, status: s.status };
    for (const f of FIELDS) payload[f.key] = s[f.key] === "" || s[f.key] === undefined ? null : s[f.key];
    setBusy(true);
    try { const r = await save({ data: payload as any }); onSaved(r.id); } catch (x) { setErrors([(x as Error).message]); } finally { setBusy(false); }
  };
  const sel = (k: string, items: Record<string, string>, label: string, empty?: string) => <label className="block text-sm"><span className="font-medium">{label}</span><select aria-label={label} className={`mt-1 ${inputCls}`} value={s[k] ?? ""} onChange={(e) => set(k, e.target.value || null)}>{empty !== undefined && <option value="">{empty}</option>}{Object.entries(items).map(([a, b]) => <option key={a} value={a}>{b}</option>)}</select></label>;
  const txt = (k: string, label: string) => <label className="block text-sm"><span className="font-medium">{label}</span><input aria-label={label} className={`mt-1 ${inputCls}`} value={s[k] ?? ""} onChange={(e) => set(k, e.target.value)} /></label>;
  return <div className="space-y-6">
    {GROUPS.map((gname) => <fieldset key={gname} className="border border-border bg-background p-4"><legend className="px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{gname}</legend>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {gname === "Identification" && <>{txt("name", "Nom commercial / modèle *")}{txt("manufacturer", "Fabricant *")}{sel("chemistry", CHEMISTRIES, "Technologie électrochimique *")}{sel("application", APPLICATIONS, "Application", "Non précisée")}</>}
        {gname === "Sources et validation" && <>{txt("source", "Source documentaire *")}{sel("acquisition_method", METHODS, "Méthode d’acquisition", "Non renseignée")}{sel("status", STATUSES, "Statut")}</>}
        {FIELDS.filter((f) => f.group === gname).map((f) => {
          const label = `${f.label}${f.unit ? ` (${f.unit})` : ""}`;
          if (f.kind === "bool") return <label key={f.key} className="block text-sm"><span className="font-medium">{label}</span><select aria-label={label} className={`mt-1 ${inputCls}`} value={s[f.key] == null ? "" : String(s[f.key])} onChange={(e) => set(f.key, e.target.value === "" ? null : e.target.value === "true")}><option value="">Non renseigné</option><option value="true">Oui</option><option value="false">Non</option></select></label>;
          if (f.kind === "long") return <label key={f.key} className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">{label}</span><textarea aria-label={label} className={`mt-1 ${inputCls} h-16 py-2`} value={s[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} /></label>;
          const numeric = ["num", "int", "pct"].includes(f.kind);
          return <label key={f.key} className="block text-sm"><span className="font-medium">{label}</span><input aria-label={label} type={numeric ? "number" : f.kind === "date" ? "date" : "text"} step="any" className={`mt-1 ${inputCls}`} value={s[f.key] ?? ""} onChange={(e) => set(f.key, numeric ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} /></label>;
        })}
      </div></fieldset>)}
    {warnings.length > 0 && <ul className="list-disc space-y-1 border border-border bg-muted/40 p-3 pl-7 text-sm">{warnings.map((w) => <li key={w}>Alerte : {w}</li>)}</ul>}
    {errors.length > 0 && <ul role="alert" className="list-disc space-y-1 border border-destructive/40 bg-destructive/5 p-3 pl-7 text-sm text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    <div className="flex justify-end gap-2 border-t border-border pt-4"><Button variant="ghost" onClick={onCancel}>Annuler</Button><Button disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer la fiche"}</Button></div>
  </div>;
}
