import { describe, expect, it } from "vitest";
import { selectCspDni } from "./csp-weather";
const rows = ["2024-02-29T00:00:00Z", "2024-02-29T01:00:00Z"].map((timestamp) => ({ timestamp, dni: 800, ghi: null, dhi: null, temp_air: null, wind_speed: null }));
describe("CSP native data transformation", () => {
  it("explicit hour energy conversion preserves native input and Feb 29", () => {
    const before = structuredClone(rows), selected = selectCspDni(rows, "Wh/m²", true, true);
    expect(selected.values).toEqual([800, 800]); expect(rows).toEqual(before);
    expect(selected.end).toBe("2024-02-29T02:00:00Z");
  });
  it("refuses unconfirmed conversion", () => expect(() => selectCspDni(rows, "Wh/m²", false, true)).toThrow());
  it("refuses instantaneous power interpretation", () => expect(() => selectCspDni(rows, "W/m²", false, false)).toThrow());
  it("refuses unknown energy unit", () => expect(() => selectCspDni(rows, "kWh/m²", true, true)).toThrow());
  it("refuses missing DNI without requiring unrelated fields", () => expect(() => selectCspDni([{ ...rows[0], dni: null }], "W/m²", false, true)).toThrow());
  it("refuses duplicate timestamps", () => expect(() => selectCspDni([rows[0], rows[0]], "W/m²", false, true)).toThrow());
  it("refuses gaps", () => expect(() => selectCspDni([rows[0], { ...rows[1], timestamp: "2024-02-29T03:00:00Z" }], "W/m²", false, true)).toThrow());
  it("refuses negative DNI", () => expect(() => selectCspDni([{ ...rows[0], dni: -1 }], "W/m²", false, true)).toThrow());
});