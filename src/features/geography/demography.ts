/**
 * Présentation des données démographiques territoriales.
 * Règles : une projection n'est jamais présentée comme un recensement ;
 * une donnée absente s'affiche « Donnée non disponible » ; toute valeur
 * affichée porte son année, sa source et sa méthode.
 */

export const POPULATION_METHODS = {
  recensement: "Recensement",
  estimation: "Estimation",
  projection: "Projection",
} as const;
export type PopulationMethod = keyof typeof POPULATION_METHODS;

export const POPULATION_NOT_AVAILABLE = "Donnée non disponible";

/** Libellé complet d'une population nationale, ou mention d'absence. Jamais de valeur inventée. */
export function populationLabel(row: {
  population: number | null;
  population_year: number | null;
  population_method: string | null;
}): string {
  if (row.population === null || row.population === undefined) return POPULATION_NOT_AVAILABLE;
  const value = `${new Intl.NumberFormat("fr-FR").format(row.population)} hab.`;
  const year = row.population_year ? ` (${row.population_year})` : "";
  return `${value}${year}`;
}

/**
 * Avertissement à afficher sous une population nationale.
 * Une projection ou une estimation n'est pas un recensement ; une donnée
 * de plus de 5 ans est signalée comme ancienne. Retourne null si rien à signaler.
 */
export function populationWarning(
  row: { population: number | null; population_year: number | null; population_method: string | null },
  currentYear: number,
): string | null {
  if (row.population === null || row.population === undefined) return null;
  const warnings: string[] = [];
  if (row.population_method === "projection") {
    warnings.push("projection démographique, pas un recensement");
  } else if (row.population_method === "estimation") {
    warnings.push("estimation, pas un recensement");
  } else if (!row.population_method) {
    warnings.push("méthode non documentée");
  }
  if (row.population_year !== null && row.population_year !== undefined && currentYear - row.population_year > 5) {
    warnings.push(`donnée de ${row.population_year}, ancienne`);
  }
  return warnings.length ? `Attention : ${warnings.join(" ; ")}.` : null;
}
