import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getEngineStatus, listBatteryConfigurations, getSimulationSeries, listSimulations, runBatterySimulation } from "@/lib/engine.functions";
import { ENGINE_SCHEMA_VERSION, type SimulationRequest } from "./engine-contract";
import { BATTERY_PARAMS, BATTERY_VERSION, batteryRequestSchema } from "./battery-contract";
import { useServerFn } from "@tanstack/react-start";
import type { ConfigSnapshot } from "@/features/storage/battery-model";

// Lecture d'un CSV de demande horaire : colonnes timestamp;demand_kwh. Aucune interpolation ; cellule vide → null (refusée par le moteur).
function parseDemandCsv(text: string): { timestamps: string[]; values: (number | null)[]; errors: string[] } {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  const errors: string[] = [];
  if (lines.length < 2) return { timestamps: [], values: [], errors: ["Fichier vide."] };
  const head = lines[0] ?? "";
  const sep = head.includes(";") ? ";" : ",";
  const header = head.split(sep).map((h) => h.trim().toLowerCase());
  const ti = header.indexOf("timestamp");
  const di = header.indexOf("demand_kwh");
  if (ti < 0) errors.push("Colonne « timestamp » manquante.");
  if (di < 0) errors.push("Colonne « demand_kwh » manquante.");
  const extra = header.filter((h) => h !== "timestamp" && h !== "demand_kwh");
  if (extra.length) errors.push(`Colonnes non prises en charge : ${extra.join(", ")}.`);
  const timestamps: string[] = [];
  const values: (number | null)[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split(sep);
    timestamps.push((cells[ti] ?? "").trim());
    const raw = (cells[di] ?? "").trim();
    const num = raw === "" ? null : Number(sep === ";" ? raw.replace(",", ".") : raw);
    values.push(num === null || Number.isFinite(num) ? num : null);
  }
  return { timestamps, values, errors };
}

const PARAMS = BATTERY_PARAMS;
const NATURES = [["measured", "Mesurée"], ["external", "API / document externe"], ["estimate", "Estimée"], ["assumption", "Hypothèse"]] as const;

export function BatterySimulationForm() {
  const navigate = useNavigate();
  const run = useServerFn(runBatterySimulation);
  const readPv = useServerFn(getSimulationSeries);
  const {data:engine} = useQuery({queryKey:["engine-status"],queryFn:()=>getEngineStatus(),retry:false});
  const {data:configs=[]} = useQuery({queryKey:["battery-configurations"],queryFn:()=>listBatteryConfigurations()});
  const [configId,setConfigId] = useState("");
  const [confirmed,setConfirmed] = useState(false);
  const selected = configs.find(c=>c.id===configId);
  const available = engine?.state === "online" && engine.capabilities.engines.some(e=>e.engine==="battery"&&e.status==="available"&&e.version===BATTERY_VERSION);
  const { data: sims = [] } = useQuery({ queryKey: ["simulations"], queryFn: () => listSimulations() });
  const pvSims = useMemo(() => sims.filter((s) => s.status === "completed" && (s.engine_version ?? "").startsWith("photovoltaic")), [sims]);
  const [name, setName] = useState("");
  const [pvSimId, setPvSimId] = useState("");
  const [demand, setDemand] = useState<{ timestamps: string[]; values: (number | null)[]; errors: string[] } | null>(null);
  const [demandNature, setDemandNature] = useState("");
  const [demandSource, setDemandSource] = useState("");
  const [strategy, setStrategy] = useState<"self_consumption" | "peak_shaving">("self_consumption");
  const [peakHours, setPeakHours] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const [natures, setNatures] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const num = (s: string | undefined) => (s === undefined || s.trim() === "" ? null : Number(s.replace(",", ".")));

  async function submit() {
    const errs: string[] = [];
    if (name.trim().length < 3) errs.push("Nom de la simulation requis.");
    if (!selected) errs.push("Configuration de stockage validée avec instantané requise.");
    if (!confirmed || !demandSource.trim() || !demandNature) errs.push("Source, nature et rattachement de la demande au projet requis.");
    if (!pvSimId) errs.push("Sélectionnez une simulation PV terminée comme source de production.");
    if (!demand) errs.push("Courbe de demande horaire (CSV) requise.");
    if (demand?.errors.length) errs.push(...demand.errors);
    const input_data: SimulationRequest["input_data"] = {};
    const snap = selected?.snapshot as unknown as ConfigSnapshot | null;
    const recorded:Record<string,unknown>={usable_energy_kwh:Number(snap?.sheet.energy_kwh)*Number(selected?.module_count),charge_power_max_kw:Number(snap?.sheet['max_charge_kw'])*Number(selected?.module_count),discharge_power_max_kw:Number(snap?.sheet['max_discharge_kw'])*Number(selected?.module_count),soc_min_pct:selected?.soc_min_pct,soc_max_pct:selected?.soc_max_pct,charge_eff_pct:selected?.charge_eff_pct,discharge_eff_pct:selected?.discharge_eff_pct};
    for (const p of PARAMS) {
      const v = p.key === "initial_soc_pct" ? num(values[p.key]) : recorded[p.key];
      if (typeof v !== "number" || !Number.isFinite(v)) errs.push(`${p.label} requis.`);
      else input_data[p.key] = { value: v, unit: p.unit, nature: (natures[p.key] ?? "assumption") as "assumption" };
    }
    input_data["strategy"] = { value: strategy, unit: "-", nature: "assumption" };
    const assumptions: SimulationRequest["assumptions"] = {};
    if (strategy === "peak_shaving") {
      const hours = peakHours.split(/[;,\s]+/).filter(Boolean).map(Number);
      if (!hours.length || hours.some((h) => !Number.isInteger(h) || h < 0 || h > 23)) errs.push("Heures de pointe : liste d'heures entières 0–23 requise.");
      else assumptions["peak_hours"] = { value: hours, unit: "h", nature: "assumption" };
    }
    setIssues(errs);
    if (errs.length || !demand) return;
    setBusy(true);
    try {
      const pv = await readPv({ data: { id: pvSimId, resultType: "series_ac_energy" } });
      if (!pv || pv.unit !== "kWh") throw new Error("La simulation PV sélectionnée ne contient pas de série horaire d'énergie AC (kWh).");
      if (pv.timestamps.length !== demand.timestamps.length || pv.timestamps.some((t, i) => t !== demand.timestamps[i]))
        throw new Error(`Les horodatages PV (${pv.timestamps.length} h) et demande (${demand.timestamps.length} h) doivent être strictement identiques.`);
      const request: SimulationRequest = {
        schema_version: ENGINE_SCHEMA_VERSION, engine: "battery", engine_version: BATTERY_VERSION, project_id:selected?.project_id, input_data, assumptions,
        source_references: [
          { label: `Simulation PV « ${pv.name} »`, table: "simulations", record_id: pvSimId },
          ...(demandSource.trim() ? [{ label: demandSource.trim() }] : []),
        ],
        timeseries: { timestamps: demand.timestamps, utc_offset_hours: pv.utcOffset, timestamp_convention: "period_start",
          series: {
            pv_energy: { values: pv.values, unit: "kWh", nature: "calculated", source: `Simulation PV ${pvSimId}` },
            demand_energy: { values: demand.values, unit: "kWh", nature: demandNature as "measured", source: demandSource.trim() || null },
          } },
      };
      batteryRequestSchema.parse(request);
      const r = await run({ data: { name: name.trim(), request, storage_config_id:configId, pv_simulation_id:pvSimId, confirm_demand_project:confirmed } });
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
        <h2 className="font-semibold">Niveau C — simulation horaire du SOC</h2>
        <p className="text-sm text-muted-foreground">A — capacité nominale et utilisable : fiches et configurations. B — autonomie simplifiée indisponible : demande moyenne liée et méthode non intégrées. C — réservoir + rendements, version {BATTERY_VERSION}, validation physique en attente.</p>
        {!available && <p role="status" className="text-sm text-destructive">Simulation indisponible : service non configuré, injoignable ou version batterie non confirmée.</p>}
        <Label htmlFor="battery-config">Configuration projet validée *</Label>
        <select id="battery-config" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={configId} onChange={e=>{setConfigId(e.target.value);setConfirmed(false);}}><option value="">— Sélectionner —</option>{configs.map(c=><option key={c.id} value={c.id}>Configuration {c.id} · projet {c.project_id}</option>)}</select>
        {selected && <dl className="grid gap-2 text-sm sm:grid-cols-2">{BATTERY_PARAMS.filter(p=>p.key !== "initial_soc_pct").map(p=>{const snap=selected.snapshot as unknown as ConfigSnapshot|null;const value=p.key === "usable_energy_kwh" ? Number(snap?.sheet.energy_kwh)*Number(selected.module_count) : p.key === "charge_power_max_kw" ? Number(snap?.sheet['max_charge_kw'])*Number(selected.module_count) : p.key === "discharge_power_max_kw" ? Number(snap?.sheet['max_discharge_kw'])*Number(selected.module_count) : (selected as Record<string,unknown>)[p.key];return <div key={p.key}><dt className="text-muted-foreground">{p.label}</dt><dd>{typeof value === "number" && Number.isFinite(value) ? `${value} ${p.unit}` : "Indisponible"}</dd></div>;})}</dl>}
        {!configs.length && <p className="text-sm text-muted-foreground">Aucune configuration validée accessible.</p>}
        <Label htmlFor="batt-name">Nom de la simulation *</Label>
        <Input id="batt-name" value={name} onChange={(e) => setName(e.target.value)} />
      </section>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">1. Production PV horaire (simulation existante)</h2>
        <p className="text-sm text-muted-foreground">La série <code>ac_energy</code> (kWh/h) d'une simulation photovoltaïque terminée alimente le bilan. Aucune production n'est recalculée ici.</p>
        <select aria-label="Simulation PV source" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={pvSimId} onChange={(e) => setPvSimId(e.target.value)}>
          <option value="">— Sélectionner une simulation PV terminée —</option>
          {pvSims.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {!pvSims.length && <p className="text-sm text-muted-foreground">Aucune simulation PV terminée disponible.</p>}
      </section>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">2. Courbe de demande horaire (CSV)</h2>
        <p className="text-sm text-muted-foreground">Colonnes <code>timestamp;demand_kwh</code>. Mêmes horodatages que la série PV. Cellules vides refusées, jamais remplacées par zéro.</p>
        <Input type="file" accept=".csv,text/csv" aria-label="Fichier CSV de demande" onChange={async (e) => { const f = e.target.files?.[0]; setDemand(f ? parseDemandCsv(await f.text()) : null); }} />
        {demand && <p className="text-sm">{demand.timestamps.length} lignes lues{demand.errors.length ? ` · ${demand.errors.join(" ")}` : ""}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="dnat">Nature de la demande</Label>
            <select id="dnat" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={demandNature} onChange={(e) => setDemandNature(e.target.value)}><option value="">— Sélectionner —</option>{NATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
          <div className="space-y-1"><Label htmlFor="dsrc">Source de la demande</Label><Input id="dsrc" value={demandSource} onChange={(e) => setDemandSource(e.target.value)} placeholder="ex. compteur site, profil mesuré…" /></div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border p-5">
        <h2 className="font-semibold">3. Paramètres figés de la configuration</h2>
        <p className="text-sm text-muted-foreground">Capacité de référence = modules × énergie nominale de l’instantané ; plage accessible = capacité × (SOC maximum − SOC minimum). Aucun DoD supplémentaire appliqué. Puissances et rendements repris côté serveur ; seul le SOC initial est saisi pour ce calcul.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {PARAMS.filter(p=>p.key === "initial_soc_pct").map((p) => (
            <div key={p.key} className="space-y-1">
              <Label htmlFor={`b-${p.key}`}>{p.label} ({p.unit}) *</Label>
              <div className="flex gap-2">
                <Input id={`b-${p.key}`} value={values[p.key] ?? ""} onChange={(e) => setValues({ ...values, [p.key]: e.target.value })} />
                <select aria-label={`Nature ${p.label}`} className="h-10 rounded-md border bg-background px-2 text-sm" value={natures[p.key] ?? "assumption"} onChange={(e) => setNatures({ ...natures, [p.key]: e.target.value })}>{NATURES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label htmlFor="strat">Stratégie de pilotage *</Label>
            <select id="strat" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={strategy} onChange={(e) => setStrategy(e.target.value as typeof strategy)}>
              <option value="self_consumption">Auto-consommation maximale</option>
              <option value="peak_shaving">Réduction de pointe (pilotage identique en V1)</option>
            </select></div>
          {strategy === "peak_shaving" && <div className="space-y-1"><Label htmlFor="peak">Heures de pointe (0–23, séparées par des espaces) *</Label><Input id="peak" value={peakHours} onChange={(e) => setPeakHours(e.target.value)} placeholder="ex. 18 19 20" /></div>}
        </div>
        <p className="text-xs text-muted-foreground">Modèle : réservoir + rendements, validation physique en attente. Limites V1 : pas d'auto-décharge, pas de vieillissement, rendements constants. Réduction de pointe : pilotage identique à l’autoconsommation dans cette version, sans priorité horaire garantie. Aucune charge depuis le réseau.</p>
      </section>

      <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)} />Je confirme que le CSV de demande concerne le même projet que la configuration et la simulation PV sélectionnées ; la source et la nature déclarées sont exactes.</label>
      {issues.length > 0 && <ul className="list-disc space-y-1 rounded-lg border border-destructive p-4 pl-8 text-sm text-destructive">{issues.map((i) => <li key={i}>{i}</li>)}</ul>}
      <Button onClick={submit} disabled={busy || !available || !selected || !pvSimId || !demand || !confirmed}>{busy ? "Calcul en cours…" : "Lancer la simulation batterie"}</Button>
    </div>
  );
}
