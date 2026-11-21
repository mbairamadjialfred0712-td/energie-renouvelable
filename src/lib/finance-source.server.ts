import { classifyProductionSource } from "@/features/finance/production-source";
import { financePayloadSchema, type FinancePayload } from "@/features/finance/python-finance-contract";

/** Always reread linked production under the caller's RLS; never trust browser energy. */
export async function readFinanceProduction(sb: any, id: string, projectId: string | null) {
  const { data: sim, error: simError } = await sb.from("simulations").select("id,name,status,project_id,period_start,period_end,engine_version").eq("id", id).maybeSingle();
  if (simError || !sim || sim.status !== "completed") throw new Error("Simulation de production terminée inaccessible.");
  if (projectId && sim.project_id !== projectId) throw new Error("La production doit appartenir au même projet.");
  const { data: row, error } = await sb.from("simulation_results").select("value,unit,calculation_method").eq("simulation_id", id).eq("result_type", "annual_ac_energy").maybeSingle();
  if (error || !row) throw new Error("Production annuelle enregistrée indisponible.");
  const check = classifyProductionSource({ simulationId: id, name: sim.name, projectId: sim.project_id, periodStart: sim.period_start, periodEnd: sim.period_end, engineVersion: sim.engine_version, valueKwh: row.value, unit: row.unit, method: row.calculation_method });
  if (!check.ok) throw new Error(check.reason);
  return { simulationId: id, name: String(sim.name), annualKwh: Number(row.value), projectId: sim.project_id as string | null, periodStart: sim.period_start as string, periodEnd: sim.period_end as string, method: String(row.calculation_method) };
}

export async function prepareFinancePayload(sb: any, input: FinancePayload, projectId: string | null) {
  const payload = structuredClone(input);
  let source = null;
  if (payload.production.simulationId) {
    source = await readFinanceProduction(sb, payload.production.simulationId, projectId);
    payload.input.yearOneProductionKwh = source.annualKwh;
    payload.production.source = `Simulation ${source.name} · ${source.method}`.slice(0, 500);
    payload.production.nature = "external";
  }
  return { payload: financePayloadSchema.parse(payload), source };
}