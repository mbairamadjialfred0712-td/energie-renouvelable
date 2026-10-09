import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listSolarLocationOptions, saveSolar, type SolarRow } from "@/lib/solar.functions";
import { DATA_NATURES, HELP, IRRADIANCE_UNITS, SOLAR_STATUSES, SUNSHINE_UNITS, solarErrors, solarWarnings, type SolarValues } from "./solar-model";

type F = Record<string, string>;
const toNum = (s: string | undefined) => { const t = (s ?? "").trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };
const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));

function fromRow(r: SolarRow | null): F {
  if (!r) return { ghiUnit: "kWh/m²/jour", dniUnit: "kWh/m²/jour", dhiUnit: "kWh/m²/jour", sunshineUnit: "h/an", data_nature: "measured", status: "unverified" };
  return {
    locality_id: r.locality_id, site_id: r.site_id ?? "", ghi: str(r.ghi), dni: str(r.dni), dhi: str(r.dhi), annual: str(r.annual), tavg: str(r.tavg), tmin: str(r.tmin), tmax: str(r.tmax), sunshine: str(r.sunshine),
    ghiUnit: r.ghiUnit, dniUnit: r.dniUnit, dhiUnit: r.dhiUnit, sunshineUnit: r.sunshineUnit, source: r.source, reference: str(r.reference), period_start: str(r.period_start), period_end: str(r.period_end),
    data_nature: r.data_nature, acquisition_method: str(r.acquisition_method), collected_on: str(r.collected_on), quality: str(r.quality), status: r.status, notes: str(r.notes),
  };
}

const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";

export function SolarForm({ row, defaultLocalityId, onSaved, onCancel }: { row: SolarRow | null; defaultLocalityId?: string | undefined; onSaved: (id: string) => void; onCancel: () => void }) {
  const { data: opts } = useQuery({ queryKey: ["solar-location-options"], queryFn: () => listSolarLocationOptions() });
  const [f, setF] = useState<F>(() => ({ ...fromRow(row), ...(defaultLocalityId && !row ? { locality_id: defaultLocalityId } : {}) }));
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

  const values: SolarValues = useMemo(() => ({
    ghi: toNum(f["ghi"]), dni: toNum(f["dni"]), dhi: toNum(f["dhi"]), annual: toNum(f["annual"]), tavg: toNum(f["tavg"]), tmin: toNum(f["tmin"]), tmax: toNum(f["tmax"]), sunshine: toNum(f["sunshine"]),
    ghiUnit: f["ghiUnit"] as SolarValues["ghiUnit"], dniUnit: f["dniUnit"] as SolarValues["dniUnit"], dhiUnit: f["dhiUnit"] as SolarValues["dhiUnit"], sunshineUnit: f["sunshineUnit"] as SolarValues["sunshineUnit"],
    periodStart: opt(f["period_start"]), periodEnd: opt(f["period_end"]),
  }), [f]);
  const nanFields = (Object.entries({ GHI: values.ghi, DNI: values.dni, DHI: values.dhi, "Irradiation annuelle": values.annual, "Température moyenne": values.tavg, "Température minimale": values.tmin, "Température maximale": values.tmax, Ensoleillement: values.sunshine }) as [string, number | null][]).filter(([, v]) => Number.isNaN(v)).map(([k]) => `${k} : valeur numérique invalide.`);
  const errors = [...nanFields, ...(nanFields.length ? [] : solarErrors(values))];
  const warnings = nanFields.length ? [] : solarWarnings(values);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!f["locality_id"]) return setError("Sélectionnez une localité.");
    if (!opt(f["source"])) return setError("La source est obligatoire.");
    if (errors.length) return setError(errors.join(" "));
    setBusy(true);
    try {
      const res = await saveSolar({ data: {
        id: row?.id ?? null, locality_id: f["locality_id"]!, site_id: opt(f["site_id"]), ...values, period: null,
        source: f["source"]!.trim(), reference: opt(f["reference"]), period_start: values.periodStart, period_end: values.periodEnd,
        data_nature: f["data_nature"] as "measured", acquisition_method: opt(f["acquisition_method"]), collected_on: opt(f["collected_on"]),
        quality: opt(f["quality"]), status: f["status"] as "unverified", notes: opt(f["notes"]),
      } });
      onSaved(res.id);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const Num = ({ k, label, unit, help, unitKey, units }: { k: string; label: string; unit?: string; help?: string | undefined; unitKey?: string; units?: readonly string[] }) => (
    <label className="block text-sm">
      <span className="flex items-center gap-1 font-medium">{label}{help && <span title={help} className="cursor-help text-muted-foreground"><Info className="h-3.5 w-3.5" /></span>}</span>
      <div className="mt-1 flex gap-1">
        <input aria-label={label} inputMode="decimal" className={inputCls} value={f[k] ?? ""} onChange={set(k)} />
        {unitKey && units ? <select aria-label={`Unité ${label}`} className="h-9 border border-input bg-background px-1 text-xs" value={f[unitKey]} onChange={set(unitKey)}>{units.map((u) => <option key={u}>{u}</option>)}</select> : unit && <span className="grid place-items-center px-2 text-xs text-muted-foreground">{unit}</span>}
      </div>
    </label>
  );
  const Txt = ({ k, label, type = "text" }: { k: string; label: string; type?: string }) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><input aria-label={label} type={type} className={`mt-1 ${inputCls}`} value={f[k] ?? ""} onChange={set(k)} /></label>
  );
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <fieldset className="border border-border bg-background p-5"><legend className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></fieldset>
  );
  const Sel = ({ label, value, onChange, items, empty }: { label: string; value: string; onChange: (v: string) => void; items: [string, string][]; empty: string }) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><select aria-label={label} className={`mt-1 ${inputCls}`} value={value} onChange={(e) => onChange(e.target.value)}><option value="">{empty}</option>{items.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Localisation">
        <Sel label="Pays" value={country} onChange={(v) => { setCountry(v); setRegion(""); setDept(""); }} items={countries} empty="Tous" />
        <Sel label="Région" value={region} onChange={(v) => { setRegion(v); setDept(""); }} items={regions} empty="Toutes" />
        <Sel label="Département" value={dept} onChange={setDept} items={depts} empty="Tous" />
        <Sel label="Localité *" value={f["locality_id"] ?? ""} onChange={(v) => setF((p) => ({ ...p, locality_id: v, site_id: "" }))} items={locList.map((l) => [l.id, l.name])} empty="— Choisir —" />
        <Sel label="Site d’étude" value={f["site_id"] ?? ""} onChange={(v) => setF((p) => ({ ...p, site_id: v }))} items={sites.map((s) => [s.id, s.name])} empty={sites.length ? "Aucun" : "Aucun site pour cette localité"} />
      </Section>
      <Section title="Ressource solaire">
        <Num k="ghi" label="GHI" help={HELP["ghi"]} unitKey="ghiUnit" units={IRRADIANCE_UNITS} />
        <Num k="dni" label="DNI" help={HELP["dni"]} unitKey="dniUnit" units={IRRADIANCE_UNITS} />
        <Num k="dhi" label="DHI" help={HELP["dhi"]} unitKey="dhiUnit" units={IRRADIANCE_UNITS} />
        <Num k="annual" label="Irradiation annuelle" unit="kWh/m²/an" help={HELP["annual"]} />
        <Num k="tavg" label="Température moyenne" unit="°C" help={HELP["temp"]} />
        <Num k="tmin" label="Température minimale" unit="°C" />
        <Num k="tmax" label="Température maximale" unit="°C" />
        <Num k="sunshine" label="Heures d’ensoleillement" help={HELP["sunshine"]} unitKey="sunshineUnit" units={SUNSHINE_UNITS} />
      </Section>
      <Section title="Source">
        <Txt k="source" label="Source * (organisme, base, station…)" />
        <Txt k="reference" label="Référence (lien, document)" />
        <label className="block text-sm"><span className="font-medium">Nature de la donnée</span><select aria-label="Nature de la donnée" className={`mt-1 ${inputCls}`} value={f["data_nature"]} onChange={set("data_nature")}>{Object.entries(DATA_NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <Txt k="period_start" label="Début de période" type="date" />
        <Txt k="period_end" label="Fin de période" type="date" />
        <Txt k="acquisition_method" label="Méthode d’obtention" />
        <Txt k="collected_on" label="Date de collecte" type="date" />
      </Section>
      <Section title="Qualité">
        <Txt k="quality" label="Qualité de la donnée" />
        <label className="block text-sm"><span className="font-medium">Statut de validation</span><select aria-label="Statut de validation" className={`mt-1 ${inputCls}`} value={f["status"]} onChange={set("status")}>{Object.entries(SOLAR_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">Notes et hypothèses déclarées</span><textarea aria-label="Notes" className="mt-1 min-h-20 w-full border border-input bg-background p-2 text-sm" value={f["notes"] ?? ""} onChange={set("notes")} /></label>
      </Section>
      {warnings.length > 0 && <div className="border border-status-ready/40 bg-muted p-3 text-sm"><p className="font-medium">Avertissements (la donnée n’est pas modifiée) :</p><ul className="mt-1 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {(error || errors.length > 0) && <div className="border border-destructive/40 p-3 text-sm text-destructive">{error ?? errors.join(" ")}</div>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : row ? "Enregistrer les modifications" : "Créer le jeu de données"}</Button><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button></div>
    </form>
  );
}
