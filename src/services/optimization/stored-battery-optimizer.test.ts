import { describe, it, expect } from "vitest";
import { BATTERY_PARAMS } from "@/features/engine/battery-contract";
import { decodeHybridEnvelope, emptyConfig, HYBRID_VERSION } from "@/features/hybrid/hybrid-model";
import { optimizationProblemSchema, type OptimizationProblem } from "./stored-battery-contract";
import { optimizeStoredBatteries, type StoredBatteryCandidate } from "./stored-battery-optimizer";
export const a = "00000000-0000-4000-8000-000000000001", b = "00000000-0000-4000-8000-000000000002";
export const problem = (): OptimizationProblem => ({ objective: "minimize_energy_not_served", unit: "kWh", candidateIds: [a, b], referenceId: a, capacityMin: 2, capacityMax: 4, capacityUnit: "kWh", domainSource: "Synthetic test domain", maxEns: null, constraintSource: "Synthetic explicit terminal policy", initialPolicy: "equal_initial_usable_energy", terminalPolicy: "final_soc_at_least_initial" });
// Hand-specified arithmetic fixtures ONLY. No data is persisted and no engine is replaced.
export function candidate(id: string, capacity: 2 | 4): StoredBatteryCandidate {
  const discharge = capacity === 2 ? 1.6 : 3, ens = 3 - discharge, charged = capacity === 2 ? 3.2 : 6.2, final = capacity * .9;
  const params: Record<string, number> = { usable_energy_kwh: capacity, charge_power_max_kw: 5, discharge_power_max_kw: 5, soc_min_pct: 10, soc_max_pct: 90, initial_soc_pct: 10, charge_eff_pct: 100, discharge_eff_pct: 100 };
  const stamps = ["2024-01-01T00:00:00", "2024-01-01T01:00:00", "2024-01-01T02:00:00"];
  const r = { schema_version: "1.0", engine: "battery", input_data: { ...Object.fromEntries(BATTERY_PARAMS.map(p => [p.key, { value: params[p.key], unit: p.unit, nature: "assumption", source: "Synthetic fixture parameters" }])), strategy: { value: "self_consumption", unit: "-", nature: "assumption", source: "Synthetic explicit strategy" } }, assumptions: {}, source_references: [{ label: "Synthetic test, not field measurements" }], timeseries: { timestamps: stamps, utc_offset_hours: 0, timestamp_convention: "period_start", series: { pv_energy: { values: [4, 0, 4], unit: "kWh", nature: "calculated", source: "Synthetic same PV" }, demand_energy: { values: [0, 3, 0], unit: "kWh", nature: "assumption", source: "Synthetic same demand" } } } };
  const scalars: Record<string, [number | null, string]> = {
    pv_total_energy: [8, "kWh"], demand_total_energy: [3, "kWh"], pv_self_consumed_direct: [0, "kWh"], energy_served_by_battery: [discharge, "kWh"], energy_charged: [charged, "kWh"], energy_not_distributed: [8 - charged, "kWh"], energy_not_served: [ens, "kWh"], charge_losses: [0, "kWh"], discharge_losses: [0, "kWh"], final_soc: [final, "kWh"], self_consumption_rate: [100 * charged / 8, "%"], demand_coverage_rate: [100 * discharge / 3, "%"], equivalent_full_cycles: [discharge / (capacity * .8), "cycles"], demand_peak_power: [3, "kW"], net_peak_power_before_battery: [3, "kW"], net_peak_power_after_battery: [ens, "kW"],
  };
  const firstCharge = capacity * .8, secondCharge = discharge;
  const series = { soc: [final, final - discharge, final], pv_served_direct: [0, 0, 0], battery_discharge: [0, discharge, 0], battery_charge: [firstCharge, 0, secondCharge], energy_not_distributed: [4 - firstCharge, 0, 4 - secondCharge], energy_not_served: [0, ens, 0], grid_import: [0, ens, 0], grid_export: [4 - firstCharge, 0, 4 - secondCharge] };
  return { id, name: `Synthetic ${capacity}`, siteId: "site", projectId: "project", status: "completed", provenanceValid: true, request: r, response: { simulation_id: id, status: "completed", engine: "battery", engine_version: "1.1.0", schema_version: "1.0", created_at: "2024-01-02", completed_at: "2024-01-02", warnings: [], validation_errors: [], results: Object.fromEntries(Object.entries(scalars).map(([key, [value, unit]]) => [key, { value, unit, nature: "calculated", method: "Synthetic exact fixture" }])), timeseries: Object.fromEntries(Object.entries(series).map(([key, values]) => [key, { values, unit: "kWh", method: "Synthetic exact fixture" }])), calculation_metadata: { level: "C", step_hours: 1, first_timestamp: stamps[0], last_timestamp: stamps[2], scientific_validation: "pending" } } };
}
const run = (p = problem(), cs = [candidate(a, 2), candidate(b, 4)]) => optimizeStoredBatteries(p, cs, "site", "project");
describe("Finite stored battery selection — synthetic arithmetic only", () => {
  it("minimizes exact ENS and reports optimum only in finite domain", () => { const r = run(); expect(r.status).toBe("completed"); expect(r.winners).toEqual([b]); expect(r.assessments.map(x => x.value)).toEqual([1.4, 0]); expect(r.optimality).toBe("finite_domain_only"); });
  it("computes compatible before/after without invented cost", () => expect(run().improvement).toEqual({ referenceId: a, selectedId: b, ensDelta: -1.4, capacityDelta: 2, unit: "kWh" }));
  it("is reproducible regardless of candidate order", () => expect(run(problem(), [candidate(b, 4), candidate(a, 2)])).toEqual(run()));
  it("preserves ties without choosing an engineer's decision", () => expect(run(problem(), [candidate(a, 2), candidate(b, 2)]).winners).toEqual([a, b]));
  it("retains an exact calculated zero objective", () => expect(run().assessments[1]?.value).toBe(0));
  it("enforces inclusive capacity bounds", () => expect(run().assessments.every(a => a.admissible)).toBe(true));
  it("rejects capacity outside explicit bounds", () => { const p = problem(); p.capacityMax = 3; expect(run(p).assessments[1]?.reasons.join()).toContain("hors bornes"); });
  it("returns no feasible solution with an impossible capacity domain", () => { const p = problem(); p.capacityMin = 5; p.capacityMax = 6; expect(run(p).status).toBe("no_feasible"); expect(run(p).optimality).toBe("not_established"); });
  it("enforces the optional ENS ceiling", () => { const p = problem(); p.maxEns = 0; expect(run(p).assessments[0]?.admissible).toBe(false); expect(run(p).winners).toEqual([b]); });
  it.each(["draft", "running", "failed", "queued"])("rejects %s candidates", status => { const c = candidate(b, 4); c.status = status; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.admissible).toBe(false); });
  it("blocks absent reference rather than assuming zero", () => expect(run(problem(), [candidate(b, 4)]).status).toBe("blocked"));
  it("rejects cross-site input", () => { const c = candidate(b, 4); c.siteId = "other"; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.admissible).toBe(false); });
  it("rejects absent source snapshot", () => { const c = candidate(b, 4); c.provenanceValid = false; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.admissible).toBe(false); });
  it("does not trust a corrupted scalar", () => { const c = candidate(b, 4); const out = c.response as any; out.results.energy_not_served.value = 10; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.reasons.join()).toContain("bilans"); });
  it("rejects incompatible demand even with same energy total", () => { const c = candidate(b, 4); (c.request as any).timeseries.series.demand_energy.values = [3, 0, 0]; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.reasons.join()).toContain("demande"); });
  it("rejects initial energy bias", () => { const c = candidate(b, 4); (c.request as any).input_data.initial_soc_pct.value = 20; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.reasons.join()).toContain("initiale mobilisable"); });
  it("rejects incompatible engine version", () => { const c = candidate(b, 4); (c.response as any).engine_version = "2.0.0"; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.reasons.join()).toContain("Version"); });
  it("rejects null ENS, never substitutes zero", () => { const c = candidate(b, 4); (c.response as any).results.energy_not_served.value = null; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.value).toBeNull(); });
  it("rejects missing hourly series", () => { const c = candidate(b, 4); delete (c.response as any).timeseries.soc; expect(run(problem(), [candidate(a, 2), c]).assessments[1]?.admissible).toBe(false); });
  it("preserves old envelopes and stores only the problem, not trusted scores", () => { const config = { ...emptyConfig(), name: "Synthetic", optimization: problem() }; const r = decodeHybridEnvelope({ kind: "hybrid_preparation", modelVersion: HYBRID_VERSION, config }); expect(r?.config.optimization?.candidateIds).toEqual([a, b]); });
  it("rejects unknown physical objectives", () => expect(optimizationProblemSchema.safeParse({ ...problem(), objective: "minimize_cost" }).success).toBe(false));
  it("rejects inverted bounds", () => expect(optimizationProblemSchema.safeParse({ ...problem(), capacityMin: 10, capacityMax: 1 }).success).toBe(false));
  it("rejects incompatible units", () => expect(optimizationProblemSchema.safeParse({ ...problem(), capacityUnit: "MWh" }).success).toBe(false));
  it("rejects duplicate candidates", () => expect(optimizationProblemSchema.safeParse({ ...problem(), candidateIds: [a, a] }).success).toBe(false));
  it("rejects unbounded search over twelve candidates", () => expect(optimizationProblemSchema.safeParse({ ...problem(), candidateIds: Array.from({ length: 13 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`) }).success).toBe(false));
});