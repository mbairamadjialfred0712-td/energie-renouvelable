import { describe, expect, it } from "vitest";
import { csvCells, parseWeatherCells, parseNasaWeather, NASA_FIELDS, weatherIssues, type WeatherSample } from "./weather-model";
const sample = (timestamp = "2024-01-01T00:00:00Z"): WeatherSample => ({ timestamp,ghi:0,dni:0,dhi:0,temp_air:25,wind_speed:3 });
describe("Fiches météo réelles",()=>{
  it("conserve une cellule vide sans remplacer un zéro",()=>{const rows=parseWeatherCells(csvCells("timestamp;ghi;dni;dhi;temp_air;wind_speed\n2024-01-01T00:00:00Z;0;;0;25;3"));expect(rows[0]?.ghi).toBe(0);expect(rows[0]?.dni).toBeNull();expect(weatherIssues(rows).missing).toBe(1);});
  it("refuse les valeurs non numériques",()=>{expect(()=>parseWeatherCells(csvCells("timestamp;ghi;dni;dhi;temp_air;wind_speed\n2024-01-01T00:00:00Z;abc;0;0;25;3"))).toThrow();});
  it("refuse les dates impossibles et doublons",()=>{expect(weatherIssues([sample("2024-02-30T00:00:00Z")]).errors.length).toBeGreaterThan(0);expect(weatherIssues([sample(),sample()]).errors.length).toBeGreaterThan(0);});
  it("signale les heures absentes sans interpoler",()=>{expect(weatherIssues([sample(),sample("2024-01-01T02:00:00Z")]).gaps).toBe(1);});
  it("refuse les rayonnements négatifs",()=>{expect(weatherIssues([{...sample(),ghi:-1}]).errors.length).toBeGreaterThan(0);});
  it("conserve les unités natives NASA et sa valeur manquante",()=>{const parameters=Object.fromEntries(Object.entries(NASA_FIELDS).map(([key,field])=>[field,{units:key==="temp_air"?"C":key==="wind_speed"?"m/s":"Wh/m^2"}]));const values=Object.fromEntries(Object.values(NASA_FIELDS).map((field)=>[field,{"2024010100":field===NASA_FIELDS.dni?-999:0}]));const rows=parseNasaWeather({header:{fill_value:-999,time_standard:"UTC"},parameters,properties:{parameter:values}},"2024-01-01","2024-01-01");expect(rows.length).toBe(24);expect(rows[0]?.ghi).toBe(0);expect(rows[0]?.dni).toBeNull();expect(rows[1]?.ghi).toBeNull();});
});