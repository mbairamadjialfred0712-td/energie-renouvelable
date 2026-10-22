import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { decodeHybridEnvelope, hybridConfigSchema, HYBRID_VERSION } from "@/features/hybrid/hybrid-model";
import type { Json } from "@/integrations/supabase/types";
import { z } from "zod";

export const getHybridWorkspace = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { loadHybridData } = await import("./hybrid-data.server");
  return loadHybridData(context.supabase, context.userId);
});
export const getScenarioComparison = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ ids: z.array(z.string().uuid()).min(2).max(12).refine(ids => new Set(ids).size === ids.length) }).strict().parse(i))
  .handler(async ({ data, context }) => {
    const { loadHybridData } = await import("./hybrid-data.server");
    const { buildScenarioComparison } = await import("@/features/hybrid/scenario-comparison");
    const refs = await loadHybridData(context.supabase, context.userId);
    return buildScenarioComparison(data.ids, refs);
  });
export const saveHybridConfiguration = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => hybridConfigSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { assertHybridWriter, assertHybridReferences } = await import("./hybrid-access.server");
    const { loadHybridData } = await import("./hybrid-data.server");
    const { data: roles, error: roleError } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    if (roleError) throw new Error("Permissions indisponibles.");
    const roleNames = (roles ?? []).map(r => r.role);
    assertHybridWriter(roleNames, context.userId);
    const current = data.id ? await context.supabase.from("scenarios").select("id,owner_id,objectives,updated_at").eq("id", data.id).single() : null;
    if (current && (current.error || !current.data)) throw new Error("Configuration inaccessible.");
    assertHybridWriter(roleNames, context.userId, current?.data?.owner_id);
    const previous = current?.data ? decodeHybridEnvelope(current.data.objectives) : null;
    if (current && !previous) throw new Error("Ce scénario ne relève pas du module hybride ; il est préservé.");
    const refs = await loadHybridData(context.supabase, context.userId);
    const missing = [...data.components.map(c => c.simulationId), ...(data.optimization?.candidateIds ?? [])].filter((id): id is string => !!id && !refs.simulations.some(s => s.id === id));
    if (missing.length) {
      const { loadSimulationsByIds } = await import("./hybrid-data.server");
      refs.simulations.push(...await loadSimulationsByIds(context.supabase, missing));
    }
    assertHybridReferences(data, refs);
    const at = new Date().toISOString();
    const history = [...(previous?.history ?? []), { at, actor: context.userId, config: data }];
    const payload = { name: data.name, description: data.description, technologies: data.components.map(c => c.technology),
      objectives: { kind: "hybrid_preparation", modelVersion: HYBRID_VERSION, config: data, history } as unknown as Json,
      powers: data.components.map(c => ({ technology: c.technology, value: c.power, unit: c.powerUnit, source: c.parameterSource })) as unknown as Json,
      assumptions: { text: data.assumptions } as Json, constraints: { text: data.constraints } as Json, updated_at: at };
    const saved = data.id && current?.data ? await context.supabase.from("scenarios").update(payload).eq("id", data.id).eq("updated_at", current.data.updated_at).select("id").maybeSingle()
      : await context.supabase.from("scenarios").insert({ ...payload, owner_id: context.userId }).select("id").single();
    if (saved.error || !saved.data) throw new Error("Configuration non enregistrée ou modifiée simultanément ; rechargez avant de réessayer.");
    return { id: saved.data.id };
  });