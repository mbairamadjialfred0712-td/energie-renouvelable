import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const input = z.object({ configId: z.string().uuid(), revision: z.string().min(1).max(100) }).strict();
export const inspectOptimization = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => input.parse(i)).handler(async ({ data, context }) => {
  const { prepareOptimization } = await import("./optimization-data.server");
  const result = await prepareOptimization(context.supabase, context.userId, data.configId, data.revision);
  return result.report;
});
export const runStoredOptimization = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => input.parse(i)).handler(async ({ data, context }) => {
  const startedAt = new Date().toISOString();
  const { prepareOptimization, persistOptimization } = await import("./optimization-data.server");
  const prepared = await prepareOptimization(context.supabase, context.userId, data.configId, data.revision);
  if (prepared.report.status === "blocked") return { id: null, report: prepared.report };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const id = await persistOptimization(supabaseAdmin, context.userId, prepared, startedAt);
  return { id, report: prepared.report };
});
export const getOptimizationRuns = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) => z.object({ configId: z.string().uuid() }).strict().parse(i)).handler(async ({ data, context }) => {
  const row = await context.supabase.from("scenarios").select("id").eq("id", data.configId).maybeSingle();
  if (row.error || !row.data) throw new Error("Configuration inaccessible.");
  const { readOptimizationRuns } = await import("./optimization-data.server");
  return readOptimizationRuns(context.supabase, data.configId);
});