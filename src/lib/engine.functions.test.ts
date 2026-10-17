import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ call: vi.fn(), admin: { from: vi.fn() } }));
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
  return builder;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: mocks.admin }));
vi.mock("./engine-http.server", () => ({ callEngine: mocks.call }));
import { getSimulationSeries, runWindSimulation } from "./engine.functions";

// Handlers invoked directly with controlled context; these are not hosted RLS tests.
const seriesHandler = getSimulationSeries as unknown as (args: unknown) => Promise<unknown>;
const runHandler = runWindSimulation as unknown as (args: unknown) => Promise<unknown>;
function query(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const k of ["select", "eq", "insert", "update", "delete"]) q[k] = vi.fn(() => q);
  q["maybeSingle"] = vi.fn(async () => result); q["single"] = vi.fn(async () => result);
  return q;
}
beforeEach(() => vi.clearAllMocks());
it("series read distinguishes database failure from absence", async () => {
  const sb = { from: vi.fn(() => query({ data: null, error: { message: "offline" } })) };
  await expect(seriesHandler({ data: { id: "id", resultType: "series_turbine_power" }, context: { supabase: sb } })).rejects.toThrow("Lecture de la simulation");
});
it("series parameters read failure cannot return empty timestamps", async () => {
  const sb = { from: vi.fn().mockReturnValueOnce(query({ data: { status: "completed" }, error: null })).mockReturnValueOnce(query({ data: { timeseries: { values: [500] }, unit: "W" }, error: null })).mockReturnValueOnce(query({ data: null, error: { message: "offline" } })) };
  await expect(seriesHandler({ data: { id: "id", resultType: "series_turbine_power" }, context: { supabase: sb } })).rejects.toThrow("Lecture des paramètres");
});
it("series with missing timestamps is unavailable, never a successful empty series", async () => {
  const sb = { from: vi.fn().mockReturnValueOnce(query({ data: { status: "completed" }, error: null })).mockReturnValueOnce(query({ data: { timeseries: { values: [500] }, unit: "W" }, error: null })).mockReturnValueOnce(query({ data: { parameters: {} }, error: null })) };
  await expect(seriesHandler({ data: { id: "id", resultType: "series_turbine_power" }, context: { supabase: sb } })).rejects.toThrow("horodatages");
});
it.each(["analyst", "viewer"])("%s cannot launch or persist a wind simulation", async (role) => {
  const sb = { from: vi.fn(() => ({ select: () => ({ eq: async () => ({ data: [{ role }], error: null }) }) })) };
  await expect(runHandler({ data: { request: { engine: "wind" } }, context: { supabase: sb, userId: "user" } })).rejects.toThrow("administrateurs et ingénieurs");
  expect(mocks.call).not.toHaveBeenCalled(); expect(mocks.admin.from).not.toHaveBeenCalled();
});
it("role lookup error cannot grant simulation permissions", async () => {
  const sb = { from: vi.fn(() => ({ select: () => ({ eq: async () => ({ data: [{ role: "admin" }], error: { message: "offline" } }) }) })) };
  await expect(runHandler({ data: { request: { engine: "wind" } }, context: { supabase: sb, userId: "user" } })).rejects.toThrow("Rôles indisponibles");
  expect(mocks.admin.from).not.toHaveBeenCalled();
});