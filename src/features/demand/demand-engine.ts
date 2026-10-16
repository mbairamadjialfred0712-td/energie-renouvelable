// Moteur pur et vérifiable de la demande énergétique (version demand-engine/1.0.0).
// Aucun dimensionnement, aucun facteur de simultanéité inventé.

export const DEMAND_ENGINE_VERSION = "demand-engine/1.0.0";
export const MONTH_DAYS = 30;

export const CATEGORIES = {
  residentiel: "Résidentiel", commercial: "Commercial", industriel: "Industriel", agricole: "Agricole",
  sante: "Établissement de santé", education: "Établissement scolaire ou universitaire", administration: "Administration publique",
  eau: "Infrastructure d’eau et d’assainissement", telecom: "Infrastructure de télécommunication", eclairage: "Éclairage public",
  humanitaire: "Site humanitaire ou communautaire", autre: "Autre",
} as const;
export type Category = keyof typeof CATEGORIES;

export const STATUSES = { unverified: "Non vérifié", in_review: "À examiner", validated: "Validé", rejected: "Rejeté", archived: "Archivé" } as const;
export type DemandStatus = keyof typeof STATUSES;
export const METHODS = { mesure: "Mesure", facture: "Facture", releve: "Relevé terrain", inventaire: "Inventaire d’équipements", estimation: "Estimation", autre: "Autre" } as const;
export const PRIORITIES = { critique: "Critique", importante: "Importante", flexible: "Flexible" } as const;
export const SUPPLY_SOURCES = { reseau: "Réseau", groupe: "Groupe électrogène", solaire: "Solaire", eolien: "Éolien", biomasse: "Biomasse", hybride: "Système hybride", aucune: "Absence d’alimentation" } as const;

export type Equipment = {
  name: string; category: string | null; quantity: number | null; unit_power: number | null; power_unit: "W" | "kW";
  hours_per_day: number | null; days_per_week: number | null; usage_factor: number | null;
  usage_factor_definition: string | null; usage_factor_source: string | null; priority: keyof typeof PRIORITIES; notes: string | null;
};
export type Measurement = { start: string; end: string; energy: number; unit: "Wh" | "kWh"; peak_kw: number | null; notes: string | null };
export type ProfileSlot = { start_hour: number; end_hour: number; power_kw: number; nature: "measured" | "estimated" };

export function equipmentErrors(e: Equipment, i: number): string[] {
  const p = `Équipement ${i + 1}${e.name ? ` (${e.name})` : ""}`;
  const out: string[] = [];
  if (!e.name.trim()) out.push(`${p} : le nom est obligatoire.`);
  if (e.quantity == null || !(e.quantity > 0)) out.push(`${p} : la quantité doit être strictement positive.`);
  if (e.unit_power == null || e.unit_power < 0) out.push(`${p} : la puissance unitaire doit être positive ou nulle.`);
  if (e.hours_per_day == null || e.hours_per_day < 0 || e.hours_per_day > 24) out.push(`${p} : la durée doit être comprise entre 0 et 24 h/jour.`);
  if (e.days_per_week == null || e.days_per_week < 0 || e.days_per_week > 7) out.push(`${p} : les jours d’utilisation doivent être compris entre 0 et 7 par semaine.`);
  if (e.usage_factor != null) {
    if (!(e.usage_factor > 0 && e.usage_factor <= 1)) out.push(`${p} : le facteur d’utilisation doit être compris entre 0 (exclu) et 1.`);
    if (!e.usage_factor_definition?.trim() || !e.usage_factor_source?.trim()) out.push(`${p} : un facteur d’utilisation exige sa définition et sa source.`);
  }
  return out;
}

/** kWh pour un jour d'utilisation = Q × P(kW) × h × (facteur si documenté). P en W ÷ 1 000. */
export function equipmentEnergy(e: Equipment) {
  if (equipmentErrors(e, 0).length) return null;
  const kw = e.power_unit === "W" ? e.unit_power! / 1000 : e.unit_power!;
  const perUseDay = e.quantity! * kw * e.hours_per_day! * (e.usage_factor ?? 1);
  const avgDaily = (perUseDay * e.days_per_week!) / 7;
  return { perUseDayKwh: perUseDay, avgDailyKwh: avgDaily, monthlyKwh: avgDaily * MONTH_DAYS, installedKw: e.quantity! * kw };
}

export function inventoryTotal(rows: Equipment[]) {
  if (!rows.length) return { complete: false as const, reason: "Aucun équipement saisi." };
  const items = rows.map(equipmentEnergy);
  if (items.some((x) => x === null)) return { complete: false as const, reason: "Au moins une ligne d’équipement est incomplète ou incohérente : aucun total n’est calculé." };
  const ok = items as NonNullable<ReturnType<typeof equipmentEnergy>>[];
  const sum = (k: keyof (typeof ok)[number]) => ok.reduce((s, x) => s + x[k], 0);
  return { complete: true as const, avgDailyKwh: sum("avgDailyKwh"), monthlyKwh: sum("monthlyKwh"), installedKw: sum("installedKw") };
}

export const ASSUMPTIONS = [
  "Énergie d’un jour d’usage (kWh) = quantité × puissance unitaire (W) × durée (h/jour) ÷ 1 000 ; saisie en kW : sans division.",
  "Moyenne journalière = énergie d’un jour d’usage × jours d’utilisation par semaine ÷ 7.",
  `Estimation mensuelle = moyenne journalière × ${MONTH_DAYS} jours (hypothèse fixe).`,
  "Facteur d’utilisation appliqué uniquement s’il est saisi avec sa définition et sa source ; aucun facteur de simultanéité.",
  "La puissance installée (somme des puissances nominales) n’est pas la puissance réellement appelée.",
  "L’estimation par inventaire d’équipements ne remplace pas une campagne de mesure.",
];

const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000) + 1;
export function measurementErrors(m: Measurement[]): string[] {
  const out: string[] = [];
  m.forEach((x, i) => {
    if (!x.start || !x.end || Number.isNaN(Date.parse(x.start)) || Number.isNaN(Date.parse(x.end))) out.push(`Mesure ${i + 1} : dates de début et de fin obligatoires.`);
    else if (x.end < x.start) out.push(`Mesure ${i + 1} : la fin précède le début.`);
    if (!(x.energy >= 0)) out.push(`Mesure ${i + 1} : l’énergie mesurée doit être positive ou nulle.`);
    if (x.peak_kw != null && x.peak_kw < 0) out.push(`Mesure ${i + 1} : la puissance maximale doit être positive.`);
  });
  return out;
}
export function overlappingMeasurements(m: Measurement[]) {
  const s = [...m].sort((a, b) => a.start.localeCompare(b.start));
  for (let i = 1; i < s.length; i++) if (s[i].start <= s[i - 1].end) return true;
  return false;
}
/** Moyenne journalière d'une mesure : conversion explicite Wh → kWh (÷ 1 000), divisée par le nombre de jours inclusifs. */
export function measurementDaily(x: Measurement) {
  const kwh = x.unit === "Wh" ? x.energy / 1000 : x.energy;
  const n = days(x.start, x.end);
  return n > 0 ? { kwh, days: n, avgDailyKwh: kwh / n } : null;
}

export function profileErrors(p: ProfileSlot[]): string[] {
  const out: string[] = [];
  const s = [...p].sort((a, b) => a.start_hour - b.start_hour);
  s.forEach((x, i) => {
    if (!(x.start_hour >= 0 && x.end_hour <= 24 && x.start_hour < x.end_hour)) out.push(`Créneau ${i + 1} : heures invalides (0 ≤ début < fin ≤ 24).`);
    if (!(x.power_kw >= 0)) out.push(`Créneau ${i + 1} : puissance négative.`);
    if (i > 0 && x.start_hour < s[i - 1].end_hour) out.push(`Créneau ${i + 1} : chevauche le créneau précédent.`);
  });
  return out;
}

/** Contrat d'entrée préparé pour le futur moteur Python (aucun appel n'est effectué). */
export function buildEngineInput(d: { id: string; locality_id: string; site_id: string | null; period_start: string | null; period_end: string | null; status: string; equipment: Equipment[]; measurements: Measurement[]; daily_profile: ProfileSlot[]; assumptions: string | null; data_time_basis: string | null }) {
  return {
    contract: "demand-input/1.0.0", demand_id: d.id, location: { locality_id: d.locality_id, site_id: d.site_id },
    reference_period: { start: d.period_start, end: d.period_end }, validation_status: d.status,
    equipment: d.equipment.map((e) => ({ ...e, unit_power_unit: e.power_unit })), measured_consumption: d.measurements,
    load_profile: { unit: "kW", slots: d.daily_profile }, assumptions: d.assumptions, data_time_basis: d.data_time_basis, engine: DEMAND_ENGINE_VERSION,
  };
}
