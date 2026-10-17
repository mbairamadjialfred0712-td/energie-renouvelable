import { describe, expect, it } from "vitest";
import { computeLcoe } from "./finance-engine";

const base = {
  currency: "EUR",
  capex: 1_000_000,
  annualOpex: 20_000,
  lifetimeYears: 25,
  discountRatePct: 8,
  yearOneProductionKwh: 1_500_000,
  degradationPctPerYear: 0.5,
  replacements: [],
};

describe("computeLcoe", () => {
  it("cas simple sans OPEX ni remplacement : LCOE = CAPEX / énergie actualisée", () => {
    const res = computeLcoe({ ...base, annualOpex: 0, discountRatePct: 0, degradationPctPerYear: 0 });
    expect(res.totalDiscountedEnergyKwh).toBeCloseTo(1_500_000 * 25, 6);
    expect(res.lcoePerKwh).toBeCloseTo(1_000_000 / (1_500_000 * 25), 10);
  });

  it("dégradation : la production de l'année t suit E1×(1−d)^(t−1)", () => {
    const res = computeLcoe(base);
    expect(res.rows[0].productionKwh).toBeCloseTo(1_500_000, 6);
    expect(res.rows[1].productionKwh).toBeCloseTo(1_500_000 * 0.995, 6);
    expect(res.rows[24].productionKwh).toBeCloseTo(1_500_000 * Math.pow(0.995, 24), 6);
  });

  it("actualisation : le coût de l'année t est divisé par (1+r)^t", () => {
    const res = computeLcoe({ ...base, capex: 1, annualOpex: 100, discountRatePct: 10 });
    expect(res.rows[0].discountedCost).toBeCloseTo(100 / 1.1, 10);
    expect(res.rows[9].discountedCost).toBeCloseTo(100 / Math.pow(1.1, 10), 10);
  });

  it("CAPEX compté en année 0 : non actualisé même à taux élevé", () => {
    const res = computeLcoe({ ...base, annualOpex: 0, discountRatePct: 50 });
    expect(res.totalCapex).toBe(1_000_000);
    expect(res.totalDiscountedCost).toBeGreaterThan(1_000_000);
  });

  it("remplacements : ajoutés au coût de leur année et totalisés", () => {
    const res = computeLcoe({
      ...base,
      replacements: [
        { year: 10, cost: 50_000 },
        { year: 10, cost: 10_000 },
        { year: 20, cost: 30_000 },
      ],
    });
    expect(res.rows[9].replacementCost).toBe(60_000);
    expect(res.rows[19].replacementCost).toBe(30_000);
    expect(res.totalReplacementCost).toBe(90_000);
    expect(res.totalDiscountedCost).toBeGreaterThan(1_000_000);
  });

  it("reproductible : mêmes entrées → même LCOE", () => {
    expect(computeLcoe(base).lcoePerKwh).toBe(computeLcoe(base).lcoePerKwh);
  });

  it("rejette les entrées invalides sans produire de résultat", () => {
    expect(() => computeLcoe({ ...base, capex: 0 })).toThrow();
    expect(() => computeLcoe({ ...base, yearOneProductionKwh: -1 })).toThrow();
    expect(() => computeLcoe({ ...base, discountRatePct: -100 })).toThrow();
    expect(() => computeLcoe({ ...base, lifetimeYears: 0 })).toThrow();
    expect(() => computeLcoe({ ...base, lifetimeYears: 12.5 })).toThrow();
    expect(() => computeLcoe({ ...base, degradationPctPerYear: 101 })).toThrow();
    expect(() => computeLcoe({ ...base, annualOpex: Number.NaN })).toThrow();
    expect(() => computeLcoe({ ...base, replacements: [{ year: 26, cost: 100 }] })).toThrow();
  });
});
