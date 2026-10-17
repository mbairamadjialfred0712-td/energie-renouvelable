import { z } from "zod";
import { weatherSampleSchema } from "../weather/weather-model";

/** Explicit hour-energy to period-average conversion. Native rows are never changed. */
export function selectCspDni(samples: unknown, radiationUnit: string, conversionConfirmed: boolean, meanConfirmed: boolean) {
  const rows = z.array(weatherSampleSchema).min(1).max(8784).parse(samples);
  if (!meanConfirmed) throw new Error("Confirmer le DNI moyen sur chaque heure et les bornes temporelles.");
  if (radiationUnit !== "W/m²" && radiationUnit !== "Wh/m²") throw new Error("Unité de rayonnement non prise en charge.");
  if (radiationUnit === "Wh/m²" && !conversionConfirmed) throw new Error("Conversion explicite Wh/m² par heure → W/m² moyen non confirmée.");
  rows.forEach((r, i) => {
    const t = Date.parse(r.timestamp);
    if (!Number.isFinite(t) || new Date(t).toISOString().replace(".000Z", "Z") !== r.timestamp || r.dni === null) throw new Error("Date invalide ou DNI manquant ; aucun zéro de substitution.");
    const prev = rows[i - 1];
    if (prev && t - Date.parse(prev.timestamp) !== 3600000) throw new Error("Série DNI non contiguë : trou, doublon ou désordre.");
  });
  const first = rows[0], last = rows.at(-1);
  if (!first || !last) throw new Error("Série vide.");
  return {
    timestamps: rows.map((r) => r.timestamp), values: rows.map((r) => r.dni as number),
    start: first.timestamp, end: new Date(Date.parse(last.timestamp) + 3600000).toISOString().replace(".000Z", "Z"),
    transformation: radiationUnit === "Wh/m²" ? "DNI natif Wh/m² par intervalle de 1 h / 1 h = W/m² moyen ; conversion explicitement acceptée" : "DNI W/m² attesté moyenne horaire ; aucune conversion",
  };
}