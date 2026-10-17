import { z } from "zod";
import { ENGINE_SCHEMA_VERSION, simulationResponse, type SimulationRequest } from "./engine-contract";

/** Reject unrelated, partial or invalid replies before any success is persisted. */
export function assertCompletedResponse(request: SimulationRequest, out: z.infer<typeof simulationResponse>, id: string) {
  if (out.status !== "completed" || out.simulation_id !== id || out.engine !== request.engine || out.schema_version !== ENGINE_SCHEMA_VERSION || !out.engine_version || !out.completed_at || out.validation_errors.length || !Object.keys(out.results).length) throw new Error("Réponse du moteur incomplète ou étrangère à cette simulation.");
  if (request.engine_version && request.engine_version !== out.engine_version) throw new Error("Version du moteur différente de la version demandée.");
  if (request.engine !== "photovoltaic") return;
  const hourly = ["ac_energy", "ac_power", "dc_power", "poa_irradiance", "cell_temperature"];
  const units = ["kWh", "W", "W", "W/m²", "°C"];
  hourly.forEach((key, i) => {
    const s = out.timeseries[key];
    if (!s || s.values.length !== 8760 || s.unit !== units[i]) throw new Error(`Sortie PV horaire invalide : ${key}.`);
  });
  for (const [key, unit] of Object.entries({ annual_ac_energy: "kWh", specific_yield: "kWh/kWc", capacity_factor_ac_basis_dc: "%", annual_poa_irradiation: "kWh/m²" })) {
    if (out.results[key]?.value === null || out.results[key]?.value === undefined || out.results[key]?.unit !== unit) throw new Error(`Résultat PV requis invalide : ${key}.`);
  }
  const daily = out.timeseries["daily_ac_energy"];
  const dates = out.calculation_metadata["daily_dates"];
  if (!daily || daily.values.length !== 365 || daily.unit !== "kWh" || !Array.isArray(dates) || dates.length !== 365) throw new Error("Agrégation journalière PV incomplète.");
  const months = new Set(request.timeseries?.timestamps.map((t) => t.slice(0, 7)));
  if (months.size !== 12 || [...months].some((m) => out.results[`monthly_ac_energy_${m}`]?.unit !== "kWh" || out.results[`monthly_ac_energy_${m}`]?.value == null)) throw new Error("Agrégation mensuelle PV incomplète.");
}