import { describe, expect, it } from "vitest";
import { summarizeDemands, type DemandSummaryRow } from "./demand-summary";

const eq = { name: "Lampe", category: null, quantity: 10, unit_power: 20, power_unit: "W", hours_per_day: 5, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "critique", notes: null };
const row = (over: Partial<DemandSummaryRow>): DemandSummaryRow => ({
  sector: "Résidentiel", demand_status: "unverified", period_start: null, period_end: null,
  measurements: [], energy_demand_equipment: [], ...over,
});

describe("summarizeDemands", () => {
  it("retourne des agrégats vides sans aucune demande", () => {
    const r = summarizeDemands([]);
    expect(r.demandBySector).toEqual({});
    expect(r.demandByStatus).toEqual({});
  });

  it("fiche sans données : comptée, aucun total mesuré ni estimé, jamais de zéro affiché", () => {
    const r = summarizeDemands([row({})]);
    const s = r.demandBySector["Résidentiel"]!;
    expect(s.count).toBe(1);
    expect(s.withMeasured).toBe(0);
    expect(s.measuredKwh).toBe(0);
    expect(s.withEstimate).toBe(0);
    expect(s.estimatedMonthlyKwh).toBe(0);
  });

  it("données partielles : inventaire incomplet → pas d'estimation", () => {
    const r = summarizeDemands([row({ energy_demand_equipment: [{ ...eq, quantity: null }] })]);
    expect(r.demandBySector["Résidentiel"]!.withEstimate).toBe(0);
  });

  it("mesures valides : sommées en kWh (conversion Wh → kWh)", () => {
    const r = summarizeDemands([row({ measurements: [{ start: "2024-01-01", end: "2024-01-31", energy: 310000, unit: "Wh", peak_kw: null, notes: null }] })]);
    const s = r.demandBySector["Résidentiel"]!;
    expect(s.withMeasured).toBe(1);
    expect(s.measuredKwh).toBeCloseTo(310);
  });

  it("mesures chevauchantes : exclues et signalées (pas de double comptage)", () => {
    const m = [
      { start: "2024-01-01", end: "2024-01-15", energy: 100, unit: "kWh", peak_kw: null, notes: null },
      { start: "2024-01-10", end: "2024-01-31", energy: 100, unit: "kWh", peak_kw: null, notes: null },
    ];
    const s = summarizeDemands([row({ measurements: m })]).demandBySector["Résidentiel"]!;
    expect(s.withMeasured).toBe(0);
    expect(s.measuredSkipped).toBe(1);
  });

  it("mesures hors période de référence : exclues et signalées, jamais incluses silencieusement", () => {
    const s = summarizeDemands([row({
      period_start: "2024-01-01", period_end: "2024-12-31",
      measurements: [{ start: "2023-06-01", end: "2023-06-30", energy: 500, unit: "kWh", peak_kw: null, notes: null }],
    })]).demandBySector["Résidentiel"]!;
    expect(s.withMeasured).toBe(0);
    expect(s.measuredKwh).toBe(0);
    expect(s.measuredOutOfPeriod).toBe(1);
  });

  it("mesure partiellement hors période : exclue ; mesure dans la période : conservée", () => {
    const s = summarizeDemands([row({
      period_start: "2024-01-01", period_end: "2024-12-31",
      measurements: [
        { start: "2023-12-15", end: "2024-01-15", energy: 100, unit: "kWh", peak_kw: null, notes: null },
        { start: "2024-03-01", end: "2024-03-31", energy: 62, unit: "kWh", peak_kw: null, notes: null },
      ],
    })]).demandBySector["Résidentiel"]!;
    expect(s.measuredOutOfPeriod).toBe(1);
    expect(s.withMeasured).toBe(1);
    expect(s.measuredKwh).toBeCloseTo(62);
  });

  it("estimation inventaire : 10 lampes 20 W × 5 h × 7 j/sem → 30 kWh/mois (mois de 30 j)", () => {
    const s = summarizeDemands([row({ energy_demand_equipment: [eq] })]).demandBySector["Résidentiel"]!;
    expect(s.withEstimate).toBe(1);
    expect(s.estimatedMonthlyKwh).toBeCloseTo(30);
  });

  it("mesuré et estimé restent séparés et ne sont jamais additionnés", () => {
    const s = summarizeDemands([row({
      measurements: [{ start: "2024-01-01", end: "2024-01-31", energy: 310, unit: "kWh", peak_kw: null, notes: null }],
      energy_demand_equipment: [eq],
    })]).demandBySector["Résidentiel"]!;
    expect(s.measuredKwh).toBeCloseTo(310);
    expect(s.estimatedMonthlyKwh).toBeCloseTo(30);
  });
});
