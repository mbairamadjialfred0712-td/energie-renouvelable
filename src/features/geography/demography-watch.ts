/**
 * Suivi des publications démographiques externes.
 * Règles : une publication externe n'écrase jamais une valeur enregistrée ;
 * des sources, années ou méthodes différentes ne sont jamais fusionnées ;
 * chaque écart est signalé pour vérification humaine.
 */

export type WatchStatus =
  | "up_to_date"
  | "newer_publication"
  | "value_mismatch"
  | "different_source"
  | "no_stored_value"
  | "no_external_value";

export const WATCH_STATUS_LABELS: Record<WatchStatus, string> = {
  up_to_date: "À jour",
  newer_publication: "Nouvelle publication à vérifier",
  value_mismatch: "Écart à vérifier",
  different_source: "Source différente (non comparable)",
  no_stored_value: "Aucune valeur enregistrée",
  no_external_value: "Aucune publication externe",
};

export type StoredPopulation = {
  population: number | null;
  population_year: number | null;
  population_source: string | null;
};

export type ExternalObservation = { value: number; year: number; source: string };

/** Seuil d'écart relatif signalé pour une même source et une même année. */
export const MISMATCH_THRESHOLD = 0.005;

export function isSameSource(stored: string | null, externalSource: string): boolean {
  if (!stored) return false;
  const s = stored.toLowerCase();
  return externalSource === "Banque mondiale" && (s.includes("banque mondiale") || s.includes("world bank"));
}

export function compareObservation(stored: StoredPopulation, ext: ExternalObservation | null): { status: WatchStatus; relativeGap: number | null } {
  if (!ext) return { status: "no_external_value", relativeGap: null };
  if (stored.population === null || stored.population === undefined) return { status: "no_stored_value", relativeGap: null };
  const sameSource = isSameSource(stored.population_source, ext.source);
  if (stored.population_year !== null && ext.year > stored.population_year && sameSource) {
    return { status: "newer_publication", relativeGap: null };
  }
  if (!sameSource) return { status: "different_source", relativeGap: null };
  if (stored.population_year !== ext.year) return { status: "different_source", relativeGap: null };
  const gap = Math.abs(ext.value - stored.population) / stored.population;
  return gap > MISMATCH_THRESHOLD ? { status: "value_mismatch", relativeGap: gap } : { status: "up_to_date", relativeGap: gap };
}

/** Lecture stricte de la réponse de l'API Banque mondiale (indicateur SP.POP.TOTL). */
export function parseWorldBankPopulation(raw: unknown): { lastUpdated: string | null; byIso3: Map<string, ExternalObservation> } {
  const byIso3 = new Map<string, ExternalObservation>();
  if (!Array.isArray(raw) || raw.length < 2 || !Array.isArray(raw[1])) return { lastUpdated: null, byIso3 };
  const meta = raw[0] as Record<string, unknown> | null;
  for (const item of raw[1] as Record<string, unknown>[]) {
    const iso3 = item?.["countryiso3code"];
    const value = item?.["value"];
    const year = Number(item?.["date"]);
    if (typeof iso3 !== "string" || iso3.length !== 3) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    if (!Number.isInteger(year)) continue;
    byIso3.set(iso3.toUpperCase(), { value, year, source: "Banque mondiale" });
  }
  const lu = meta?.["lastupdated"];
  return { lastUpdated: typeof lu === "string" ? lu : null, byIso3 };
}
