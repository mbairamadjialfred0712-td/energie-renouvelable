import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getEngineStatus, runCspSimulation } from "@/lib/engine.functions";
import { listWeather } from "@/lib/weather.functions";
import { listProjects } from "@/lib/projects.functions";
import { CSP_VERSION } from "./csp-contract";
import type { SimulationRequest } from "./engine-contract";

const PARAMS = [
  ["aperture_area", "Surface d’ouverture", "m²", true],
  ["optical_efficiency", "Rendement optique effectif (fraction)", "-", true],
  ["thermal_loss", "Pertes thermiques moyennes prescrites", "W", true],
  ["operating_temperature", "Température de fonctionnement documentée", "°C", true],
  ["cycle_efficiency", "Rendement du cycle (fraction, facultatif)", "-", false],
  ["auxiliary_power", "Consommations auxiliaires moyennes (facultatif)", "W", false],
] as const;

export function CspSimulationForm() {
  const navigate = useNavigate();
  const run = useServerFn(runCspSimulation);
  const weather = useQuery({ queryKey: ["weather"], queryFn: () => listWeather() });
  const projects = useQuery({ queryKey: ["projects"], queryFn: () => listProjects() });
  const engine = useQuery({ queryKey: ["engine-status"], queryFn: () => getEngineStatus() });
  const [project, setProject] = useState("");
  const [dataset, setDataset] = useState("");
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [natures, setNatures] = useState<Record<string, "external" | "measured" | "assumption" | "estimate">>({});
  const [fluid, setFluid] = useState("");
  const [conditions, setConditions] = useState("");
  const [reference, setReference] = useState("");
  const [mean, setMean] = useState(false);
  const [conversion, setConversion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const selected = weather.data?.find((w) => w.id === dataset);
  const online = engine.data?.state === "online" && engine.data.capabilities.engines.some((e) => e.engine === "csp" && e.status === "available" && e.version === CSP_VERSION);
  async function submit() {
    const issues = [];
    const input_data: SimulationRequest["input_data"] = {};
    if (!selected || selected.status !== "validated") issues.push("Jeu météo validé requis.");
    if (!project) issues.push("Projet requis.");
    if (name.trim().length < 3) issues.push("Nom de simulation requis.");
    if (!fluid.trim() || !conditions.trim() || !reference.trim()) issues.push("Fluide, conditions et référence documentaire obligatoires.");
    if (!mean) issues.push("DNI moyen horaire à confirmer.");
    if (selected?.radiation_unit === "Wh/m²" && !conversion) issues.push("Conversion du DNI énergétique à confirmer.");
    for (const [k, label, unit, required] of PARAMS) {
      const raw = values[k]?.trim();
      if (!raw) { if (required) issues.push(`${label} requis.`); continue; }
      const x = Number(raw.replace(",", "."));
      if (!Number.isFinite(x) || !docs[k]?.trim()) { issues.push(`${label} : nombre fini et source/justification obligatoires.`); continue; }
      input_data[k] = { value: x, unit, nature: natures[k] ?? "assumption", source: docs[k].trim() };
    }
    setErrors(issues);
    if (issues.length || !selected) return;
    const text = (value: string, source = reference) => ({ value, unit: "-", nature: "assumption" as const, source });
    Object.assign(input_data, {
      site_id: text(selected.site_id, selected.source), technology: text("parabolic_trough"), fluid: text(fluid),
      conditions: text(conditions), optical_basis: text("effective_includes_incidence"), dni_basis: text("period_mean"),
      period_start: text(selected.period_start, selected.source), period_end: text(selected.period_end, selected.source),
    });
    setBusy(true);
    try {
      const out = await run({ data: { name: name.trim(), project_id: project, weather_dataset_id: dataset,
        confirm_hourly_mean: mean, confirm_radiation_conversion: conversion,
        request: { schema_version: "1.0", engine: "csp", engine_version: CSP_VERSION, project_id: project,
          input_data, assumptions: {}, source_references: [{ label: reference }], timeseries: null },
      } });
      await navigate({ to: "/simulations/$id/results", params: { id: out.id } });
    } catch (e) { setErrors([e instanceof Error ? e.message : "Calcul CSP refusé."]); }
    finally { setBusy(false); }
  }
  return <div className="max-w-4xl space-y-6">
    <header><h2 className="text-lg font-semibold">CSP — bilan cylindro-parabolique prescrit</h2><p className="mt-1 text-sm text-muted-foreground">Modèle 1.0.0 · validation scientifique en attente · sans stockage thermique</p></header>
    {!online && <p role="status" className="border-l-2 border-destructive pl-3 text-sm">Calcul indisponible : {engine.data?.state === "not_configured" ? "service Python non configuré" : "moteur CSP non joignable ou capacité non confirmée"}.</p>}
    {(weather.error || projects.error) && <p role="alert" className="text-destructive">Les sites ou projets n’ont pas pu être chargés.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="csp-name">Nom de la simulation</Label><Input id="csp-name" value={name} onChange={(e) => setName(e.target.value)} /></div>
      <div><Label htmlFor="csp-project">Projet</Label><select id="csp-project" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={project} onChange={(e) => setProject(e.target.value)}><option value="">Sélectionner</option>{projects.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="sm:col-span-2"><Label htmlFor="csp-weather">Site / jeu météo DNI validé</Label><select id="csp-weather" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={dataset} onChange={(e) => { setDataset(e.target.value); setConversion(false); setMean(false); }}><option value="">Sélectionner</option>{weather.data?.filter((w) => w.status === "validated").map((w) => <option key={w.id} value={w.id}>{w.study_sites?.name} — {w.name} · {w.radiation_unit}</option>)}</select></div>
    </div>
    {selected && <p className="text-sm text-muted-foreground">{selected.source} · {selected.data_nature} · validé · {selected.period_start} → {selected.period_end} UTC · {selected.radiation_unit}</p>}
    <div className="flex items-start gap-2"><Checkbox id="csp-mean" checked={mean} onCheckedChange={(v) => setMean(v === true)} /><Label htmlFor="csp-mean">DNI moyen de chaque intervalle horaire ; rendement effectif incluant incidence, cosinus et pertes optiques documentés.</Label></div>
    {selected?.radiation_unit === "Wh/m²" && <div className="flex items-start gap-2"><Checkbox id="csp-conversion" checked={conversion} onCheckedChange={(v) => setConversion(v === true)} /><Label htmlFor="csp-conversion">Conversion explicite : DNI natif Wh/m² sur 1 h ÷ 1 h = W/m² moyen ; données originales conservées.</Label></div>}
    <fieldset className="space-y-4"><legend className="mb-3 font-semibold">Paramètres documentés</legend>
      {PARAMS.map(([k, label, unit]) => <div key={k} className="grid gap-2 border-b pb-4 sm:grid-cols-3"><div><Label htmlFor={`csp-${k}`}>{label} ({unit})</Label><Input id={`csp-${k}`} type="number" step="any" value={values[k] ?? ""} onChange={(e) => setValues({ ...values, [k]: e.target.value })} /></div><div><Label htmlFor={`csp-nature-${k}`}>Nature</Label><select id={`csp-nature-${k}`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={natures[k] ?? "assumption"} onChange={(e) => setNatures({ ...natures, [k]: e.target.value as "assumption" })}><option value="assumption">Hypothèse ingénieur</option><option value="external">Fabricant / source externe</option><option value="measured">Mesurée</option><option value="estimate">Estimée</option></select></div><div><Label htmlFor={`csp-doc-${k}`}>Source / justification</Label><Input id={`csp-doc-${k}`} value={docs[k] ?? ""} onChange={(e) => setDocs({ ...docs, [k]: e.target.value })} /></div></div>)}
    </fieldset>
    <div><Label htmlFor="csp-fluid">Fluide caloporteur</Label><Input id="csp-fluid" value={fluid} onChange={(e) => setFluid(e.target.value)} /></div>
    <div><Label htmlFor="csp-conditions">Conditions : températures, plages fabricant, frontières thermiques et validité des pertes/rendements</Label><Textarea id="csp-conditions" value={conditions} onChange={(e) => setConditions(e.target.value)} /></div>
    <div><Label htmlFor="csp-reference">Référence documentaire des conditions et du rendement effectif</Label><Input id="csp-reference" value={reference} onChange={(e) => setReference(e.target.value)} /></div>
    <p className="text-sm text-muted-foreground">Température et fluide documentés, non simulés. Rendements constants ; pertes et auxiliaires prescrits à chaque heure, nuit incluse. Pertes supérieures à la capture : bilan signé conservé, chaleur utile et conversion électrique indisponibles. Rendement de cycle absent : brut indisponible. Auxiliaires absents : net indisponible.</p>
    {errors.length > 0 && <ul role="alert" className="list-disc pl-5 text-sm text-destructive">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>}
    <Button onClick={submit} disabled={busy || !online}>{busy ? "Calcul en cours…" : "Lancer le bilan CSP"}</Button>
  </div>;
}