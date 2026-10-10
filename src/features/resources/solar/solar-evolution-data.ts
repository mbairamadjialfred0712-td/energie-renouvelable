import type { SolarRow } from "@/lib/solar.functions";

export const SOLAR_METRICS = {
  ghi: { label: "GHI", units: ["kWh/m²/jour", "kWh/m²/an"], unitKey: "ghiUnit" },
  dni: { label: "DNI", units: ["kWh/m²/jour", "kWh/m²/an"], unitKey: "dniUnit" },
  dhi: { label: "DHI", units: ["kWh/m²/jour", "kWh/m²/an"], unitKey: "dhiUnit" },
  annual: { label: "Irradiation annuelle", units: ["kWh/m²/an"] },
  tavg: { label: "Température moyenne", units: ["°C"] },
  tmin: { label: "Température minimale", units: ["°C"] },
  tmax: { label: "Température maximale", units: ["°C"] },
  sunshine: { label: "Ensoleillement", units: ["h/jour", "h/an"], unitKey: "sunshineUnit" },
} as const;
export type SolarMetric = keyof typeof SOLAR_METRICS;
export type SolarPoint = { date: number; value: number; row: SolarRow };

function timestamp(date: string | null): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date ? time : null;
}

/** Raw recorded values only; no date inference, averaging, conversion or interpolation. */
export function solarEvolutionPoints(rows: SolarRow[], metric: SolarMetric, unit: string, from = "", to = "") {
  const lower = timestamp(from || null), upper = timestamp(to || null);
  const invalidRange = lower !== null && upper !== null && lower > upper;
  const spec = SOLAR_METRICS[metric];
  let undated = 0;
  const points: SolarPoint[] = [];
  for (const row of rows) {
    const value = row[metric];
    const rowUnit = "unitKey" in spec ? row[spec.unitKey] : spec.units[0];
    if (value === null || !Number.isFinite(value) || rowUnit !== unit) continue;
    const start = timestamp(row.period_start), end = timestamp(row.period_end);
    if (start === null || end === null || end < start) { undated++; continue; }
    // Periods intersecting the chosen window are kept in full, without prorating values.
    if (invalidRange || (lower !== null && end < lower) || (upper !== null && start > upper)) continue;
    points.push({ date: start, value, row });
  }
  return { points: points.sort((a, b) => a.date - b.date || a.row.id.localeCompare(b.row.id)), undated, invalidRange };
}