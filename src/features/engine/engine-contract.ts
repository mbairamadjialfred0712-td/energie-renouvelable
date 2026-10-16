// Contrat API v1 du moteur scientifique Python — miroir TypeScript de python-engine/app/api/schemas/contract.py.
// Navigateur-sûr : aucun secret, aucun calcul scientifique.
import { z } from "zod";

export const ENGINE_SCHEMA_VERSION = "1.0" as const;

export const dataNature = z.enum(["measured", "external", "estimate", "assumption", "calculated"]);
export const inputValue = z.object({
  value: z.union([z.number(), z.string(), z.boolean(), z.array(z.number()), z.null()]),
  unit: z.string().max(40).nullable().optional(),
  nature: dataNature,
  source: z.string().max(500).nullable().optional(),
});
export const sourceReference = z.object({
  label: z.string().min(1).max(300),
  url: z.string().max(1000).nullable().optional(),
  period: z.string().max(100).nullable().optional(),
  table: z.string().max(80).nullable().optional(),
  record_id: z.string().max(80).nullable().optional(),
});
export const seriesIn = z.object({
  values: z.array(z.number().finite().nullable()).max(8784),
  unit: z.string().min(1).max(40),
  nature: dataNature,
  source: z.string().max(500).nullable().optional(),
});
export const timeseriesIn = z.object({
  timestamps: z.array(z.string().max(40)).max(8784),
  utc_offset_hours: z.number().min(-12).max(14),
  timestamp_convention: z.literal("period_start").default("period_start"),
  series: z.record(z.string(), seriesIn),
});
export const simulationRequest = z.object({
  schema_version: z.literal(ENGINE_SCHEMA_VERSION),
  simulation_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  engine: z.string().regex(/^[a-z_]+$/).max(60),
  engine_version: z.string().max(20).nullable().optional(),
  input_data: z.record(z.string(), inputValue),
  assumptions: z.record(z.string(), inputValue).default({}),
  source_references: z.array(sourceReference).max(200).default([]),
  timeseries: timeseriesIn.nullable().optional(),
});
export const issue = z.object({ field: z.string().nullable().optional(), code: z.string(), message: z.string() });
export const capability = z.object({
  engine: z.string(),
  status: z.enum(["available", "not_implemented"]),
  version: z.string().nullable(),
  description: z.string(),
  required_inputs: z.array(z.string()),
});
export const capabilitiesResponse = z.object({ schema_version: z.string(), service_version: z.string(), engines: z.array(capability) });
export const healthResponse = z.object({ status: z.literal("ok"), service_version: z.string(), schema_version: z.string(), environment: z.string(), auth_configured: z.boolean() });
export const validationResponse = z.object({ valid: z.boolean(), engine: z.string(), engine_available: z.boolean(), warnings: z.array(issue), validation_errors: z.array(issue) });
export const resultValue = z.object({ value: z.number().nullable(), unit: z.string(), nature: z.literal("calculated"), method: z.string() });
export const seriesOut = z.object({ values: z.array(z.number()), unit: z.string(), method: z.string() });
export const simulationResponse = z.object({
  simulation_id: z.string().nullable(),
  status: z.enum(["pending", "running", "completed", "failed"]),
  engine: z.string(),
  engine_version: z.string().nullable(),
  schema_version: z.string(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
  results: z.record(z.string(), resultValue),
  timeseries: z.record(z.string(), seriesOut),
  warnings: z.array(issue),
  validation_errors: z.array(issue),
  calculation_metadata: z.record(z.string(), z.unknown()),
});
export const errorResponse = z.object({ error: z.object({ code: z.string(), message: z.string(), details: z.array(z.unknown()).default([]) }) });

export type SimulationRequest = z.infer<typeof simulationRequest>;
export type EngineCapability = z.infer<typeof capability>;
export type ValidationResponse = z.infer<typeof validationResponse>;

/** État exposé à l’interface : jamais de résultat simulé lorsque le moteur est absent. */
export type EngineStatus =
  | { state: "not_configured"; message: string }
  | { state: "unreachable"; message: string }
  | { state: "error"; message: string }
  | { state: "online"; health: z.infer<typeof healthResponse>; capabilities: z.infer<typeof capabilitiesResponse> };
