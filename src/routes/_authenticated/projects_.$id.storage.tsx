import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { deleteStorageConfig, getProjectStorage, getStorageAccess, listDatasheets, saveStorageConfig } from "@/lib/storage.functions";
import { STATUSES, configErrors, configTotals, type Sheet, type StorageConfig } from "@/features/storage/battery-model";
import { StatusBadge, val } from "@/features/storage/battery-ui";
import { inputCls } from "@/features/storage/battery-form";

const META = "Configuration du stockage par batteries d’un projet : fiche fabricant, valeurs retenues pour l’étude et hypothèses de l’ingénieur.";
export const Route = createFileRoute("/_authenticated/projects_/$id/storage")({
  head: () => ({ meta: [{ title: "Stockage du projet — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Stockage du projet — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ProjectStorage,
});

type Cfg = StorageConfig & { id: string | null; datasheet_id: string; reference_temp_c: number | null; aging_assumption: string | null; justification: string | null; status: keyof typeof STATUSES };
const blank = (): Cfg => ({ id: null, datasheet_id: "", module_count: null, series_count: null, parallel_count: null, usable_energy_limit_kwh: null, soc_min_pct: null, soc_max_pct: null, rte_pct: null, charge_eff_pct: null, discharge_eff_pct: null, reference_temp_c: null, aging_assumption: null, retained_cost: null, currency: null, justification: null, status: "unverified" });
const NUMS: [keyof Cfg, string][] = [["module_count", "Nombre de modules *"], ["series_count", "Modules en série"], ["parallel_count", "Branches en parallèle"], ["usable_energy_limit_kwh", "Limite d’énergie utilisable (kWh)"], ["soc_min_pct", "SOC minimum retenu (%)"], ["soc_max_pct", "SOC maximum retenu (%)"], ["rte_pct", "Rendement aller-retour retenu (%)"], ["charge_eff_pct", "Rendement de charge retenu (%)"], ["discharge_eff_pct", "Rendement de décharge retenu (%)"], ["reference_temp_c", "Température de référence (°C)"], ["retained_cost", "Coût retenu"]];
const ROWS: [string, string, string | null][] = [["Énergie nominale par module", "energy_kwh", null], ["SOC minimum", "soc_min_pct", "soc_min_pct"], ["SOC maximum", "soc_max_pct", "soc_max_pct"], ["Rendement aller-retour", "rte_pct", "rte_pct"], ["Rendement de charge", "charge_eff_pct", "charge_eff_pct"], ["Rendement de décharge", "discharge_eff_pct", "discharge_eff_pct"], ["Capacité utilisable", "usable_kwh", "usable_energy_limit_kwh"], ["Prix", "price", "retained_cost"]];

function ProjectStorage() {
  const { id } = Route.useParams(); const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["project-storage", id], queryFn: () => getProjectStorage({ data: { projectId: id } }) });
  const { data: sheets = [] } = useQuery({ queryKey: ["battery-sheets"], queryFn: () => listDatasheets() });
  const { data: access } = useQuery({ queryKey: ["storage-access"], queryFn: () => getStorageAccess() });
  const save = useServerFn(saveStorageConfig); const del = useServerFn(deleteStorageConfig);
  const [form, setForm] = useState<Cfg | null>(null); const [errors, setErrors] = useState<string[]>([]);
  if (isLoading) return <WorkspacePage eyebrow="Projets / Stockage" title="Stockage" description="Chargement…"><span /></WorkspacePage>;
  if (!data) return <WorkspacePage eyebrow="Projets / Stockage" title="Projet inaccessible" description="Ce projet n’existe pas ou vous n’y avez pas accès."><Link to="/projects" className="text-primary">Retour</Link></WorkspacePage>;
  const canWrite = !!access && (access.isAdmin || (access.canWrite && data.project.owner_id === access.userId));
  const sheet = sheets.find((s) => s.id === form?.datasheet_id);
  const submit = async () => {
    if (!form) return;
    const e = configErrors(form); if (!form.datasheet_id) e.push("Sélectionnez une fiche technique.");
    setErrors(e); if (e.length) return;
    try { await save({ data: { ...form, project_id: id } }); setForm(null); qc.invalidateQueries(); } catch (x) { setErrors([(x as Error).message]); }
  };
  return <WorkspacePage eyebrow="Projets / Stockage" title={`Stockage — ${data.project.name}`} description={META}
    action={<div className="flex gap-2"><Button asChild variant="outline"><Link to="/projects/$id" params={{ id }}>Retour au projet</Link></Button>{canWrite && !form && <Button onClick={() => { setErrors([]); setForm(blank()); }}><Plus />Nouvelle configuration</Button>}</div>}>
    {!canWrite && <p className="mb-4 text-xs text-muted-foreground">Consultation seule.</p>}
    {form && <div className="mb-6 space-y-4 border border-border bg-background p-4">
      <label className="block text-sm"><span className="font-medium">Fiche technique *</span><select aria-label="Fiche technique" className={`mt-1 ${inputCls}`} value={form.datasheet_id} onChange={(e) => setForm({ ...form, datasheet_id: e.target.value })}><option value="">— Sélectionner —</option>{sheets.filter((s) => s.status !== "archived" && s.status !== "rejected").map((s) => <option key={s.id} value={s.id}>{s.name} · {s.manufacturer}{s.status !== "validated" ? " (non validée)" : ""}</option>)}</select></label>
      {!sheets.length && <p className="text-sm text-muted-foreground">Aucune fiche dans la bibliothèque. <Link to="/technologies/storage/new" className="text-primary">Créer une fiche</Link>.</p>}
      <div className="grid gap-3 sm:grid-cols-3">{NUMS.map(([k, l]) => <label key={k} className="block text-sm"><span className="font-medium">{l}</span><input aria-label={l} type="number" step="any" className={`mt-1 ${inputCls}`} value={(form[k] as number | null) ?? ""} onChange={(e) => setForm({ ...form, [k]: e.target.value === "" ? null : Number(e.target.value) })} /></label>)}
        <label className="block text-sm"><span className="font-medium">Devise</span><input aria-label="Devise" className={`mt-1 ${inputCls}`} value={form.currency ?? ""} onChange={(e) => setForm({ ...form, currency: e.target.value || null })} /></label>
        <label className="block text-sm"><span className="font-medium">Statut</span><select aria-label="Statut" className={`mt-1 ${inputCls}`} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Cfg["status"] })}>{Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label></div>
      <label className="block text-sm"><span className="font-medium">Hypothèses de vieillissement</span><textarea aria-label="Hypothèses de vieillissement" className={`mt-1 ${inputCls} h-14 py-2`} value={form.aging_assumption ?? ""} onChange={(e) => setForm({ ...form, aging_assumption: e.target.value || null })} /></label>
      <label className="block text-sm"><span className="font-medium">Source et justification des paramètres modifiés</span><textarea aria-label="Justification" className={`mt-1 ${inputCls} h-14 py-2`} value={form.justification ?? ""} onChange={(e) => setForm({ ...form, justification: e.target.value || null })} /></label>
      {sheet && <p className="text-sm">Totaux nominaux (modules × fiche) : énergie {val(configTotals(form, sheet).energyKwh, "kWh")} · charge {val(configTotals(form, sheet).chargeKw, "kW")} · décharge {val(configTotals(form, sheet).dischargeKw, "kW")}</p>}
      {errors.length > 0 && <ul role="alert" className="list-disc space-y-1 border border-destructive/40 bg-destructive/5 p-3 pl-7 text-sm text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setForm(null)}>Annuler</Button><Button onClick={submit}>Enregistrer la configuration</Button></div>
    </div>}
    {!data.configs.length ? <p className="text-sm text-muted-foreground">Aucune configuration de stockage pour ce projet.</p> : data.configs.map(({ config: c0, sheet: s }) => { const c = c0 as any; const t = configTotals(c, s as Sheet); return <section key={c.id} className="mb-6 border border-border bg-background p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-semibold"><Link to="/technologies/storage/$id" params={{ id: s.id }} className="text-primary hover:underline">{s.name}</Link> · {s.manufacturer} · {c.module_count} module(s){c.series_count && c.parallel_count ? ` (${c.series_count}S × ${c.parallel_count}P)` : ""}</h2>
        <div className="flex items-center gap-2"><StatusBadge status={c.status as any} />{canWrite && <><Button size="sm" variant="outline" onClick={() => { setErrors([]); setForm({ ...blank(), ...(c as any) }); }}>Modifier</Button><Button size="sm" variant="ghost" aria-label="Supprimer la configuration" onClick={async () => { if (confirm("Supprimer cette configuration ?")) { await del({ data: { id: c.id } }); qc.invalidateQueries(); } }}><Trash2 /></Button></>}</div></div>
      <p className="mt-2 text-sm">Totaux nominaux : énergie {val(t.energyKwh, "kWh")} · charge {val(t.chargeKw, "kW")} · décharge {val(t.dischargeKw, "kW")} <span className="text-xs text-muted-foreground">(modules × valeurs fabricant ; puissance seulement si la limite par module est connue)</span></p>
      <div className="mt-3 overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="p-2">Paramètre</th><th className="p-2">Valeur fabricant</th><th className="p-2">Valeur retenue pour le projet</th></tr></thead>
        <tbody className="divide-y divide-border">{ROWS.map(([l, sk, ck]) => <tr key={l}><td className="p-2">{l}</td><td className="p-2">{val(s[sk], "")}</td><td className="p-2">{ck ? val(c[ck], "") : "—"}</td></tr>)}</tbody></table></div>
      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p><span className="text-muted-foreground">Hypothèses de vieillissement : </span>{c.aging_assumption ?? "—"}</p><p><span className="text-muted-foreground">Justification : </span>{c.justification ?? "—"}</p><p><span className="text-muted-foreground">Température de référence : </span>{val(c.reference_temp_c, "°C")}</p><p><span className="text-muted-foreground">Coût retenu : </span>{val(c.retained_cost, String(c.currency ?? ""))}</p></div>
    </section>; })}
    <p className="text-xs text-muted-foreground">Aucune simulation de charge, autonomie ni dimensionnement n’est réalisée à cette étape. La fiche fabricant n’est jamais modifiée par la configuration projet.</p>
  </WorkspacePage>;
}
