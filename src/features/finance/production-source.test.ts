import { describe, expect, it } from "vitest";
import { classifyProductionSource, type ProductionCandidate } from "./production-source";

const c: ProductionCandidate = { simulationId: "s", name: "PV", valueKwh: 15500, unit: "kWh", periodStart: "2026-01-01", periodEnd: "2026-12-31", projectId: null, engineVersion: "x", method: "m" };

describe("production de référence", () => {
  it("accepte une année complète en kWh", () => expect(classifyProductionSource(c).ok).toBe(true));
  it("accepte une année bissextile", () => expect(classifyProductionSource({ ...c, periodStart: "2024-01-01", periodEnd: "2024-12-31" }).ok).toBe(true));
  it("refuse une semaine (pas d'extrapolation)", () => expect(classifyProductionSource({ ...c, periodEnd: "2026-01-07" }).ok).toBe(false));
  it("refuse une autre unité", () => expect(classifyProductionSource({ ...c, unit: "MWh" }).ok).toBe(false));
  it("refuse une valeur absente", () => expect(classifyProductionSource({ ...c, valueKwh: null }).ok).toBe(false));
});
