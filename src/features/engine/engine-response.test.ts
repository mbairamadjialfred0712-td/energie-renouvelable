import { describe, expect, it } from "vitest";
import { simulationResponse, type SimulationRequest } from "./engine-contract";
import { assertCompletedResponse } from "./engine-response";

const id = "12300000-0000-4000-8000-000000000001";
const request: SimulationRequest = { schema_version: "1.0", engine: "photovoltaic", input_data: {}, assumptions: {}, source_references: [], timeseries: { timestamps: Array.from({ length: 8760 }, (_, i) => new Date(Date.UTC(2023, 0, 1) + i * 3600000).toISOString().slice(0, 19)), utc_offset_hours: 0, timestamp_convention: "period_start", series: {} } };
function reply() {
  return simulationResponse.parse({ simulation_id: id, status: "completed", engine: "photovoltaic", engine_version: "1.0.1", schema_version: "1.0", created_at: "2023-01-01T00:00:00Z", completed_at: "2023-01-01T00:01:00Z", warnings: [], validation_errors: [], calculation_metadata: { daily_dates: Array.from({ length: 365 }, (_, i) => new Date(Date.UTC(2023, 0, 1) + i * 86400000).toISOString().slice(0, 10)) }, results: Object.fromEntries(Object.entries({ annual_ac_energy: "kWh", specific_yield: "kWh/kWc", capacity_factor_ac_basis_dc: "%", annual_poa_irradiation: "kWh/m²", ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`monthly_ac_energy_2023-${String(i + 1).padStart(2, "0")}`, "kWh"])) }).map(([k, unit]) => [k, { value: 1, unit, nature: "calculated", method: "fixture test only" }])), timeseries: Object.fromEntries(Object.entries({ ac_energy: "kWh", ac_power: "W", dc_power: "W", poa_irradiance: "W/m²", cell_temperature: "°C", daily_ac_energy: "kWh" }).map(([k, unit]) => [k, { values: Array(k === "daily_ac_energy" ? 365 : 8760).fill(0), unit, method: "fixture test only" }])) });
}
describe("PV response boundary (fixtures, not scientific results)", () => {
  it("accepts a complete correlated response", () => expect(() => assertCompletedResponse(request, reply(), id)).not.toThrow());
  it.each(["failed", "running", "pending"] as const)("does not accept %s as success", (status) => { const out = reply(); out.status = status; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects an unrelated simulation", () => { const out = reply(); out.simulation_id = "other"; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects a different engine", () => { const out = reply(); out.engine = "battery"; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects incompatible schema", () => { const out = reply(); out.schema_version = "2.0"; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects missing hourly result", () => { const out = reply(); delete out.timeseries["ac_energy"]; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects short hourly series", () => { const out = reply(); out.timeseries["ac_energy"]?.values.pop(); expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects absent annual result", () => { const out = reply(); delete out.results["annual_ac_energy"]; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects incompatible energy units", () => { const out = reply(); const s = out.timeseries["ac_energy"]; if (s) s.unit = "W"; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects missing daily dates", () => { const out = reply(); delete out.calculation_metadata["daily_dates"]; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects missing monthly aggregation", () => { const out = reply(); delete out.results["monthly_ac_energy_2023-01"]; expect(() => assertCompletedResponse(request, out, id)).toThrow(); });
  it("rejects nonfinite numbers at schema boundary", () => { const out = reply(); const s = out.timeseries["ac_energy"]; if (s) s.values[0] = Infinity; expect(simulationResponse.safeParse(out).success).toBe(false); });
});