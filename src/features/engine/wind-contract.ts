import { z } from "zod";
import { simulationRequest, type SimulationRequest } from "./engine-contract";
import { weatherSampleSchema, weatherIssues } from "@/features/weather/weather-model";
export const WIND_VERSION = "1.0.0";
export const WIND_LABELS: Record<string, string> = { mean_wind_speed: "Vitesse moyenne arithmétique", min_wind_speed: "Vitesse minimale observée", max_wind_speed: "Vitesse maximale observée", observed_hours: "Heures observées", mean_kinetic_power: "Flux cinétique moyen — non électrique", kinetic_energy: "Énergie du flux de vent — non électrique", turbine_energy: "Énergie turbine brute sur la période", annual_turbine_energy: "Énergie turbine sur année civile complète", capacity_factor: "Facteur de capacité sur la période" };
export const windRequestSchema = simulationRequest.extend({ engine: z.literal("wind"), engine_version: z.literal(WIND_VERSION), project_id: z.string().uuid() }).superRefine((r, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: "custom", message });
  const level = r.input_data["level"]?.value;
  const allowed = new Set(["level","site_id","measurement_height","wind_basis","period_start","period_end","air_density","swept_area","hub_height","rotor_diameter","rated_power","curve_density","cut_in","rated_speed","cut_out","turbine_reference","curve_conditions","curve_speeds","curve_powers"]);
  if (Object.keys(r.assumptions).length || Object.keys(r.input_data).some((k) => !allowed.has(k))) fail("Paramètre non pris en charge : aucune extrapolation ou perte implicite.");
  if (!["A", "B", "C"].includes(String(level))) fail("Niveau A/B/C requis.");
  const required = ["site_id", "measurement_height", "wind_basis", "period_start", "period_end", ...(level === "B" ? ["swept_area", "air_density"] : []), ...(level === "C" ? ["air_density", "hub_height", "rotor_diameter", "rated_power", "curve_density", "turbine_reference", "curve_conditions", "curve_speeds", "curve_powers"] : [])];
  for (const k of required) { const v = r.input_data[k]; if (!v || v.value === null || v.value === "" || !v.source?.trim()) fail(`${k} : valeur et source obligatoires.`); }
  for (const [k, unit] of Object.entries({ measurement_height: "m", air_density: "kg/m³", swept_area: "m²", hub_height: "m", rotor_diameter: "m", rated_power: "W", curve_density: "kg/m³", cut_in: "m/s", rated_speed: "m/s", cut_out: "m/s" })) {
    const v = r.input_data[k]; if (v && (typeof v.value !== "number" || !Number.isFinite(v.value) || (k === "cut_in" ? v.value < 0 : v.value <= 0) || v.unit !== unit)) fail(`${k} : nombre positif en ${unit} requis.`);
  }
  if (r.input_data["wind_basis"]?.value !== "period_mean") fail("Moyennes horaires à confirmer.");
  if (level === "B" && typeof r.input_data["rotor_diameter"]?.value === "number") {
    const area = Math.PI * (Number(r.input_data["rotor_diameter"].value) / 2) ** 2;
    if (!Number.isFinite(area) || Math.abs(area - Number(r.input_data["swept_area"]?.value)) > 1e-9 * area) fail("Surface incompatible avec A = pi × (diamètre / 2)².");
  }
  if (level === "C") {
    const source = r.input_data["turbine_reference"]?.source;
    if (!source?.trim() || ["curve_conditions", "curve_speeds", "curve_powers"].some((k) => r.input_data[k]?.source !== source)) fail("Turbine et courbe : même référence documentaire obligatoire.");
    if (r.input_data["measurement_height"]?.value !== r.input_data["hub_height"]?.value) fail("Hauteurs différentes : extrapolation non prise en charge.");
    if (r.input_data["air_density"]?.value !== r.input_data["curve_density"]?.value) fail("Densité incompatible : correction non prise en charge.");
    const xs = r.input_data["curve_speeds"]?.value, ys = r.input_data["curve_powers"]?.value;
    if (!Array.isArray(xs) || !Array.isArray(ys) || xs.length < 2 || xs.length > 1000 || xs.length !== ys.length || xs.some((x,i) => x < 0 || (i > 0 && x <= (xs[i-1] ?? x))) || ys.some((y) => y < 0 || y > Number(r.input_data["rated_power"]?.value))) fail("Courbe invalide : vitesses croissantes, puissances bornées, longueurs identiques requises.");
    if (Array.isArray(xs) && Array.isArray(ys)) {
      const cutIn = r.input_data["cut_in"]?.value, rated = r.input_data["rated_speed"]?.value, cutOut = r.input_data["cut_out"]?.value;
      if (typeof cutIn === "number" && typeof cutOut === "number" && cutIn >= cutOut) fail("Vitesses de démarrage/arrêt incohérentes.");
      if (typeof rated === "number" && ((typeof cutIn === "number" && rated < cutIn) || (typeof cutOut === "number" && rated >= cutOut))) fail("Vitesse nominale incohérente.");
      if (xs.some((x,i) => (typeof cutIn === "number" && x < cutIn || typeof cutOut === "number" && x >= cutOut) && ys[i] !== 0)) fail("Courbe incompatible avec démarrage/arrêt documentés.");
      if (typeof rated === "number") { const branch = ys.filter((_,i) => (xs[i] ?? Infinity) <= rated && (typeof cutIn !== "number" || (xs[i] ?? -Infinity) >= cutIn)); if (branch.some((y,i) => i > 0 && y < (branch[i-1] ?? y))) fail("Branche de montée non monotone."); }
    }
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
  const ts = request.timeseries;
  const n = ts?.timestamps.length, level = request.input_data["level"]?.value;
  const close = (a: number, b: number) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 1e-9*Math.max(1,Math.abs(b));
  if (!ts || ts.utc_offset_hours !== 0 || ts.leap_day_convention != null || ts.timestamps.some((t,i) => !/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(t) || !Number.isFinite(Date.parse(t)) || new Date(t).toISOString().replace(".000Z","Z") !== t || (i > 0 && Date.parse(t)-Date.parse(ts.timestamps[i-1] ?? "") !== 3600000))) throw new Error("Durées éoliennes invalides.");
  if (!n || out.calculation_metadata["level"] !== level || out.calculation_metadata["time_standard"] !== "UTC" || out.calculation_metadata["scientific_validation"] !== "pending") throw new Error("Métadonnées éoliennes incohérentes.");
  for (const [k, unit] of Object.entries({ mean_wind_speed: "m/s", min_wind_speed: "m/s", max_wind_speed: "m/s", observed_hours: "h" })) if (out.results[k]?.value == null || out.results[k]?.unit !== unit) throw new Error("Statistiques éoliennes incomplètes.");
  if (out.results["observed_hours"]?.value !== n) throw new Error("Couverture éolienne incohérente.");
  const speeds = out.timeseries["observed_wind_speed"];
  if (!speeds || speeds.unit !== "m/s" || speeds.values.length !== n || speeds.values.some((v) => v < 0)) throw new Error("Observations éoliennes manquantes.");
  const native = request.timeseries?.series["wind_speed"];
  const factor = native?.unit === "km/h" ? 1/3.6 : native?.unit === "kn" ? 1852/3600 : native?.unit === "m/s" ? 1 : null;
  if (!native || factor === null || native.values.some((v,i) => v === null || Math.abs(v*factor-(speeds.values[i] ?? NaN)) > 1e-9*Math.max(1,Math.abs(v*factor)))) throw new Error("Vent retourné différent des observations envoyées.");
  for (const [k,expected] of Object.entries({mean_wind_speed:speeds.values.reduce((a,b)=>a+b/n,0),min_wind_speed:Math.min(...speeds.values),max_wind_speed:Math.max(...speeds.values)})) if (!close(Number(out.results[k]?.value),expected)) throw new Error("Statistiques différentes des observations.");
  const keys = level === "B" ? ["observed_wind_speed","kinetic_power"] : level === "C" ? ["observed_wind_speed","turbine_power"] : ["observed_wind_speed"];
  if (Object.keys(out.timeseries).length !== keys.length || Object.keys(out.timeseries).some((k)=>!keys.includes(k))) throw new Error("Séries incompatibles avec le niveau demandé.");
  if (level === "B") {
    const rho=Number(request.input_data["air_density"]?.value), area=Number(request.input_data["swept_area"]?.value);
    if (out.timeseries["kinetic_power"]?.values.some((p,i)=>!close(p,0.5*rho*area*(speeds.values[i] ?? NaN)**3))) throw new Error("Flux différent des paramètres documentés.");
    const expected=out.timeseries["kinetic_power"]?.values.reduce((a,b)=>a+b/n,0);
    if (expected === undefined || out.results["mean_kinetic_power"]?.unit !== "W" || !close(Number(out.results["mean_kinetic_power"]?.value),expected)) throw new Error("Flux moyen incohérent.");
  }
  if (level === "C") {
    const xs=request.input_data["curve_speeds"]?.value, ys=request.input_data["curve_powers"]?.value;
    if (!Array.isArray(xs) || !Array.isArray(ys)) throw new Error("Courbe absente du snapshot.");
    for (const [h,v] of speeds.values.entries()) {
      if (v < (xs[0] ?? Infinity) || v > (xs.at(-1) ?? -Infinity)) throw new Error("Vitesse hors courbe.");
      let i = 0;
      while (i < xs.length-2 && (xs[i+1] ?? Infinity) <= v) i++;
      const x=xs[i], next=xs[i+1], y=ys[i], ny=ys[i+1];
      if (x === undefined || next === undefined || y === undefined || ny === undefined) throw new Error("Courbe incomplète.");
      const w=(v-x)/(next-x), cutIn=request.input_data["cut_in"]?.value, cutOut=request.input_data["cut_out"]?.value;
      const expected=(typeof cutIn === "number" && v<cutIn || typeof cutOut === "number" && v>=cutOut) ? 0 : (1-w)*y+w*ny;
      if (!close(out.timeseries["turbine_power"]?.values[h] ?? NaN,expected)) throw new Error("Puissance différente de la courbe documentée.");
    }
  }
  const required = level === "B" ? "kinetic_power" : level === "C" ? "turbine_power" : null;
  if (required && !out.timeseries[required]) throw new Error("Puissance éolienne requise absente.");
  for (const [k,s] of Object.entries(out.timeseries)) if (k.endsWith("_power")) {
    const r = out.results[k.replace("_power", "_energy")], energy = s.values.reduce((a,b) => a+b/1000,0);
    if (s.unit !== "W" || s.values.length !== n || s.values.some((v) => v < 0) || !r || r.value === null || r.unit !== "kWh" || !Number.isFinite(energy) || Math.abs(r.value-energy) > 1e-9*Math.max(1,Math.abs(energy))) throw new Error("Énergie éolienne incohérente avec la série.");
  }
  const reasons = out.calculation_metadata["unavailable_reasons"] as Record<string, unknown> | undefined;
  for (const k of ["turbine_energy", "capacity_factor", "annual_turbine_energy"]) { const r = out.results[k]; if (!r || (r.value === null && (typeof reasons?.[k] !== "string" || !String(reasons[k]).trim()))) throw new Error("Résultat éolien indisponible sans motif."); }
  if (level !== "C" && (out.results["turbine_energy"]?.value !== null || out.results["capacity_factor"]?.value !== null)) throw new Error("Flux cinétique assimilé à l’électricité.");
  if (level === "C") { const energy = out.results["turbine_energy"], cf = out.results["capacity_factor"], rated = request.input_data["rated_power"]?.value; if (energy?.unit !== "kWh" || cf?.unit !== "%" || energy.value === null || cf.value === null || typeof rated !== "number" || Math.abs(cf.value-energy.value*1000/(rated*n)*100) > 1e-9 || out.timeseries["turbine_power"]?.values.some((v) => v > rated)) throw new Error("Facteur de capacité ou puissance nominale incohérents."); }
  const annual = out.results["annual_turbine_energy"];
  const start = request.timeseries?.timestamps[0], last = request.timeseries?.timestamps.at(-1);
  if (annual?.unit !== "kWh") throw new Error("Unité annuelle invalide.");
  if (annual?.value !== null && !close(annual?.value ?? NaN,out.results["turbine_energy"]?.value ?? NaN)) throw new Error("Énergie annuelle différente de la période complète.");
  if (annual?.value !== null && (level !== "C" || !start?.endsWith("-01-01T00:00:00Z") || !last?.endsWith("-12-31T23:00:00Z") || start.slice(0,4) !== last.slice(0,4) || ![8760,8784].includes(n))) throw new Error("Annualisation éolienne interdite.");
}