import { describe, expect, it } from "vitest";
import { cspRequestSchema } from "./csp-contract";
const value = (v: number | string, unit = "-") => ({ value: v, unit, nature: "assumption", source: "Manufactured test only" });
const req = () => ({ schema_version: "1.0", engine: "csp", engine_version: "1.0.0", project_id: "00000000-0000-4000-8000-000000000001", input_data: {
  site_id: value("00000000-0000-4000-8000-000000000002"), technology: value("parabolic_trough"), aperture_area: value(100, "m²"), optical_efficiency: value(.5), thermal_loss: value(0, "W"), operating_temperature: value(300, "°C"), fluid: value("test only"), conditions: value("test only"), period_start: value("2024-02-29T00:00:00Z"), period_end: value("2024-02-29T01:00:00Z"), dni_basis: value("period_mean"), optical_basis: value("effective_includes_incidence"),
}, assumptions: {}, source_references: [{ label: "Test only" }], timeseries: { timestamps: ["2024-02-29T00:00:00Z"], utc_offset_hours: 0, timestamp_convention: "period_start", series: { dni: { values: [800], unit: "W/m²", nature: "assumption", source: "Test only" } } } });
describe("strict CSP server contract", () => {
  it("accepts documented parameters without invented optional cycle", () => expect(cspRequestSchema.safeParse(req()).success).toBe(true));
  it("rejects unknown fields before generic schema stripping", () => expect(cspRequestSchema.safeParse({ ...req(), arbitrary: 1 }).success).toBe(false));
  it("rejects undocumented losses", () => { const r = req(); r.input_data.thermal_loss.source = ""; expect(cspRequestSchema.safeParse(r).success).toBe(false); });
  it("rejects negative aperture", () => { const r = req(); r.input_data.aperture_area.value = -1; expect(cspRequestSchema.safeParse(r).success).toBe(false); });
  it("rejects efficiency above unity", () => { const r = req(); r.input_data.optical_efficiency.value = 1.1; expect(cspRequestSchema.safeParse(r).success).toBe(false); });
  it("rejects power confused with energy", () => { const r = req(); r.input_data.thermal_loss.unit = "Wh"; expect(cspRequestSchema.safeParse(r).success).toBe(false); });
  it("rejects unsupported tower", () => { const r = req(); r.input_data.technology.value = "tower"; expect(cspRequestSchema.safeParse(r).success).toBe(false); });
});