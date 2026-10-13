import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import type { WindRow } from "@/lib/wind.functions";
import { WIND_NATURES, WIND_STATUSES, directionSectors, type WindNature, type WindStatus } from "./wind-model";

export const fmt = (v: number | null, unit?: string) => (v === null ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`);
export const periodText = (r: { period_start: string | null; period_end: string | null; period: string | null }) =>
  r.period_start || r.period_end ? `${r.period_start ?? "?"} → ${r.period_end ?? "?"}` : r.period ?? "—";

export function WindStatusBadge({ status }: { status: WindStatus }) {
  return <Badge variant={status === "validated" ? "default" : status === "rejected" ? "destructive" : "outline"}>{WIND_STATUSES[status]}</Badge>;
}
export function WindNatureBadge({ nature }: { nature: WindNature }) {
  return <Badge variant={nature === "assumption" || nature === "estimate" ? "secondary" : "outline"} className={nature === "assumption" || nature === "estimate" ? "italic" : ""}>{WIND_NATURES[nature]}</Badge>;
}

const axis = { stroke: "var(--border)", tick: { fontSize: 11, fill: "var(--muted-foreground)" } };
const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;

/** Charts built only from the series/distribution entered on this dataset. */
export function WindDatasetCharts({ row }: { row: WindRow }) {
  const ts = row.timeseries ?? []; const dist = row.distribution ?? []; const sectors = directionSectors(ts);
  return (
    <div className="grid min-w-0 gap-4 lg:grid-cols-3">
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-2 text-sm font-semibold">Évolution de la vitesse (m/s)</h3>
        {ts.length < 2 ? <Empty text="Aucune série temporelle saisie pour ce jeu." /> : <div className="h-56"><ResponsiveContainer><LineChart data={ts}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="date" {...axis} minTickGap={30} /><YAxis {...axis} width={40} /><Tooltip /><Line dataKey="speed_ms" name="Vitesse (m/s)" stroke="var(--chart-1)" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>}
      </section>
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-2 text-sm font-semibold">Distribution des vitesses (%)</h3>
        {!dist.length ? <Empty text="Aucune distribution fournie par la source." /> : <div className="h-56"><ResponsiveContainer><BarChart data={dist.map((b) => ({ name: `${b.min_ms}–${b.max_ms}`, f: b.frequency_pct }))}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={40} /><Tooltip /><Bar dataKey="f" name="Fréquence (%)" fill="var(--chart-2)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
      </section>
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-2 text-sm font-semibold">Directions observées (nombre)</h3>
        {!sectors ? <Empty text="Direction insuffisamment documentée (moins de 8 observations datées avec direction)." /> : <div className="h-56"><ResponsiveContainer><BarChart data={sectors}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={30} allowDecimals={false} /><Tooltip /><Bar dataKey="count" name="Observations" fill="var(--chart-3)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
      </section>
      <p className="text-xs text-muted-foreground lg:col-span-3">Source : {row.source} · Nature : {WIND_NATURES[row.data_nature]} · Qualité : {row.quality ?? "non renseignée"}</p>
    </div>
  );
}

/** Neutral side-by-side comparison; differences flagged, no source preferred. */
export function WindComparison({ rows, currentId }: { rows: WindRow[]; currentId?: string }) {
  if (rows.length < 2) return <p className="text-sm text-muted-foreground">Moins de deux jeux pour cette localité : comparaison disponible dès qu’un deuxième jeu sera enregistré.</p>;
  const lines: [string, (r: WindRow) => React.ReactNode, ((r: WindRow) => unknown)?][] = [
    ["Vitesse moyenne", (r) => fmt(r.avg, "m/s"), (r) => r.avg], ["Hauteur", (r) => fmt(r.height, "m"), (r) => r.height], ["Vitesse max.", (r) => fmt(r.max, "m/s")],
    ["Direction", (r) => fmt(r.direction, "°")], ["Période", periodText, periodText], ["Source", (r) => r.source, (r) => r.source],
    ["Qualité", (r) => r.quality ?? "—", (r) => r.quality], ["Méthode", (r) => r.acquisition_method ?? "—", (r) => r.acquisition_method],
    ["Nature", (r) => WIND_NATURES[r.data_nature]], ["Statut", (r) => <WindStatusBadge status={r.status} />],
  ];
  const heights = new Set(rows.map((r) => r.height));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs"><tr><th className="px-3 py-2">Paramètre</th>{rows.map((r, i) => <th key={r.id} className={`px-3 py-2 ${r.id === currentId ? "text-primary" : ""}`}><Link to="/resources/wind/$id" params={{ id: r.id }} className="hover:underline">Jeu #{i + 1}</Link></th>)}</tr></thead>
          <tbody>{lines.map(([label, render, key]) => { const differs = key ? new Set(rows.map((r) => String(key(r)))).size > 1 : false; return (
            <tr key={label} className="border-t border-border"><td className="px-3 py-2 text-muted-foreground">{label}{differs && <span className="ml-1 text-xs text-primary">≠</span>}</td>{rows.map((r) => <td key={r.id} className="px-3 py-2 tabular-nums">{render(r)}</td>)}</tr>); })}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">« ≠ » signale une différence entre jeux ; aucune source n’est désignée comme plus fiable.{heights.size > 1 && " Les hauteurs de mesure diffèrent : vitesses non directement comparables (aucune extrapolation verticale appliquée)."}</p>
    </div>
  );
}
