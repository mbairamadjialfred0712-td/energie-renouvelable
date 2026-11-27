import { describe, expect, it } from "vitest";
import { analyzeHourly, annualSum, cacheKey, markHomonyms, nominatimPrecision, parsePvgisTmy, pvReadiness } from "./site-reference";

const year = (y: number) => { const out: string[] = []; for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 3600000) out.push(new Date(t).toISOString().replace(".000Z", "Z")); return out; };
const pvgis = (stamps: string[]) => ({ inputs: { location: { elevation: 8, irradiance_time_offset: 0.11 }, meteo_data: { radiation_db: "PVGIS-SARAH3", meteo_db: "ERA5", year_min: 2005, year_max: 2023 } },
  outputs: { months_selected: [{ month: 1, year: 2014 }], tmy_hourly: stamps.map((t, i) => ({ "time(UTC)": `${i < 744 ? "2014" : "2019"}${t.slice(5, 7)}${t.slice(8, 10)}:${t.slice(11, 13)}00`, "G(h)": 100, "Gb(n)": 50, "Gd(h)": 50, T2m: 27, WS10m: 3 })) } });

describe("Normalisation temporelle", () => {
  it("accepte une année non bissextile de 8 760 h", () => { const r = analyzeHourly(year(2025)); expect(r.status).toBe("complete_8760"); expect(r.pvCompatible).toBe(true); });
  it("conserve une année bissextile de 8 784 h mais bloque le PV", () => { const r = analyzeHourly(year(2024)); expect(r.count).toBe(8784); expect(r.hasFeb29).toBe(true); expect(r.status).toBe("complete_8784_leap"); expect(r.pvCompatible).toBe(false); });
  it("refuse une bissextile privée du 29 février (incohérente avec la batterie)", () => { const r = analyzeHourly(year(2024).filter((t) => t.slice(5, 10) !== "02-29")); expect(r.count).toBe(8760); expect(r.status).toBe("incomplete"); expect(r.gaps).toBe(24); });
  it("détecte les heures manquantes", () => { const s = year(2025); s.splice(10, 3); expect(analyzeHourly(s).gaps).toBe(3); });
  it("détecte doublons et désordre", () => { const s = year(2025); expect(analyzeHourly([...s, s[0]!]).status).toBe("invalid"); expect(analyzeHourly([s[1]!, s[0]!]).disordered).toBe(1); });
});

describe("PVGIS année type", () => {
  it("conserve les horodatages fournisseur et libelle 8 760 h dans l’année de référence", () => { const t = parsePvgisTmy(pvgis(year(2023))); expect(t.rows).toHaveLength(8760); expect(t.rows[0]?.raw_time).toBe("20140101:0000"); expect(t.rows[0]?.timestamp).toBe("2023-01-01T00:00:00Z"); expect(t.rows[8759]?.raw_time.startsWith("2019")).toBe(true); expect(t.radiationDb).toBe("PVGIS-SARAH3"); });
  it("refuse une année type incomplète", () => { expect(() => parsePvgisTmy(pvgis(year(2023).slice(0, 8000)))).toThrow(); });
  it("refuse un 29 février", () => { const p = pvgis(year(2023)); p.outputs.tmy_hourly[1500]!["time(UTC)"] = "20160229:1200"; expect(() => parsePvgisTmy(p)).toThrow(/29 février/); });
  it("conserve une valeur manquante au lieu de zéro", () => { const p = pvgis(year(2023)); (p.outputs.tmy_hourly[5] as Record<string, unknown>)["G(h)"] = null; const t = parsePvgisTmy(p); expect(t.rows[5]?.ghi).toBeNull(); expect(annualSum(t.rows.map((r) => r.ghi))).toBeNull(); });
});

describe("Recherche, cache et dossier", () => {
  it("clé de cache stable selon paramètres et version", () => { expect(cacheKey("pvgis", "1", "tmy", 6.13001, 1.22, { b: 1, a: 2 })).toBe(cacheKey("pvgis", "1", "tmy", 6.13004, 1.22, { a: 2, b: 1 })); expect(cacheKey("pvgis", "2", "tmy", 6.13, 1.22)).not.toBe(cacheKey("pvgis", "1", "tmy", 6.13, 1.22)); });
  it("signale les homonymes", () => { const base = { latitude: 0, longitude: 0, precision: "approximate" as const, source: "x", localityId: null, region: null }; const r = markHomonyms([{ ...base, key: "1", name: "Dapaong", country: "Togo" }, { ...base, key: "2", name: "dapaong", country: "Togo" }, { ...base, key: "3", name: "Lomé", country: "Togo" }]); expect(r.map((x) => x.homonym)).toEqual([true, true, false]); });
  it("un centre de ville n’est pas un site précis", () => { expect(nominatimPrecision("administrative", "city")).toBe("locality_center"); expect(nominatimPrecision("boundary", "state")).toBe("approximate"); });
  it("le dossier ne déclare jamais le PV prêt sans paramètres d’installation", () => { const r = pvReadiness({ calendar: analyzeHourly(year(2025)), siteSaved: true, weatherValidated: true }); expect(r.ready).toBe(false); expect(r.missing.join(" ")).toMatch(/Paramètres d’installation/); });
});
