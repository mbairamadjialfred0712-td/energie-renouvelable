import { z } from "zod";
import { inputValue, seriesIn, sourceReference } from "./engine-contract";

export const CSP_VERSION = "1.0.0";
const documented = inputValue.strict().refine((v) => Boolean(v.source?.trim()) && v.nature !== "calculated", "Source/justification requise et nature calculée interdite.");
const numberValue = (unit: string, accepts: (x: number) => boolean) => documented.refine((v) => typeof v.value === "number" && Number.isFinite(v.value) && v.unit === unit && accepts(v.value), `Valeur ou unité incompatible (${unit}).`);
const textValue = documented.refine((v) => typeof v.value === "string" && Boolean(v.value.trim()) && v.unit === "-", "Texte documenté et unité - requis.");
export const cspRequestSchema = z.object({
  schema_version: z.literal("1.0"), engine: z.literal("csp"), engine_version: z.literal(CSP_VERSION),
  simulation_id: z.string().uuid().nullable().optional(), project_id: z.string().uuid(),
  input_data: z.object({
    site_id: textValue.refine((v) => z.string().uuid().safeParse(v.value).success),
    technology: textValue.refine((v) => v.value === "parabolic_trough"), aperture_area: numberValue("m²", (v) => v > 0),
    optical_efficiency: numberValue("-", (v) => v > 0 && v <= 1), thermal_loss: numberValue("W", (v) => v >= 0), fluid: textValue,
    operating_temperature: numberValue("°C", (v) => v >= -273.15), conditions: textValue,
    period_start: textValue, period_end: textValue,
    dni_basis: textValue.refine((v) => v.value === "period_mean"), optical_basis: textValue.refine((v) => v.value === "effective_includes_incidence"),
    cycle_efficiency: numberValue("-", (v) => v > 0 && v <= 1).optional(), auxiliary_power: numberValue("W", (v) => v >= 0).optional(),
  }).strict(),
  assumptions: z.object({}).strict(), source_references: z.array(sourceReference.strict()).min(1),
  timeseries: z.object({
    timestamps: z.array(z.string()).min(1).max(8784), utc_offset_hours: z.literal(0),
    timestamp_convention: z.literal("period_start"), leap_day_convention: z.null().optional(),
    series: z.object({ dni: seriesIn.strict() }).strict(),
  }).strict(),
}).strict();

export const CSP_LABELS: Record<string, string> = {
  incident_energy: "Énergie directe de référence", captured_energy: "Énergie thermique captée",
  thermal_loss_energy: "Pertes thermiques prescrites", thermal_balance_energy: "Bilan thermique signé",
  useful_thermal_energy: "Énergie thermique utile", gross_electric_energy: "Électricité brute",
  auxiliary_energy: "Consommations auxiliaires", net_electric_energy: "Électricité nette (signée)",
  capture_efficiency: "Capture / énergie directe",
};