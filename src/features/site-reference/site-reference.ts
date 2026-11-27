/** Référentiel automatique de site — fonctions pures (aucun appel réseau, aucune donnée inventée). */
export const PVGIS_ADAPTER = "pvgis-tmy-5.3/1.0.0";
export const NASA_ADAPTER = "nasa-power-hourly/1.0.0";
export const NOMINATIM_ADAPTER = "nominatim-search/1.0.0";
/** Année de référence conventionnelle non bissextile utilisée pour libeller une année type. */
export const REFERENCE_YEAR = 2023;

export type VariableStatus = "available" | "modeled" | "estimated" | "missing" | "to_verify" | "validated";
export const STATUS_LABELS: Record<VariableStatus, string> = { available: "Disponible", modeled: "Données modélisées", estimated: "Données estimées", missing: "Données manquantes", to_verify: "À vérifier", validated: "Validée par un ingénieur" };

export const isLeap = (y: number) => y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0);

export type CalendarReport = { count: number; duplicates: number; disordered: number; gaps: number; invalid: number; years: number[]; hasFeb29: boolean;
  status: "complete_8760" | "complete_8784_leap" | "incomplete" | "invalid"; pvCompatible: boolean; reason: string };

/** Analyse d’une série horaire UTC « YYYY-MM-DDTHH:00:00Z » : rien n’est corrigé, tout est signalé. */
export function analyzeHourly(timestamps: string[]): CalendarReport {
  let duplicates = 0, disordered = 0, gaps = 0, invalid = 0; const seen = new Set<string>(); const years = new Set<number>(); let hasFeb29 = false; let prev: number | null = null;
  for (const t of timestamps) {
    const ms = Date.parse(t);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(t) || !Number.isFinite(ms) || new Date(ms).toISOString().replace(".000Z", "Z") !== t) { invalid++; continue; }
    if (seen.has(t)) duplicates++; seen.add(t); years.add(Number(t.slice(0, 4))); if (t.slice(5, 10) === "02-29") hasFeb29 = true;
    if (prev !== null) { const d = ms - prev; if (d <= 0) disordered++; else if (d > 3600000) gaps += d / 3600000 - 1; }
    prev = ms;
  }
  const ys = [...years].sort();
  const base = { count: timestamps.length, duplicates, disordered, gaps, invalid, years: ys, hasFeb29 };
  if (invalid || duplicates || disordered) return { ...base, status: "invalid", pvCompatible: false, reason: "Horodatages invalides, dupliqués ou désordonnés." };
  const y = ys[0];
  const fullYear = ys.length === 1 && y !== undefined && timestamps[0] === `${y}-01-01T00:00:00Z` && timestamps.at(-1) === `${y}-12-31T23:00:00Z` && gaps === 0;
  if (fullYear && y !== undefined && !isLeap(y) && timestamps.length === 8760) return { ...base, status: "complete_8760", pvCompatible: true, reason: "Année civile complète de 8 760 heures." };
  if (fullYear && y !== undefined && isLeap(y) && timestamps.length === 8784) return { ...base, status: "complete_8784_leap", pvCompatible: false, reason: "Année bissextile complète (8 784 h) conservée intacte ; passage au PV et à la batterie bloqué en attente d’une méthode validée par l’ingénieur." };
  return { ...base, status: "incomplete", pvCompatible: false, reason: `Série incomplète : ${timestamps.length} heures, ${gaps} heure(s) manquante(s).` };
}

export type PvgisRow = { raw_time: string; timestamp: string; ghi: number | null; dni: number | null; dhi: number | null; temp_air: number | null; wind_speed: number | null };
export type PvgisTmy = { rows: PvgisRow[]; elevation: number | null; radiationDb: string; meteoDb: string; yearMin: number; yearMax: number; irradianceTimeOffset: number | null; monthsSelected: { month: number; year: number }[] };

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Lecture de l’année type PVGIS (W/m², °C, m/s). Les horodatages fournisseur (mois issus d’années différentes)
 * sont conservés dans raw_time ; le libellé canonique reprend mois/jour/heure UTC dans l’année de référence non
 * bissextile. Aucune valeur n’est décalée, interpolée ni remplacée. Toute anomalie est refusée.
 */
export function parsePvgisTmy(payload: unknown): PvgisTmy {
  const p = payload as { inputs?: { location?: { elevation?: unknown; irradiance_time_offset?: unknown }; meteo_data?: { radiation_db?: unknown; meteo_db?: unknown; year_min?: unknown; year_max?: unknown } }; outputs?: { tmy_hourly?: Record<string, unknown>[]; months_selected?: { month?: unknown; year?: unknown }[] } };
  const hourly = p?.outputs?.tmy_hourly;
  if (!Array.isArray(hourly)) throw new Error("Réponse PVGIS sans série horaire.");
  const seen = new Set<string>();
  const rows = hourly.map((r, i) => {
    const raw = String(r["time(UTC)"] ?? "");
    const m = /^(\d{4})(\d{2})(\d{2}):(\d{2})00$/.exec(raw);
    if (!m) throw new Error(`Ligne PVGIS ${i + 1} : horodatage inattendu.`);
    const [, , mo, d, h] = m;
    if (mo === "02" && d === "29") throw new Error("PVGIS a renvoyé un 29 février : année type refusée.");
    const timestamp = `${REFERENCE_YEAR}-${mo}-${d}T${h}:00:00Z`;
    if (new Date(Date.parse(timestamp)).toISOString().replace(".000Z", "Z") !== timestamp) throw new Error(`Ligne PVGIS ${i + 1} : date impossible.`);
    if (seen.has(timestamp)) throw new Error("Heure dupliquée dans l’année type PVGIS.");
    seen.add(timestamp);
    return { raw_time: raw, timestamp, ghi: num(r["G(h)"]), dni: num(r["Gb(n)"]), dhi: num(r["Gd(h)"]), temp_air: num(r["T2m"]), wind_speed: num(r["WS10m"]) };
  });
  const sorted = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  if (sorted.some((r, i) => r !== rows[i])) throw new Error("Ordre temporel PVGIS inattendu.");
  const report = analyzeHourly(rows.map((r) => r.timestamp));
  if (report.status !== "complete_8760") throw new Error(`Année type PVGIS refusée : ${report.reason}`);
  const md = p.inputs?.meteo_data ?? {};
  return { rows, elevation: num(p.inputs?.location?.elevation), radiationDb: String(md.radiation_db ?? "inconnue"), meteoDb: String(md.meteo_db ?? "inconnue"), yearMin: Number(md.year_min), yearMax: Number(md.year_max), irradianceTimeOffset: num(p.inputs?.location?.irradiance_time_offset),
    monthsSelected: (p.outputs?.months_selected ?? []).map((s) => ({ month: Number(s.month), year: Number(s.year) })) };
}

/** Clé de cache : fournisseur + version + coordonnées arrondies (4 décimales ≈ 11 m) + paramètres triés. */
export function cacheKey(provider: string, version: string, dataType: string, lat: number, lon: number, params: Record<string, string | number> = {}) {
  const sortedParams = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return `${provider}|${version}|${dataType}|${lat.toFixed(4)},${lon.toFixed(4)}|${sortedParams}`;
}

export type PlaceResult = { key: string; name: string; country: string | null; region: string | null; latitude: number; longitude: number; precision: "point" | "locality_center" | "approximate"; source: string; homonym: boolean; localityId: string | null };

const PRECISE = new Set(["house", "building", "amenity", "school", "hospital", "office"]);
export function nominatimPrecision(type: string | undefined, addresstype: string | undefined): PlaceResult["precision"] {
  if (PRECISE.has(type ?? "") || PRECISE.has(addresstype ?? "")) return "point";
  if (["city", "town", "village", "hamlet", "suburb", "neighbourhood", "municipality"].includes(addresstype ?? type ?? "")) return "locality_center";
  return "approximate";
}

/** Marque les homonymes (même nom normalisé) pour forcer l’affichage pays/région. */
export function markHomonyms(results: Omit<PlaceResult, "homonym">[]): PlaceResult[] {
  const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
  const counts = new Map<string, number>();
  for (const r of results) counts.set(norm(r.name), (counts.get(norm(r.name)) ?? 0) + 1);
  return results.map((r) => ({ ...r, homonym: (counts.get(norm(r.name)) ?? 0) > 1 }));
}

/** Somme horaire W/m² × 1 h → kWh/m² ; null si une seule heure manque (jamais remplacée par zéro). */
export function annualSum(values: (number | null)[]): number | null {
  if (!values.length || values.some((v) => v === null)) return null;
  return (values as number[]).reduce((a, b) => a + b, 0) / 1000;
}

export type PvReadiness = { ready: false; missing: string[] };
/** Le dossier ne lance jamais de calcul : il liste ce qui manque avant le formulaire PV. */
export function pvReadiness(input: { calendar: CalendarReport | null; siteSaved: boolean; weatherValidated: boolean }): PvReadiness {
  const missing: string[] = [];
  if (!input.calendar) missing.push("Série météo horaire de référence.");
  else if (!input.calendar.pvCompatible) missing.push(input.calendar.reason);
  if (!input.siteSaved) missing.push("Site d’étude enregistré et rattaché à une localité.");
  if (!input.weatherValidated) missing.push("Validation de la fiche météo par un ingénieur.");
  missing.push("Paramètres d’installation : puissance, ratio DC/AC, rendement onduleur, pertes, inclinaison, azimut, type de module, montage, GCR, albédo.");
  return { ready: false, missing };
}
