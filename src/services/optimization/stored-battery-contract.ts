import { z } from "zod";
import type { Json } from "@/integrations/supabase/types";

export const OPTIMIZATION_VERSION = "stored-battery-enumeration/1.0.0";
export const MAX_CANDIDATES = 12;
export const optimizationProblemSchema = z.object({
  objective: z.literal("minimize_energy_not_served"),
  unit: z.literal("kWh"),
  candidateIds: z.array(z.string().uuid()).min(1).max(MAX_CANDIDATES).refine(ids => new Set(ids).size === ids.length, "Candidats dupliqués."),
  referenceId: z.string().uuid(),
  capacityMin: z.number().finite().positive(),
  capacityMax: z.number().finite().positive(),
  capacityUnit: z.literal("kWh"),
  domainSource: z.string().trim().min(3).max(2000),
  maxEns: z.number().finite().nonnegative().nullable(),
  constraintSource: z.string().trim().min(3).max(2000),
  initialPolicy: z.literal("equal_initial_usable_energy"),
  terminalPolicy: z.literal("final_soc_at_least_initial"),
}).strict().superRefine((p, ctx) => {
  if (p.capacityMin > p.capacityMax) ctx.addIssue({ code: "custom", message: "Borne minimale supérieure à la borne maximale." });
  if (!p.candidateIds.includes(p.referenceId)) ctx.addIssue({ code: "custom", message: "La référence doit appartenir au domaine exploré." });
});
export type OptimizationProblem = z.infer<typeof optimizationProblemSchema>;
export type CandidateAssessment = {
  id: string; name: string; value: number | null; capacity: number | null;
  initialEnergy: number | null; finalEnergy: number | null;
  admissible: boolean; reasons: string[]; verified: string[];
  engineVersion: string | null; validation: string; sources: Json;
};
export type OptimizationReport = {
  version: string; method: "exhaustive_stored_candidates";
  status: "completed" | "no_feasible" | "blocked";
  optimality: "finite_domain_only" | "not_established";
  winners: string[]; assessments: CandidateAssessment[];
  improvement: { referenceId: string; selectedId: string; ensDelta: number; capacityDelta: number; unit: "kWh" } | null;
  limitations: string[];
};