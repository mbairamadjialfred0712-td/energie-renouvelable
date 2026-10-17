import { beforeEach, expect, it, vi } from "vitest";

import { assertCanRun, readSimulationSeries } from "./engine-access.server";

function query(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const k of ["select", "eq", "insert", "update", "delete"]) q[k] = vi.fn(() => q);
  q["maybeSingle"] = vi.fn(async () => result); q["single"] = vi.fn(async () => result);
  return q;
}
beforeEach(() => vi.clearAllMocks());
it("series read distinguishes database failure from absence", async () => {
  const sb = { from: vi.fn(() => query({ data: null, error: { message: "offline" } })) };
  await expect(readSimulationSeries(sb, "id", "series_turbine_power")).rejects.toThrow("Lecture de la simulation");
});
it("series parameters read failure cannot return empty timestamps", async () => {
  const sb = { from: vi.fn().mockReturnValueOnce(query({ data: { status: "completed" }, error: null })).mockReturnValueOnce(query({ data: { timeseries: { values: [500] }, unit: "W" }, error: null })).mockReturnValueOnce(query({ data: null, error: { message: "offline" } })) };
  await expect(readSimulationSeries(sb, "id", "series_turbine_power")).rejects.toThrow("Lecture des paramètres");
});
it("series with missing timestamps is unavailable, never a successful empty series", async () => {
  const sb = { from: vi.fn().mockReturnValueOnce(query({ data: { status: "completed" }, error: null })).mockReturnValueOnce(query({ data: { timeseries: { values: [500] }, unit: "W" }, error: null })).mockReturnValueOnce(query({ data: { parameters: {} }, error: null })) };
  await expect(readSimulationSeries(sb, "id", "series_turbine_power")).rejects.toThrow("horodatages");
});
it.each(["analyst", "viewer"])("%s cannot launch or persist a wind simulation", async (role) => {
  const sb = { from: vi.fn(() => ({ select: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) })) };
  await expect(assertCanRun(sb, "user")).rejects.toThrow("administrateurs et ingénieurs");
  expect(sb.from).toHaveBeenCalledTimes(1);
});
it("role lookup error cannot grant simulation permissions", async () => {
  const sb = { from: vi.fn(() => ({ select: () => ({ eq: async () => ({ data: [{ role: "admin" }], error: { message: "offline" } }) }) })) };
  await expect(assertCanRun(sb, "user")).rejects.toThrow("Rôles indisponibles");
  expect(sb.from).toHaveBeenCalledTimes(1);
});