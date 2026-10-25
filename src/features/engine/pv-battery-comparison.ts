// Assemblage du tableau multi-scénarios PV/Batterie.
// Règle absolue : seules des valeurs réellement calculées et enregistrées par le moteur sont affichées.
// Le PV seul ne compare jamais production et demande : couverture, autoconsommation et énergie non servie
// restent null (affichées « non calculées »), jamais estimées.

export type PvBatterySimulationRow = {
  id: string;
  name: string;
  engine: "photovoltaic" | "battery";
  periodStart: string | null;
  periodEnd: string | null;
  coverageRatePct: number | null;
  selfConsumptionRatePct: number | null;
  energyNotServedKwh: number | null;
};

export type StoredScalar = { simulation_id: string; result_type: string; value: number | null; unit: string | null };

const BATTERY_METRICS = ["demand_coverage_rate", "self_consumption_rate", "energy_not_served"] as const;

function metric(results: StoredScalar[], simulationId: string, key: string): number | null {
  const r = results.find((x) => x.simulation_id === simulationId && x.result_type === key);
  return r && r.value !== null && Number.isFinite(r.value) ? r.value : null;
}

/**
 * Construit les lignes du tableau à partir des simulations terminées et de leurs résultats enregistrés.
 * Aucune agrégation, aucune conversion, aucun classement : chaque ligne renvoie à sa simulation.
 */
export function buildPvBatteryRows(
  simulations: { id: string; name: string; engine_version: string | null; period_start: string | null; period_end: string | null; status: string }[],
  results: StoredScalar[],
): PvBatterySimulationRow[] {
  return simulations
    .filter((s) => s.status === "completed" && (s.engine_version?.startsWith("photovoltaic") || s.engine_version?.startsWith("battery")))
    .map((s) => {
      const engine = s.engine_version!.startsWith("battery") ? "battery" : "photovoltaic";
      if (engine === "photovoltaic") {
        return { id: s.id, name: s.name, engine, periodStart: s.period_start, periodEnd: s.period_end, coverageRatePct: null, selfConsumptionRatePct: null, energyNotServedKwh: null };
      }
      return {
        id: s.id,
        name: s.name,
        engine,
        periodStart: s.period_start,
        periodEnd: s.period_end,
        coverageRatePct: metric(results, s.id, BATTERY_METRICS[0]),
        selfConsumptionRatePct: metric(results, s.id, BATTERY_METRICS[1]),
        energyNotServedKwh: metric(results, s.id, BATTERY_METRICS[2]),
      };
    });
}
