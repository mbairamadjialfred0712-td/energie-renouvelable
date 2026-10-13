import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const calculateProjectEnergy = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ projectId: z.string().uuid(), resourceId: z.string().uuid(), settingsId: z.string().uuid(), powerKw: z.number().finite().min(0).max(1e9), assumptions: z.string().trim().min(10).max(4000) }).parse(input)).handler(async ({ data, context }) => {
 const { data: id, error } = await context.supabase.rpc("estimate_project_energy", { _project_id: data.projectId, _resource_id: data.resourceId, _settings_id: data.settingsId, _power_kw: data.powerKw, _assumptions: data.assumptions });
 if (error) throw new Error(error.message);
 return { id };
});
