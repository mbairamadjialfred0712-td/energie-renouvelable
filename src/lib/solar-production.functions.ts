import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const calculateProjectSolar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid(), resourceId: z.string().uuid(), powerKwp: z.number().finite().positive().max(1e9), performanceRatio: z.number().finite().positive().max(1), assumptions: z.string().trim().min(10).max(4000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: id, error } = await context.supabase.rpc("estimate_project_solar", { _project_id: data.projectId, _resource_id: data.resourceId, _power_kwp: data.powerKwp, _performance_ratio: data.performanceRatio, _assumptions: data.assumptions });
    if (error) throw new Error(error.message);
    return { id };
  });