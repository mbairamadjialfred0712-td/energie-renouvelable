import { describe, expect, it } from "vitest";
import { buildPvBatteryRows, type StoredScalar } from "./pv-battery-comparison";

const pv = { id: "11111111-1111-1111-1111-111111111111", name: "PV A", engine_version: "photovoltaic 1.0.0", period_start: "2026-01-01", period_end: "2026-12-31", status: "completed" };
const bat = { id: "22222222-2222-2222-2222-222222222222", name: "Batterie B", engine_version: "battery 1.1.0", period_start: "2026-01-01", period_end: "2026-12-31", status: "completed" };
const results: StoredScalar[] = [
  { simulation_id: bat.id, result_type: "demand_coverage_rate", value: 81.07, unit: "%" },
  { simulation_id: bat.id, result_type: "self_consumption_rate", value: 87.16, unit: "%" },
  { simulation_id: bat.id, result_type: "energy_not_served", value: 3025.72, unit: "kWh" },
  { simulation_id: pv.id, result_type: "annual_ac_energy", value: 15500, unit: "kWh" },
];

describe("buildPvBatteryRows", () => {
  it("n'affiche jamais couverture, autoconsommation ou ENS pour un PV seul", () => {
    const rows = buildPvBatteryRows([pv], results);
    expect(rows).toHaveLength(1);
    expect(rows.at(0)!.engine).toBe("photovoltaic");
    expect(rows.at(0)!.coverageRatePct).toBeNull();
    expect(rows.at(0)!.selfConsumptionRatePct).toBeNull();
    expect(rows.at(0)!.energyNotServedKwh).toBeNull();
  });

  it("reprend les valeurs enregistrées d'une simulation batterie terminée", () => {
    const rows = buildPvBatteryRows([bat], results);
    expect(rows.at(0)!.coverageRatePct).toBeCloseTo(81.07);
    expect(rows.at(0)!.selfConsumptionRatePct).toBeCloseTo(87.16);
    expect(rows.at(0)!.energyNotServedKwh).toBeCloseTo(3025.72);
  });

  it("laisse null un indicateur batterie absent des résultats enregistrés", () => {
    const rows = buildPvBatteryRows([bat], results.filter((r) => r.result_type !== "energy_not_served"));
    expect(rows.at(0)!.energyNotServedKwh).toBeNull();
    expect(rows.at(0)!.coverageRatePct).toBeCloseTo(81.07);
  });

  it("ignore les simulations non terminées et les autres moteurs", () => {
    const rows = buildPvBatteryRows(
      [{ ...pv, status: "failed" }, { ...bat, engine_version: "wind 1.0.0" }, pv, bat],
      results,
    );
    expect(rows.map((r) => r.id)).toEqual([pv.id, bat.id]);
  });
});
