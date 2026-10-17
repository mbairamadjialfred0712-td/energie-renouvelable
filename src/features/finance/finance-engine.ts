/**
 * Moteur économique déterministe — coût actualisé de l'énergie (LCOE).
 *
 * Modèle validé avant implémentation (règle du projet) :
 *   E_t = E_1 × (1 - d)^(t-1)          production de l'année t, dégradation constante d
 *   C_t = O_t (+ R_t si remplacement)  coûts annuels ; CAPEX compté en année 0, non actualisé
 *   LCOE = [CAPEX + Σ_t C_t/(1+r)^t] / [Σ_t E_t/(1+r)^t]
 *
 * Hypothèses explicites :
 * - CAPEX dépensé intégralement en année 0 (jamais actualisé).
 * - OPEX constant en monnaie constante (pas d'inflation modélisée dans cette version).
 * - Dégradation linéaire géométrique appliquée à la production dès l'année 2.
 * - Les remplacements surviennent en fin d'année indiquée, au coût nominal saisi.
 * - Aucune valeur résiduelle, aucun revenu, aucune fiscalité.
 * Limites : ce LCOE n'est pas un prix de vente ; il ne couvre ni réseau ni financement.
 */

export interface ReplacementEvent {
  /** Année du remplacement, 1..lifetimeYears. */
  year: number;
  /** Coût du remplacement en monnaie constante (même devise que le CAPEX). */
  cost: number;
}

export interface FinanceInput {
  currency: string;
  /** Investissement initial, année 0. > 0. */
  capex: number;
  /** Coûts d'exploitation annuels constants. >= 0. */
  annualOpex: number;
  /** Durée d'étude en années entières, 1..100. */
  lifetimeYears: number;
  /** Taux d'actualisation en %, > -100. */
  discountRatePct: number;
  /** Production de l'année 1 en kWh. > 0. */
  yearOneProductionKwh: number;
  /** Dégradation annuelle de la production en %, 0..100. */
  degradationPctPerYear: number;
  replacements: ReplacementEvent[];
}

export interface FinanceYearRow {
  year: number;
  productionKwh: number;
  opex: number;
  replacementCost: number;
  totalCost: number;
  discountedCost: number;
  discountedEnergyKwh: number;
}

export interface FinanceResult {
  rows: FinanceYearRow[];
  totalDiscountedCost: number;
  totalDiscountedEnergyKwh: number;
  /** LCOE en unité monétaire par kWh. */
  lcoePerKwh: number;
  totalCapex: number;
  totalReplacementCost: number;
  totalOpex: number;
}

const MAX_LIFETIME_YEARS = 100;

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new Error(`${name} doit être un nombre fini.`);
}

export function computeLcoe(input: FinanceInput): FinanceResult {
  const { capex, annualOpex, lifetimeYears, discountRatePct, yearOneProductionKwh, degradationPctPerYear } = input;
  assertFinite(capex, "CAPEX");
  assertFinite(annualOpex, "OPEX annuel");
  assertFinite(discountRatePct, "Taux d'actualisation");
  assertFinite(yearOneProductionKwh, "Production année 1");
  assertFinite(degradationPctPerYear, "Dégradation");
  if (!Number.isInteger(lifetimeYears) || lifetimeYears < 1 || lifetimeYears > MAX_LIFETIME_YEARS)
    throw new Error("La durée d'étude doit être un entier entre 1 et 100 ans.");
  if (capex <= 0) throw new Error("Le CAPEX doit être strictement positif.");
  if (annualOpex < 0) throw new Error("L'OPEX annuel ne peut pas être négatif.");
  if (discountRatePct <= -100) throw new Error("Le taux d'actualisation doit être supérieur à -100 %.");
  if (yearOneProductionKwh <= 0) throw new Error("La production de l'année 1 doit être strictement positive.");
  if (degradationPctPerYear < 0 || degradationPctPerYear > 100)
    throw new Error("La dégradation doit être comprise entre 0 et 100 %.");

  const replacementByYear = new Map<number, number>();
  for (const r of input.replacements) {
    if (!Number.isInteger(r.year) || r.year < 1 || r.year > lifetimeYears)
      throw new Error(`Année de remplacement invalide : ${r.year} (attendu 1..${lifetimeYears}).`);
    assertFinite(r.cost, "Coût de remplacement");
    if (r.cost < 0) throw new Error("Un coût de remplacement ne peut pas être négatif.");
    replacementByYear.set(r.year, (replacementByYear.get(r.year) ?? 0) + r.cost);
  }

  const r = discountRatePct / 100;
  const d = degradationPctPerYear / 100;
  const rows: FinanceYearRow[] = [];
  let totalDiscountedCost = capex;
  let totalDiscountedEnergyKwh = 0;
  let totalReplacementCost = 0;

  for (let t = 1; t <= lifetimeYears; t += 1) {
    const productionKwh = yearOneProductionKwh * Math.pow(1 - d, t - 1);
    const replacementCost = replacementByYear.get(t) ?? 0;
    const totalCost = annualOpex + replacementCost;
    const discountFactor = Math.pow(1 + r, t);
    rows.push({
      year: t,
      productionKwh,
      opex: annualOpex,
      replacementCost,
      totalCost,
      discountedCost: totalCost / discountFactor,
      discountedEnergyKwh: productionKwh / discountFactor,
    });
    totalDiscountedCost += totalCost / discountFactor;
    totalDiscountedEnergyKwh += productionKwh / discountFactor;
    totalReplacementCost += replacementCost;
  }

  if (totalDiscountedEnergyKwh <= 0) throw new Error("L'énergie actualisée totale est nulle : LCOE indéfini.");

  return {
    rows,
    totalDiscountedCost,
    totalDiscountedEnergyKwh,
    lcoePerKwh: totalDiscountedCost / totalDiscountedEnergyKwh,
    totalCapex: capex,
    totalReplacementCost,
    totalOpex: annualOpex * lifetimeYears,
  };
}

export const LCOE_FORMULA = "LCOE = [CAPEX + Σ_t (OPEX + R_t)/(1+r)^t] / [Σ_t E₁×(1−d)^(t−1)/(1+r)^t]";
