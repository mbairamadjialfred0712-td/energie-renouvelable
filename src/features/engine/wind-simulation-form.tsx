import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getEngineStatus, runWindSimulation } from "@/lib/engine.functions";
import { listWeather } from "@/lib/weather.functions";
import { listProjects } from "@/lib/projects.functions";
import { WIND_VERSION, parseWindCurve, windRequestSchema } from "./wind-contract";
import type { SimulationRequest } from "./engine-contract";

const PARAMS = [["air_density", "Densité de l’air", "kg/m³"], ["swept_area", "Surface balayée", "m²"], ["hub_height", "Hauteur du moyeu", "m"], ["rotor_diameter", "Diamètre du rotor", "m"], ["rated_power", "Puissance nominale", "W"], ["curve_density", "Densité de référence de la courbe", "kg/m³"], ["cut_in", "Démarrage (si documenté)", "m/s"], ["rated_speed", "Vitesse nominale (si documentée)", "m/s"], ["cut_out", "Arrêt (si documenté)", "m/s"]] as const;
export function WindSimulationForm() {
  const navigate = useNavigate(), run = useServerFn(runWindSimulation);
  const weather = useQuery({ queryKey: ["weather"], queryFn: () => listWeather() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const engine = useQuery({ queryKey: ["engine-status"], queryFn: () => getEngineStatus() });
  const [name,setName] = useState(""), [project,setProject] = useState(""), [dataset,setDataset] = useState(""), [level,setLevel] = useState("A");
  const [values,setValues] = useState<Record<string,string>>({}), [docs,setDocs] = useState<Record<string,string>>({});
  const [natures,setNatures] = useState<Record<string,"external"|"measured"|"assumption"|"estimate">>({});
  const [curve,setCurve] = useState(""), [reference,setReference] = useState(""), [turbine,setTurbine] = useState(""), [conditions,setConditions] = useState("");
  const [mean,setMean] = useState(false), [busy,setBusy] = useState(false), [errors,setErrors] = useState<string[]>([]);
  const selected = weather.data?.find((w) => w.id === dataset);
  const online = engine.data?.state === "online" && engine.data.capabilities.engines.some((e) => e.engine === "wind" && e.status === "available" && e.version === WIND_VERSION);
  const params = PARAMS.filter(([k]) => level === "B" ? ["air_density","swept_area"].includes(k) : level === "C" ? k !== "swept_area" : false);
  function makeRequest(): SimulationRequest {
    if (!selected || selected.status !== "validated" || !project || name.trim().length < 3 || !mean) throw new Error("Nom, projet, jeu météo validé et confirmation des moyennes horaires requis.");
    const text = (value: string, source = selected.source) => ({ value, unit: "-", nature: "external" as const, source });
    const input_data: SimulationRequest["input_data"] = { level: text(level, "Conventions V1 validées par Joël"), site_id: text(selected.site_id), wind_basis: text("period_mean", "Confirmation ingénieur"), measurement_height: { value: selected.wind_height_m, unit: "m", nature: "external", source: selected.source }, period_start: text(selected.period_start), period_end: text(selected.period_end) };
    for (const [k,label,unit] of params) {
      const raw = values[k]?.trim(); if (!raw && ["cut_in","rated_speed","cut_out"].includes(k)) continue;
      if (!raw || !docs[k]?.trim()) throw new Error(`${label} : valeur et source/justification obligatoires.`);
      input_data[k] = { value: Number(raw.replace(",",".")), unit, nature: natures[k] ?? "assumption", source: docs[k] };
    }
    if (level === "C") {
      if (!turbine.trim() || !conditions.trim() || !reference.trim()) throw new Error("Référence turbine, conditions et source/version de courbe requises.");
      const { xs,ys } = parseWindCurve(curve);
      Object.assign(input_data, { turbine_reference: text(turbine,reference), curve_conditions: text(conditions,reference), curve_speeds: { value: xs, unit: "m/s", nature: "external", source: reference }, curve_powers: { value: ys, unit: "W", nature: "external", source: reference } });
    }
    return windRequestSchema.parse({ schema_version: "1.0", engine: "wind", engine_version: WIND_VERSION, project_id: project, input_data, assumptions: {}, source_references: [{ label: level === "C" ? reference : selected.source }], timeseries: null });
  }
  async function submit(calculate: boolean) {
    try {
      const request = makeRequest(); setErrors([]);
      if (!calculate) return;
      setBusy(true);
      const out = await run({ data: { name: name.trim(), project_id: project, weather_dataset_id: dataset, confirm_hourly_mean: mean, request } });
      await navigate({ to: "/simulations/$id/results", params: { id: out.id } });
    } catch (e) { setErrors([e instanceof Error ? e.message : "Calcul éolien refusé."]); }
    finally { setBusy(false); }
  }
  let ready = false;
  try { makeRequest(); ready = true; } catch { /* Visible errors on verification, no substituted inputs. */ }
  return <div className="max-w-4xl space-y-6">
    <header><h2 className="text-lg font-semibold">Éolien — ressource, flux cinétique et turbine</h2><p className="mt-1 text-sm text-muted-foreground">Version {WIND_VERSION} · conventions V1 approuvées · validation physique en attente</p></header>
    {!online && <p role="status" className="border-l-2 border-destructive pl-3 text-sm">Calcul indisponible : service non configuré, non joignable ou moteur éolien non confirmé.</p>}
    {(weather.error || projects.error) && <p role="alert" className="text-destructive">Chargement des sites ou projets impossible.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="wind-name">Nom de la simulation</Label><Input id="wind-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label htmlFor="wind-project">Projet</Label><select id="wind-project" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Sélectionner</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="sm:col-span-2"><Label htmlFor="wind-weather">Site / jeu météo vent validé</Label><select id="wind-weather" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dataset} onChange={(e) => { setDataset(e.target.value); setMean(false); }}><option value="">Sélectionner</option>{weather.data?.filter((w) => w.status === "validated" && w.wind_height_m > 0).map((w) => <option key={w.id} value={w.id}>{w.study_sites?.name} — {w.name} · {w.wind_height_m} m</option>)}</select></div>
      <div><Label htmlFor="wind-level">Niveau de calcul</Label><select id="wind-level" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}><option value="A">A — Analyse de la ressource</option><option value="B">B — Flux cinétique, non électrique</option><option value="C">C — Production de turbine</option></select></div>
    </div>
    {selected && <p className="text-sm text-muted-foreground">{selected.source} · {selected.data_nature} · {selected.period_start} → {selected.period_end} UTC · m/s à {selected.wind_height_m} m</p>}
    <div className="flex items-start gap-2"><Checkbox id="wind-mean" checked={mean} onCheckedChange={(v) => setMean(v === true)} /><Label htmlFor="wind-mean">Vitesses représentatives de chaque heure ; variabilité sous-horaire non reconstruite.</Label></div>
    {level === "B" && <p className="border-l-2 border-primary pl-3 text-sm">P = ½ ρ A v³ : puissance du flux de vent, pas puissance électrique d’une turbine.</p>}
    {params.length > 0 && <fieldset className="space-y-4"><legend className="mb-3 font-semibold">Paramètres documentés</legend>{params.map(([k,label,unit]) => <div key={k} className="grid gap-2 border-b pb-4 sm:grid-cols-3"><div><Label htmlFor={`wind-${k}`}>{label} ({unit})</Label><Input id={`wind-${k}`} type="number" step="any" value={values[k] ?? ""} onChange={(e) => setValues({...values,[k]:e.target.value})} /></div><div><Label htmlFor={`wind-nature-${k}`}>Nature</Label><select id={`wind-nature-${k}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={natures[k] ?? "assumption"} onChange={(e) => setNatures({...natures,[k]:e.target.value as "assumption"})}><option value="assumption">Hypothèse ingénieur</option><option value="external">Source externe / fabricant</option><option value="measured">Mesurée</option><option value="estimate">Estimée</option></select></div><div><Label htmlFor={`wind-doc-${k}`}>Source / justification</Label><Input id={`wind-doc-${k}`} value={docs[k] ?? ""} onChange={(e) => setDocs({...docs,[k]:e.target.value})} /></div></div>)}</fieldset>}
    {level === "C" && <div className="space-y-4"><div><Label htmlFor="wind-turbine">Modèle / référence turbine</Label><Input id="wind-turbine" value={turbine} onChange={(e) => setTurbine(e.target.value)} /></div><div><Label htmlFor="wind-reference">Source et version de la courbe</Label><Input id="wind-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div><div><Label htmlFor="wind-conditions">Conditions de validité de la courbe et domaine de fonctionnement</Label><Textarea id="wind-conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} /></div><div><Label htmlFor="wind-curve">Points documentés : vitesse (m/s) ; puissance (W), une ligne par point</Label><Textarea id="wind-curve" rows={8} value={curve} onChange={(e) => setCurve(e.target.value)} /></div></div>}
    {level === "C" && <p className="text-sm text-muted-foreground">Courbe et référence déclarées par l’ingénieur ; authenticité documentaire à vérifier. Production estimée, non mesurée.</p>}
    <p className="text-sm text-muted-foreground">Pas de correction de hauteur ou densité, perte supposée, sillage ni extrapolation annuelle. Les données datées du catalogue ne deviennent pas automatiquement des heures. Représentativité climatologique à confirmer.</p>
    {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-destructive">{errors.map((e,i) => <li key={i}>{e}</li>)}</ul>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => submit(false)}>Vérifier les paramètres</Button><Button disabled={busy || !online || !ready} onClick={() => submit(true)}>{busy ? "Calcul en cours…" : "Lancer le calcul éolien"}</Button></div>
  </div>;
}