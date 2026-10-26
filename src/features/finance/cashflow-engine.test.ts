import { describe, expect, it } from "vitest";
import { checkComparability, computeCashflows, computeIrr, paybackYears, runSensitivity, sumCostItems, type CashflowInput } from "./cashflow-engine";
import { computeLcoe } from "./finance-engine";

const base: CashflowInput = {
  currency: "XOF",
  lifetimeYears: 10,
  realDiscountRatePct: 0,
  capexItems: [{ label: "Modules", amount: 1000, source: "devis test" }],
  opexItems: [{ label: "Maintenance", amount: 50, source: "hypothèse utilisateur" }],
  replacements: [],
  yearOneProductionKwh: 1000,
  degradationPctPerYear: 0,
  soldShare: 1,
  substitutedShare: 0,
  saleTariffPerKwh: 0.25,
  referenceCostPerKwh: null,
  subsidy: 0,
  residualValue: 0,
};

describe("CAPEX / OPEX", () => {
  it("n'additionne pas un poste déjà inclus ailleurs", () => {
    expect(sumCostItems([{ label: "Kit", amount: 900, source: "s" }, { label: "Onduleur (inclus)", amount: 100, includedInOther: true, source: "s" }], "CAPEX")).toBe(900);
  });
  it("exige une source par poste et refuse les négatifs", () => {
    expect(() => sumCostItems([{ label: "X", amount: 1, source: " " }], "OPEX")).toThrow();
    expect(() => sumCostItems([{ label: "X", amount: -1, source: "s" }], "OPEX")).toThrow();
  });
  it("OPEX annuel = somme des postes", () => {
    expect(computeCashflows({ ...base, opexItems: [{ label: "a", amount: 20, source: "s" }, { label: "b", amount: 30, source: "s" }] }).annualOpex).toBe(50);
  });
});

describe("flux, VAN, retour", () => {
  it("taux 0 : flux nets = 250−50 = 200/an, VAN = −1000 + 2000", () => {
    const r = computeCashflows(base);
    expect(r.rows[1]!.net).toBe(200);
    expect(r.npv).toBeCloseTo(1000, 9);
    expect(r.simplePaybackYears).toBeCloseTo(5, 9);
  });
  it("actualisation : VA_t = CF_t/(1+r)^t, CAPEX non actualisé", () => {
    const r = computeCashflows({ ...base, realDiscountRatePct: 10 });
    expect(r.rows[0]!.discounted).toBe(-1000);
    expect(r.rows[3]!.discounted).toBeCloseTo(200 / 1.1 ** 3, 9);
  });
  it("VAN négative et retour non atteint", () => {
    const r = computeCashflows({ ...base, saleTariffPerKwh: 0.1 });
    expect(r.npv).toBeCloseTo(-500, 9);
    expect(r.simplePaybackYears).toBeNull();
    expect(r.discountedPaybackYears).toBeNull();
  });
  it("retour actualisé plus long que le retour simple", () => {
    const r = computeCashflows({ ...base, realDiscountRatePct: 5 });
    expect(r.discountedPaybackYears!).toBeGreaterThan(r.simplePaybackYears!);
  });
  it("paybackYears interpole et renvoie null si jamais atteint", () => {
    expect(paybackYears([-100, -50, 50])).toBeCloseTo(1.5, 9);
    expect(paybackYears([-100, -50])).toBeNull();
  });
});

describe("TRI", () => {
  it("cas connu : −1000 puis 1100 → 10 %", () => {
    const r = computeIrr([-1000, 1100]);
    expect(r.status).toBe("ok");
    if (r.status === "ok") expect(r.ratePct).toBeCloseTo(10, 6);
  });
  it("annule la VAN du projet", () => {
    const res = computeCashflows(base);
    expect(res.irr.status).toBe("ok");
    if (res.irr.status === "ok") expect(computeCashflows({ ...base, realDiscountRatePct: res.irr.ratePct }).npv).toBeCloseTo(0, 5);
  });
  it("sans changement de signe : indisponible", () => {
    expect(computeIrr([-1000, -10]).status).toBe("unavailable");
  });
  it("plusieurs changements de signe : indisponible", () => {
    expect(computeIrr([-100, 230, -132]).status).toBe("unavailable");
  });
});

describe("revenus, LCOE et validation", () => {
  it("aucun tarif → aucun revenu inventé", () => {
    const r = computeCashflows({ ...base, saleTariffPerKwh: null });
    expect(r.rows[1]!.revenue).toBe(0);
    expect(r.hasIncome).toBe(false);
  });
  it("vendu + substitué > 100 % refusé (double comptage)", () => {
    expect(() => computeCashflows({ ...base, soldShare: 0.7, substitutedShare: 0.4, referenceCostPerKwh: 0.2 })).toThrow();
  });
  it("LCOE identique au moteur LCOE existant (monnaie/kWh)", () => {
    const r = computeCashflows({ ...base, realDiscountRatePct: 8, degradationPctPerYear: 0.5, replacements: [{ year: 5, cost: 100 }] });
    const l = computeLcoe({ currency: "XOF", capex: 1000, annualOpex: 50, lifetimeYears: 10, discountRatePct: 8, yearOneProductionKwh: 1000, degradationPctPerYear: 0.5, replacements: [{ year: 5, cost: 100 }] });
    expect(r.lcoePerKwh).toBeCloseTo(l.lcoePerKwh, 12);
  });
  it("entrées invalides refusées", () => {
    expect(() => computeCashflows({ ...base, capexItems: [] })).toThrow();
    expect(() => computeCashflows({ ...base, lifetimeYears: 0 })).toThrow();
    expect(() => computeCashflows({ ...base, currency: "" })).toThrow();
    expect(() => computeCashflows({ ...base, yearOneProductionKwh: Number.NaN })).toThrow();
    expect(() => computeCashflows({ ...base, replacements: [{ year: 11, cost: 1 }] })).toThrow();
  });
  it("valeur résiduelle en année N et subvention en année 0", () => {
    const r = computeCashflows({ ...base, residualValue: 100, subsidy: 200 });
    expect(r.rows[10]!.residual).toBe(100);
    expect(r.rows[0]!.net).toBe(-800);
  });
});

describe("sensibilité et comparaison", () => {
  it("bornée, reproductible, n'altère pas la base", () => {
    const copy = structuredClone(base);
    const a = runSensitivity(base, "capex", [-10, 0, 10]);
    expect(a[1]!.npv).toBeCloseTo(computeCashflows(base).npv, 9);
    expect(a[0]!.npv).toBeGreaterThan(a[2]!.npv);
    expect(base).toEqual(copy);
    expect(runSensitivity(base, "capex", [-10, 0, 10])).toEqual(a);
    expect(() => runSensitivity(base, "opex", [95])).toThrow();
    expect(() => runSensitivity(base, "opex", Array(10).fill(1))).toThrow();
  });
  it("comparaison refusée sur devises/durées/taux différents", () => {
    expect(checkComparability([{ name: "A", input: base }, { name: "B", input: base }])).toEqual([]);
    expect(checkComparability([{ name: "A", input: base }, { name: "B", input: { ...base, currency: "EUR", lifetimeYears: 20 } }])).toHaveLength(2);
  });
});
