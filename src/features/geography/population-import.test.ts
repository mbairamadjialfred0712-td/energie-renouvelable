import { describe, expect, it } from "vitest";
import { planPopulationImport, type ImportCountry } from "./demography-watch";

const c = (o: Partial<ImportCountry>): ImportCountry => ({ id: "1", name: "X", iso3: "CIV", population: null, population_year: null, population_source: null, population_method: null, ...o });
const wb = new Map([["CIV", { value: 32711547, year: 2025, source: "Banque mondiale" }]]);

describe("planPopulationImport", () => {
  it("ne remplace jamais une valeur ANStat", () => {
    expect(planPopulationImport([c({ population: 33293101, population_year: 2026, population_source: "ANStat projection" })], wb)[0]?.action).toBe("kept_other_source");
  });
  it("remplit un pays vide", () => {
    expect(planPopulationImport([c({})], wb)[0]?.action).toBe("updated");
  });
  it("met à jour une ancienne valeur Banque mondiale", () => {
    expect(planPopulationImport([c({ population: 31000000, population_year: 2024, population_source: "Banque mondiale — WDI" })], wb)[0]?.action).toBe("updated");
  });
  it("signale identique", () => {
    expect(planPopulationImport([c({ population: 32711547, population_year: 2025, population_source: "Banque mondiale" })], wb)[0]?.action).toBe("unchanged");
  });
  it("signale un pays sans publication", () => {
    expect(planPopulationImport([c({ iso3: "ZZZ", population: 5 })], wb)[0]?.action).toBe("missing");
    expect(planPopulationImport([c({ iso3: null })], wb)[0]?.action).toBe("missing");
  });
});
