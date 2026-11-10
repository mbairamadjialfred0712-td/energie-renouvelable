import { describe, expect, it } from "vitest";
import { POPULATION_NOT_AVAILABLE, populationLabel, populationWarning } from "./demography";

// Intl fr-FR utilise une espace fine insécable (U+202F) comme séparateur de milliers.
const norm = (s: string) => s.replace(/\u202f/g, " ");

describe("populationLabel", () => {
  it("affiche la valeur avec son année de référence", () => {
    expect(norm(populationLabel({ population: 33293101, population_year: 2026, population_method: "projection" })))
      .toBe("33 293 101 hab. (2026)");
  });
  it("affiche « Donnée non disponible » quand la population est absente, sans inventer de valeur", () => {
    expect(populationLabel({ population: null, population_year: null, population_method: null })).toBe(POPULATION_NOT_AVAILABLE);
  });
  it("affiche la valeur sans année si celle-ci manque", () => {
    expect(norm(populationLabel({ population: 1000, population_year: null, population_method: "recensement" })))
      .toBe("1 000 hab.");
  });
});

describe("populationWarning", () => {
  it("signale qu'une projection n'est pas un recensement", () => {
    expect(populationWarning({ population: 33293101, population_year: 2026, population_method: "projection" }, 2026))
      .toMatch(/projection démographique, pas un recensement/);
  });
  it("signale qu'une estimation n'est pas un recensement", () => {
    expect(populationWarning({ population: 32711547, population_year: 2025, population_method: "estimation" }, 2026))
      .toMatch(/estimation, pas un recensement/);
  });
  it("signale une méthode non documentée", () => {
    expect(populationWarning({ population: 1000, population_year: 2026, population_method: null }, 2026))
      .toMatch(/méthode non documentée/);
  });
  it("signale un recensement de plus de 5 ans comme ancien", () => {
    expect(populationWarning({ population: 1000, population_year: 2019, population_method: "recensement" }, 2026))
      .toMatch(/donnée de 2019, ancienne/);
  });
  it("ne signale rien pour un recensement récent documenté", () => {
    expect(populationWarning({ population: 1000, population_year: 2024, population_method: "recensement" }, 2026)).toBeNull();
  });
  it("ne signale rien quand la donnée est absente", () => {
    expect(populationWarning({ population: null, population_year: null, population_method: null }, 2026)).toBeNull();
  });
});
