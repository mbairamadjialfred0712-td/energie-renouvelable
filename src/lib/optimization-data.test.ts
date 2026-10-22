import { it, expect } from "vitest";
import { prepareOptimization, persistOptimization, readOptimizationRuns } from "./optimization-data.server";
import type { OptimizationReport, OptimizationProblem } from "@/services/optimization/stored-battery-contract";
import { emptyConfig, HYBRID_VERSION } from "@/features/hybrid/hybrid-model";
const a = "00000000-0000-4000-8000-000000000001", b = "00000000-0000-4000-8000-000000000002";
const problem = (): OptimizationProblem => ({ objective: "minimize_energy_not_served", unit: "kWh", candidateIds: [a, b], referenceId: a, capacityMin: 2, capacityMax: 4, capacityUnit: "kWh", domainSource: "Synthetic test", constraintSource: "Synthetic constraint", maxEns: null, initialPolicy: "equal_initial_usable_energy", terminalPolicy: "final_soc_at_least_initial" });
const report = (): OptimizationReport => ({ version: "stored-battery-enumeration/1.0.0", method: "exhaustive_stored_candidates", status: "completed", optimality: "finite_domain_only", winners: [b], assessments: [], improvement: null, limitations: [] });
function accessClient(role: string, owner = "owner", revision = "revision") {
  return { from: (table: string) => {
    const q: any = { select: () => q, eq: () => q, abortSignal: () => q, maybeSingle: () => Promise.resolve({ error: null, data: table === "scenarios" ? { owner_id: owner, archived: false, updated_at: revision, objectives: { kind: "hybrid_preparation", modelVersion: HYBRID_VERSION, config: { ...emptyConfig(), name: "Synthetic", optimization: problem() } } } : null }), then: (resolve: any) => resolve({ error: null, data: [{ role }] }) }; return q;
  } };
}
it.each(["viewer", "analyst"])("%s cannot launch optimization", async role => await expect(prepareOptimization(accessClient(role) as any, "owner", a, "revision")).rejects.toThrow("ingénieurs"));
it("engineer cannot execute another owner's optimization", async () => await expect(prepareOptimization(accessClient("engineer") as any, "other", a, "revision")).rejects.toThrow("ingénieurs"));
it("rejects a stale problem revision", async () => await expect(prepareOptimization(accessClient("admin") as any, "owner", a, "stale")).rejects.toThrow("modifiée"));
it("rejects missing site and project, not defaulting them", async () => await expect(prepareOptimization(accessClient("admin") as any, "owner", a, "revision")).rejects.toThrow("Projet, site"));
const prepared = () => ({ report: report(), problem: problem(), configId: a, revision: "revision", name: "Synthetic only", projectId: a, localityId: b, sourceSnapshot: [] });
it("persists and rereads exact problem/results in one insert (mock, not hosted)", async () => {
  let stored: any;
  const client = { from: () => { const q: any = { insert: (value: any) => { stored = value; return q; }, select: () => q, single: async () => ({ data: { ...stored, id: b }, error: null }), contains: () => q, order: () => q, limit: async () => ({ data: [{ id: b, parameters: stored.parameters, created_at: "2024-01-02" }], error: null }) }; return q; } };
  expect(await persistOptimization(client as any, "owner", prepared(), "2024-01-02")).toBe(b);
  expect(stored.status).toBe("completed");
  expect((await readOptimizationRuns(client as any, a))[0]?.report.winners).toEqual([b]);
  expect(stored.parameters.problem.capacityMin).toBe(2);
});
it("no feasible run is saved failed, never completed", async () => {
  let stored: any; const p = prepared(); p.report.status = "no_feasible"; p.report.winners = [];
  const client = { from: () => { const q: any = { insert: (value: any) => { stored = value; return q; }, select: () => q, single: async () => ({ data: { id: a }, error: null }) }; return q; } };
  await persistOptimization(client as any, "owner", p, "2024-01-02"); expect(stored.status).toBe("failed"); expect(stored.parameters.report.status).toBe("no_feasible");
});
it("write failure never reports success", async () => {
  const client = { from: () => { const q: any = { insert: () => q, select: () => q, single: async () => ({ error: { message: "unavailable" }, data: null }) }; return q; } };
  await expect(persistOptimization(client as any, "owner", prepared(), "2024-01-02")).rejects.toThrow("aucun succès");
});