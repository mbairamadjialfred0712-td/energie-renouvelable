import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const countTable = async (client: any, table: string) => {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(`Impossible de compter ${table}.`);
  return count ?? 0;
};

export const getDashboardSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [localities, simulations, projects, scenarios, resources] = await Promise.all([
      countTable(context.supabase, "localities"),
      countTable(context.supabase, "simulations"),
      countTable(context.supabase, "projects"),
      countTable(context.supabase, "scenarios"),
      countTable(context.supabase, "energy_resources"),
    ]);
    return { localities, simulations, projects, scenarios, resources };
  });
