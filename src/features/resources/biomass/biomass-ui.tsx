import { Link } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import type { BiomassRow } from "@/lib/biomass.functions";
import { BIOMASS_NATURES, BIOMASS_STATUSES, LHV_BASES, MONTHS, safeTotal, type BiomassNature, type BiomassStatus } from "./biomass-model";

export const fmt = (v: number | null | undefined, unit?: string) => (v === null || v === undefined ? "—" : `${v.toLocaleString("fr-FR", { maximumFractionDigits: 3 })}${unit ? ` ${unit}` : ""}`);
export const periodText = (r: { period_start: string | null; period_end: string | null; period: string | null }) =>
  r.period_start || r.period_end ? `${r.period_start ?? "?"} → ${r.period_end ?? "?"}` : r.period ?? "—";
export const typeText = (r: BiomassRow) => `${r.type}${r.type_detail ? ` — ${r.type_detail}` : ""}`;
export const lhvText = (r: BiomassRow) => (r.lhv === null ? "—" : `${fmt(r.lhv, "MJ/kg")} (${r.lhv_basis ? LHV_BASES[r.lhv_basis] : "base ?"})`);
export const seasonText = (s: number[] | null) => (s?.length ? s.map((m) => MONTHS[m - 1]).join(", ") : "—");

export function BiomassStatusBadge({ status }: { status: BiomassStatus }) {
  return <Badge variant={status === "validated" ? "default" : status === "rejected" ? "destructive" : "outline"}>{BIOMASS_STATUSES[status]}</Badge>;
}
export function BiomassNatureBadge({ nature }: { nature: BiomassNature }) {
  const est = nature === "assumption" || nature === "estimate";
  return <Badge variant={est ? "secondary" : "outline"} className={est ? "italic" : ""}>{BIOMASS_NATURES[nature]}</Badge>;
}

const axis = { stroke: "var(--border)", tick: { fontSize: 11, fill: "var(--muted-foreground)" } };
const Empty = ({ text }: { text: string }) => <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;

/** Charts from recorded rows only; quantities grouped per unit, never converted nor summed across units. */
export function BiomassCharts({ rows }: { rows: BiomassRow[] }) {
  const withQty = rows.filter((r) => r.quantity !== null);
  const units = [...new Set(withQty.map((r) => r.unit))];
  const unit = units[0];
  const byType = unit ? withQty.filter((r) => r.unit === unit).map((r, i) => ({ name: `${r.type} #${i + 1}`, q: r.quantity })) : [];
  const statuses = Object.entries(BIOMASS_STATUSES).map(([k, label]) => ({ name: label, n: rows.filter((r) => r.status === k).length })).filter((s) => s.n > 0);
  const months = MONTHS.map((m, i) => ({ name: m, n: rows.filter((r) => r.seasonal?.includes(i + 1)).length }));
  const hasSeason = rows.some((r) => r.seasonal?.length);
  return (
    <div className="mb-6 grid min-w-0 gap-4 lg:grid-cols-3">
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-1 text-sm font-semibold">Quantité par jeu et type{unit ? ` (${unit})` : ""}</h3>
        {units.length > 1 && <p className="text-xs text-muted-foreground">Seuls les jeux en {unit} sont affichés : unités différentes non converties.</p>}
        {!byType.length ? <Empty text="Aucune quantité renseignée." /> : <div className="h-52"><ResponsiveContainer><BarChart data={byType}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={50} /><Tooltip /><Bar dataKey="q" name={unit ?? ""} fill="var(--chart-1)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
      </section>
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-1 text-sm font-semibold">Saisonnalité déclarée (nombre de jeux par mois)</h3>
        {!hasSeason ? <Empty text="Aucune saisonnalité renseignée." /> : <div className="h-52"><ResponsiveContainer><BarChart data={months}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={30} allowDecimals={false} /><Tooltip /><Bar dataKey="n" name="Jeux disponibles" fill="var(--chart-2)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
      </section>
      <section className="min-w-0 border border-border bg-background p-4"><h3 className="mb-1 text-sm font-semibold">Statut de validation</h3>
        {!statuses.length ? <Empty text="Aucun jeu." /> : <div className="h-52"><ResponsiveContainer><BarChart data={statuses}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="name" {...axis} /><YAxis {...axis} width={30} allowDecimals={false} /><Tooltip /><Bar dataKey="n" name="Jeux" fill="var(--chart-3)" isAnimationActive={false} /></BarChart></ResponsiveContainer></div>}
      </section>
    </div>
  );
}

export function BiomassComparison({ rows, currentId }: { rows: BiomassRow[]; currentId?: string }) {
  if (rows.length < 2) return <p className="text-sm text-muted-foreground">Moins de deux jeux pour cette localité : comparaison disponible dès qu’un deuxième jeu sera enregistré.</p>;
  const lines: [string, (r: BiomassRow) => React.ReactNode, ((r: BiomassRow) => unknown)?][] = [
    ["Type", typeText, (r) => r.type], ["Quantité", (r) => fmt(r.quantity, r.unit), (r) => `${r.quantity}${r.unit}`], ["Période", periodText, periodText],
    ["Humidité", (r) => fmt(r.moisture, "%"), (r) => r.moisture], ["PCI", lhvText, (r) => `${r.lhv}${r.lhv_basis}`], ["Source", (r) => r.source, (r) => r.source],
    ["Origine", (r) => BIOMASS_NATURES[r.data_nature]], ["Statut", (r) => <BiomassStatusBadge status={r.status} />],
  ];
  const total = safeTotal(rows.map((r) => ({ id: r.id, type: r.type, unit: r.unit, lhvBasis: r.lhv_basis, start: r.period_start, end: r.period_end, quantity: r.quantity })));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs"><tr><th className="px-3 py-2">Paramètre</th>{rows.map((r, i) => <th key={r.id} className={`px-3 py-2 ${r.id === currentId ? "text-primary" : ""}`}><Link to="/resources/biomass/$id" params={{ id: r.id }} className="hover:underline">Jeu #{i + 1}</Link></th>)}</tr></thead>
          <tbody>{lines.map(([label, render, key]) => { const differs = key ? new Set(rows.map((r) => String(key(r)))).size > 1 : false; return (
            <tr key={label} className="border-t border-border"><td className="px-3 py-2 text-muted-foreground">{label}{differs && <span className="ml-1 text-xs text-primary">≠</span>}</td>{rows.map((r) => <td key={r.id} className="px-3 py-2 tabular-nums">{render(r)}</td>)}</tr>); })}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">« ≠ » signale une différence ; aucune source n’est désignée comme plus fiable. Total : {"total" in total ? `${fmt(total.total, total.unit)} (types distincts, même période, unité et base)` : total.reason}</p>
    </div>
  );
}
