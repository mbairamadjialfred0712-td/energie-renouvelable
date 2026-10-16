import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDemandOptions, saveDemand, type DemandInput, type DemandRow } from "@/lib/demand.functions";
import { CATEGORIES, METHODS, PRIORITIES, STATUSES, SUPPLY_SOURCES, equipmentEnergy, equipmentErrors, inventoryTotal, measurementErrors, profileErrors, type Equipment, type Measurement, type ProfileSlot, type Supply } from "./demand-engine";
import { fmt } from "./demand-ui";

const inputCls = "h-9 w-full rounded-md border border-input bg-background px-3 text-sm";
const STEPS = ["A · Identification", "B · Équipements", "C · Profil", "D · Alimentation", "E · Sources"];
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));
const str = (s: string) => (s.trim() === "" ? null : s.trim());
const blankEq = (): Equipment => ({ name: "", category: null, quantity: null, unit_power: null, power_unit: "W", hours_per_day: null, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "importante", notes: null });

function F({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return <label className={`block text-sm ${wide ? "sm:col-span-2" : ""}`}><span className="font-medium">{label}</span><div className="mt-1">{children}</div></label>;
}
function T({ v, set, type = "text", ph }: { v: string | number | null | undefined; set: (s: string) => void; type?: string; ph?: string }) {
  return <input type={type} step="any" className={inputCls} value={v ?? ""} placeholder={ph} onChange={(e) => set(e.target.value)} />;
}
function S({ v, set, items, empty }: { v: string; set: (s: string) => void; items: [string, string][]; empty?: string }) {
  return <select className={inputCls} value={v} onChange={(e) => set(e.target.value)}>{empty !== undefined && <option value="">{empty}</option>}{items.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
}

export function DemandForm({ row, defaultLocalityId, canValidate, onSaved, onCancel }: { row: DemandRow | null; defaultLocalityId?: string | undefined; canValidate: boolean; onSaved: (id: string) => void; onCancel: () => void }) {
  const { data: opt } = useQuery({ queryKey: ["demand-options"], queryFn: () => getDemandOptions() });
  const save = useServerFn(saveDemand);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [geo, setGeo] = useState({ country: row?.country_id ?? "", region: row?.region_id ?? "", department: row?.department_id ?? "" });
  const [f, setF] = useState<DemandInput>(() => ({
    id: row?.id ?? null, name: row?.name ?? "", category: row?.category ?? "residentiel", consumer_detail: row?.consumer_detail ?? null, consumer_name: row?.consumer_name ?? null,
    locality_id: row?.locality_id ?? defaultLocalityId ?? "", site_id: row?.site_id ?? null, users_count: row?.users_count ?? null, description: row?.description ?? null,
    period_start: row?.period_start ?? null, period_end: row?.period_end ?? null, equipment: row?.equipment.map(({ id: _id, ...e }) => e) ?? [],
    measurements: row?.measurements ?? [], measured_peak_kw: row?.measured_peak_kw ?? null, daily_profile: row?.daily_profile ?? [],
    weekday_variation: row?.weekday_variation ?? null, seasonal_variation: row?.seasonal_variation ?? null, has_history: row?.has_history ?? null, criticality: row?.criticality ?? null,
    growth_rate_pct: row?.growth_rate_pct ?? null, assumptions: row?.assumptions ?? null, supply: row?.supply ?? {}, source: row?.source ?? "", reference: row?.reference ?? null,
    acquisition_method: (row?.acquisition_method as DemandInput["acquisition_method"]) ?? null, data_time_basis: row?.data_time_basis ?? null, collected_by: row?.collected_by ?? null,
    comments: row?.comments ?? null, status: row?.status ?? "unverified",
  }));
  const set = <K extends keyof DemandInput>(k: K, v: DemandInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const sp = f.supply as Supply;
  const sup = (k: keyof Supply, v: unknown) => set("supply", { ...f.supply, [k]: v });

  const regions = useMemo(() => (opt?.regions ?? []).filter((r) => !geo.country || r.country_id === geo.country), [opt, geo.country]);
  const depts = useMemo(() => (opt?.departments ?? []).filter((d) => (geo.region ? d.region_id === geo.region : !geo.country || regions.some((r) => r.id === d.region_id))), [opt, geo, regions]);
  const locs = useMemo(() => (opt?.localities ?? []).filter((l) => (geo.department ? l.department_id === geo.department : !geo.country && !geo.region ? true : depts.some((d) => d.id === l.department_id))), [opt, geo, depts]);
  const sites = (opt?.sites ?? []).filter((s) => s.locality_id === f.locality_id);
  const inv = inventoryTotal(f.equipment);

  const updEq = (i: number, patch: Partial<Equipment>) => set("equipment", f.equipment.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const updM = (i: number, patch: Partial<Measurement>) => set("measurements", f.measurements.map((e, j) => (j === i ? { ...e, ...patch } : e)));
  const updP = (i: number, patch: Partial<ProfileSlot>) => set("daily_profile", f.daily_profile.map((e, j) => (j === i ? { ...e, ...patch } : e)));

  const submit = async () => {
    const errs: string[] = [];
    if (f.name.trim().length < 2) errs.push("Le nom de l’étude est obligatoire.");
    if (!f.locality_id) errs.push("Sélectionnez une localité.");
    if (f.category === "autre" && !f.consumer_detail) errs.push("Précisez le type de consommateur pour « Autre ».");
    if (f.users_count != null && (!Number.isInteger(f.users_count) || f.users_count < 0)) errs.push("Le nombre d’usagers doit être un entier positif.");
    if (f.period_start && f.period_end && f.period_end < f.period_start) errs.push("La fin de la période précède son début.");
    if (f.source.trim().length < 2) errs.push("La source des données est obligatoire.");
    if (f.growth_rate_pct != null && !f.assumptions) errs.push("Une croissance prévisionnelle doit être accompagnée de son hypothèse.");
    errs.push(...f.equipment.flatMap(equipmentErrors), ...measurementErrors(f.measurements), ...profileErrors(f.daily_profile));
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    try { const r = await save({ data: f }); onSaved(r.id); } catch (e) { setErrors([(e as Error).message]); } finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <nav className="flex flex-wrap gap-1 border-b border-border">{STEPS.map((s, i) => <button key={s} type="button" onClick={() => setStep(i)} className={`border-b-2 px-3 py-2 text-sm ${i === step ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}>{s}</button>)}</nav>

    {step === 0 && <div className="grid gap-4 sm:grid-cols-2">
      <F label="Nom de l’étude *"><T v={f.name} set={(v) => set("name", v)} /></F>
      <F label="Catégorie de consommateur *"><S v={f.category} set={(v) => set("category", v as DemandInput["category"])} items={Object.entries(CATEGORIES)} /></F>
      {f.category === "autre" && <F label="Précision du type de consommateur *"><T v={f.consumer_detail} set={(v) => set("consumer_detail", str(v))} /></F>}
      <F label="Nom du site ou du consommateur"><T v={f.consumer_name} set={(v) => set("consumer_name", str(v))} /></F>
      <F label="Pays"><S v={geo.country} set={(v) => { setGeo({ country: v, region: "", department: "" }); set("locality_id", ""); set("site_id", null); }} items={(opt?.countries ?? []).map((c) => [c.id, c.name])} empty="Tous" /></F>
      <F label="Région"><S v={geo.region} set={(v) => { setGeo((g) => ({ ...g, region: v, department: "" })); set("locality_id", ""); set("site_id", null); }} items={regions.map((c) => [c.id, c.name])} empty="Toutes" /></F>
      <F label="Département / province"><S v={geo.department} set={(v) => { setGeo((g) => ({ ...g, department: v })); set("locality_id", ""); set("site_id", null); }} items={depts.map((c) => [c.id, c.name])} empty="Tous" /></F>
      <F label="Localité *"><S v={f.locality_id} set={(v) => { set("locality_id", v); set("site_id", null); }} items={locs.map((c) => [c.id, c.name])} empty="— Sélectionner —" /></F>
      <F label="Site d’étude"><S v={f.site_id ?? ""} set={(v) => set("site_id", v || null)} items={sites.map((c) => [c.id, c.name])} empty={sites.length ? "Aucun" : "Aucun site pour cette localité"} /></F>
      <F label="Nombre d’usagers ou d’habitants"><T type="number" v={f.users_count} set={(v) => set("users_count", num(v))} /></F>
      <F label="Description" wide><textarea className={`${inputCls} h-20 py-2`} value={f.description ?? ""} onChange={(e) => set("description", str(e.target.value))} /></F>
    </div>}

    {step === 1 && <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Convention : jours d’utilisation <b>par semaine</b> (0–7). Puissance en W ou kW, affichée telle que saisie.</p>
      {f.equipment.map((e, i) => { const r = equipmentEnergy(e); return <div key={i} className="grid gap-2 border border-border bg-background p-3 sm:grid-cols-4">
        <F label="Équipement *"><T v={e.name} set={(v) => updEq(i, { name: v })} /></F>
        <F label="Catégorie"><T v={e.category} set={(v) => updEq(i, { category: str(v) })} /></F>
        <F label="Quantité *"><T type="number" v={e.quantity} set={(v) => updEq(i, { quantity: num(v) })} /></F>
        <F label="Puissance unitaire *"><div className="flex gap-1"><T type="number" v={e.unit_power} set={(v) => updEq(i, { unit_power: num(v) })} /><select aria-label="Unité de puissance" className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={e.power_unit} onChange={(x) => updEq(i, { power_unit: x.target.value as "W" | "kW" })}><option>W</option><option>kW</option></select></div></F>
        <F label="Durée (h/jour) *"><T type="number" v={e.hours_per_day} set={(v) => updEq(i, { hours_per_day: num(v) })} /></F>
        <F label="Jours / semaine *"><T type="number" v={e.days_per_week} set={(v) => updEq(i, { days_per_week: num(v) })} /></F>
        <F label="Priorité"><S v={e.priority} set={(v) => updEq(i, { priority: v as Equipment["priority"] })} items={Object.entries(PRIORITIES)} /></F>
        <F label="Facteur d’utilisation (0–1)"><T type="number" v={e.usage_factor} set={(v) => updEq(i, { usage_factor: num(v) })} ph="Facultatif" /></F>
        {e.usage_factor != null && <><F label="Définition du facteur *"><T v={e.usage_factor_definition} set={(v) => updEq(i, { usage_factor_definition: str(v) })} /></F><F label="Source du facteur *"><T v={e.usage_factor_source} set={(v) => updEq(i, { usage_factor_source: str(v) })} /></F></>}
        <F label="Notes"><T v={e.notes} set={(v) => updEq(i, { notes: str(v) })} /></F>
        <div className="flex items-end justify-between gap-2 sm:col-span-4"><p className="text-xs text-muted-foreground">{r ? `Jour d’usage : ${fmt(r.perUseDayKwh, "kWh")} · moyenne : ${fmt(r.avgDailyKwh, "kWh/j")}` : "Ligne incomplète : non calculée."}</p><Button type="button" size="sm" variant="ghost" aria-label={`Supprimer l’équipement ${i + 1}`} onClick={() => set("equipment", f.equipment.filter((_, j) => j !== i))}><Trash2 />Supprimer</Button></div>
      </div>; })}
      <Button type="button" variant="outline" onClick={() => set("equipment", [...f.equipment, blankEq()])}><Plus />Ajouter un équipement</Button>
      <p className="text-sm">{inv.complete ? <>Total estimé : <b>{fmt(inv.avgDailyKwh, "kWh/j")}</b> · {fmt(inv.monthlyKwh, "kWh/mois")} (30 j) · puissance nominale {fmt(inv.installedKw, "kW")}</> : <span className="text-muted-foreground">{inv.reason}</span>}</p>
    </div>}

    {step === 2 && <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Début de la période de référence"><T type="date" v={f.period_start} set={(v) => set("period_start", str(v))} /></F>
        <F label="Fin de la période de référence"><T type="date" v={f.period_end} set={(v) => set("period_end", str(v))} /></F>
        <F label="Puissance maximale mesurée (kW)"><T type="number" v={f.measured_peak_kw} set={(v) => set("measured_peak_kw", num(v))} /></F>
        <F label="Historique de consommation"><S v={f.has_history == null ? "" : String(f.has_history)} set={(v) => set("has_history", v === "" ? null : v === "true")} items={[["true", "Oui"], ["false", "Non"]]} empty="Non renseigné" /></F>
        <F label="Variation jours ouvrés / non ouvrés"><T v={f.weekday_variation} set={(v) => set("weekday_variation", str(v))} /></F>
        <F label="Variation saisonnière"><T v={f.seasonal_variation} set={(v) => set("seasonal_variation", str(v))} /></F>
        <F label="Croissance prévisionnelle (%/an)"><T type="number" v={f.growth_rate_pct} set={(v) => set("growth_rate_pct", num(v))} ph="Seulement si hypothèse fournie" /></F>
        <F label="Criticité de l’alimentation"><T v={f.criticality} set={(v) => set("criticality", str(v))} /></F>
        <F label="Hypothèses" wide><textarea className={`${inputCls} h-16 py-2`} value={f.assumptions ?? ""} onChange={(e) => set("assumptions", str(e.target.value))} /></F>
      </div>
      <h3 className="text-sm font-semibold">Consommations mesurées (conservées séparément des estimations)</h3>
      {f.measurements.map((m, i) => <div key={i} className="grid gap-2 sm:grid-cols-6"><T type="date" v={m.start} set={(v) => updM(i, { start: v })} /><T type="date" v={m.end} set={(v) => updM(i, { end: v })} /><T type="number" v={m.energy} set={(v) => updM(i, { energy: num(v) ?? NaN })} ph="Énergie" /><select aria-label="Unité d’énergie" className={inputCls} value={m.unit} onChange={(e) => updM(i, { unit: e.target.value as "Wh" | "kWh" })}><option>kWh</option><option>Wh</option></select><T type="number" v={m.peak_kw} set={(v) => updM(i, { peak_kw: num(v) })} ph="Pointe kW" /><Button type="button" variant="ghost" size="sm" onClick={() => set("measurements", f.measurements.filter((_, j) => j !== i))}><Trash2 /></Button></div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => set("measurements", [...f.measurements, { start: "", end: "", energy: NaN, unit: "kWh", peak_kw: null, notes: null }])}><Plus />Ajouter une mesure</Button>
      <h3 className="text-sm font-semibold">Profil journalier par créneaux (kW)</h3>
      {f.daily_profile.map((p, i) => <div key={i} className="grid gap-2 sm:grid-cols-5"><T type="number" v={p.start_hour} set={(v) => updP(i, { start_hour: num(v) ?? NaN })} ph="Début (h)" /><T type="number" v={p.end_hour} set={(v) => updP(i, { end_hour: num(v) ?? NaN })} ph="Fin (h)" /><T type="number" v={p.power_kw} set={(v) => updP(i, { power_kw: num(v) ?? NaN })} ph="kW" /><select aria-label="Nature du créneau" className={inputCls} value={p.nature} onChange={(e) => updP(i, { nature: e.target.value as ProfileSlot["nature"] })}><option value="measured">Mesuré</option><option value="estimated">Estimé</option></select><Button type="button" variant="ghost" size="sm" onClick={() => set("daily_profile", f.daily_profile.filter((_, j) => j !== i))}><Trash2 /></Button></div>)}
      <Button type="button" variant="outline" size="sm" onClick={() => set("daily_profile", [...f.daily_profile, { start_hour: NaN, end_hour: NaN, power_kw: NaN, nature: "estimated" }])}><Plus />Ajouter un créneau</Button>
    </div>}

    {step === 3 && <div className="grid gap-4 sm:grid-cols-2">
      <F label="Source d’alimentation actuelle"><S v={sp.current_source ?? ""} set={(v) => sup("current_source", v || null)} items={Object.entries(SUPPLY_SOURCES)} empty="Non renseignée" /></F>
      <F label="Fiabilité de l’alimentation"><T v={sp.reliability} set={(v) => sup("reliability", str(v))} /></F>
      <F label="Heures de coupure moyennes mesurées (h/jour)"><T type="number" v={sp.outage_hours} set={(v) => sup("outage_hours", num(v))} /></F>
      <F label="Groupe électrogène présent"><S v={sp.has_genset == null ? "" : String(sp.has_genset)} set={(v) => sup("has_genset", v === "" ? null : v === "true")} items={[["true", "Oui"], ["false", "Non"]]} empty="Non renseigné" /></F>
      <F label="Installation existante (solaire ou autre)"><T v={sp.existing_installation} set={(v) => sup("existing_installation", str(v))} /></F>
      <F label="Autonomie souhaitée (si spécifiée)"><T v={sp.autonomy} set={(v) => sup("autonomy", str(v))} /></F>
      <F label="Délestage possible"><T v={sp.load_shedding} set={(v) => sup("load_shedding", str(v))} /></F>
      <F label="Charges critiques prioritaires"><T v={sp.critical_loads} set={(v) => sup("critical_loads", str(v))} /></F>
      <F label="Contraintes du site" wide><textarea className={`${inputCls} h-16 py-2`} value={sp.site_constraints ?? ""} onChange={(e) => sup("site_constraints", str(e.target.value))} /></F>
      <p className="text-xs text-muted-foreground sm:col-span-2">Ces contraintes sont enregistrées telles quelles ; aucune recommandation de dimensionnement n’en est déduite.</p>
    </div>}

    {step === 4 && <div className="grid gap-4 sm:grid-cols-2">
      <F label="Source des données *"><T v={f.source} set={(v) => set("source", v)} /></F>
      <F label="Référence / justificatif"><T v={f.reference} set={(v) => set("reference", str(v))} /></F>
      <F label="Méthode d’acquisition"><S v={f.acquisition_method ?? ""} set={(v) => set("acquisition_method", (v || null) as DemandInput["acquisition_method"])} items={Object.entries(METHODS)} empty="Non renseignée" /></F>
      <F label="Unité et base temporelle des données"><T v={f.data_time_basis} set={(v) => set("data_time_basis", str(v))} ph="ex. kWh/mois, factures" /></F>
      <F label="Auteur de la collecte"><T v={f.collected_by} set={(v) => set("collected_by", str(v))} /></F>
      <F label="Statut"><S v={f.status} set={(v) => set("status", v as DemandInput["status"])} items={Object.entries(STATUSES).filter(([k]) => canValidate || !["validated", "rejected"].includes(k) || k === f.status)} /></F>
      <F label="Commentaires" wide><textarea className={`${inputCls} h-16 py-2`} value={f.comments ?? ""} onChange={(e) => set("comments", str(e.target.value))} /></F>
    </div>}

    {errors.length > 0 && <ul role="alert" className="list-disc space-y-1 border border-destructive/40 bg-destructive/5 p-3 pl-7 text-sm text-destructive">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
      <div className="flex gap-2"><Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>Précédent</Button><Button type="button" variant="outline" disabled={step === 4} onClick={() => setStep(step + 1)}>Suivant</Button></div>
      <div className="flex gap-2"><Button type="button" variant="ghost" onClick={onCancel}>Annuler</Button><Button type="button" disabled={busy} onClick={submit}>{busy ? "Enregistrement…" : "Enregistrer la demande"}</Button></div>
    </div>
  </div>;
}
