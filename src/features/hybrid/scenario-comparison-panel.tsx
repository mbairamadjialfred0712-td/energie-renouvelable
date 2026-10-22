import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getScenarioComparison, saveHybridConfiguration } from "@/lib/hybrid.functions";
import type { HybridConfig, HybridData } from "./hybrid-model";
import type { ScenarioTable } from "./scenario-comparison";

export function ScenarioComparisonPanel({ config, data }: { config: HybridConfig; data: HybridData }) {
  const [ids, setIds] = useState(config.comparison.scenarioIds);
  const [name, setName] = useState(config.comparison.name);
  const [table, setTable] = useState<ScenarioTable | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const compare = useServerFn(getScenarioComparison), save = useServerFn(saveHybridConfiguration);
  const client = useQueryClient();
  const run = async (persist: boolean) => {
    setBusy(true); setError(""); setTable(null);
    try {
      const result = ids.length >= 2 ? await compare({ data: { ids } }) : null;
      if (persist) { await save({ data: { ...config, comparison: { name, scenarioIds: ids } } }); await client.invalidateQueries({ queryKey: ["hybrid-workspace"] }); }
      setTable(result);
    } catch (e) { setError(e instanceof Error ? e.message : "Comparaison indisponible."); }
    finally { setBusy(false); }
  };
  return <section className="space-y-5 border-t border-border pt-5" aria-label="Comparaison de scénarios">
    <h3 className="font-semibold">Scénarios comparatifs</h3>
    <Label className="grid max-w-md gap-2">Nom de la comparaison<Input value={name} onChange={e => setName(e.target.value)} /></Label>
    <fieldset className="grid gap-3 sm:grid-cols-2"><legend className="mb-3 text-sm text-muted-foreground">Scénarios du même site</legend>{data.configs.filter(r => r.config.siteId === config.siteId && config.siteId !== null).map(r => <label key={r.config.id} className="flex min-w-0 items-start gap-2 text-sm"><Checkbox disabled={busy || (!ids.includes(r.config.id ?? "") && ids.length >= 12)} checked={ids.includes(r.config.id ?? "")} onCheckedChange={checked => { const id = r.config.id; if (!id) return; setIds(checked === true ? [...ids, id] : ids.filter(x => x !== id)); setTable(null); }} /><span className="break-words">{r.config.name}</span></label>)}</fieldset>
    <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={busy || ids.length < 2} onClick={() => run(false)}><RefreshCw />{busy ? "Vérification…" : "Comparer"}</Button>{data.canWrite && config.id && <Button disabled={busy} onClick={() => run(true)}><Save />Enregistrer la sélection</Button>}</div>
    {ids.length < 2 && <p className="text-sm text-muted-foreground">Comparaison indisponible : moins de deux scénarios sélectionnés.</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {table && <>{table.warnings.map(w => <p key={w} role="status" className="text-sm text-muted-foreground">{w}</p>)}<div className="max-w-full overflow-x-auto"><table className="w-full border-collapse text-sm" aria-label="Indicateurs par scénario"><thead><tr className="border-b border-border"><th className="min-w-48 p-3 text-left">Indicateur</th>{table.columns.map(c => <th key={c.id} className="min-w-60 p-3 text-left"><p className="break-words">{c.name}</p><p className="mt-1 font-normal text-muted-foreground">{c.site} · {c.prepared ? "Préparation uniquement" : "Résultats individuels"}</p><details className="mt-2 font-normal"><summary>Objectif et hypothèses</summary><p className="mt-2 whitespace-pre-wrap">{c.objective || "Objectif non renseigné"}</p><p className="mt-2 whitespace-pre-wrap">{c.assumptions || "Hypothèses non renseignées"}</p><p className="mt-2 text-xs">Scénario {c.id}</p></details></th>)}</tr></thead><tbody>{table.rows.map(r => <tr key={r.key} className="border-b border-border"><th className="p-3 text-left align-top font-medium">{r.label}</th>{r.cells.map((c, i) => <td key={table.columns[i]?.id ?? i} className="p-3 align-top"><p className="font-medium">{c.value === null ? "Non disponible" : c.value.toLocaleString("fr-FR", { maximumFractionDigits: 4 })} <span className="font-normal text-muted-foreground">{c.unit}</span></p><p className="mt-1 text-xs text-muted-foreground">{c.period} · {c.validation}</p>{c.reasons.map(reason => <p key={reason} className="mt-2 text-xs text-destructive">{reason}</p>)}<details className="mt-2 text-xs"><summary>Méthode et limites</summary><p className="mt-2 whitespace-pre-wrap">{c.method}</p></details>{c.simulationId && <Button asChild variant="link" className="mt-1 h-auto px-0 text-xs"><Link to="/simulations/$id/results" params={{ id: c.simulationId }}>Sources et détails du calcul</Link></Button>}</td>)}</tr>)}</tbody></table></div></>}
  </section>;
}