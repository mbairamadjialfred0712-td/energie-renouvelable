import { describe, expect, it } from "vitest";
import { compareObservation, parseWorldBankPopulation } from "./demography-watch";

const wb = (value: number, year: number) => ({ value, year, source: "Banque mondiale" });

describe("compareObservation", () => {
  it("signale une année plus récente de la même source", () => {
    expect(compareObservation({ population: 100, population_year: 2024, population_source: "Banque mondiale" }, wb(105, 2025)).status).toBe("newer_publication");
  });
  it("ne compare pas une projection ANStat à la Banque mondiale", () => {
    expect(compareObservation({ population: 33_293_101, population_year: 2026, population_source: "ANStat — projection" }, wb(32_711_547, 2025)).status).toBe("different_source");
  });
  it("signale un écart supérieur à 0,5 % pour même source et même année", () => {
    expect(compareObservation({ population: 1000, population_year: 2025, population_source: "World Bank" }, wb(1010, 2025)).status).toBe("value_mismatch");
    expect(compareObservation({ population: 1000, population_year: 2025, population_source: "World Bank" }, wb(1004, 2025)).status).toBe("up_to_date");
  });
  it("distingue l'absence de valeur enregistrée ou externe", () => {
    expect(compareObservation({ population: null, population_year: null, population_source: null }, wb(1, 2025)).status).toBe("no_stored_value");
    expect(compareObservation({ population: 1, population_year: 2025, population_source: null }, null).status).toBe("no_external_value");
  });
});

describe("parseWorldBankPopulation", () => {
  it("ignore les entrées invalides", () => {
    const r = parseWorldBankPopulation([{ lastupdated: "2026-10-08" }, [
      { countryiso3code: "CIV", date: "2025", value: 32711547 },
      { countryiso3code: "", date: "2025", value: 5 },
      { countryiso3code: "FRA", date: "2025", value: null },
    ]]);
    expect(r.lastUpdated).toBe("2026-10-08");
    expect(r.byIso3.size).toBe(1);
    expect(r.byIso3.get("CIV")).toEqual({ value: 32711547, year: 2025, source: "Banque mondiale" });
  });
});
