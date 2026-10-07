// Browser-safe model of a solar dataset: labels, units, help texts, validation rules.
export const IRRADIANCE_UNITS = ["kWh/m²/jour", "kWh/m²/an"] as const;
export const SUNSHINE_UNITS = ["h/jour", "h/an"] as const;
export type IrradianceUnit = (typeof IRRADIANCE_UNITS)[number];
export type SunshineUnit = (typeof SUNSHINE_UNITS)[number];

export const DATA_NATURES = { measured: "Donnée mesurée", imported: "Donnée importée", api: "Donnée API", estimate: "Estimation", assumption: "Hypothèse" } as const;
export type DataNature = keyof typeof DATA_NATURES;
export const SOLAR_STATUSES = { unverified: "Non vérifiée", in_review: "En vérification", validated: "Validée", rejected: "Rejetée", archived: "Archivée" } as const;
export type SolarStatus = keyof typeof SOLAR_STATUSES;

export const HELP: Record<string, string> = {
  ghi: "Global Horizontal Irradiance — rayonnement solaire global reçu sur une surface horizontale.",
  dni: "Direct Normal Irradiance — rayonnement direct reçu perpendiculairement aux rayons solaires. Essentiel pour le solaire thermique / CSP.",
  dhi: "Diffuse Horizontal Irradiance — composante diffuse du rayonnement reçue sur une surface horizontale.",
  annual: "Irradiation globale cumulée sur l’année, telle que fournie par la source.",
  temp: "La température influence notamment les performances des modules photovoltaïques.",
  sunshine: "Durée d’ensoleillement : n’est PAS équivalente à l’irradiation solaire.",
};

export type SolarValues = {
  ghi: number | null; dni: number | null; dhi: number | null; annual: number | null;
  tavg: number | null; tmin: number | null; tmax: number | null; sunshine: number | null;
  ghiUnit: IrradianceUnit; dniUnit: IrradianceUnit; dhiUnit: IrradianceUnit; sunshineUnit: SunshineUnit;
  periodStart: string | null; periodEnd: string | null;
};

/** Blocking errors: impossible values only. */
export function solarErrors(v: SolarValues): string[] {
  const e: string[] = [];
  for (const [k, label] of [["ghi", "GHI"], ["dni", "DNI"], ["dhi", "DHI"], ["annual", "Irradiation annuelle"], ["sunshine", "Ensoleillement"]] as const)
    if (v[k] !== null && v[k]! < 0) e.push(`${label} doit être ≥ 0.`);
  if (v.sunshine !== null && v.sunshineUnit === "h/jour" && v.sunshine > 24) e.push("Ensoleillement > 24 h/jour impossible.");
  if (v.sunshine !== null && v.sunshineUnit === "h/an" && v.sunshine > 8784) e.push("Ensoleillement > 8 784 h/an impossible.");
  if (v.tmin !== null && v.tmax !== null && v.tmin > v.tmax) e.push("La température minimale dépasse la maximale.");
  if (v.tavg !== null && v.tmin !== null && v.tavg < v.tmin) e.push("La température moyenne est inférieure à la minimale.");
  if (v.tavg !== null && v.tmax !== null && v.tavg > v.tmax) e.push("La température moyenne est supérieure à la maximale.");
  if (v.periodStart && v.periodEnd && v.periodEnd < v.periodStart) e.push("La fin de période précède le début.");
  return e;
}

/** Non-blocking warnings: unusual but possible values. Data is never modified. */
export function solarWarnings(v: SolarValues): string[] {
  const w: string[] = [];
  const daily = (x: number | null, u: IrradianceUnit) => (x === null ? null : u === "kWh/m²/jour" ? x : null);
  const g = daily(v.ghi, v.ghiUnit), n = daily(v.dni, v.dniUnit), d = daily(v.dhi, v.dhiUnit);
  if (g !== null && g > 9) w.push("GHI > 9 kWh/m²/jour : valeur inhabituelle, à vérifier.");
  if (n !== null && n > 12) w.push("DNI > 12 kWh/m²/jour : valeur inhabituelle, à vérifier.");
  if (g !== null && d !== null && d > g) w.push("DHI supérieur au GHI : à vérifier.");
  if (v.ghi !== null && v.ghiUnit === "kWh/m²/an" && v.ghi < 50) w.push("GHI annuel très faible : l’unité est-elle bien kWh/m²/an ?");
  if (v.ghi !== null && v.ghiUnit === "kWh/m²/jour" && v.ghi > 50) w.push("GHI journalier très élevé : l’unité est-elle bien kWh/m²/jour ?");
  for (const [k, l] of [["tavg", "moyenne"], ["tmin", "minimale"], ["tmax", "maximale"]] as const)
    if (v[k] !== null && (v[k]! < -60 || v[k]! > 60)) w.push(`Température ${l} hors −60/+60 °C : à vérifier.`);
  if (v.ghiUnit !== v.dniUnit || v.ghiUnit !== v.dhiUnit) w.push("GHI, DNI et DHI n’ont pas la même unité : aucune conversion n’est faite.");
  return w;
}

/** Standardised input contract for the future Python PV/CSP engine. No computation here. */
export type SolarResourceInput = {
  datasetId: string; localityId: string; siteId: string | null;
  latitude: number | null; longitude: number | null;
  ghi: { value: number | null; unit: IrradianceUnit }; dni: { value: number | null; unit: IrradianceUnit }; dhi: { value: number | null; unit: IrradianceUnit };
  temperatureC: { avg: number | null; min: number | null; max: number | null };
  period: { start: string | null; end: string | null; label: string | null };
  source: string; reference: string | null; dataNature: DataNature; quality: string | null; status: SolarStatus;
};

/** Future import pipeline contract (CSV / Excel / PDF / API). Extracted data always starts "unverified". */
export type SolarImportStep = "source" | "extraction" | "normalisation" | "unit_check" | "validation" | "preview" | "confirmation" | "stored";
export type SolarImportOrigin = "csv" | "excel" | "pdf" | "api";
