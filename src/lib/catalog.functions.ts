import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Small metadata only, paginated so catalogue counts never stop at the Data API row limit.
export const getCatalogRecords = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const configs: { id: string; project_id: string; locality_id: string; status: string }[] = [];
  const simulations: { id: string; locality_id: string | null; engine: string }[] = [];
  for (let start = 0; ; start += 500) {
    const { data, error } = await context.supabase.from("project_storage_configs").select("id,project_id,status,projects(locality_id)").order("id").range(start, start + 499);
    if (error) throw new Error("Les configurations de stockage n’ont pas pu être chargées.");
    for (const r of data ?? []) configs.push({ id: r.id, project_id: r.project_id, status: r.status, locality_id: r.projects?.locality_id ?? "" });
    if ((data?.length ?? 0) < 500) break;
  }
  for (let start = 0; ; start += 500) {
    const { data, error } = await context.supabase.from("simulations").select("id,locality_id,parameters").eq("status", "completed").order("id").range(start, start + 499);
    if (error) throw new Error("Les calculs enregistrés n’ont pas pu être chargés.");
    for (const r of data ?? []) {
      const p = r.parameters;
      if (p && typeof p === "object" && !Array.isArray(p) && typeof p.engine === "string") simulations.push({ id: r.id, locality_id: r.locality_id, engine: p.engine });
    }
    if ((data?.length ?? 0) < 500) break;
  }
  return { configs, simulations };
});
