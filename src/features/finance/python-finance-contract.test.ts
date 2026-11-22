import { describe, expect, it } from "vitest";
import { financePayloadSchema, financeRequest, checkFinanceResponse } from "./python-finance-contract";
import { requiredNumber } from "./python-finance-ui";
import { simulationResponse } from "@/features/engine/engine-contract";
const payload = { mode: "lcoe" as const, input: { currency: "XOF", capex: 1000, annualOpex: 50, lifetimeYears: 1, discountRatePct: 0, yearOneProductionKwh: 1000, degradationPctPerYear: 0, replacements: [] }, evidence: { reference: "Devis fictif QA", date: "2026-11-20", costsConfirmed: true as const }, production: { simulationId: null, source: "Production QA fictive", nature: "assumption" as const } };
const result = { rows: [{ year: 1, productionKwh: 1000, opex: 50, replacementCost: 0, totalCost: 50, discountedCost: 50, discountedEnergyKwh: 1000 }], totalDiscountedCost: 1050, totalDiscountedEnergyKwh: 1000, lcoePerKwh: 1.05, totalCapex: 1000, totalReplacementCost: 0, totalOpex: 50 };
function response() { return simulationResponse.parse({ simulation_id: "id", status: "completed", engine: "finance", engine_version: "1.0.0", schema_version: "1.0", created_at: "2026-11-20T00:00:00Z", completed_at: "2026-11-20T00:00:01Z", results: { lcoe: { value: 1.05, unit: "XOF/kWh", nature: "calculated", method: "QA" } }, timeseries: {}, warnings: [], validation_errors: [], calculation_metadata: { payload, report: { mode: "lcoe", result } } }); }
describe("Python economic boundary", () => {
 it("does not turn missing costs into zero", () => { expect(() => requiredNumber("")).toThrow(); expect(requiredNumber("0")).toBe(0); });
 it("requires dated documentary evidence", () => { expect(financePayloadSchema.safeParse({ ...payload, evidence: { ...payload.evidence, reference: "", date: "2026-02-30" } }).success).toBe(false); });
 it("requires explicit cost confirmation", () => { expect(financePayloadSchema.safeParse({ ...payload, evidence: { ...payload.evidence, costsConfirmed: false } }).success).toBe(false); });
 it("rejects a replacement beyond the analysis duration", () => { expect(financePayloadSchema.safeParse({ ...payload, input: { ...payload.input, replacements: [{ year: 2, cost: 10 }] } }).success).toBe(false); });
 it("accepts the complete response regardless of JSON field order", () => { const out = response(); out.calculation_metadata['payload'] = { production: payload.production, evidence: payload.evidence, input: payload.input, mode: payload.mode }; expect(checkFinanceResponse(financeRequest(payload, null), out, "id").result.lcoePerKwh).toBe(1.05); });
 it("rejects unrelated or incomplete results", () => { const out = response(); out.simulation_id = "other"; expect(() => checkFinanceResponse(financeRequest(payload, null), out, "id")).toThrow(); });
 it("rejects inconsistent discounted balances", () => { const out = response(); out.calculation_metadata['report'] = { mode: "lcoe", result: { ...result, totalDiscountedCost: 2000 } }; expect(() => checkFinanceResponse(financeRequest(payload, null), out, "id")).toThrow("Bilan"); });
 it("rejects changed cost snapshots", () => { const out = response(); out.calculation_metadata['payload'] = { ...payload, input: { ...payload.input, capex: 999 } }; expect(() => checkFinanceResponse(financeRequest(payload, null), out, "id")).toThrow("entrées"); });
});
