// Agrégation pure des demandes pour le tableau de bord.
// Règles : jamais de zéro de substitution, jamais de mélange mesuré/estimé,
// mesures incohérentes, chevauchantes ou hors période de référence exclues et comptées.
import { inventoryTotal, measurementDaily, measurementErrors, measurementsOutsidePeriod, overlappingMeasurements, type Equipment, type Measurement } from "@/features/demand/demand-engine";

export type DemandSummaryRow = {
  sector: string;
  demand_status: string | null;
  period_start: string | null;
  period_end: string | null;
  measurements: unknown;
  energy_demand_equipment: unknown;
};

export type SectorSummary = {
  count: number;
  withMeasured: number;
  measuredKwh: number;
  measuredSkipped: number; // mesures incohérentes ou chevauchantes
  measuredOutOfPeriod: number; // mesures hors période de référence : exclues, jamais silencieusement incluses
  withEstimate: number;
  estimatedMonthlyKwh: number;
};

export function summarizeDemands(rows: DemandSummaryRow[]) {
  const demandBySector: Record<string, SectorSummary> = {};
  const demandByStatus: Record<string, number> = {};
  for (const d of rows) {
    const s = (demandBySector[d.sector] ??= { count: 0, withMeasured: 0, measuredKwh: 0, measuredSkipped: 0, measuredOutOfPeriod: 0, withEstimate: 0, estimatedMonthlyKwh: 0 });
    s.count += 1;
    demandByStatus[d.demand_status ?? "unverified"] = (demandByStatus[d.demand_status ?? "unverified"] ?? 0) + 1;
    const measurements = (Array.isArray(d.measurements) ? d.measurements : []) as Measurement[];
    if (measurements.length) {
      const outside = measurementsOutsidePeriod(measurements, d.period_start, d.period_end);
      const inside = measurements.filter((m) => !outside.includes(m));
      if (outside.length) s.measuredOutOfPeriod += 1;
      if (inside.length) {
        if (measurementErrors(inside).length || overlappingMeasurements(inside)) {
          s.measuredSkipped += 1; // non sommées : risque de double comptage
        } else {
          s.withMeasured += 1;
          s.measuredKwh += inside.reduce((sum, m) => sum + (measurementDaily(m)?.kwh ?? 0), 0);
        }
      }
    }
    const equipment = (Array.isArray(d.energy_demand_equipment) ? d.energy_demand_equipment : []) as Equipment[];
    const inv = inventoryTotal(equipment);
    if (inv.complete) { s.withEstimate += 1; s.estimatedMonthlyKwh += inv.monthlyKwh; }
  }
  return { demandBySector, demandByStatus };
}
