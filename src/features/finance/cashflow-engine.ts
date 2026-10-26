/**
 * Moteur de flux de trésorerie déterministe (PROMPT 18).
 *
 * Conventions explicites :
 * - Flux ANNUELS, monnaie constante (convention RÉELLE) : le taux d'actualisation saisi doit être un taux réel.
 *   Aucune inflation n'est appliquée ; mélanger flux nominaux et taux réel est refusé par construction.
 * - Année 0 = date de référence : CAPEX (et subventions d'investissement) en année 0, non actualisés.
 * - Années 1..N : flux en fin d'année, actualisés par (1+r)^t.
 * - Revenus = énergie vendue × tarif ; économies = énergie substituée × coût de référence. Les deux
 *   quantités sont saisies séparément ; leur somme ne peut pas dépasser la production de l'année
 *   (aucune énergie comptée deux fois). Sans tarif/coût de référence : aucun revenu.
 * - Valeur résiduelle : ajoutée en fin d'année N si saisie.
 * - Pas de fiscalité, pas de dette : flux nets AVANT impôts et financement.
 */

export type CostItem = { label: string; amount: number; includedInOther?: boolean; source: string };

export interface CashflowInput {
  currency: string;
  lifetimeYears: number;
  /** Taux d'actualisation RÉEL en %. */
  realDiscountRatePct: number;
  capexItems: CostItem[];
  opexItems: CostItem[];
  replacements: { year: number; cost: number }[];
  /** Production année 1 (kWh) et dégradation (%/an). */
  yearOneProductionKwh: number;
  degradationPctPerYear: number;
  /** Part de la production vendue et substituée (0..1 chacune, somme ≤ 1). */
  soldShare: number;
  substitutedShare: number;
  /** Tarif de vente et coût de référence (monnaie/kWh) ; null = inconnu → aucun revenu correspondant. */
  saleTariffPerKwh: number | null;
  referenceCostPerKwh: number | null;
  subsidy: number;
  residualValue: number;
}

export interface CashflowRow {
  year: number;
  productionKwh: number;
  capex: number;
  opex: number;
  replacement: number;
  revenue: number;
  savings: number;
  subsidy: number;
  residual: number;
  net: number;
  discounted: number;
  cumulative: number;
  cumulativeDiscounted: number;
}

export type IrrResult = { status: "ok"; ratePct: number } | { status: "unavailable"; reason: string };

export interface CashflowResult {
  rows: CashflowRow[];
  totalCapex: number;
  annualOpex: number;
  npv: number;
  irr: IrrResult;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  lcoePerKwh: number;
  hasIncome: boolean;
  warnings: string[];
}

function finite(v: number, name: string) {
  if (!Number.isFinite(v)) throw new Error(`${name} doit être un nombre fini.`);
}

export function sumCostItems(items: CostItem[], name: string): number {
  let total = 0;
  for (const it of items) {
    finite(it.amount, `${name} « ${it.label} »`);
    if (it.amount < 0) throw new Error(`${name} « ${it.label} » ne peut pas être négatif.`);
    if (!it.source.trim()) throw new Error(`${name} « ${it.label} » : source ou « hypothèse utilisateur » requise.`);
    if (!it.includedInOther) total += it.amount;
  }
  return total;
}

export function npvOf(flows: number[], ratePct: number): number {
  const r = ratePct / 100;
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + r, t), 0);
}

/** TRI par bissection sur ]-99 %, 1000 %]. Refuse les profils sans ou à plusieurs changements de signe. */
export function computeIrr(flows: number[]): IrrResult {
  const signs = flows.filter((f) => f !== 0).map(Math.sign);
  let changes = 0;
  for (let i = 1; i < signs.length; i += 1) if (signs[i] !== signs[i - 1]) changes += 1;
  if (changes === 0) return { status: "unavailable", reason: "Aucun changement de signe des flux : TRI inexistant." };
  if (changes > 1) return { status: "unavailable", reason: "Plusieurs changements de signe : TRI potentiellement multiple, non interprétable." };
  let lo = -99, hi = 1000;
  let fLo = npvOf(flows, lo), fHi = npvOf(flows, hi);
  if (Math.sign(fLo) === Math.sign(fHi)) return { status: "unavailable", reason: "Aucune racine dans ]-99 % ; 1000 %]." };
  for (let i = 0; i < 200; i += 1) {
    const mid = (lo + hi) / 2;
    const fMid = npvOf(flows, mid);
    if (Math.abs(fMid) < 1e-9 || hi - lo < 1e-10) return { status: "ok", ratePct: mid };
    if (Math.sign(fMid) === Math.sign(fLo)) { lo = mid; fLo = fMid; } else { hi = mid; fHi = fMid; }
  }
  return { status: "ok", ratePct: (lo + hi) / 2 };
}

/** Retour : première année où le cumul devient ≥ 0, interpolé linéairement dans l'année ; null si jamais atteint. */
export function paybackYears(cumulative: number[]): number | null {
  if (cumulative[0]! >= 0) return 0;
  for (let t = 1; t < cumulative.length; t += 1) {
    if (cumulative[t]! >= 0) {
      const prev = cumulative[t - 1]!;
      const gain = cumulative[t]! - prev;
      return t - 1 + (gain > 0 ? -prev / gain : 1);
    }
  }
  return null;
}

export function computeCashflows(input: CashflowInput): CashflowResult {
  const { lifetimeYears: N } = input;
  if (!input.currency.trim()) throw new Error("Devise requise.");
  if (!Number.isInteger(N) || N < 1 || N > 100) throw new Error("La durée d'analyse doit être un entier entre 1 et 100 ans.");
  for (const [v, n] of [[input.realDiscountRatePct, "Taux d'actualisation"], [input.yearOneProductionKwh, "Production année 1"], [input.degradationPctPerYear, "Dégradation"], [input.soldShare, "Part vendue"], [input.substitutedShare, "Part substituée"], [input.subsidy, "Subvention"], [input.residualValue, "Valeur résiduelle"]] as const) finite(v, n);
  if (input.realDiscountRatePct <= -100) throw new Error("Le taux d'actualisation doit être supérieur à -100 %.");
  if (input.yearOneProductionKwh <= 0) throw new Error("La production de l'année 1 doit être strictement positive.");
  if (input.degradationPctPerYear < 0 || input.degradationPctPerYear > 100) throw new Error("Dégradation hors de 0..100 %.");
  if (input.soldShare < 0 || input.substitutedShare < 0 || input.soldShare + input.substitutedShare > 1 + 1e-12)
    throw new Error("Parts vendue + substituée doivent être ≥ 0 et totaliser au plus 100 % de la production (pas de double comptage).");
  if (input.subsidy < 0 || input.residualValue < 0) throw new Error("Subvention et valeur résiduelle ne peuvent pas être négatives.");
  for (const t of [input.saleTariffPerKwh, input.referenceCostPerKwh]) if (t != null && (!Number.isFinite(t) || t < 0)) throw new Error("Tarif et coût de référence doivent être positifs ou nuls.");

  const totalCapex = sumCostItems(input.capexItems, "CAPEX");
  if (totalCapex <= 0) throw new Error("Le CAPEX total doit être strictement positif.");
  const annualOpex = sumCostItems(input.opexItems, "OPEX");
  const repl = new Map<number, number>();
  for (const r of input.replacements) {
    if (!Number.isInteger(r.year) || r.year < 1 || r.year > N) throw new Error(`Année de remplacement invalide : ${r.year}.`);
    finite(r.cost, "Coût de remplacement");
    if (r.cost < 0) throw new Error("Coût de remplacement négatif.");
    repl.set(r.year, (repl.get(r.year) ?? 0) + r.cost);
  }

  const warnings: string[] = [];
  if (input.soldShare > 0 && input.saleTariffPerKwh == null) warnings.push("Part vendue saisie sans tarif : aucun revenu de vente compté.");
  if (input.substitutedShare > 0 && input.referenceCostPerKwh == null) warnings.push("Part substituée saisie sans coût de référence : aucune économie comptée.");
  const tariff = input.saleTariffPerKwh ?? 0;
  const refCost = input.referenceCostPerKwh ?? 0;
  const hasIncome = (input.soldShare > 0 && input.saleTariffPerKwh != null && tariff > 0) || (input.substitutedShare > 0 && input.referenceCostPerKwh != null && refCost > 0);
  if (!hasIncome) warnings.push("Aucun revenu ni économie documenté : VAN, TRI et temps de retour ne reflètent que des coûts.");

  const r = input.realDiscountRatePct / 100;
  const d = input.degradationPctPerYear / 100;
  const rows: CashflowRow[] = [];
  const row0net = -totalCapex + input.subsidy;
  rows.push({ year: 0, productionKwh: 0, capex: totalCapex, opex: 0, replacement: 0, revenue: 0, savings: 0, subsidy: input.subsidy, residual: 0, net: row0net, discounted: row0net, cumulative: row0net, cumulativeDiscounted: row0net });
  let costPv = totalCapex, energyPv = 0;
  for (let t = 1; t <= N; t += 1) {
    const prod = input.yearOneProductionKwh * Math.pow(1 - d, t - 1);
    const replacement = repl.get(t) ?? 0;
    const revenue = prod * input.soldShare * tariff;
    const savings = prod * input.substitutedShare * refCost;
    const residual = t === N ? input.residualValue : 0;
    const net = revenue + savings + residual - annualOpex - replacement;
    const f = Math.pow(1 + r, t);
    const prev = rows[t - 1]!;
    rows.push({ year: t, productionKwh: prod, capex: 0, opex: annualOpex, replacement, revenue, savings, subsidy: 0, residual, net, discounted: net / f, cumulative: prev.cumulative + net, cumulativeDiscounted: prev.cumulativeDiscounted + net / f });
    costPv += (annualOpex + replacement) / f;
    energyPv += prod / f;
  }
  const flows = rows.map((x) => x.net);
  return {
    rows,
    totalCapex,
    annualOpex,
    npv: rows[N]!.cumulativeDiscounted,
    irr: computeIrr(flows),
    simplePaybackYears: paybackYears(rows.map((x) => x.cumulative)),
    discountedPaybackYears: paybackYears(rows.map((x) => x.cumulativeDiscounted)),
    lcoePerKwh: costPv / energyPv,
    hasIncome,
    warnings,
  };
}

export type SensitivityVariable = "capex" | "opex" | "discount" | "production" | "tariff";
export const MAX_SENSITIVITY_VARIANTS = 9;
export const SENSITIVITY_BOUND_PCT = 90;

/** Sensibilité bornée : variations relatives saisies (|Δ| ≤ 90 %, au plus 9), l'entrée de base n'est jamais modifiée. */
export function runSensitivity(base: CashflowInput, variable: SensitivityVariable, deltasPct: number[]) {
  if (deltasPct.length === 0 || deltasPct.length > MAX_SENSITIVITY_VARIANTS) throw new Error(`Entre 1 et ${MAX_SENSITIVITY_VARIANTS} variantes.`);
  return deltasPct.map((delta) => {
    if (!Number.isFinite(delta) || Math.abs(delta) > SENSITIVITY_BOUND_PCT) throw new Error(`Variation hors bornes ±${SENSITIVITY_BOUND_PCT} % : ${delta}.`);
    const k = 1 + delta / 100;
    const v: CashflowInput = structuredClone(base);
    if (variable === "capex") v.capexItems = v.capexItems.map((i) => ({ ...i, amount: i.amount * k }));
    if (variable === "opex") v.opexItems = v.opexItems.map((i) => ({ ...i, amount: i.amount * k }));
    if (variable === "discount") v.realDiscountRatePct *= k;
    if (variable === "production") v.yearOneProductionKwh *= k;
    if (variable === "tariff") {
      if (v.saleTariffPerKwh != null) v.saleTariffPerKwh *= k;
      if (v.referenceCostPerKwh != null) v.referenceCostPerKwh *= k;
    }
    const res = computeCashflows(v);
    return { deltaPct: delta, npv: res.npv, irr: res.irr, lcoePerKwh: res.lcoePerKwh, simplePaybackYears: res.simplePaybackYears };
  });
}

/** Contrôle de comparabilité de plusieurs analyses : refuse devises, durées ou taux différents. Aucun classement. */
export function checkComparability(items: { name: string; input: CashflowInput }[]): string[] {
  const issues: string[] = [];
  if (items.length < 2) return issues;
  const [a] = items;
  for (const b of items.slice(1)) {
    if (b.input.currency !== a!.input.currency) issues.push(`Devise différente (${a!.name} : ${a!.input.currency}, ${b.name} : ${b.input.currency}) — aucune conversion appliquée.`);
    if (b.input.lifetimeYears !== a!.input.lifetimeYears) issues.push(`Durée d'analyse différente entre ${a!.name} et ${b.name}.`);
    if (b.input.realDiscountRatePct !== a!.input.realDiscountRatePct) issues.push(`Taux d'actualisation différent entre ${a!.name} et ${b.name}.`);
  }
  return issues;
}
