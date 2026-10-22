import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Battery, GitMerge, Pencil, Plus, Save, Sun, Wind, Flame, Leaf, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspacePage } from "@/components/app/page";
import { saveHybridConfiguration } from "@/lib/hybrid.functions";
import { emptyConfig, evaluateHybrid, newComponent, TECHNOLOGIES, type HybridConfig, type HybridData, type HybridOption, type Technology } from "./hybrid-model";
import { ScenarioComparisonPanel } from "./scenario-comparison-panel";

const icons = { photovoltaic: Sun, wind: Wind, biomass: Leaf, csp: Flame, battery: Battery };
function Choice({ label, value, options, onChange }: { label: string; value: string | null; options: HybridOption[]; onChange: (id: string | null) => void }) {
  return <Label className="grid gap-2 text-sm">{label}<select aria-label={label} className="h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 font-normal" value={value ?? ""} onChange={e => onChange(e.target.value || null)}><option value="">Non associé</option>{options.map(x => <option key={x.id} value={x.id}>{x.name}{x.status ? ` — ${x.status}` : ""}</option>)}</select></Label>;
}

export function HybridWorkspace({ data }: { data: HybridData }) {
  const [selected, setSelected] = useState<string | null>(data.configs[0]?.config.id ?? null);
  const [draft, setDraft] = useState<HybridConfig | null>(null);
  const [tab, setTab] = useState("preparation");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();
  const save = useServerFn(saveHybridConfiguration);
  const record = data.configs.find(r => r.config.id === selected);
  const config = draft ?? record?.config;
  const evaluation = config ? evaluateHybrid(config, data) : null;
  const patch = (changes: Partial<HybridConfig>) => { if (draft) setDraft({ ...draft, ...changes }); };
  const patchComponent = (technology: Technology, changes: Partial<HybridConfig["components"][number]>) => {
    if (draft) patch({ components: draft.components.map(x => x.technology === technology ? { ...x, ...changes } : x) });
  };
  const submit = async () => {
    if (!draft) return;
    setBusy(true); setError("");
    try { const saved = await save({ data: draft }); await queryClient.invalidateQueries({ queryKey: ["hybrid-workspace"] }); setSelected(saved.id); setDraft(null); }
    catch (e) { setError(e instanceof Error ? e.message : "Enregistrement impossible."); }
    finally { setBusy(false); }
  };
  return <div className="[&_header]:grid-cols-1 sm:[&_header]:grid-cols-[minmax(0,1fr)_auto] [&_header_h1]:whitespace-normal [&_header_h1]:overflow-visible [&_header_h1]:text-clip"><WorkspacePage eyebrow="Études / Scénarios" title="Systèmes hybrides" description="Configurations de projet · résultats individuels · bilan chronologique" action={data.canWrite ? <Button size="sm" onClick={() => { setDraft(emptyConfig()); setTab("preparation"); setError(""); }}><Plus />Nouvelle configuration</Button> : undefined}>
    <div className="grid min-w-0 gap-6 xl:grid-cols-[240px_minmax(0,1fr)]">
      <section className="min-w-0" aria-label="Configurations hybrides"><h2 className="mb-3 text-sm font-semibold">Configurations enregistrées</h2>
        {data.configs.length === 0 ? <div className="border border-dashed border-border p-5 text-sm text-muted-foreground">Aucune configuration hybride.</div> : <div className="space-y-2">{data.configs.map(r => <Button key={r.config.id} variant={selected === r.config.id && !draft ? "secondary" : "outline"} className="h-auto w-full justify-start whitespace-normal py-3 text-left" onClick={() => { setSelected(r.config.id); setDraft(null); setError(""); }}><GitMerge className="shrink-0" /><span className="min-w-0 break-words">{r.config.name}<span className="mt-1 block text-xs font-normal text-muted-foreground">{r.config.components.map(c => TECHNOLOGIES[c.technology]).join(" + ") || "Brouillon"}</span></span></Button>)}</div>}
        {data.discardedConfigs > 0 && <p role="alert" className="mt-3 text-xs text-destructive">{data.discardedConfigs} configuration(s) enregistrée(s) illisible(s) : version ou structure non reconnue, données préservées mais non affichées.</p>}
        {data.invalidConfigs?.map(c => <details key={c.id} className="mt-3 break-words text-xs text-destructive"><summary>{c.name} · Données invalides</summary><p className="mt-2">{c.id} · {c.reason}</p></details>)}
        <div className="mt-6 border-t border-border pt-4 text-xs leading-6 text-muted-foreground"><p>Simulation hybride : indisponible</p><p>Validation scientifique : requise</p></div>
      </section>
      <div className="min-w-0">
        {!config ? <div className="grid min-h-72 place-items-center border border-dashed border-border p-8 text-center"><div><GitMerge className="mx-auto mb-4 h-12 w-12 text-primary" /><h2 className="text-lg font-semibold">Aucun système sélectionné</h2><p className="mt-2 text-sm text-muted-foreground">Aucun bilan ni résultat hybride enregistré.</p></div></div> : <>
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-xl font-semibold">{draft ? draft.id ? "Modifier la configuration" : "Nouvelle configuration" : config.name}</h2><Badge variant="outline" className="mt-2">{draft ? "Brouillon" : evaluation?.status}</Badge></div>{!draft && data.canWrite && <Button variant="outline" size="sm" onClick={() => { setDraft(structuredClone(config)); setTab("preparation"); }}><Pencil />Modifier</Button>}</div>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4"><TabsTrigger value="preparation">A · Préparation</TabsTrigger><TabsTrigger value="comparison">B · Comparaison</TabsTrigger><TabsTrigger value="simulation">C · Simulation</TabsTrigger><TabsTrigger value="history">Historique</TabsTrigger></TabsList>
            <TabsContent value="preparation" className="space-y-6 pt-4">
              {draft ? <>
                <div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2 sm:col-span-2">Nom<Input aria-label="Nom de la configuration" value={draft.name} onChange={e => patch({ name: e.target.value })} /></Label>
                  <Choice label="Projet de référence" value={draft.projectId} options={data.projects} onChange={projectId => patch({ projectId, siteId: null, demandId: null, components: draft.components.map(c => ({ ...c, simulationId: null, equipmentId: null, weatherId: null })) })} />
                  <Choice label="Site de référence" value={draft.siteId} options={data.sites} onChange={siteId => patch({ siteId, demandId: null, components: draft.components.map(c => ({ ...c, simulationId: null, equipmentId: c.technology === "battery" ? c.equipmentId : null, weatherId: null })) })} />
                  <Choice label="Demande énergétique" value={draft.demandId} options={data.demands.filter(x => x.siteId === draft.siteId && draft.siteId !== null)} onChange={demandId => patch({ demandId })} />
                  <Label className="grid gap-2">Description<Input value={draft.description} onChange={e => patch({ description: e.target.value })} /></Label>
                  <Label className="grid gap-2">Objectif<Textarea value={draft.objective} onChange={e => patch({ objective: e.target.value })} /></Label>
                  <Label className="grid gap-2">Début de période<Input type="date" value={draft.periodStart ?? ""} onChange={e => patch({ periodStart: e.target.value || null })} /></Label>
                  <Label className="grid gap-2">Fin de période<Input type="date" value={draft.periodEnd ?? ""} onChange={e => patch({ periodEnd: e.target.value || null })} /></Label>
                </div>
                <fieldset><legend className="mb-3 text-sm font-semibold">Technologies sélectionnées</legend><div className="flex flex-wrap gap-3">{(Object.keys(TECHNOLOGIES) as Technology[]).map(t => { const Icon = icons[t]; return <label key={t} className="flex items-center gap-2 rounded-md border border-border px-3 py-3 text-sm"><Checkbox checked={draft.components.some(x => x.technology === t)} onCheckedChange={checked => patch({ components: checked === true ? [...draft.components, newComponent(t)] : draft.components.filter(x => x.technology !== t) })} /><Icon className="h-4 w-4 text-primary" />{TECHNOLOGIES[t]}</label>; })}</div></fieldset>
                {draft.components.map(c => { const Icon = icons[c.technology]; return <section key={c.technology} className="border-t border-border pt-5"><h3 className="mb-4 flex items-center gap-2 font-semibold"><Icon className="h-5 w-5 text-primary" />{TECHNOLOGIES[c.technology]}</h3><div className="grid gap-4 sm:grid-cols-2">
                  <Choice label={`Résultat individuel — ${TECHNOLOGIES[c.technology]}`} value={c.simulationId} options={data.simulations.filter(s => s.engine === c.technology && s.projectId === draft.projectId && draft.projectId !== null).map(s => ({ id: s.id, name: s.name, status: s.status }))} onChange={simulationId => patchComponent(c.technology, { simulationId })} />
                  {c.technology === "battery" || c.technology === "biomass" ? <Choice label={`Équipement / ressource — ${TECHNOLOGIES[c.technology]}`} value={c.equipmentId} options={data.equipment.filter(e => e.technology === c.technology && (c.technology === "battery" ? e.projectId === draft.projectId && draft.projectId !== null : e.siteId === draft.siteId && draft.siteId !== null))} onChange={equipmentId => patchComponent(c.technology, { equipmentId })} /> : <Choice label={`Météo — ${TECHNOLOGIES[c.technology]}`} value={c.weatherId} options={data.weather.filter(w => w.siteId === draft.siteId && draft.siteId !== null)} onChange={weatherId => patchComponent(c.technology, { weatherId })} />}
                  <Label className="grid gap-2">{c.technology === "battery" ? "Capacité déclarée" : "Puissance déclarée"} ({c.powerUnit})<Input type="number" min="0" step="any" value={c.power ?? ""} onChange={e => patchComponent(c.technology, { power: e.target.value === "" ? null : Number(e.target.value) })} /></Label>
                  <Label className="grid gap-2">Source du paramètre<Input value={c.parameterSource} onChange={e => patchComponent(c.technology, { parameterSource: e.target.value })} /></Label>
                </div></section>; })}
                <div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2">Hypothèses explicites<Textarea value={draft.assumptions} onChange={e => patch({ assumptions: e.target.value })} /></Label><Label className="grid gap-2">Contraintes de fonctionnement<Textarea value={draft.constraints} onChange={e => patch({ constraints: e.target.value })} /></Label></div>
                <label className="flex items-center gap-2 text-sm"><Checkbox checked={draft.reviewRequested} onCheckedChange={checked => patch({ reviewRequested: checked === true })} />Validation scientifique requise</label>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <div className="flex flex-wrap gap-2"><Button disabled={busy || draft.name.trim().length < 3} onClick={submit}><Save />{busy ? "Enregistrement…" : "Enregistrer la configuration"}</Button><Button variant="outline" disabled={busy} onClick={() => setDraft(null)}><X />Annuler</Button></div>
              </> : <><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-muted-foreground">Projet</dt><dd className="mt-1 font-medium">{data.projects.find(p => p.id === config.projectId)?.name ?? "Non associé"}</dd></div><div><dt className="text-muted-foreground">Site</dt><dd className="mt-1 font-medium">{data.sites.find(s => s.id === config.siteId)?.name ?? "Non associé"}</dd></div><div><dt className="text-muted-foreground">Hypothèses</dt><dd className="mt-1 whitespace-pre-wrap">{config.assumptions || "Non fournies"}</dd></div><div><dt className="text-muted-foreground">Contraintes</dt><dd className="mt-1 whitespace-pre-wrap">{config.constraints || "Non fournies"}</dd></div></dl><div className="flex flex-wrap gap-2">{config.components.map(c => <Badge key={c.technology} variant="secondary">{TECHNOLOGIES[c.technology]} · {c.power === null ? "Indisponible" : `${c.power} ${c.powerUnit}`}</Badge>)}</div></>}
              <section className="border-t border-border pt-5"><h3 className="flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-destructive" />Préparation des données · {evaluation?.blockers.length ?? 0} blocage(s)</h3><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{evaluation?.blockers.map((b, i) => <li key={i} className="flex gap-2"><span className="shrink-0">•</span>{b}</li>)}</ul></section>
            </TabsContent>
            <TabsContent value="comparison" className="space-y-5 pt-4"><p className="border-l-2 border-primary pl-3 text-sm leading-6">Résultats individuels enregistrés, pas une simulation hybride synchronisée. Aucune addition ni conversion entre électricité, chaleur et énergie primaire.</p>
              {!draft && <ScenarioComparisonPanel key={config.id} config={config} data={data} />}
              {!evaluation?.comparisons.length ? <p className="py-8 text-sm text-muted-foreground">Aucun résultat individuel terminé associé. Valeurs indisponibles, non égales à zéro.</p> : <div className="grid gap-5 lg:grid-cols-2">{evaluation.comparisons.map(s => <article key={s.id} className="min-w-0 rounded-md border border-border bg-background p-4"><h3 className="font-semibold">{s.name}</h3><Badge variant="outline" className="mt-2">Individuelle terminée</Badge><p className="mt-2 text-xs text-muted-foreground">{s.version ?? "Version absente"} · {s.periodStart ?? "?"} → {s.periodEnd ?? "?"}</p><p className="mt-2 text-xs text-muted-foreground">Site historique : {s.siteId ?? "non établi"} · UTC {s.utcOffset ?? "indisponible"}</p><div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Indicateur</th><th>Valeur</th><th>Unité</th></tr></thead><tbody>{s.results.map(r => <tr key={r.key} className="border-b"><td className="max-w-48 break-words py-2" title={r.method}>{r.key}</td><td>{r.value === null ? "Indisponible" : r.value.toLocaleString("fr-FR", { maximumFractionDigits: 4 })}</td><td>{r.unit}</td></tr>)}</tbody></table></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{s.limits}</p><details className="mt-3 text-xs"><summary>Sources et hypothèses enregistrées</summary><pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-words">{JSON.stringify({ sources: s.sources, assumptions: s.assumptions }, null, 2)}</pre></details><Button asChild variant="link" className="mt-2 px-0"><Link to="/simulations/$id/results" params={{ id: s.id }}>Résultats et méthodes</Link></Button></article>)}</div>}
            </TabsContent>
            <TabsContent value="simulation" className="pt-5"><div className="border-l-2 border-destructive pl-4"><h3 className="font-semibold">Niveau C indisponible</h3><ul className="mt-3 space-y-3 text-sm text-muted-foreground">{evaluation?.levelCReasons.map(r => <li key={r}>{r}</li>)}</ul></div><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">{["Énergie servie", "Énergie non servie", "Surplus / écrêtage", "Pertes", "Charge / décharge", "État de charge chronologique"].map(label => <div key={label} className="border-b border-border pb-3"><dt className="text-muted-foreground">{label}</dt><dd className="mt-1">Indisponible</dd></div>)}</dl><Button disabled className="mt-6"><GitMerge />Lancer la simulation hybride</Button></TabsContent>
            <TabsContent value="history" className="space-y-5 pt-4"><h3 className="font-semibold">Versions de configuration</h3>{!record?.history.length ? <p className="text-sm text-muted-foreground">Aucune version enregistrée.</p> : <ol className="space-y-3">{[...record.history].reverse().map((h, i) => <li key={`${h.at}-${i}`} className="border-b border-border pb-3 text-sm"><time>{new Date(h.at).toLocaleString("fr-FR")}</time><p className="mt-1 text-muted-foreground">{h.config.name} · {h.config.components.map(c => TECHNOLOGIES[c.technology]).join(" + ")}</p><details className="mt-1"><summary>Instantané de préparation</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs">{JSON.stringify(h.config, null, 2)}</pre></details></li>)}</ol>}<h3 className="font-semibold">Simulations individuelles du projet</h3>{data.simulations.filter(s => s.projectId === config.projectId && config.projectId !== null).map(s => <div key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-border py-2 text-sm"><Link to="/simulations/$id/results" params={{ id: s.id }} className="underline">{s.name}</Link><span>{({ running: "En cours", completed: "Terminée", failed: "Échec", draft: "Brouillon" } as Record<string, string>)[s.status] ?? s.status}</span></div>)}<p className="text-sm text-muted-foreground">Aucune simulation hybride exécutée.</p></TabsContent>
          </Tabs>
        </>}
      </div>
    </div>
  </WorkspacePage></div>;
}