import { expect, it, vi } from "vitest";
import { prepareFinancePayload, readFinanceProduction } from "./finance-source.server";
function q(result: unknown) { const obj: Record<string, unknown> = {}; for (const k of ['select','eq']) obj[k] = vi.fn(() => obj); obj['maybeSingle'] = vi.fn(async () => result); return obj; }
const sim = { id: 'source', name: 'PV QA', status: 'completed', project_id: 'project', period_start: '2025-01-01', period_end: '2025-12-31', engine_version: 'photovoltaic 1.0.1' };
it('never replaces stored production with a browser value', async () => {
 const sb = { from: vi.fn().mockReturnValueOnce(q({ data: sim })).mockReturnValueOnce(q({ data: { value: 15468, unit: 'kWh', calculation_method: 'PVWatts' } })) };
 const prepared = await prepareFinancePayload(sb, { mode: 'lcoe', input: { currency: 'XOF', capex: 1000, annualOpex: 0, lifetimeYears: 1, discountRatePct: 0, yearOneProductionKwh: 999, degradationPctPerYear: 0, replacements: [] }, evidence: { reference: 'Devis QA fictif', date: '2026-11-20', costsConfirmed: true }, production: { simulationId: '11111111-1111-4111-8111-111111111111', source: 'Browser QA', nature: 'assumption' } }, 'project');
 expect(prepared.payload.input.yearOneProductionKwh).toBe(15468);
});
it('rejects another project before reading results', async () => { const sb = { from: vi.fn(() => q({ data: sim })) }; await expect(readFinanceProduction(sb, 'source', 'other')).rejects.toThrow('même projet'); expect(sb.from).toHaveBeenCalledTimes(1); });
it('rejects incomplete annual periods without extrapolation', async () => { const sb = { from: vi.fn().mockReturnValueOnce(q({ data: { ...sim, period_end: '2025-01-07' } })).mockReturnValueOnce(q({ data: { value: 100, unit: 'kWh', calculation_method: 'QA' } })) }; await expect(readFinanceProduction(sb, 'source', 'project')).rejects.toThrow('année complète'); });
it('rejects wrong units', async () => { const sb = { from: vi.fn().mockReturnValueOnce(q({ data: sim })).mockReturnValueOnce(q({ data: { value: 100, unit: 'MWh', calculation_method: 'QA' } })) }; await expect(readFinanceProduction(sb, 'source', 'project')).rejects.toThrow('Unité'); });
