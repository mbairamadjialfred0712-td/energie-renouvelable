import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runPvSimulation } from "@/lib/engine.functions";
import { listProjects } from "@/lib/projects.functions";
import { ENGINE_SCHEMA_VERSION, type SimulationRequest } from "./engine-contract";
import { buildPvCsvTemplate, parsePvCsv, PV_SERIES, type ParsedSeries } from "./pv-csv";

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([buildPvCsvTemplate()], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = "modele-pv-horaire-DEMONSTRATION-donnees-fictives.csv";
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const PARAMS = [
  { key: "latitude", label: "Latitude", unit: "°", hint: "−90 à 90" },
  { key: "longitude", label: "Longitude", unit: "°", hint: "−180 à 180" },
  { key: "elevation", label: "Altitude", unit: "m", hint: "" },
  { key: "system_capacity", label: "Puissance DC installée", unit: "kWc", hint: "" },
  { key: "dc_ac_ratio", label: "Ratio DC/AC", unit: "-", hint: "0,5 à 3" },
  { key: "inv_eff", label: "Rendement nominal onduleur", unit: "%", hint: "90 à 99,5" },
  { key: "losses", label: "Pertes système totales", unit: "%", hint: "−5 à 99" },
  { key: "tilt", label: "Inclinaison", unit: "°", hint: "0 = horizontal" },
  { key: "azimuth", label: "Azimut", unit: "°", hint: "convention PVWatts : 0 = N, 90 = E, 180 = S, 270 = O" },
  { key: "module_type", label: "Type de module", unit: "-", hint: "0 standard, 1 premium, 2 couche mince" },
  { key: "array_type", label: "Montage / suivi", unit: "-", hint: "0 fixe ouvert, 1 fixe toiture, 2 suivi 1 axe, 3 1 axe avec rétro-suivi, 4 2 axes" },
  { key: "gcr", label: "Taux d’occupation du sol (GCR)", unit: "-", hint: "0,01 à 0,99" },
] as const;
const NATURES = [["measured", "Mesurée"], ["external", "API / document externe"], ["estimate", "Estimée"], ["assumption", "Hypothèse"]] as const;

export function PvSimulationForm() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [projectId, setProjectId] = useState("");
  useEffect(() => { listProjects().then((r) => setProjects((r as { id: string; name: string }[]).map((p) => ({ id: p.id, name: p.name })))).catch(() => setProjects([])); }, []);
  const [natures, setNatures] = useState<Record<string, string>>({});
  const [csv, setCsv] = useState<ParsedSeries | null>(null);
  const [seriesNature, setSeriesNature] = useState("external");
  const [seriesSource, setSeriesSource] = useState("");
  const [utcOffset, setUtcOffset] = useState("");
  const [albedo, setAlbedo] = useState("");
  const [omitLeapDay, setOmitLeapDay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

  const num = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function submit() {
    const errs: string[] = [];
    if (name.trim().length < 3) errs.push("Nom de la simulation requis.");
    if (!csv) errs.push("Série horaire CSV requise.");
    if (csv?.errors.length) errs.push(...csv.errors);
    const year = Number(csv?.timestamps[0]?.slice(0, 4));
    const isLeap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    if (isLeap && !omitLeapDay) errs.push("Confirmer la convention bissextile : 29 février exclu des données fournies.");
    const offset = num(utcOffset);
    if (offset === null || !Number.isFinite(offset)) errs.push("Décalage UTC requis.");
    const input_data: SimulationRequest["input_data"] = {};
    for (const p of PARAMS) {
      const v = num(values[p.key]);
      if (v === null || !Number.isFinite(v)) errs.push(`${p.label} requis.`);
      else input_data[p.key] = { value: v, unit: p.unit, nature: (natures[p.key] ?? "assumption") as "assumption" };
    }
    const assumptions: SimulationRequest["assumptions"] = {};
    if (csv && !("albedo" in csv.series)) {
      const a = num(albedo);
      if (a === null || !Number.isFinite(a)) errs.push("Albédo requis (aucune colonne albedo dans le fichier).");
      else assumptions["albedo"] = { value: a, unit: "-", nature: "assumption" };
    }
    setIssues(errs);
    if (errs.length || !csv || offset === null) return;
    const request: SimulationRequest = {
      schema_version: ENGINE_SCHEMA_VERSION, engine: "photovoltaic", input_data, assumptions,
      source_references: seriesSource.trim() ? [{ label: seriesSource.trim() }] : [],
      timeseries: { timestamps: csv.timestamps, utc_offset_hours: offset, timestamp_convention: "period_start",
        leap_day_convention: omitLeapDay ? "omit_feb29" : null,
        series: Object.fromEntries(Object.entries(csv.series).flatMap(([k, vals]) => { const metric = PV_SERIES.find((s) => s.key === k); return metric ? [[k, { values: vals, unit: metric.unit, nature: seriesNature as "external", source: seriesSource.trim() || null }]] : []; })) },
    };
    setBusy(true);
    try {
      const r = await runPvSimulation({ data: { name: name.trim(), request, project_id: projectId || null } });
      if (r.status === "completed") toast.success("Simulation terminée.");
      else toast.error(r.message);
      navigate({ to: "/simulations/$id/results", params: { id: r.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-5xl space-y-8">
      <section className="space-y-3">
        <Label htmlFor="sim-name">Nom de la simulation *</Label>
        <Input id="sim-name" value={name} onChange={(e) => setName(e.target.value)} />
        <Label htmlFor="pv-project">Projet rattaché (requis pour une simulation batterie ultérieure)</Label>
        <select id="pv-project" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">— Aucun projet —</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </section>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">1. Série météorologique horaire</h2>
        <p className="text-sm text-muted-foreground">CSV avec colonnes <code>timestamp;ghi;dni;dhi;temp_air;wind_speed</code> (+ <code>albedo</code> facultatif). 8 760 heures, heure locale standard au début de chaque heure (ex. 2023-01-01T00:00:00), 29 février retiré. Unités : W/m², °C, m/s. Cellules vides refusées, jamais remplacées par zéro.</p>
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3 text-sm">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>Télécharger le modèle CSV</Button>
          <span className="text-muted-foreground">8 760 heures (année 2023). Valeurs <strong>fictives de démonstration</strong>, ne représentant aucun site : à remplacer par vos séries réelles sourcées.</span>
        </div>
        <Input type="file" accept=".csv,text/csv" aria-label="Fichier CSV horaire" onChange={async (e) => { const f = e.target.files?.[0]; setCsv(f ? parsePvCsv(await f.text()) : null); }} />
        <Label className="flex items-center gap-2"><input type="checkbox" checked={omitLeapDay} onChange={(e) => setOmitLeapDay(e.target.checked)} />Année bissextile : je confirme que le 29 février est exclu (aucune suppression automatique).</Label>
        {csv && <p className="text-sm">{csv.timestamps.length} lignes lues · colonnes : {Object.keys(csv.series).join(", ") || "aucune"}{csv.errors.length ? ` · ${csv.errors.join(" ")}` : ""}</p>}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1"><Label htmlFor="utc">Décalage UTC de l’heure standard (h) *</Label><Input id="utc" value={utcOffset} onChange={(e) => setUtcOffset(e.target.value)} placeholder="ex. 0" /></div>
          <div className="space-y-1"><Label htmlFor="snat">Nature des séries</Label>
            <select id="snat" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={seriesNature} onChange={(e) => setSeriesNature(e.target.value)}>{NATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor="ssrc">Source des séries</Label><Input id="ssrc" value={seriesSource} onChange={(e) => setSeriesSource(e.target.value)} placeholder="ex. station, NASA POWER, PVGIS…" /></div>
        </div>
        {csv && !("albedo" in csv.series) && <div className="max-w-xs space-y-1"><Label htmlFor="alb">Albédo constant (hypothèse, 0–1) *</Label><Input id="alb" value={albedo} onChange={(e) => setAlbedo(e.target.value)} /></div>}
      </section>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">2. Installation (PVWatts v8) — aucune valeur par défaut</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {PARAMS.map((p) => (
            <div key={p.key} className="space-y-1">
              <Label htmlFor={`p-${p.key}`}>{p.label} ({p.unit}) *</Label>
              <div className="flex gap-2">
                <Input id={`p-${p.key}`} value={values[p.key] ?? ""} onChange={(e) => setValues({ ...values, [p.key]: e.target.value })} />
                <select aria-label={`Nature ${p.label}`} className="h-10 rounded-md border bg-background px-2 text-sm" value={natures[p.key] ?? "assumption"} onChange={(e) => setNatures({ ...natures, [p.key]: e.target.value })}>{NATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
              {p.hint && <p className="text-xs text-muted-foreground">{p.hint}</p>}
            </div>
          ))}
        </div>
      </section>

      {issues.length > 0 && <ul className="list-disc space-y-1 rounded-lg border border-destructive p-4 pl-8 text-sm text-destructive">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <Button onClick={submit} disabled={busy}>{busy ? "Calcul en cours…" : "Lancer la simulation PV"}</Button>
    </div>
  );
}
