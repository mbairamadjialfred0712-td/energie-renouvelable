import { describe, expect, it } from "vitest";
import { biomassErrors, biomassWarnings, safeTotal, type BiomassValues } from "./biomass-model";

const base: BiomassValues = {
  quantity: 100, unit: "t/an", moisture: 20, lhv: 15, lhvBasis: "as_received", fraction: 60,
  potential: null, potentialSource: null, periodStart: "2023-01-01", periodEnd: "2023-12-31",
  levels: {}, seasonal: [],
};

describe("biomassErrors — rejets de valeurs impossibles ou intraçables", () => {
  it("refuse une quantité négative", () => {
    expect(biomassErrors({ ...base, quantity: -1 })).toContain("La quantité disponible doit être ≥ 0.");
  });
  it("exige une unité de quantité explicite", () => {
    expect(biomassErrors({ ...base, unit: null })).toContain("L’unité de quantité est obligatoire.");
  });
  it("refuse une humidité hors plage physique 0–100 %", () => {
    expect(biomassErrors({ ...base, moisture: 120 })).toContain("L’humidité doit être comprise entre 0 et 100 %.");
    expect(biomassErrors({ ...base, moisture: -5 })).toContain("L’humidité doit être comprise entre 0 et 100 %.");
  });
  it("refuse un PCI négatif", () => {
    expect(biomassErrors({ ...base, lhv: -1 })).toContain("Le PCI doit être ≥ 0 MJ/kg.");
  });
  it("exige la base de mesure dès qu’un PCI est renseigné", () => {
    expect(biomassErrors({ ...base, lhvBasis: null })).toContain("Précisez si le PCI porte sur la matière telle que reçue ou sèche.");
  });
  it("refuse une fraction exploitable hors 0–100 %", () => {
    expect(biomassErrors({ ...base, fraction: 150 })).toContain("La fraction exploitable doit être comprise entre 0 et 100 %.");
  });
  it("exige la source d’un potentiel énergétique renseigné", () => {
    expect(biomassErrors({ ...base, potential: 500 })).toContain("Un potentiel énergétique doit citer la source qui le fournit.");
  });
  it("refuse une période incohérente", () => {
    expect(biomassErrors({ ...base, periodStart: "2024-06-01", periodEnd: "2024-01-01" })).toContain("La fin de période précède le début.");
  });
  it("refuse un niveau de disponibilité négatif", () => {
    expect(biomassErrors({ ...base, levels: { theoretical: -10 } })).toContain("Potentiel théorique doit être ≥ 0.");
  });
  it("refuse un mois de saisonnalité hors 1–12", () => {
    expect(biomassErrors({ ...base, seasonal: [0] })).toContain("Saisonnalité : mois invalides.");
    expect(biomassErrors({ ...base, seasonal: [13] })).toContain("Saisonnalité : mois invalides.");
    expect(biomassErrors({ ...base, seasonal: [3, 11] })).toEqual([]);
  });
  it("accepte un jeu complet et cohérent", () => {
    expect(biomassErrors(base)).toEqual([]);
  });
});

describe("biomassWarnings — alertes non bloquantes, valeur jamais modifiée", () => {
  it("signale un PCI anormalement élevé sans le corriger", () => {
    expect(biomassWarnings({ ...base, lhv: 40 })).toContain("PCI > 25 MJ/kg : inhabituel pour une biomasse, à vérifier (unité, base de mesure).");
  });
  it("signale un potentiel technique supérieur au potentiel théorique", () => {
    expect(biomassWarnings({ ...base, levels: { theoretical: 100, technical: 150 } }))
      .toContain("Potentiel technique supérieur au potentiel théorique : à vérifier.");
  });
  it("signale une quantité mensuelle non comparable aux jeux annuels", () => {
    expect(biomassWarnings({ ...base, unit: "t/mois" })).toContain("Quantité mensuelle : non comparable aux jeux annuels (aucune conversion appliquée).");
  });
});

describe("safeTotal — aucun total fictif", () => {
  const row = (over: object) => ({ id: "1", type: "Résidus agricoles", unit: "t/an", lhvBasis: "as_received", start: "2023-01-01", end: "2023-12-31", quantity: 50, ...over });
  it("calcule un total pour des types distincts, même unité, base et période", () => {
    const t = safeTotal([row({}), row({ id: "2", type: "Bois et résidus ligneux", quantity: 30 })]);
    expect(t).toEqual({ total: 80, unit: "t/an" });
  });
  it("refuse de totaliser des unités différentes", () => {
    const t = safeTotal([row({}), row({ id: "2", type: "Bois et résidus ligneux", unit: "m³/an" })]);
    expect(t).toEqual({ reason: "Unités différentes : aucun total calculé." });
  });
  it("refuse de totaliser des bases de mesure différentes", () => {
    const t = safeTotal([row({}), row({ id: "2", type: "Bois et résidus ligneux", lhvBasis: "dry" })]);
    expect(t).toEqual({ reason: "Bases de mesure différentes : aucun total calculé." });
  });
  it("refuse de totaliser des périodes non datées (risque de double comptage)", () => {
    const t = safeTotal([row({ start: null }), row({ id: "2", type: "Bois et résidus ligneux" })]);
    expect(t).toEqual({ reason: "Périodes non datées : risque de double comptage, aucun total calculé." });
  });
  it("refuse de totaliser deux jeux du même type (sources concurrentes)", () => {
    const t = safeTotal([row({}), row({ id: "2" })]);
    expect(t).toEqual({ reason: "Plusieurs jeux du même type (sources ou périodes concurrentes) : aucun total calculé." });
  });
  it("refuse de totaliser des périodes différentes", () => {
    const t = safeTotal([row({}), row({ id: "2", type: "Bois et résidus ligneux", start: "2022-01-01", end: "2022-12-31" })]);
    expect(t).toEqual({ reason: "Périodes différentes : aucun total calculé." });
  });
  it("ne remplace jamais une quantité absente par zéro", () => {
    const t = safeTotal([row({ quantity: null }), row({ id: "2", type: "Bois et résidus ligneux" })]);
    expect(t).toEqual({ reason: "Moins de deux quantités renseignées." });
  });
});
