import { z } from "zod";
import { simulationResponse } from "@/features/engine/engine-contract";
import { checkFinanceResponse, financeRequest, runFinanceSchema } from "@/features/finance/python-finance-contract";
import { assertCanRun } from "./engine-access.server";
import { prepareFinancePayload } from "./finance-source.server";
import { callEngine } from "./engine-http.server";

/** A single completed-envelope INSERT prevents partially saved finance results. */
export async function executeFinance(data: z.infer<typeof runFinanceSchema>, context: { supabase: any; userId: string }) {
  await assertCanRun(context.supabase, context.userId);
  if (data.projectId) {
    const { data: project, error } = await context.supabase.from("projects").select("id").eq("id", data.projectId).maybeSingle();
    if (error || !project) throw new Error("Projet inaccessible.");
  }
  const { payload, source } = await prepareFinancePayload(context.supabase, data.payload, data.projectId);
  const request = financeRequest(payload, data.projectId);
  const id = crypto.randomUUID();
  const out = await callEngine("/simulations", simulationResponse, { method: "POST", body: { ...request, simulation_id: id }, auth: true });
  const report = checkFinanceResponse(request, out, id);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const snapshot = { kind: "python_finance", request, payload, source, report, response: out };
  const { data: saved, error } = await supabaseAdmin.from("simulations").insert({ id, owner_id: context.userId, name: data.name, project_id: data.projectId,
    status: "completed", objective: "Analyse économique Python", engine_version: `finance ${out.engine_version}`, parameters: snapshot as any,
    period_start: source?.periodStart ?? null, period_end: source?.periodEnd ?? null,
  }).select("id").single();
  if (error || saved?.id !== id) throw new Error("Calcul effectué mais non enregistré : aucun succès confirmé.");
  const { data: stored, error: readError } = await context.supabase.from("simulations").select("id,parameters").eq("id", id).single();
  if (readError || !stored || stored.id !== id || JSON.stringify(stored.parameters) === "null") throw new Error("Résultat enregistré mais relecture indisponible : aucun succès confirmé.");
  const envelope = stored.parameters as { request?: unknown; response?: unknown; payload?: unknown };
  const { simulationRequest } = await import("@/features/engine/engine-contract");
  const { financePayloadSchema } = await import("@/features/finance/python-finance-contract");
  const reread = checkFinanceResponse(simulationRequest.parse(envelope.request), simulationResponse.parse(envelope.response), id);
  return { id, report: reread, payload: financePayloadSchema.parse(envelope.payload), version: out.engine_version, completedAt: out.completed_at };
}