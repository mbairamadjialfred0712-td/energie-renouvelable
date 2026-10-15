import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listSolarLocationOptions } from "@/lib/solar.functions";
import { saveBiomass, type BiomassRow } from "@/lib/biomass.functions";
import { AVAILABILITY_LEVELS, BIOMASS_NATURES, BIOMASS_STATUSES, BIOMASS_TYPES, LHV_BASES, MONTHS, QUANTITY_UNITS, biomassErrors, biomassWarnings, type AvailabilityKey, type BiomassValues } from "./biomass-model";

type F = Record<string, string>;
const toNum = (s: string | undefined) => { const t = (s ?? "").trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };
const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";
const LEVEL_KEYS = Object.keys(AVAILABILITY_LEVELS) as AvailabilityKey[];

function fromRow(r: BiomassRow | null): F {
  if (!r) return { data_nature: "measured", status: "unverified", unit: "t/an", type: "" };
  return {
    locality_id: r.locality_id, site_id: r.site_id ?? "", type: r.type, type_detail: str(r.type_detail), quantity: str(r.quantity), unit: r.unit,
    availability_period: str(r.availability_period), constraints: str(r.constraints), fraction: str(r.fraction), moisture: str(r.moisture), lhv: str(r.lhv),
    lhv_basis: r.lhv_basis ?? "", lhv_method: str(r.lhv_method), potential: str(r.potential), potential_source: str(r.potential_source),
    source: r.source, reference: str(r.reference), period_start: str(r.period_start), period_end: str(r.period_end), data_nature: r.data_nature,
    acquisition_method: str(r.acquisition_method), collected_on: str(r.collected_on), quality: str(r.quality), status: r.status, notes: str(r.notes),
    ...Object.fromEntries(LEVEL_KEYS.map((k) => [`lvl_${k}`, str(r.levels[k])])),
  };
}

export function BiomassForm({ row, defaultLocalityId, onSaved, onCancel }: { row: BiomassRow | null; defaultLocalityId?: string | undefined; onSaved: (id: string) => void; onCancel: () => void }) {
  const { data: opts } = useQuery({ queryKey: ["solar-location-options"], queryFn: () => listSolarLocationOptions() });
  const [f, setF] = useState<F>(() => ({ ...fromRow(row), ...(defaultLocalityId && !row ? { locality_id: defaultLocalityId } : {}) }));
  const [months, setMonths] = useState<number[]>(row?.seasonal ?? []);
  const [country, setCountry] = useState(""); const [region, setRegion] = useState(""); const [dept, setDept] = useState("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));

  type Loc = { id: string; name: string; departmentId: string | null; departmentName: string | null; regionId: string | null; regionName: string | null; countryId: string | null; countryName: string | null };
  const locs: Loc[] = opts?.localities ?? [];
  const uniq = (arr: [string | null, string | null][]) => [...new Map(arr.filter((x): x is [string, string] => !!x[0] && !!x[1])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const countries = uniq(locs.map((l) => [l.countryId, l.countryName]));
  const regions = uniq(locs.filter((l) => !country || l.countryId === country).map((l) => [l.regionId, l.regionName]));
  const depts = uniq(locs.filter((l) => (!country || l.countryId === country) && (!region || l.regionId === region)).map((l) => [l.departmentId, l.departmentName]));
  const locList = locs.filter((l) => (!country || l.countryId === country) && (!region || l.regionId === region) && (!dept || l.departmentId === dept));
  const sites = (opts?.sites ?? []).filter((s) => s.locality_id === f["locality_id"]);

  const values: BiomassValues = useMemo(() => ({
    quantity: toNum(f["quantity"]), unit: opt(f["unit"]), moisture: toNum(f["moisture"]), lhv: toNum(f["lhv"]), lhvBasis: opt(f["lhv_basis"]), fraction: toNum(f["fraction"]),
    potential: toNum(f["potential"]), potentialSource: opt(f["potential_source"]), periodStart: opt(f["period_start"]), periodEnd: opt(f["period_end"]),
    levels: Object.fromEntries(LEVEL_KEYS.map((k) => [k, toNum(f[`lvl_${k}`])])), seasonal: months,
  }), [f, months]);
  const numLabels: Record<string, string> = { quantity: "Quantité", moisture: "Humidité", lhv: "PCI", fraction: "Fraction exploitable", potential: "Potentiel énergétique" };
  const nan = [...Object.entries(numLabels).filter(([k]) => Number.isNaN(values[k as keyof BiomassValues])).map(([, l]) => l), ...LEVEL_KEYS.filter((k) => Number.isNaN(values.levels[k])).map((k) => AVAILABILITY_LEVELS[k])].map((l) => `${l} : valeur numérique invalide.`);
  const errors = [...nan, ...(nan.length ? [] : biomassErrors(values))];
  const warnings = nan.length ? [] : biomassWarnings(values);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!f["locality_id"]) return setError("Sélectionnez une localité.");
    if (!f["type"]) return setError("Sélectionnez un type de biomasse.");
    if (!opt(f["source"])) return setError("La source est obligatoire.");
    if (errors.length) return setError(errors.join(" "));
    setBusy(true);
    try {
      const res = await saveBiomass({ data: {
        id: row?.id ?? null, locality_id: f["locality_id"]!, site_id: opt(f["site_id"]), type: f["type"] as (typeof BIOMASS_TYPES)[number], type_detail: opt(f["type_detail"]),
        quantity: values.quantity, unit: f["unit"] as (typeof QUANTITY_UNITS)[number], availability_period: opt(f["availability_period"]),
        levels: values.levels, seasonal: months, constraints: opt(f["constraints"]), fraction: values.fraction, moisture: values.moisture, lhv: values.lhv,
        lhv_basis: (opt(f["lhv_basis"]) as "as_received" | "dry" | null), lhv_method: opt(f["lhv_method"]), potential: values.potential, potential_source: opt(f["potential_source"]),
        source: f["source"]!.trim(), reference: opt(f["reference"]), period_start: values.periodStart, period_end: values.periodEnd,
        data_nature: f["data_nature"] as "measured", acquisition_method: opt(f["acquisition_method"]), collected_on: opt(f["collected_on"]),
        quality: opt(f["quality"]), status: f["status"] as "unverified", notes: opt(f["notes"]),
      } });
      onSaved(res.id);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const unit = f["unit"] || "t/an";
  const Num = (k: string, label: string, u: string) => (
    <label className="block text-sm"><span className="font-medium">{label}</span>
      <div className="mt-1 flex gap-1"><input aria-label={label} inputMode="decimal" className={inputCls} value={f[k] ?? ""} onChange={set(k)} /><span className="grid place-items-center whitespace-nowrap px-2 text-xs text-muted-foreground">{u}</span></div></label>
  );
  const Txt = (k: string, label: string, type = "text") => (
    <label className="block text-sm"><span className="font-medium">{label}</span><input aria-label={label} type={type} className={`mt-1 ${inputCls}`} value={f[k] ?? ""} onChange={set(k)} /></label>
  );
  const Section = (title: string, children: React.ReactNode) => (
    <fieldset className="border border-border bg-background p-5"><legend className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></fieldset>
  );
  const Sel = (label: string, value: string, onChange: (v: string) => void, items: [string, string][], empty: string | null) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><select aria-label={label} className={`mt-1 ${inputCls}`} value={value} onChange={(e) => onChange(e.target.value)}>{empty !== null && <option value="">{empty}</option>}{items.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
  );
  const pair = (o: Record<string, string>) => Object.entries(o) as [string, string][];

  return (
    <form onSubmit={submit} className="space-y-5">
      {Section("A. Localisation", <>
        {Sel("Pays", country, (v) => { setCountry(v); setRegion(""); setDept(""); }, countries, "Tous")}
        {Sel("Région", region, (v) => { setRegion(v); setDept(""); }, regions, "Toutes")}
        {Sel("Département", dept, setDept, depts, "Tous")}
        {Sel("Localité *", f["locality_id"] ?? "", (v) => setF((p) => ({ ...p, locality_id: v, site_id: "" })), locList.map((l) => [l.id, l.name]), "— Choisir —")}
        {Sel("Site d’étude", f["site_id"] ?? "", (v) => setF((p) => ({ ...p, site_id: v })), sites.map((s) => [s.id, s.name]), sites.length ? "Aucun" : "Aucun site pour cette localité")}
      </>)}
      {Section("B. Ressource", <>
        {Sel("Type de biomasse *", f["type"] ?? "", (v) => setF((p) => ({ ...p, type: v })), BIOMASS_TYPES.map((t) => [t, t]), "— Choisir —")}
        {Txt("type_detail", "Type exact (ex. coques d’anacarde)")}
        {Sel("Unité de quantité *", unit, (v) => setF((p) => ({ ...p, unit: v })), QUANTITY_UNITS.map((u) => [u, u]), null)}
        {Num("quantity", "Quantité disponible", unit)}
        {Num("fraction", "Proportion réellement exploitable", "%")}
        {Txt("availability_period", "Période de disponibilité (ex. récolte nov.–mars)")}
        {Txt("period_start", "Début de période des données", "date")}
        {Txt("period_end", "Fin de période des données", "date")}
        <div className="text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">Saisonnalité (mois de disponibilité, si connue)</span>
          <div className="mt-1 flex flex-wrap gap-1">{MONTHS.map((m, i) => { const on = months.includes(i + 1); return <button type="button" key={m} aria-pressed={on} onClick={() => setMonths((p) => (on ? p.filter((x) => x !== i + 1) : [...p, i + 1]))} className={`border px-2 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"}`}>{m}</button>; })}</div></div>
        <div className="sm:col-span-2 lg:col-span-3"><p className="text-sm font-medium">Niveaux de disponibilité ({unit}) — chacun selon sa propre source, aucun n’est déduit d’un autre</p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{LEVEL_KEYS.map((k) => <div key={k}>{Num(`lvl_${k}`, AVAILABILITY_LEVELS[k], unit)}</div>)}</div></div>
        <label className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">Contraintes de collecte, transport, stockage et concurrence d’usage</span><textarea aria-label="Contraintes" className="mt-1 min-h-16 w-full border border-input bg-background p-2 text-sm" value={f["constraints"] ?? ""} onChange={set("constraints")} /></label>
      </>)}
      {Section("C. Caractéristiques énergétiques", <>
        {Num("moisture", "Humidité", "%")}
        {Num("lhv", "Pouvoir calorifique inférieur (PCI)", "MJ/kg")}
        {Sel("Base de mesure du PCI", f["lhv_basis"] ?? "", (v) => setF((p) => ({ ...p, lhv_basis: v })), pair(LHV_BASES), "— Préciser —")}
        {Txt("lhv_method", "Méthode d’obtention du PCI (analyse labo, littérature…)")}
        {Num("potential", "Potentiel énergétique fourni par une source", "MWh/an")}
        {Txt("potential_source", "Source du potentiel énergétique (obligatoire si renseigné)")}
      </>)}
      {Section("D. Source et validation", <>
        {Txt("source", "Source * (organisme, inventaire, étude…)")}
        {Txt("reference", "Référence (lien, document)")}
        {Sel("Origine de la donnée", f["data_nature"] ?? "measured", (v) => setF((p) => ({ ...p, data_nature: v })), pair(BIOMASS_NATURES), null)}
        {Txt("acquisition_method", "Méthode de collecte")}
        {Txt("collected_on", "Date de collecte", "date")}
        {Txt("quality", "Qualité de la donnée")}
        {Sel("Statut de validation", f["status"] ?? "unverified", (v) => setF((p) => ({ ...p, status: v })), pair(BIOMASS_STATUSES), null)}
        <label className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">Notes et hypothèses déclarées</span><textarea aria-label="Notes" className="mt-1 min-h-20 w-full border border-input bg-background p-2 text-sm" value={f["notes"] ?? ""} onChange={set("notes")} /></label>
      </>)}
      <p className="text-xs text-muted-foreground">Aucun potentiel électrique n’est calculé ici. La quantité produite sur un territoire n’est pas assimilée à la quantité disponible pour une centrale. Aucune unité n’est convertie.</p>
      {warnings.length > 0 && <div className="border border-border bg-muted p-3 text-sm"><p className="font-medium">Avertissements (la donnée n’est pas modifiée) :</p><ul className="mt-1 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {(error || errors.length > 0) && <div role="alert" className="border border-destructive/40 p-3 text-sm text-destructive">{error ?? errors.join(" ")}</div>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : row ? "Enregistrer les modifications" : "Créer le jeu de données"}</Button><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button></div>
    </form>
  );
}
