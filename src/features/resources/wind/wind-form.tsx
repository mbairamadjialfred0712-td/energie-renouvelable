import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { listSolarLocationOptions } from "@/lib/solar.functions";
import { saveWind, type WindRow } from "@/lib/wind.functions";
import { WIND_NATURES, WIND_STATUSES, distributionText, parseDistribution, parseTimeseries, timeseriesText, windErrors, windWarnings, type WindValues } from "./wind-model";

type F = Record<string, string>;
const toNum = (s: string | undefined) => { const t = (s ?? "").trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };
const opt = (s: string | undefined) => (s && s.trim() ? s.trim() : null);
const str = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const inputCls = "h-9 w-full border border-input bg-background px-2 text-sm";

function fromRow(r: WindRow | null): F {
  if (!r) return { data_nature: "measured", status: "unverified" };
  return {
    locality_id: r.locality_id, site_id: r.site_id ?? "", avg: str(r.avg), max: str(r.max), height: str(r.height), direction: str(r.direction), density: str(r.density), cf: str(r.cf), cf_method: str(r.cf_method),
    timeseries: timeseriesText(r.timeseries), distribution: distributionText(r.distribution), source: r.source, reference: str(r.reference), period_start: str(r.period_start), period_end: str(r.period_end),
    data_nature: r.data_nature, acquisition_method: str(r.acquisition_method), collected_on: str(r.collected_on), quality: str(r.quality), status: r.status, notes: str(r.notes),
  };
}

export function WindForm({ row, defaultLocalityId, onSaved, onCancel }: { row: WindRow | null; defaultLocalityId?: string | undefined; onSaved: (id: string) => void; onCancel: () => void }) {
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

  const ts = useMemo(() => parseTimeseries(f["timeseries"] ?? ""), [f]);
  const dist = useMemo(() => parseDistribution(f["distribution"] ?? ""), [f]);
  const values: WindValues = useMemo(() => ({
    avg: toNum(f["avg"]), max: toNum(f["max"]), height: toNum(f["height"]), direction: toNum(f["direction"]), density: toNum(f["density"]), cf: toNum(f["cf"]),
    periodStart: opt(f["period_start"]), periodEnd: opt(f["period_end"]), timeseries: ts.rows, distribution: dist.rows,
  }), [f, ts, dist]);
  const labels: Record<string, string> = { avg: "Vitesse moyenne", max: "Vitesse maximale", height: "Hauteur de mesure", direction: "Direction", density: "Densité de l’air", cf: "Facteur de capacité" };
  const nan = Object.entries(labels).filter(([k]) => Number.isNaN(values[k as keyof WindValues])).map(([, l]) => `${l} : valeur numérique invalide.`);
  const errors = [...nan, ...ts.errors, ...dist.errors, ...(nan.length ? [] : windErrors(values)), ...(values.cf !== null && !opt(f["cf_method"]) ? ["Indiquez la méthode et l’origine du facteur de capacité."] : [])];
  const warnings = nan.length ? [] : windWarnings(values);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(null);
    if (!f["locality_id"]) return setError("Sélectionnez une localité.");
    if (!opt(f["source"])) return setError("La source est obligatoire.");
    if (errors.length) return setError(errors.join(" "));
    setBusy(true);
    try {
      const res = await saveWind({ data: {
        id: row?.id ?? null, locality_id: f["locality_id"]!, site_id: opt(f["site_id"]),
        avg: values.avg, max: values.max, height: values.height, direction: values.direction, density: values.density, cf: values.cf, cf_method: opt(f["cf_method"]),
        timeseries: ts.rows, distribution: dist.rows, source: f["source"]!.trim(), reference: opt(f["reference"]), period_start: values.periodStart, period_end: values.periodEnd,
        data_nature: f["data_nature"] as "measured", acquisition_method: opt(f["acquisition_method"]), collected_on: opt(f["collected_on"]),
        quality: opt(f["quality"]), status: f["status"] as "unverified", notes: opt(f["notes"]),
      } });
      onSaved(res.id);
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }

  const Num = (k: string, label: string, unit: string) => (
    <label className="block text-sm"><span className="font-medium">{label}</span>
      <div className="mt-1 flex gap-1"><input aria-label={label} inputMode="decimal" className={inputCls} value={f[k] ?? ""} onChange={set(k)} /><span className="grid place-items-center px-2 text-xs text-muted-foreground">{unit}</span></div></label>
  );
  const Txt = (k: string, label: string, type = "text") => (
    <label className="block text-sm"><span className="font-medium">{label}</span><input aria-label={label} type={type} className={`mt-1 ${inputCls}`} value={f[k] ?? ""} onChange={set(k)} /></label>
  );
  const Area = (k: string, label: string, hint: string) => (
    <label className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">{label}</span><span className="block text-xs text-muted-foreground">{hint}</span>
      <textarea aria-label={label} className="mt-1 min-h-20 w-full border border-input bg-background p-2 font-mono text-xs" value={f[k] ?? ""} onChange={set(k)} /></label>
  );
  const Section = (title: string, children: React.ReactNode) => (
    <fieldset className="border border-border bg-background p-5"><legend className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</legend><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div></fieldset>
  );
  const Sel = (label: string, value: string, onChange: (v: string) => void, items: [string, string][], empty: string) => (
    <label className="block text-sm"><span className="font-medium">{label}</span><select aria-label={label} className={`mt-1 ${inputCls}`} value={value} onChange={(e) => onChange(e.target.value)}><option value="">{empty}</option>{items.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      {Section("A. Localisation", <>
        {Sel("Pays", country, (v) => { setCountry(v); setRegion(""); setDept(""); }, countries, "Tous")}
        {Sel("Région", region, (v) => { setRegion(v); setDept(""); }, regions, "Toutes")}
        {Sel("Département", dept, setDept, depts, "Tous")}
        {Sel("Localité *", f["locality_id"] ?? "", (v) => setF((p) => ({ ...p, locality_id: v, site_id: "" })), locList.map((l) => [l.id, l.name]), "— Choisir —")}
        {Sel("Site d’étude", f["site_id"] ?? "", (v) => setF((p) => ({ ...p, site_id: v })), sites.map((s) => [s.id, s.name]), sites.length ? "Aucun" : "Aucun site pour cette localité")}
      </>)}
      {Section("B. Mesures du vent", <>
        {Num("avg", "Vitesse moyenne", "m/s")}
        {Num("height", "Hauteur de mesure", "m")}
        {Num("direction", "Direction dominante", "° (0–<360)")}
        {Txt("period_start", "Début de période", "date")}
        {Txt("period_end", "Fin de période", "date")}
        {Area("timeseries", "Données temporelles (facultatif)", "Une ligne par observation : AAAA-MM-JJ;vitesse en m/s;direction en ° (facultative). Uniquement des valeurs réellement mesurées ou fournies par la source.")}
        {Area("distribution", "Distribution des vitesses (facultatif)", "Une ligne par classe : vitesse min m/s;vitesse max m/s;fréquence en %.")}
      </>)}
      {Section("C. Paramètres complémentaires", <>
        {Num("max", "Vitesse maximale", "m/s")}
        {Num("density", "Densité de l’air", "kg/m³")}
        {Num("cf", "Facteur de capacité estimé", "%")}
        {Txt("cf_method", "Méthode et origine du facteur de capacité")}
        {Txt("acquisition_method", "Méthode d’obtention (anémomètre, mât, LiDAR, réanalyse…)")}
      </>)}
      {Section("D. Source et validation", <>
        {Txt("source", "Source * (organisme, station, étude…)")}
        {Txt("reference", "Référence (lien, document)")}
        <label className="block text-sm"><span className="font-medium">Nature de la donnée</span><select aria-label="Nature de la donnée" className={`mt-1 ${inputCls}`} value={f["data_nature"]} onChange={set("data_nature")}>{Object.entries(WIND_NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        {Txt("collected_on", "Date de collecte", "date")}
        {Txt("quality", "Qualité de la donnée")}
        <label className="block text-sm"><span className="font-medium">Statut de validation</span><select aria-label="Statut de validation" className={`mt-1 ${inputCls}`} value={f["status"]} onChange={set("status")}>{Object.entries(WIND_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="block text-sm sm:col-span-2 lg:col-span-3"><span className="font-medium">Notes et hypothèses déclarées</span><textarea aria-label="Notes" className="mt-1 min-h-20 w-full border border-input bg-background p-2 text-sm" value={f["notes"] ?? ""} onChange={set("notes")} /></label>
      </>)}
      <p className="text-xs text-muted-foreground">Une vitesse moyenne ne suffit pas à déterminer une production : aucune production n’est calculée ici. Aucune unité n’est convertie.</p>
      {warnings.length > 0 && <div className="border border-border bg-muted p-3 text-sm"><p className="font-medium">Avertissements (la donnée n’est pas modifiée) :</p><ul className="mt-1 list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
      {(error || errors.length > 0) && <div role="alert" className="border border-destructive/40 p-3 text-sm text-destructive">{error ?? errors.join(" ")}</div>}
      <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy ? "Enregistrement…" : row ? "Enregistrer les modifications" : "Créer le jeu de données"}</Button><Button type="button" variant="outline" onClick={onCancel}>Annuler</Button></div>
    </form>
  );
}
