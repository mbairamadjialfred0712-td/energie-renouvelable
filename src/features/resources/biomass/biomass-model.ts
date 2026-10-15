// Browser-safe model of a biomass dataset: labels, validation, availability levels and anti double-counting selectors.
export const BIOMASS_TYPES = ["Résidus agricoles", "Résidus forestiers", "Résidus agro-industriels", "Déchets organiques", "Résidus d’élevage", "Bois et résidus ligneux", "Cultures énergétiques", "Autre"] as const;
export const BIOMASS_NATURES = { measured: "Mesure locale", technical_study: "Étude technique", inventory: "Inventaire agricole ou forestier", pdf: "Document PDF", spreadsheet: "Fichier CSV ou Excel", api: "API", estimate: "Estimation", assumption: "Hypothèse" } as const;
export type BiomassNature = keyof typeof BIOMASS_NATURES;
export const BIOMASS_STATUSES = { unverified: "Non vérifiée", in_review: "En vérification", validated: "Validée", rejected: "Rejetée", archived: "Archivée" } as const;
export type BiomassStatus = keyof typeof BIOMASS_STATUSES;
export const QUANTITY_UNITS = ["t/an", "t (matière sèche)/an", "m³/an", "t/mois"] as const;
export type QuantityUnit = (typeof QUANTITY_UNITS)[number];
export const LHV_BASES = { as_received: "Telle que reçue (humide)", dry: "Matière sèche" } as const;
export type LhvBasis = keyof typeof LHV_BASES;
/** Distinct availability levels; none is ever derived from another. Same unit as the main quantity. */
export const AVAILABILITY_LEVELS = {
  theoretical: "Potentiel théorique", technical: "Potentiel techniquement exploitable", sustainable: "Quantité durablement disponible",
  collectable: "Quantité réellement collectable", used_elsewhere: "Quantité déjà utilisée par d’autres activités", deliverable: "Quantité livrable au site énergétique",
} as const;
export type AvailabilityKey = keyof typeof AVAILABILITY_LEVELS;
export const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"] as const;

export type BiomassValues = {
  quantity: number | null; unit: string | null; moisture: number | null; lhv: number | null; lhvBasis: string | null; fraction: number | null;
  potential: number | null; potentialSource: string | null; periodStart: string | null; periodEnd: string | null;
  levels: Partial<Record<AvailabilityKey, number | null | undefined>>; seasonal: number[];
};

/** Blocking errors: impossible or untraceable values only. */
export function biomassErrors(v: BiomassValues): string[] {
  const e: string[] = [];
  if (v.quantity !== null && v.quantity < 0) e.push("La quantité disponible doit être ≥ 0.");
  if (!v.unit) e.push("L’unité de quantité est obligatoire.");
  if (v.moisture !== null && (v.moisture < 0 || v.moisture > 100)) e.push("L’humidité doit être comprise entre 0 et 100 %.");
  if (v.lhv !== null && v.lhv < 0) e.push("Le PCI doit être ≥ 0 MJ/kg.");
  if (v.lhv !== null && !v.lhvBasis) e.push("Précisez si le PCI porte sur la matière telle que reçue ou sèche.");
  if (v.fraction !== null && (v.fraction < 0 || v.fraction > 100)) e.push("La fraction exploitable doit être comprise entre 0 et 100 %.");
  if (v.potential !== null && v.potential < 0) e.push("Le potentiel énergétique doit être ≥ 0.");
  if (v.potential !== null && !(v.potentialSource && v.potentialSource.trim().length >= 2)) e.push("Un potentiel énergétique doit citer la source qui le fournit.");
  if (v.periodStart && v.periodEnd && v.periodEnd < v.periodStart) e.push("La fin de période précède le début.");
  for (const [k, val] of Object.entries(v.levels)) if (val !== null && val !== undefined && val < 0) e.push(`${AVAILABILITY_LEVELS[k as AvailabilityKey]} doit être ≥ 0.`);
  if (v.seasonal.some((m) => m < 0 || m > 12)) e.push("Saisonnalité : mois invalides.");
  return e;
}

/** Non-blocking warnings: unusual but possible. Values are never modified. */
export function biomassWarnings(v: BiomassValues): string[] {
  const w: string[] = [];
  if (v.lhv !== null && v.lhv > 25) w.push("PCI > 25 MJ/kg : inhabituel pour une biomasse, à vérifier (unité, base de mesure).");
  if (v.lhv !== null && v.lhv === 0) w.push("PCI nul : à vérifier.");
  if (v.lhv !== null && v.lhvBasis === "dry" && v.moisture === null) w.push("PCI sur matière sèche sans humidité renseignée : non comparable à une matière reçue.");
  if (v.moisture !== null && v.moisture > 70) w.push("Humidité > 70 % : valorisation thermique à vérifier selon la technologie.");
  const l = v.levels;
  const gt = (a: AvailabilityKey, b: AvailabilityKey) => l[a] != null && l[b] != null && l[a]! > l[b]!;
  if (gt("technical", "theoretical")) w.push("Potentiel technique supérieur au potentiel théorique : à vérifier.");
  if (gt("collectable", "technical")) w.push("Quantité collectable supérieure au potentiel technique : à vérifier.");
  if (gt("deliverable", "collectable")) w.push("Quantité livrable supérieure à la quantité collectable : à vérifier.");
  if (v.quantity !== null && v.unit === "t/mois") w.push("Quantité mensuelle : non comparable aux jeux annuels (aucune conversion appliquée).");
  return w;
}

type Comparable = { id: string; type: string; unit: string; lhvBasis: string | null; start: string | null; end: string | null; quantity: number | null };
/**
 * Returns a total only when rows can be summed without double counting: same unit and
 * PCI basis, distinct types, dated periods that do not overlap within a type. Otherwise returns the reason.
 */
export function safeTotal(rows: Comparable[]): { total: number; unit: string } | { reason: string } {
  const r = rows.filter((x) => x.quantity !== null);
  if (r.length < 2) return { reason: "Moins de deux quantités renseignées." };
  const units = new Set(r.map((x) => x.unit));
  if (units.size > 1) return { reason: "Unités différentes : aucun total calculé." };
  if (new Set(r.map((x) => x.lhvBasis ?? "")).size > 1) return { reason: "Bases de mesure différentes : aucun total calculé." };
  if (r.some((x) => !x.start || !x.end)) return { reason: "Périodes non datées : risque de double comptage, aucun total calculé." };
  const types = new Set(r.map((x) => x.type));
  if (types.size < r.length) return { reason: "Plusieurs jeux du même type (sources ou périodes concurrentes) : aucun total calculé." };
  const starts = new Set(r.map((x) => `${x.start}|${x.end}`));
  if (starts.size > 1) return { reason: "Périodes différentes : aucun total calculé." };
  return { total: r.reduce((s, x) => s + x.quantity!, 0), unit: [...units][0]! };
}
