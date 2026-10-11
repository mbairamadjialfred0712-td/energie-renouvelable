export const PV_ENGINE_VERSION = "pv-annual-estimate/1.0";
export const PV_METHOD = "E = P_STC × H / G_STC × PR ; G_STC = 1 kW/m²";
export const PV_LIMITS = "Estimation annuelle sur irradiation documentée, sans transposition sur plan incliné, ombrage, profil horaire, stockage ou dégradation. Ne remplace pas une étude de productible.";

export function recordedDate(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value ? time : null;
}

export function isAnnualPeriod(start: unknown, end: unknown): boolean {
  const a = recordedDate(start), b = recordedDate(end);
  if (a === null || b === null || b < a) return false;
  const next = new Date(a);
  next.setUTCFullYear(next.getUTCFullYear() + 1);
  return b === next.getTime() - 86400000;
}

export function estimateSolarPv(input: { powerKwp: number; performanceRatio: number; annualIrradiation: number; periodStart: string; periodEnd: string }) {
  if (!Number.isFinite(input.powerKwp) || input.powerKwp <= 0) throw new Error("La puissance doit être positive, en kWc.");
  if (!Number.isFinite(input.performanceRatio) || input.performanceRatio <= 0 || input.performanceRatio > 1) throw new Error("Le ratio de performance doit être supérieur à 0 et inférieur ou égal à 1.");
  if (!Number.isFinite(input.annualIrradiation) || input.annualIrradiation <= 0) throw new Error("Une irradiation annuelle positive en kWh/m²/an est obligatoire.");
  if (!isAnnualPeriod(input.periodStart, input.periodEnd)) throw new Error("Le jeu doit couvrir une année complète, du premier jour au jour précédant son anniversaire.");
  const productionKwh = input.powerKwp * input.annualIrradiation * input.performanceRatio;
  if (!Number.isFinite(productionKwh)) throw new Error("Les paramètres dépassent la plage de calcul.");
  return { productionKwh, unit: "kWh/an", method: PV_METHOD, engineVersion: PV_ENGINE_VERSION, limitations: PV_LIMITS };
}