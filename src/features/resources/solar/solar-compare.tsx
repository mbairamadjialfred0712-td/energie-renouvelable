import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Link } from "@tanstack/react-router";
import type { SolarRow } from "@/lib/solar.functions";
import { DATA_NATURES } from "./solar-model";
import { StatusBadge, fmt, periodText } from "./solar-ui";

export function SolarComparison({ rows, currentId }: { rows: SolarRow[]; currentId?: string }) {
  if (rows.length < 2) return <p className="text-sm text-muted-foreground">Un seul jeu de données pour cette localité : comparaison et graphique disponibles dès qu’un deuxième jeu sera enregistré.</p>;
  const lines: [string, (r: SolarRow) => React.ReactNode][] = [
    ["GHI", (r) => fmt(r.ghi, r.ghiUnit)], ["DNI", (r) => fmt(r.dni, r.dniUnit)], ["DHI", (r) => fmt(r.dhi, r.dhiUnit)],
    ["Irradiation annuelle", (r) => fmt(r.annual, "kWh/m²/an")], ["T moyenne", (r) => fmt(r.tavg, "°C")], ["T min / max", (r) => `${fmt(r.tmin)} / ${fmt(r.tmax, "°C")}`],
    ["Ensoleillement", (r) => fmt(r.sunshine, r.sunshineUnit)], ["Période", periodText], ["Source", (r) => r.source], ["Nature", (r) => DATA_NATURES[r.data_nature]],
    ["Qualité", (r) => r.quality ?? "—"], ["Statut", (r) => <StatusBadge status={r.status} />],
  ];
  // Chart only compares values sharing the same unit — no conversion.
  const unit = rows[0]!.ghiUnit;
  const comparable = rows.filter((r) => r.ghiUnit === unit && r.dniUnit === unit && r.dhiUnit === unit && (r.ghi !== null || r.dni !== null || r.dhi !== null));
  const chart = comparable.map((r, i) => ({ name: `#${i + 1} ${r.source.slice(0, 18)}`, GHI: r.ghi, DNI: r.dni, DHI: r.dhi }));
  return (
    <div className="space-y-5">
      <div className="overflow-x-auto border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs"><tr><th className="px-3 py-2">Paramètre</th>{rows.map((r, i) => <th key={r.id} className={`px-3 py-2 ${r.id === currentId ? "text-primary" : ""}`}><Link to="/resources/solar/$id" params={{ id: r.id }} className="hover:underline">Jeu #{i + 1}{r.id === currentId ? " (affiché)" : ""}</Link></th>)}</tr></thead>
          <tbody>{lines.map(([l, fn]) => <tr key={l} className="border-t border-border"><td className="px-3 py-2 font-medium">{l}</td>{rows.map((r) => <td key={r.id} className="px-3 py-2 tabular-nums">{fn(r)}</td>)}</tr>)}</tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Les écarts sont présentés tels quels ; la plateforme ne désigne pas de source « correcte ».</p>
      {chart.length >= 2 ? (
        <div className="h-72 border border-border p-3">
          <p className="mb-2 text-xs text-muted-foreground">GHI / DNI / DHI par jeu ({unit}) — jeux dans d’autres unités exclus, sans conversion.</p>
          <ResponsiveContainer width="100%" height="88%"><BarChart data={chart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
            <Bar dataKey="GHI" fill="var(--color-primary)" /><Bar dataKey="DNI" fill="var(--color-status-ready, #d4a017)" /><Bar dataKey="DHI" fill="var(--color-muted-foreground)" /></BarChart></ResponsiveContainer>
        </div>
      ) : <p className="text-sm text-muted-foreground">Graphique non affiché : moins de deux jeux avec des irradiations dans la même unité.</p>}
    </div>
  );
}
