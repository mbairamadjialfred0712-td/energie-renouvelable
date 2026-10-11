import { useState } from "react";
import { CartesianGrid, Scatter, ScatterChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ResourceRow } from "@/lib/resources.functions";
import { RESOURCE_DETAILS, type ResourceType } from "./resource-types";
import { resourceEvolutionPoints } from "./resource-evolution-data";

const colors = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const shapes = ["circle", "triangle", "square", "diamond", "cross"] as const;
const statuses: Record<string, string> = { validated: "Validée", pending: "À vérifier", rejected: "Rejetée" };
const period = (r: ResourceRow) => `${r.detail["period_start"]} → ${r.detail["period_end"]}`;

export function ResourceEvolution({ rows, type }: { rows: ResourceRow[]; type: ResourceType }) {
  const config = RESOURCE_DETAILS[type];
  const metrics = config.fields.filter((f) => f.kind === "number");
  const [metric, setMetric] = useState(metrics[0]?.key ?? "");
  const [locality, setLocality] = useState("all");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const spec = metrics.find((m) => m.key === metric); const unit = spec?.unit ?? "";
  const { points, undated, invalidRange } = resourceEvolutionPoints(rows, type, metric, unit, locality, from, to);
  const options = [...new Map(rows.map((r) => [r.locality_id, r.locality_name ?? "Localité non renseignée"])).entries()];
  const series = options.map(([id, name], i) => ({ id, name, color: colors[i % 5], shape: shapes[i % 5], points: points.filter((p) => p.row.locality_id === id) })).filter((s) => s.points.length);
  const dates = new Set(points.map((p) => p.date));
  return <section aria-label={`Évolution — ${config.label}`} className="my-6 min-w-0 space-y-4 border-y border-border py-5">
    <h2 className="text-lg font-semibold">Évolution — {config.label}</h2>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Select value={metric} onValueChange={setMetric}><SelectTrigger aria-label="Paramètre du graphique"><SelectValue /></SelectTrigger><SelectContent>{metrics.map((m) => <SelectItem key={m.key} value={m.key}>{m.label} ({m.unit})</SelectItem>)}</SelectContent></Select>
      <Select value={locality} onValueChange={setLocality}><SelectTrigger aria-label="Localité du graphique"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Toutes les localités</SelectItem>{options.map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
      <label className="text-xs text-muted-foreground">Début de la fenêtre<Input aria-label="Début de la fenêtre" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="text-xs text-muted-foreground">Fin de la fenêtre<Input aria-label="Fin de la fenêtre" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
    </div>
    {invalidRange ? <p role="alert" className="text-sm text-destructive">La fin de la fenêtre doit être postérieure ou égale au début.</p> : !points.length ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Aucune observation datée dans cette unité et cette fenêtre.</p> : <>
      <p className="text-xs text-muted-foreground">{spec?.label} ({unit}) · {points.length} observations · {series.length} localités</p>
      <div className="h-80 min-w-0" role="img" aria-label={`${config.label} : ${points.length} observations en ${unit}`}><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 12, left: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis type="number" dataKey="date" domain={dates.size === 1 ? [(points[0]?.date ?? 0) - 86400000, (points[0]?.date ?? 0) + 86400000] : ["dataMin", "dataMax"]} tickFormatter={(n) => new Date(n).toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" })} stroke="var(--border)" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} minTickGap={40} />
        <YAxis type="number" dataKey="value" domain={[0, "auto"]} width={65} stroke="var(--border)" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
        <Tooltip content={({ active, payload }) => { const p = payload?.[0]?.payload as (typeof points)[number] | undefined; return active && p ? <div className="max-w-72 space-y-1 rounded-md border border-border bg-popover p-3 text-sm shadow-sm"><p className="font-semibold">{p.row.locality_name}</p><p>{p.value.toLocaleString("fr-FR")} {unit}</p><p>{period(p.row)}</p><p>Source : {p.row.source}</p><p>{statuses[p.row.validation_status]} · {p.row.quality ?? "Qualité non renseignée"}</p></div> : null; }} />
        {series.map((s) => <Scatter key={s.id} name={s.name} data={s.points} fill={s.color} shape={s.shape} isAnimationActive={false} />)}
      </ScatterChart></ResponsiveContainer></div>
      <ul className="flex flex-wrap gap-4 text-xs">{series.map((s) => <li key={s.id}>{s.name}</li>)}</ul>
      {dates.size < 2 && <p className="text-xs text-muted-foreground">Une seule date de début : évolution temporelle non déterminable.</p>}
      <details className="text-sm"><summary className="cursor-pointer text-primary">Observations et sources ({points.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{["Localité", "Période", `Valeur (${unit})`, "Source", "Qualité / statut"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead><tbody>{points.map((p) => <tr key={p.row.id} className="border-b border-border"><td className="p-2">{p.row.locality_name}</td><td className="p-2">{period(p.row)}</td><td className="p-2">{p.value.toLocaleString("fr-FR")}</td><td className="p-2">{p.row.source}</td><td className="p-2">{p.row.quality ?? "—"} · {statuses[p.row.validation_status]}</td></tr>)}</tbody></table></div></details>
    </>}
    <p className="text-xs text-muted-foreground">Valeurs enregistrées en {unit}, sans conversion, moyenne ni interpolation. Chaque point conserve sa période complète.</p>
    {undated > 0 && <p className="text-xs text-muted-foreground">{undated} observation(s) exclue(s) : période absente ou invalide.</p>}
  </section>;
}