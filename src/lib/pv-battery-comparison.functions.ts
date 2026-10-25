import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildPvBatteryRows, type PvBatterySimulationRow, type StoredScalar } from "@/features/engine/pv-battery-comparison";

/** Tableau multi-scénarios PV/Batterie : lectures sous RLS utilisateur, valeurs enregistrées uniquement. */
export const getPvBatteryComparison = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PvBatterySimulationRow[]> => {
    const sims = await context.supabase
      .from("simulations")
      .select("id,name,engine_version,period_start,period_end,status")
      .eq("status", "completed")
      .order("created_at", { ascending: false })
      .limit(100);
    if (sims.error) throw new Error("Simulations indisponibles.");
    const eligible = (sims.data ?? []).filter(
      (s) => s.engine_version?.startsWith("photovoltaic") || s.engine_version?.startsWith("battery"),
    );
    if (!eligible.length) return [];
    const res = await context.supabase
      .from("simulation_results")
      .select("simulation_id,result_type,value,unit")
      .in("simulation_id", eligible.map((s) => s.id))
      .in("result_type", ["demand_coverage_rate", "self_consumption_rate", "energy_not_served"]);
    if (res.error) throw new Error("Résultats indisponibles.");
    return buildPvBatteryRows(eligible, (res.data ?? []) as StoredScalar[]);
  });
