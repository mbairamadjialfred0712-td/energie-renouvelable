import { simulationRequest } from "@/features/engine/engine-contract";
import { windRequestSchema } from "@/features/engine/wind-contract";
import { cspRequestSchema } from "@/features/engine/csp-contract";
import { biomassRequestSchema } from "@/features/engine/biomass-contract";
import { batteryRequestSchema } from "@/features/engine/battery-contract";

/** Validate saved request contracts; never rerun a scientific calculation. */
export function requestEvidence(raw: unknown) {
  const parsed = simulationRequest.safeParse(raw);
  if (!parsed.success) return { requestValid: false, natures: [] as string[], boundary: "" };
  const r = parsed.data;
  const schemas: Record<string, { safeParse: (v: unknown) => { success: boolean } }> = { wind: windRequestSchema, csp: cspRequestSchema, biomass: biomassRequestSchema, battery: batteryRequestSchema };
  const schema = schemas[r.engine];
  let requestValid = schema?.safeParse(raw).success ?? false;
  if (r.engine === "photovoltaic") {
    const required = { latitude: "°", longitude: "°", elevation: "m", system_capacity: "kWc", dc_ac_ratio: "-", inv_eff: "%", losses: "%", tilt: "°", azimuth: "°", module_type: "-", array_type: "-", gcr: "-" };
    requestValid = r.timeseries?.timestamps.length === 8760 && Object.entries(required).every(([k, unit]) => { const v = r.input_data[k]; return typeof v?.value === "number" && Number.isFinite(v.value) && v.unit === unit; }) && ["ghi", "dni", "dhi", "temp_air", "wind_speed"].every(k => r.timeseries?.series[k]?.values.length === 8760);
  }
  const inputs = Object.values(r.input_data), series = Object.values(r.timeseries?.series ?? {});
  const natures = [...new Set([...inputs, ...series, ...Object.values(r.assumptions)].map(v => v.nature))].sort();
  if ([...inputs, ...series].some(v => !v.source?.trim())) requestValid = false;
  return { requestValid, natures, boundary: JSON.stringify({ engine: r.engine, level: r.input_data["level"]?.value ?? null, technology: r.input_data["technology"]?.value ?? null, strategy: r.input_data["strategy"]?.value ?? null, leap: r.timeseries?.leap_day_convention ?? null }) };
}