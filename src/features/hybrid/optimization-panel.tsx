import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Play, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { saveHybridConfiguration } from "@/lib/hybrid.functions";
import { getOptimizationRuns, inspectOptimization, runStoredOptimization } from "@/lib/optimization.functions";
import { optimizationProblemSchema, type OptimizationProblem, type OptimizationReport } from "@/services/optimization/stored-battery-contract";
import type { HybridConfig, HybridData } from "./hybrid-model";

export function OptimizationReportView({ report }: { report: OptimizationReport }) {
  return <section aria-label="Résultat d'optimisation" className="space-y-4 border-t border-border pt-4">
    <h3 className="font-semibold">{report.status === "blocked" ? "Optimisation impossible faute de données" : report.status === "no_feasible" ? "Aucune solution admissible trouvée" : "Optimum dans le domaine enregistré admissible"}</h3>
    <p className="text-sm text-muted-foreground">{report.version} · Énumération exhaustive · {report.assessments.length} candidat(s) · {report.winners.length} optimum(s) ex æquo</p>
    <div className="overflow-x-auto"><table className="w-full text-sm" aria-label="Solutions batterie"><thead><tr className="border-b border-border text-left"><th className="p-2">Configuration calculée</th><th className="p-2">Capacité de référence</th><th className="p-2">Énergie non servie</th><th className="p-2">Admissibilité</th></tr></thead><tbody>{report.assessments.map(a => <tr key={a.id} className="border-b border-border"><td className="min-w-48 p-2 align-top"><Link to="/simulations/$id/results" params={{ id: a.id }} className="underline">{a.name}</Link><p className="mt-1 text-xs">{a.engineVersion} · {a.validation}</p></td><td className="p-2 align-top">{a.capacity ?? "Non disponible"} kWh</td><td className="p-2 align-top">{a.value ?? "Non disponible"} kWh</td><td className="min-w-60 p-2 align-top">{a.admissible ? report.winners.includes(a.id) ? "Optimum du domaine admissible" : "Admissible non optimale" : "Inadmissible"}{a.reasons.map(r => <p key={r} className="mt-1 text-xs text-destructive">{r}</p>)}<details className="mt-2 text-xs"><summary>Contraintes et sources</summary><ul>{a.verified.map(v => <li key={v}>{v}</li>)}</ul><p>Énergie initiale {a.initialEnergy ?? "—"} kWh · finale {a.finalEnergy ?? "—"} kWh</p><pre className="whitespace-pre-wrap break-words">{JSON.stringify(a.sources, null, 2)}</pre></details></td></tr>)}</tbody></table></div>
    {report.improvement && <p className="text-sm">Avant / après : variation d’énergie non servie {report.improvement.ensDelta} kWh ; capacité {report.improvement.capacityDelta} kWh. Aucune économie financière calculée.</p>}
    <ul className="space-y-2 text-xs text-muted-foreground">{report.limitations.map(l => <li key={l}>{l}</li>)}</ul>
  </section>;
}
export function OptimizationPanel({ config, data, revision }: { config: HybridConfig; data: HybridData; revision: string }) {
  const p = config.optimization;
  const [ids, setIds] = useState(p?.candidateIds ?? []);
  const [referenceId, setReference] = useState(p?.referenceId ?? "");
  const [min, setMin] = useState(p ? String(p.capacityMin) : ""), [max, setMax] = useState(p ? String(p.capacityMax) : "");
  const [maxEns, setMaxEns] = useState(p?.maxEns == null ? "" : String(p.maxEns));
  const [source, setSource] = useState(p?.domainSource ?? ""), [constraint, setConstraint] = useState(p?.constraintSource ?? "");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false), [report, setReport] = useState<OptimizationReport | null>(null);
  const save = useServerFn(saveHybridConfiguration), inspect = useServerFn(inspectOptimization), run = useServerFn(runStoredOptimization);
  const client = useQueryClient();
  const history = useQuery({ queryKey: ["optimization-runs", config.id], queryFn: () => config.id ? getOptimizationRuns({ data: { configId: config.id } }) : Promise.resolve([]), enabled: Boolean(config.id) });
  const problem = (): OptimizationProblem => optimizationProblemSchema.parse({ objective: "minimize_energy_not_served", unit: "kWh", candidateIds: ids, referenceId, capacityMin: min === "" ? null : Number(min), capacityMax: max === "" ? null : Number(max), capacityUnit: "kWh", domainSource: source, maxEns: maxEns === "" ? null : Number(maxEns), constraintSource: constraint, initialPolicy: "equal_initial_usable_energy", terminalPolicy: "final_soc_at_least_initial" });
  const unchanged = (() => { try { return JSON.stringify(problem()) === JSON.stringify(p); } catch { return false; } })();
  const action = async (mode: "save" | "inspect" | "run") => {
    if (!config.id) return;
    setBusy(true); setError(""); setReport(null);
    try {
      if (mode === "save") { await save({ data: { ...config, optimization: problem() } }); await client.invalidateQueries({ queryKey: ["hybrid-workspace"] }); }
      else if (mode === "inspect") setReport(await inspect({ data: { configId: config.id, revision } }));
      else { const r = await run({ data: { configId: config.id, revision } }); setReport(r.report); await client.invalidateQueries({ queryKey: ["optimization-runs", config.id] }); }
    } catch (e) { setError(e instanceof Error ? e.message : "Optimisation indisponible."); } finally { setBusy(false); }
  };
  const options = data.simulations.filter(s => s.projectId === config.projectId && s.engine === "battery" && (!s.siteId || s.siteId === config.siteId));
  return <section aria-label="Optimisation batterie" className="space-y-5">
    <h3 className="font-semibold">Optimisation · configurations batterie enregistrées</h3>
    <p className="text-sm text-muted-foreground">Objectif : minimiser l’énergie non servie (kWh). Domaine discret : identifiants des calculs sélectionnés, sans interpolation ni relance de moteur.</p>
    <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt>Site</dt><dd>{data.sites.find(s => s.id === config.siteId)?.name ?? "Non associé"}</dd></div><div><dt>Demande / PV</dt><dd>Profils exacts enregistrés dans le calcul de référence ; égalité vérifiée avant admissibilité.</dd></div></dl>
    {!options.length && <p role="status" className="text-sm text-destructive">Aucun calcul batterie enregistré du projet. Un PV terminé, une demande horaire compatible et des calculs batterie sauvegardés sont requis.</p>}
    <fieldset className="space-y-2" disabled={!data.canWrite || busy}><legend className="mb-2 text-sm font-medium">Domaine de recherche · 12 candidats maximum</legend>{options.map(s => <label key={s.id} className="flex items-start gap-2 text-sm"><Checkbox checked={ids.includes(s.id)} disabled={!ids.includes(s.id) && ids.length >= 12} onCheckedChange={v => setIds(v === true ? [...ids, s.id] : ids.filter(id => id !== s.id))} /><span>{s.name} · {s.status}</span></label>)}</fieldset>
    <div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Calcul de référence<select aria-label="Calcul de référence" disabled={!data.canWrite} className="h-10 min-w-0 rounded-md border border-input bg-background px-3" value={referenceId} onChange={e => setReference(e.target.value)}><option value="">Non associé</option>{options.filter(s => ids.includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Label>
      <Label className="grid gap-2">Plafond énergie non servie (kWh, facultatif)<Input type="number" disabled={!data.canWrite} value={maxEns} onChange={e => setMaxEns(e.target.value)} /></Label>
      <Label className="grid gap-2">Capacité de référence minimale (kWh)<Input type="number" disabled={!data.canWrite} value={min} onChange={e => setMin(e.target.value)} /></Label><Label className="grid gap-2">Capacité de référence maximale (kWh)<Input type="number" disabled={!data.canWrite} value={max} onChange={e => setMax(e.target.value)} /></Label>
      <Label className="grid gap-2">Source / justification du domaine<Textarea disabled={!data.canWrite} value={source} onChange={e => setSource(e.target.value)} /></Label><Label className="grid gap-2">Justification des contraintes et de la politique SOC<Textarea disabled={!data.canWrite} value={constraint} onChange={e => setConstraint(e.target.value)} /></Label></div>
    <p className="text-sm">Contraintes obligatoires : même PV et demande, même énergie initiale mobilisable, stock final ≥ stock initial, bilans/SOC/puissances/rendements cohérents. Coûts et contraintes réseau non vérifiés.</p>
    {data.canWrite && <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => action("save")}><Save />Enregistrer le problème</Button><Button variant="outline" disabled={busy || !unchanged} onClick={() => action("inspect")}><Search />Vérifier les données</Button><Button disabled={busy || !unchanged} onClick={() => action("run")}><Play />{busy ? "Vérification…" : "Lancer et enregistrer"}</Button></div>}
    {error && <p role="alert" className="break-words text-sm text-destructive">{error}</p>}
    {report && <OptimizationReportView report={report} />}
    <h3 className="font-semibold">Exécutions enregistrées</h3>{history.error && <p role="alert">Historique indisponible.</p>}{history.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucune optimisation exécutée.</p>}{history.data?.map(h => <details key={h.id} className="border-t border-border pt-3"><summary>{new Date(h.at).toLocaleString("fr-FR")} · {h.report.status}{h.revision !== revision ? " · configuration modifiée depuis" : ""}</summary><OptimizationReportView report={h.report} /><details><summary>Problème enregistré</summary><pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(h.problem, null, 2)}</pre></details></details>)}
  </section>;
}