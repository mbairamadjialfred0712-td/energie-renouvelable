import { z } from "zod";
import { simulationRequest, type SimulationRequest } from "./engine-contract";
import { weatherSampleSchema, weatherIssues } from "@/features/weather/weather-model";
export const WIND_VERSION = "1.0.0";
export const WIND_LABELS: Record<string, string> = { mean_wind_speed: "Vitesse moyenne arithmétique", min_wind_speed: "Vitesse minimale observée", max_wind_speed: "Vitesse maximale observée", observed_hours: "Heures observées", mean_kinetic_power: "Flux cinétique moyen — non électrique", kinetic_energy: "Énergie du flux de vent — non électrique", turbine_energy: "Énergie turbine brute sur la période", annual_turbine_energy: "Énergie turbine sur année civile complète", capacity_factor: "Facteur de capacité sur la période" };
export const windRequestSchema = simulationRequest.extend({ engine: z.literal("wind"), engine_version: z.literal(WIND_VERSION), project_id: z.string().uuid() }).superRefine((r, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  const level = r.input_data["level"]?.value;
  if (!["A", "B", "C"].includes(String(level))) fail("Niveau A/B/C requis.");
  const required = ["site_id", "measurement_height", "wind_basis", "period_start", "period_end", ...(level === "B" ? ["swept_area", "air_density"] : []), ...(level === "C" ? ["air_density", "hub_height", "rotor_diameter", "rated_power", "curve_density", "turbine_reference", "curve_conditions", "curve_speeds", "curve_powers"] : [])];
  for (const k of required) { const v = r.input_data[k]; if (!v || v.value === null || v.value === "" || !v.source?.trim()) fail(`${k} : valeur et source obligatoires.`); }
  for (const [k, unit] of Object.entries({ measurement_height: "m", air_density: "kg/m³", swept_area: "m²", hub_height: "m", rotor_diameter: "m", rated_power: "W", curve_density: "kg/m³", cut_in: "m/s", rated_speed: "m/s", cut_out: "m/s" })) {
    const v = r.input_data[k]; if (v && (typeof v.value !== "number" || !Number.isFinite(v.value) || v.value <= 0 || v.unit !== unit)) fail(`${k} : nombre positif en ${unit} requis.`);
  }
  if (r.input_data["wind_basis"]?.value !== "period_mean") fail("Moyennes horaires à confirmer.");
  if (level === "C") {
    if (r.input_data["measurement_height"]?.value !== r.input_data["hub_height"]?.value) fail("Hauteurs différentes : extrapolation non prise en charge.");
    if (r.input_data["air_density"]?.value !== r.input_data["curve_density"]?.value) fail("Densité incompatible : correction non prise en charge.");
    const xs = r.input_data["curve_speeds"]?.value, ys = r.input_data["curve_powers"]?.value;
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length < 2 || xs.length > 1000 || xs.length !== ys.length || xs.some((x,i) => x < 0 || (i > 0 && x <= (xs[i-1] ?? x))) || ys.some((y) => y < 0 || y > Number(r.input_data["rated_power"]?.value))) fail("Courbe invalide : vitesses croissantes, puissances bornées, longueurs identiques requises.");
  }
});
export function selectWindWeather(samples: unknown, mean: boolean) {
  if (!mean) throw new Error("Moyennes horaires à confirmer.");
  const rows = z.array(weatherSampleSchema).min(1).max(8784).parse(samples);
  const issues = weatherIssues(rows);
  if (issues.errors.length || issues.gaps || rows.some((r) => r.wind_speed === null)) throw new Error("Vent manquant ou heures incomplètes, dupliquées ou désordonnées.");
  const first = rows[0], last = rows.at(-1);
  if (!first || !last) throw new Error("Vent absent.");
  return { timestamps: rows.map((r) => r.timestamp), values: rows.map((r) => { if (r.wind_speed === null) throw new Error("Vent absent."); return r.wind_speed; }), start: first.timestamp, end: new Date(Date.parse(last.timestamp) + 3600000).toISOString().replace(".000Z", "Z") };
}
export function parseWindCurve(text: string) {
  const xs: number[] = [], ys: number[] = [];
  for (const line of text.trim().split(/\r?\n/)) {
    const cells = line.split(";");
    if (cells.length !== 2 || cells.some((c) => !c.trim())) throw new Error("Courbe : deux colonnes vitesse m/s ; puissance W requises.");
    const x = Number(cells[0]?.replace(",", ".")), y = Number(cells[1]?.replace(",", "."));
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || (xs.length > 0 && x <= (xs.at(-1) ?? x))) throw new Error("Courbe numérique non négative, vitesses strictement croissantes requises.");
    xs.push(x); ys.push(y);
  }
  if (xs.length < 2 || xs.length > 1000) throw new Error("Courbe : 2 à 1 000 points requis.");
  return { xs, ys };
}
export function checkWindResponse(request: SimulationRequest, out: { results: Record<string, { value: number | null; unit: string }>; timeseries: Record<string, { values: number[]; unit: string }>; calculation_metadata: Record<string, unknown> }) {
  const n = request.timeseries?.timestamps.length, level = request.input_data["level"]?.value;
  if (!n || out.calculation_metadata["level"] !== level || out.calculation_metadata["time_standard"] !== "UTC" || out.calculation_metadata["scientific_validation"] !== "pending") throw new Error("Métadonnées éoliennes incohérentes.");
  for (const [k, unit] of Object.entries({ mean_wind_speed: "m/s", min_wind_speed: "m/s", max_wind_speed: "m/s", observed_hours: "h" })) if (out.results[k]?.value == null || out.results[k]?.unit !== unit) throw new Error("Statistiques éoliennes incomplètes.");
  if (out.results["observed_hours"]?.value !== n) throw new Error("Couverture éolienne incohérente.");
  const speeds = out.timeseries["observed_wind_speed"];
  if (!speeds || speeds.unit !== "m/s" || speeds.values.length !== n || speeds.values.some((v) => v < 0)) throw new Error("Observations éoliennes manquantes.");
  const required = level === "B" ? "kinetic_power" : level === "C" ? "turbine_power" : null;
  if (required && !out.timeseries[required]) throw new Error("Puissance éolienne requise absente.");
  for (const [k,s] of Object.entries(out.timeseries)) if (k.endsWith("_power")) {
    const r = out.results[k.replace("_power", "_energy")], energy = s.values.reduce((a,b) => a+b/1000,0);
    if (s.unit !== "W" || s.values.length !== n || s.values.some((v) => v < 0) || !r || r.value === null || r.unit !== "kWh" || !Number.isFinite(energy) || Math.abs(r.value-energy) > 1e-9*Math.max(1,Math.abs(energy))) throw new Error("Énergie éolienne incohérente avec la série.");
  }
  const reasons = out.calculation_metadata["unavailable_reasons"] as Record<string, unknown> | undefined;
  for (const k of ["turbine_energy", "capacity_factor", "annual_turbine_energy"]) { const r = out.results[k]; if (!r || (r.value === null && (typeof reasons?.[k] !== "string" || !String(reasons[k]).trim()))) throw new Error("Résultat éolien indisponible sans motif."); }
  if (level !== "C" && (out.results["turbine_energy"]?.value !== null || out.results["capacity_factor"]?.value !== null)) throw new Error("Flux cinétique assimilé à l’électricité.");
  const annual = out.results["annual_turbine_energy"];
  const start = request.timeseries?.timestamps[0], last = request.timeseries?.timestamps.at(-1);
  if (annual?.value !== null && (level !== "C" || !start?.endsWith("-01-01T00:00:00Z") || !last?.endsWith("-12-31T23:00:00Z") || start.slice(0,4) !== last.slice(0,4) || ![8760,8784].includes(n))) throw new Error("Annualisation éolienne interdite.");
}