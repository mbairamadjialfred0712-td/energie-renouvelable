import { it, expect, vi } from "vitest";
import { loadHybridData } from "./hybrid-data.server";
import { emptyConfig, HYBRID_VERSION } from "@/features/hybrid/hybrid-model";
const envelope = { kind: "hybrid_preparation", modelVersion: HYBRID_VERSION, config: { ...emptyConfig(), name: "QA legacy reference", components: [{ technology: "wind", simulationId: "00000000-0000-4000-8000-000000000009", equipmentId: null, weatherId: null, power: null, powerUnit: "kW", parameterSource: "" }] }, history: [] };
it("reloads a referenced old simulation outside the 100-row window on workspace reads", async () => {
  const calls: string[] = [];
  const sb = { from: vi.fn((table: string) => {
    let old = false;
    const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, in: () => { old = true; calls.push(table); return q; }, then: (resolve: (v: unknown) => unknown) => resolve({ error: null, data: table === "scenarios" ? [{ id: "qa", name: "QA", objectives: envelope, updated_at: "2026-01-01" }] : table === "simulations" && old ? [{ id: envelope.config.components[0]?.simulationId, name: "QA old", project_id: null, status: "draft", parameters: {}, assumptions: {}, engine_version: null, period_start: null, period_end: null }] : [] }) };
    return q;
  }) };
  const result = await loadHybridData(sb as any, "qa");
  expect(calls).toContain("simulations"); expect(result.simulations.map(s => s.id)).toContain(envelope.config.components[0]?.simulationId);
});
it("shows malformed hybrid identity but does not mislabel legacy unrelated scenarios", async () => {
  const sb = { from: (table: string) => { const q: any = { select: () => q, eq: () => q, order: () => q, limit: () => q, then: (resolve: (v: unknown) => unknown) => resolve({ error: null, data: table === "scenarios" ? [{ id: "broken", name: "QA broken", objectives: { kind: "hybrid_preparation" }, updated_at: "2026-01-01" }, { id: "legacy", name: "legacy", objectives: [], updated_at: "2026-01-01" }] : [] }) }; return q; } };
  const result = await loadHybridData(sb as any, "qa"); expect(result.discardedConfigs).toBe(1); expect(result.invalidConfigs?.map(c => c.id)).toEqual(["broken"]);
});