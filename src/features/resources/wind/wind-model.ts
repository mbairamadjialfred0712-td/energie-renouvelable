// Browser-safe model of a wind dataset: labels, validation, and pure selectors over user-entered series.
export const WIND_NATURES = { measured: "Mesure locale", technical_study: "Étude technique", imported: "Fichier importé", api: "Donnée API", estimate: "Estimation", assumption: "Hypothèse" } as const;
export type WindNature = keyof typeof WIND_NATURES;
export const WIND_STATUSES = { unverified: "Non vérifiée", in_review: "En vérification", validated: "Validée", rejected: "Rejetée", archived: "Archivée" } as const;
export type WindStatus = keyof typeof WIND_STATUSES;

export type WindSample = { date: string; speed_ms: number; direction_deg: number | null };
export type WindBin = { min_ms: number; max_ms: number; frequency_pct: number };

export type WindValues = {
  avg: number | null; max: number | null; height: number | null; direction: number | null; density: number | null; cf: number | null;
  periodStart: string | null; periodEnd: string | null; timeseries: WindSample[]; distribution: WindBin[];
};

/** Blocking errors: impossible values only. */
export function windErrors(v: WindValues): string[] {
  const e: string[] = [];
  if (v.avg !== null && v.avg < 0) e.push("La vitesse moyenne doit être ≥ 0 m/s.");
  if (v.max !== null && v.max < 0) e.push("La vitesse maximale doit être ≥ 0 m/s.");
  if (v.height !== null && v.height < 0) e.push("La hauteur de mesure doit être ≥ 0 m.");
  if (v.direction !== null && (v.direction < 0 || v.direction >= 360)) e.push("La direction doit être comprise entre 0 et moins de 360°.");
  if (v.density !== null && v.density <= 0) e.push("La densité de l’air doit être > 0 kg/m³.");
  if (v.cf !== null && (v.cf < 0 || v.cf > 100)) e.push("Le facteur de capacité doit être compris entre 0 et 100 %.");
  if (v.periodStart && v.periodEnd && v.periodEnd < v.periodStart) e.push("La fin de période précède le début.");
  if (v.timeseries.some((s) => s.speed_ms < 0 || (s.direction_deg !== null && (s.direction_deg < 0 || s.direction_deg >= 360)))) e.push("Série temporelle : vitesse négative ou direction hors 0–360°.");
  if (v.distribution.some((b) => b.min_ms < 0 || b.max_ms <= b.min_ms || b.frequency_pct < 0 || b.frequency_pct > 100)) e.push("Distribution : classes ou fréquences invalides.");
  return e;
}

/** Non-blocking warnings: unusual but possible. Values are never modified. */
export function windWarnings(v: WindValues): string[] {
  const w: string[] = [];
  if (v.avg !== null && v.max !== null && v.max < v.avg) w.push("Vitesse maximale inférieure à la moyenne : à vérifier.");
  if (v.avg !== null && v.avg > 25) w.push("Vitesse moyenne > 25 m/s : valeur inhabituelle, à vérifier (unité m/s ?).");
  if (v.avg !== null && v.height === null) w.push("Hauteur de mesure absente : la vitesse n’est pas comparable entre jeux.");
  if (v.density !== null && (v.density < 0.9 || v.density > 1.4)) w.push("Densité de l’air hors 0,9–1,4 kg/m³ : à vérifier.");
  const total = v.distribution.reduce((s, b) => s + b.frequency_pct, 0);
  if (v.distribution.length && Math.abs(total - 100) > 1) w.push(`Somme des fréquences = ${total.toLocaleString("fr-FR")} % (≠ 100 %) : à vérifier.`);
  if (v.cf !== null && v.cf > 60) w.push("Facteur de capacité > 60 % : valeur inhabituelle, à vérifier.");
  return w;
}

const num = (s: string | undefined) => { const t = (s ?? "").trim().replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) ? n : NaN; };

/** Parse "AAAA-MM-JJ;vitesse;direction" lines. Returns errors per line instead of guessing. */
export function parseTimeseries(text: string): { rows: WindSample[]; errors: string[] } {
  const rows: WindSample[] = []; const errors: string[] = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const [d, s, dir] = line.split(/[;\t]/).map((x) => x.trim());
    const speed = num(s); const direction = num(dir);
    if (!d || !/^\d{4}-\d{2}-\d{2}/.test(d) || speed === null || Number.isNaN(speed) || Number.isNaN(direction)) errors.push(`Série, ligne ${i + 1} : format attendu AAAA-MM-JJ;vitesse;direction.`);
    else rows.push({ date: d, speed_ms: speed, direction_deg: direction });
  });
  return { rows, errors };
}
/** Parse "min;max;fréquence %" lines. */
export function parseDistribution(text: string): { rows: WindBin[]; errors: string[] } {
  const rows: WindBin[] = []; const errors: string[] = [];
  text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line, i) => {
    const [a, b, c] = line.split(/[;\t]/).map(num);
    if ([a, b, c].some((x) => x === null || x === undefined || Number.isNaN(x))) errors.push(`Distribution, ligne ${i + 1} : format attendu min;max;fréquence.`);
    else rows.push({ min_ms: a!, max_ms: b!, frequency_pct: c! });
  });
  return { rows, errors };
}
export const timeseriesText = (rows: WindSample[] | null) => (rows ?? []).map((r) => [r.date, r.speed_ms, r.direction_deg ?? ""].join(";")).join("\n");
export const distributionText = (rows: WindBin[] | null) => (rows ?? []).map((r) => [r.min_ms, r.max_ms, r.frequency_pct].join(";")).join("\n");

const SECTORS = ["N", "NE", "E", "SE", "S", "SO", "O", "NO"];
/** Counts entered samples per 45° sector. Null when fewer than 8 directional samples (insufficient documentation). */
export function directionSectors(rows: WindSample[]) {
  const dirs = rows.filter((r) => r.direction_deg !== null);
  if (dirs.length < 8) return null;
  const counts = SECTORS.map((name) => ({ name, count: 0 }));
  for (const r of dirs) counts[Math.floor((((r.direction_deg! + 22.5) % 360) / 45)) % 8]!.count++;
  return counts;
}
