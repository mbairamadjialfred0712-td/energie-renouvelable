import { describe, expect, it } from "vitest";
import { equipmentEnergy, equipmentErrors, inventoryTotal, measurementDaily, overlappingMeasurements, type Equipment } from "./demand-engine";

const base: Equipment = { name: "Lampe", category: null, quantity: 10, unit_power: 15, power_unit: "W", hours_per_day: 6, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "importante", notes: null };

describe("demand engine", () => {
  it("calcule en W et en kW de façon cohérente", () => {
    expect(equipmentEnergy(base)!.avgDailyKwh).toBeCloseTo(0.9); // 10 × 15 × 6 / 1000
    expect(equipmentEnergy({ ...base, unit_power: 0.015, power_unit: "kW" })!.avgDailyKwh).toBeCloseTo(0.9);
  });
  it("applique jours/semaine et 30 jours", () => {
    const r = equipmentEnergy({ ...base, days_per_week: 5 })!;
    expect(r.avgDailyKwh).toBeCloseTo(0.9 * 5 / 7);
    expect(r.monthlyKwh).toBeCloseTo((0.9 * 5 / 7) * 30);
  });
  it("refuse durées négatives et facteur non documenté", () => {
    expect(equipmentErrors({ ...base, hours_per_day: -1 }, 0).length).toBe(1);
    expect(equipmentErrors({ ...base, hours_per_day: 25 }, 0).length).toBe(1);
    expect(equipmentErrors({ ...base, usage_factor: 0.5 }, 0).length).toBe(1);
    expect(inventoryTotal([base, { ...base, quantity: 0 }]).complete).toBe(false);
  });
  it("convertit explicitement Wh et détecte les chevauchements", () => {
    expect(measurementDaily({ start: "2025-01-01", end: "2025-01-10", energy: 10000, unit: "Wh", peak_kw: null, notes: null })!.avgDailyKwh).toBeCloseTo(1);
    expect(overlappingMeasurements([{ start: "2025-01-01", end: "2025-01-31", energy: 1, unit: "kWh", peak_kw: null, notes: null }, { start: "2025-01-15", end: "2025-02-15", energy: 1, unit: "kWh", peak_kw: null, notes: null }])).toBe(true);
  });
});
