import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { classifyProductionSource, type ProductionCandidate } from "@/features/finance/production-source";

/** Simulations terminées portant une production annuelle AC enregistrée, lues sous RLS utilisateur. Aucun recalcul. */
export const listFinanceProductionSources = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const sb = context.supabase as any;
  const { data: res, error } = await sb.from("simulation_results")
    .select("value,unit,simulation_id,calculation_method,simulations!inner(id,name,status,period_start,period_end,project_id,engine_version)")
    .eq("result_type", "annual_ac_energy").eq("simulations.status", "completed").limit(100);
  if (error) throw new Error("Les simulations de production n’ont pas pu être chargées.");
  return ((res ?? []) as any[]).map((r): ProductionCandidate & { eligible: boolean; reason: string | null } => {
    const c: ProductionCandidate = { simulationId: r.simulations.id, name: r.simulations.name, valueKwh: r.value, unit: r.unit, periodStart: r.simulations.period_start, periodEnd: r.simulations.period_end, projectId: r.simulations.project_id, engineVersion: r.simulations.engine_version, method: r.calculation_method };
    const check = classifyProductionSource(c);
    return { ...c, eligible: check.ok, reason: check.ok ? null : check.reason };
  });
});
