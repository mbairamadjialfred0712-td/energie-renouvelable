import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { CartesianGrid, Scatter, ScatterChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SolarRow } from "@/lib/solar.functions";
import { DATA_NATURES, SOLAR_STATUSES } from "./solar-model";
import { fmt, periodText } from "./solar-ui";
import { SOLAR_METRICS, solarEvolutionPoints, type SolarMetric, type SolarPoint } from "./solar-evolution-data";

const COLORS = ["var(--chart-2)", "var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const SHAPES = ["circle", "triangle", "square", "diamond", "cross"] as const;
const dateLabel = (time: number) => new Date(time).toLocaleDateString("fr-FR", { month: "short", year: "numeric", timeZone: "UTC" });

function PointTooltip({ active, payload, unit }: { active?: boolean; payload?: { payload?: SolarPoint }[]; unit: string }) {
  const point = payload?.[0]?.payload;
  if (!active || !point?.row) return null;
  const r = point.row;
  return <div className="max-w-72 space-y-1 rounded-md border border-border bg-popover p-3 text-sm text-popover-foreground shadow-sm">
    <p className="font-semibold">{r.locality_name ?? "Localité non renseignée"}{r.site_name ? ` · ${r.site_name}` : ""}</p>
    <p className="font-semibold tabular-nums">{fmt(point.value, unit)}</p>
    <p>{periodText(r)}</p><p className="break-words">Source : {r.source}</p>
    <p className="text-xs text-muted-foreground">{DATA_NATURES[r.data_nature]} · {SOLAR_STATUSES[r.status]}</p>
  </div>;
}

export function SolarEvolution({ rows }: { rows: SolarRow[] }) {
  const [metric, setMetric] = useState<SolarMetric>("ghi");
  const [unit, setUnit] = useState<string>("kWh/m²/jour");
  const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const spec = SOLAR_METRICS[metric];
  const { points, undated, invalidRange } = solarEvolutionPoints(rows, metric, unit, from, to);
  const localities = [...new Map(points.map((p) => [p.row.locality_id, p.row.locality_name ?? "Localité non renseignée"])).entries()];
  const series = localities.map(([id, name], index) => ({ id, name, color: COLORS[index % COLORS.length], shape: SHAPES[index % SHAPES.length], points: points.filter((p) => p.row.locality_id === id) }));
  const dates = new Set(points.map((p) => p.date));
  return <section aria-label="Évolution des données solaires" className="my-6 min-w-0 space-y-4 border-y border-border py-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">Évolution des données solaires</h2><span className="text-xs text-muted-foreground">{points.length} observation{points.length > 1 ? "s" : ""} · {localities.length} localité{localities.length > 1 ? "s" : ""}</span></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1"><span className="text-xs text-muted-foreground">Paramètre</span><Select value={metric} onValueChange={(v) => { const next = v as SolarMetric; setMetric(next); setUnit(SOLAR_METRICS[next].units[0]); }}><SelectTrigger aria-label="Paramètre du graphique"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SOLAR_METRICS).map(([key, m]) => <SelectItem key={key} value={key}>{m.label}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><span className="text-xs text-muted-foreground">Unité</span><Select value={unit} onValueChange={setUnit}><SelectTrigger aria-label="Unité du graphique"><SelectValue /></SelectTrigger><SelectContent>{spec.units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
      <label className="space-y-1 text-xs text-muted-foreground">Début de la fenêtre<Input aria-label="Début de la fenêtre" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="space-y-1 text-xs text-muted-foreground">Fin de la fenêtre<Input aria-label="Fin de la fenêtre" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
    </div>
    {invalidRange ? <p role="alert" className="text-sm text-destructive">La fin de la fenêtre doit être postérieure ou égale au début.</p> : points.length === 0 ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Aucune valeur {spec.label} avec une période datée dans cette unité et cette fenêtre.</p> : <>
      <p className="text-xs text-muted-foreground">{spec.label} ({unit}) · Début de la période</p>
      <div className="h-80 min-w-0" role="img" aria-label={`${spec.label} en ${unit}, par début de période et localité : ${points.length} observations`}>
        <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 12, left: 8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
          <XAxis type="number" dataKey="date" domain={dates.size === 1 ? [(points[0]?.date ?? 0) - 86400000, (points[0]?.date ?? 0) + 86400000] : ["dataMin", "dataMax"]} tickFormatter={dateLabel} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" minTickGap={40} />
          <YAxis type="number" dataKey="value" width={65} tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" domain={metric.startsWith("t") ? ["auto", "auto"] : [0, "auto"]} />
          <Tooltip cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }} content={<PointTooltip unit={unit} />} />
          {series.map((s) => <Scatter key={s.id} name={s.name} data={s.points} fill={s.color} shape={s.shape} isAnimationActive={false} />)}
        </ScatterChart></ResponsiveContainer>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs" aria-label="Localités du graphique">{series.map((s, i) => <li key={s.id}><span className={`mr-1 ${["text-chart-2", "text-chart-1", "text-chart-3", "text-chart-4", "text-chart-5"][i % 5]}`}>{["●", "▲", "■", "◆", "+"][i % 5]}</span>{s.name}</li>)}</ul>
      {dates.size < 2 && <p className="text-xs text-muted-foreground">Une seule date de début disponible : évolution temporelle non déterminable.</p>}
      <details className="text-sm"><summary className="cursor-pointer text-primary">Observations et sources ({points.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-muted"><tr>{["Localité / site", "Période", `${spec.label} (${unit})`, "Source", "Nature / statut"].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead><tbody>{points.map((p) => <tr key={p.row.id} className="border-b border-border"><td className="p-2"><Link to="/resources/solar/$id" params={{ id: p.row.id }} className="text-primary hover:underline">{p.row.locality_name}{p.row.site_name ? ` · ${p.row.site_name}` : ""}</Link></td><td className="p-2">{periodText(p.row)}</td><td className="p-2 tabular-nums">{fmt(p.value)}</td><td className="p-2">{p.row.source}</td><td className="p-2">{DATA_NATURES[p.row.data_nature]} · {SOLAR_STATUSES[p.row.status]}</td></tr>)}</tbody></table></div></details>
    </>}
    <p className="text-xs text-muted-foreground">Valeurs enregistrées, sans conversion ni moyenne. Chaque point représente une période complète ; aucune interpolation entre les périodes, les sites ou les sources.</p>
    {undated > 0 && <p className="text-xs text-muted-foreground">{undated} valeur{undated > 1 ? "s" : ""} exclue{undated > 1 ? "s" : ""} : début ou fin de période absent ou invalide.</p>}
  </section>;
}