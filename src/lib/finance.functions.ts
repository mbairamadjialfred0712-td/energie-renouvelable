import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const replacementSchema = z.object({ year: z.number().int().min(1).max(100), cost: z.number().finite().min(0) });
const assumptionSchema = z.object({
  project_id: z.string().uuid(),
  currency: z.string().trim().min(1).max(10),
  capex: z.number().finite().positive(),
  annual_opex: z.number().finite().min(0),
  lifetime_years: z.number().int().min(1).max(100),
  discount_rate_pct: z.number().finite().gt(-100),
  degradation_pct_per_year: z.number().finite().min(0).max(100),
  year_one_production_kwh: z.number().finite().positive().nullable(),
  production_simulation_id: z.string().uuid().nullable(),
  replacements: z.array(replacementSchema).max(50),
  notes: z.string().trim().max(4000).nullable(),
});
export type ProjectFinanceAssumptions = z.infer<typeof assumptionSchema> & { id: string; updated_at: string };

async function assertCanWrite(sb: any, userId: string) {
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId);
  const roles: string[] = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("engineer")) throw new Error("Seuls les administrateurs et ingénieurs peuvent modifier les hypothèses financières.");
}

export const getProjectFinance = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ projectId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    const [{ data: row, error }, { data: sims }, { data: hist }] = await Promise.all([
      sb.from("project_finance_assumptions").select("*").eq("project_id", data.projectId).maybeSingle(),
      sb.from("simulations").select("id,name,status,engine_version,created_at").eq("project_id", data.projectId).eq("status", "completed").order("created_at", { ascending: false }).limit(50),
      sb.from("project_finance_assumption_history").select("id,action,snapshot,created_at").eq("project_id", data.projectId).order("created_at", { ascending: false }).limit(20),
    ]);
    if (error) throw new Error("Les hypothèses financières n’ont pas pu être chargées.");
    // Si une simulation de production est liée, relire sa production annuelle enregistrée (jamais recalculée ici).
    let linkedProduction: { simulationId: string; name: string; annualKwh: number } | null = null;
    if (row?.production_simulation_id) {
      const { data: res } = await sb.from("simulation_results").select("value").eq("simulation_id", row.production_simulation_id).eq("result_type", "annual_ac_energy").maybeSingle();
      const sim = (sims ?? []).find((s: any) => s.id === row.production_simulation_id);
      if (res?.value != null && sim) linkedProduction = { simulationId: row.production_simulation_id, name: sim.name, annualKwh: res.value };
    }
    return { assumptions: (row ?? null) as ProjectFinanceAssumptions | null, simulations: (sims ?? []) as { id: string; name: string; engine_version: string | null; created_at: string }[], linkedProduction, history: (hist ?? []) as { id: string; action: string; created_at: string }[] };
  });

export const saveProjectFinance = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => assumptionSchema.parse(i))
  .handler(async ({ data, context }) => {
    const sb = context.supabase as any;
    await assertCanWrite(sb, context.userId);
    const { project_id, ...rest } = data;
    if (rest.production_simulation_id) {
      const { data: sim } = await sb.from("simulations").select("id,project_id,status").eq("id", rest.production_simulation_id).maybeSingle();
      if (!sim || sim.status !== "completed") throw new Error("La simulation liée doit être terminée.");
      if (sim.project_id && sim.project_id !== project_id) throw new Error("Cette simulation appartient à un autre projet.");
      const { data: res } = await sb.from("simulation_results").select("value").eq("simulation_id", sim.id).eq("result_type", "annual_ac_energy").maybeSingle();
      if (res?.value == null) throw new Error("La simulation liée ne contient pas de production annuelle enregistrée.");
      rest.year_one_production_kwh = res.value; // la production année 1 vient de la simulation, pas d'une saisie
    } else if (rest.year_one_production_kwh == null) {
      throw new Error("Production année 1 requise : saisie explicite ou simulation liée.");
    }
    const row = { ...rest, project_id, owner_id: context.userId, updated_by: context.userId };
    const { data: up, error } = await sb.from("project_finance_assumptions").upsert(row, { onConflict: "project_id" }).select("id");
    if (error || !up?.length) throw new Error("Les hypothèses n’ont pas pu être enregistrées (droits insuffisants ?).");
    return { id: up[0].id as string };
  });
