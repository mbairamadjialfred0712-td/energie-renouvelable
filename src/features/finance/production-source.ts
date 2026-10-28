/** Règles d'éligibilité d'une production simulée comme production de référence (année 1). Aucune extrapolation. */
export type ProductionCandidate = {
  simulationId: string; name: string; valueKwh: number | null; unit: string;
  periodStart: string | null; periodEnd: string | null; projectId: string | null; engineVersion: string | null; method: string;
};

export function classifyProductionSource(c: ProductionCandidate): { ok: true } | { ok: false; reason: string } {
  if (c.valueKwh == null || !Number.isFinite(c.valueKwh) || c.valueKwh <= 0) return { ok: false, reason: "Production enregistrée absente ou non positive." };
  if (c.unit !== "kWh") return { ok: false, reason: `Unité ${c.unit} non reconnue (kWh attendu, aucune conversion).` };
  if (!c.periodStart || !c.periodEnd) return { ok: false, reason: "Période de simulation inconnue." };
  const days = (Date.parse(`${c.periodEnd}T00:00:00Z`) - Date.parse(`${c.periodStart}T00:00:00Z`)) / 86_400_000 + 1;
  if (!Number.isFinite(days) || days < 365 || days > 366) return { ok: false, reason: `Période de ${Number.isFinite(days) ? days : "?"} jours : une année complète est requise (aucune extrapolation d'une période partielle).` };
  return { ok: true };
}
