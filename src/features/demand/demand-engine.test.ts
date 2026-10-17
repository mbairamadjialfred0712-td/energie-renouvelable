import { describe, expect, it } from "vitest";
import { MONTH_DAYS, demandWarnings, equipmentEnergy, equipmentErrors, equipmentWarnings, inventoryTotal, measurementDaily, measurementErrors, measurementsOutsidePeriod, overlappingMeasurements, profileErrors } from "./demand-engine";
import type { Equipment, Measurement, ProfileSlot } from "./demand-engine";

const eq = (p: Partial<Equipment> = {}): Equipment => ({ name: "Lampe", category: null, quantity: 10, unit_power: 20, power_unit: "W", hours_per_day: 4, days_per_week: 7, usage_factor: null, usage_factor_definition: null, usage_factor_source: null, priority: "importante", notes: null, ...p });

describe("equipmentErrors", () => {
  it("accepte une ligne complète", () => expect(equipmentErrors(eq(), 0)).toEqual([]));
  it("rejette une quantité négative ou nulle", () => {
    expect(equipmentErrors(eq({ quantity: -2 }), 0).join(" ")).toMatch(/strictement positive/);
    expect(equipmentErrors(eq({ quantity: 0 }), 0).join(" ")).toMatch(/strictement positive/);
  });
  it("rejette une puissance négative", () => expect(equipmentErrors(eq({ unit_power: -1 }), 0).join(" ")).toMatch(/positive/));
  it("rejette des heures hors limites plausibles", () => {
    expect(equipmentErrors(eq({ hours_per_day: 25 }), 0).join(" ")).toMatch(/24 h/);
    expect(equipmentErrors(eq({ hours_per_day: -1 }), 0).join(" ")).toMatch(/24 h/);
  });
  it("rejette des jours hors 0–7", () => expect(equipmentErrors(eq({ days_per_week: 8 }), 0).join(" ")).toMatch(/0 et 7/));
  it("rejette les valeurs manquantes sans les remplacer par zéro", () => {
    const e = eq({ unit_power: null });
    expect(equipmentErrors(e, 0).length).toBeGreaterThan(0);
    expect(equipmentEnergy(e)).toBeNull();
  });
  it("exige définition et source pour un facteur d’utilisation", () => {
    expect(equipmentErrors(eq({ usage_factor: 0.8 }), 0).join(" ")).toMatch(/définition et sa source/);
    expect(equipmentErrors(eq({ usage_factor: 0.8, usage_factor_definition: "Charge réelle", usage_factor_source: "Mesures 2024" }), 0)).toEqual([]);
  });
  it("rejette un facteur d’utilisation hors (0, 1]", () => expect(equipmentErrors(eq({ usage_factor: 1.5 }), 0).join(" ")).toMatch(/entre 0/));
});

describe("equipmentEnergy — conversions W/kW", () => {
  it("W : Q × P(W) × h ÷ 1 000", () => {
    const r = equipmentEnergy(eq())!;
    expect(r.perUseDayKwh).toBeCloseTo(0.8); // 10 × 20 W × 4 h / 1000
    expect(r.avgDailyKwh).toBeCloseTo(0.8); // 7/7 jours
    expect(r.monthlyKwh).toBeCloseTo(0.8 * MONTH_DAYS);
    expect(r.installedKw).toBeCloseTo(0.2);
  });
  it("kW : pas de division par 1 000", () => {
    const r = equipmentEnergy(eq({ unit_power: 2, power_unit: "kW" }))!;
    expect(r.perUseDayKwh).toBeCloseTo(80);
    expect(r.installedKw).toBeCloseTo(20);
  });
  it("pondère la moyenne par les jours d’utilisation (÷ 7)", () => {
    expect(equipmentEnergy(eq({ days_per_week: 3.5 }))!.avgDailyKwh).toBeCloseTo(0.4);
  });
  it("applique le facteur d’utilisation documenté", () => {
    const r = equipmentEnergy(eq({ usage_factor: 0.5, usage_factor_definition: "d", usage_factor_source: "s" }))!;
    expect(r.perUseDayKwh).toBeCloseTo(0.4);
  });
});

describe("inventoryTotal", () => {
  it("somme plusieurs équipements complets", () => {
    const t = inventoryTotal([eq(), eq({ name: "Pompe", quantity: 1, unit_power: 1, power_unit: "kW", hours_per_day: 2 })]);
    expect(t.complete).toBe(true);
    if (t.complete) expect(t.avgDailyKwh).toBeCloseTo(2.8);
  });
  it("refuse tout total si une ligne est incomplète", () => {
    const t = inventoryTotal([eq(), eq({ name: "Incomplet", unit_power: null })]);
    expect(t.complete).toBe(false);
  });
  it("refuse un total sans équipement", () => expect(inventoryTotal([]).complete).toBe(false));
});

describe("measurementErrors / measurementDaily", () => {
  const m = (p: Partial<Measurement> = {}): Measurement => ({ start: "2024-01-01", end: "2024-01-31", energy: 310, unit: "kWh", peak_kw: null, notes: null, ...p });
  it("accepte une mesure valide", () => expect(measurementErrors([m()])).toEqual([]));
  it("rejette une énergie négative", () => expect(measurementErrors([m({ energy: -1 })]).join(" ")).toMatch(/positive/));
  it("rejette une période incohérente", () => expect(measurementErrors([m({ end: "2023-12-01" })]).join(" ")).toMatch(/précède/));
  it("rejette des dates invalides", () => expect(measurementErrors([m({ start: "n/a" })]).join(" ")).toMatch(/obligatoires/));
  it("calcule la moyenne journalière sur le nombre réel de jours (inclusif)", () => {
    expect(measurementDaily(m())!.avgDailyKwh).toBeCloseTo(10); // 310 / 31
    expect(measurementDaily(m({ energy: 620, unit: "kWh", start: "2024-02-01", end: "2024-02-29" }))!.days).toBe(29);
  });
  it("convertit Wh → kWh explicitement (÷ 1 000)", () => {
    expect(measurementDaily(m({ energy: 310000, unit: "Wh" }))!.kwh).toBeCloseTo(310);
  });
  it("détecte les mesures chevauchantes (double comptage)", () => {
    expect(overlappingMeasurements([m(), m({ start: "2024-01-15", end: "2024-02-15" })])).toBe(true);
    expect(overlappingMeasurements([m(), m({ start: "2024-02-01", end: "2024-02-29" })])).toBe(false);
  });
});

describe("profileErrors", () => {
  const s = (p: Partial<ProfileSlot> = {}): ProfileSlot => ({ start_hour: 0, end_hour: 6, power_kw: 2, nature: "estimated", ...p });
  it("accepte des créneaux valides", () => expect(profileErrors([s(), s({ start_hour: 6, end_hour: 18 })])).toEqual([]));
  it("rejette des heures invalides", () => {
    expect(profileErrors([s({ start_hour: -1 })]).join(" ")).toMatch(/invalides/);
    expect(profileErrors([s({ end_hour: 25 })]).join(" ")).toMatch(/invalides/);
    expect(profileErrors([s({ start_hour: 6, end_hour: 6 })]).join(" ")).toMatch(/invalides/);
  });
  it("rejette une puissance négative", () => expect(profileErrors([s({ power_kw: -1 })]).join(" ")).toMatch(/négative/));
  it("rejette les créneaux chevauchants", () => expect(profileErrors([s(), s({ start_hour: 5, end_hour: 9 })]).join(" ")).toMatch(/chevauche/));
});

describe("avertissements non bloquants (A2.1)", () => {
  it("signale une quantité fractionnaire sans la bloquer", () => {
    expect(equipmentErrors(eq({ quantity: 2.5 }), 0)).toEqual([]);
    expect(equipmentWarnings(eq({ quantity: 2.5 }), 0).join(" ")).toMatch(/fractionnaire/);
    expect(equipmentWarnings(eq({ quantity: 3 }), 0)).toEqual([]);
  });
  it("détecte les mesures hors période de référence (même partiellement)", () => {
    const inside = m({ start: "2024-03-01", end: "2024-03-31" });
    const outside = m({ start: "2023-06-01", end: "2023-06-30" });
    const partial = m({ start: "2023-12-15", end: "2024-01-15" });
    expect(measurementsOutsidePeriod([inside, outside, partial], "2024-01-01", "2024-12-31")).toEqual([outside, partial]);
    expect(measurementsOutsidePeriod([inside, outside], null, null)).toEqual([]);
  });
  it("demandWarnings consolide fractionnaires et hors période sans jamais bloquer", () => {
    const w = demandWarnings({ equipment: [eq({ quantity: 1.5 })], measurements: [m({ start: "2022-01-01", end: "2022-01-31" })], period_start: "2024-01-01", period_end: "2024-12-31" });
    expect(w.join(" ")).toMatch(/fractionnaire/);
    expect(w.join(" ")).toMatch(/hors de la période/);
  });
});
