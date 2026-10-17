import { describe, expect, it } from "vitest";
import { demandsToCsv } from "./demand-csv";
import type { DemandRow } from "@/lib/demand.functions";

const row = (over: Partial<DemandRow> = {}): DemandRow => ({
  id: "d1", owner_id: "u1", name: "Étude A", locality_id: "l1", site_id: null, locality_name: "Ville",
  department: null, department_id: null, region: null, region_id: null, country: null, country_id: null, site_name: null,
  category: "residentiel", consumer_detail: null, consumer_name: null, users_count: null, description: null,
  period_start: "2024-01-01", period_end: "2024-12-31", measurements: [], measured_peak_kw: null, daily_profile: [],
  weekday_variation: null, seasonal_variation: null, has_history: null, criticality: null, growth_rate_pct: null,
  assumptions: null, supply: {}, source: "Enquête", reference: null, acquisition_method: null, data_time_basis: null,
  collected_by: null, comments: null, status: "unverified", created_at: "", updated_at: "", equipment: [], ...over,
});

describe("demandsToCsv", () => {
  it("produit un en-tête et une synthèse même sans équipement", () => {
    const csv = demandsToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toContain("demande_id");
    expect(lines.some((l) => l.includes("synthese"))).toBe(true);
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("exporte l’estimation en kWh avec conversion W → kW (÷ 1 000)", () => {
    const csv = demandsToCsv([row({ equipment: [{ id: "e1", name: "Lampe", category: null, quantity: 10, unit_power: 20, power_unit: "W", hours_per_day: 4, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "importante", notes: null }] })]);
    expect(csv).toContain("0,8"); // 10 × 20 W × 4 h / 1000
  });

  it("laisse vide une valeur non calculable au lieu de zéro", () => {
    const csv = demandsToCsv([row({ equipment: [{ id: "e1", name: "Incomplet", category: null, quantity: 1, unit_power: null, power_unit: "W", hours_per_day: 4, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "importante", notes: null }] })]);
    expect(csv).toContain("Ligne incomplète : non calculée");
    expect(csv).not.toContain(";0;0;0;");
  });

  it("distingue mesure et estimation dans les lignes exportées", () => {
    const csv = demandsToCsv([row({ measurements: [{ start: "2024-01-01", end: "2024-01-31", energy: 310, unit: "kWh", peak_kw: 5, notes: null }] })]);
    expect(csv).toContain(";mesure;mesure;");
    expect(csv).toContain("estimation (calculée)");
    expect(csv).toContain(",1;"); // 310 kWh / 31 jours ≈ 10 kWh/j → « 10 » ; vérifie la moyenne mesurée
    expect(csv).toContain("10");
  });

  it("convertit Wh → kWh dans la moyenne mesurée", () => {
    const csv = demandsToCsv([row({ measurements: [{ start: "2024-01-01", end: "2024-01-31", energy: 310000, unit: "Wh", peak_kw: null, notes: null }] })]);
    expect(csv).toContain("Wh ÷ 1 000");
  });

  it("échappe les champs contenant des points-virgules", () => {
    const csv = demandsToCsv([row({ name: "Étude ; spéciale" })]);
    expect(csv).toContain('"Étude ; spéciale"');
  });

  it("signale les mesures chevauchantes sans les sommer", () => {
    const csv = demandsToCsv([row({ measurements: [
      { start: "2024-01-01", end: "2024-01-31", energy: 100, unit: "kWh", peak_kw: null, notes: null },
      { start: "2024-01-15", end: "2024-02-15", energy: 100, unit: "kWh", peak_kw: null, notes: null },
    ] })]);
    expect(csv).toContain("Mesures chevauchantes : non sommées");
  });
});
