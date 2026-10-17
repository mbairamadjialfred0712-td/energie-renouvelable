// Fiches techniques batteries : champs, contrôles et formules indicatives (battery-model/1.0.0).
// Aucune simulation de charge, d'autonomie ou de vieillissement.

export const CHEMISTRIES = { lfp: "Lithium-ion LFP", nmc: "Lithium-ion NMC", lead_acid: "Plomb-acide", lead_carbon: "Plomb-carbone", sodium_ion: "Sodium-ion", other: "Autre technologie" } as const;
export const STATUSES = { unverified: "Non vérifié", in_review: "À examiner", validated: "Validé", rejected: "Rejeté", archived: "Archivé" } as const;
export const METHODS = { fabricant: "Fabricant", fiche_technique: "Fiche technique", mesure: "Mesure", saisie: "Saisie manuelle", estimation: "Estimation", autre: "Autre" } as const;
export const APPLICATIONS = { residentiel: "Résidentiel", tertiaire: "Commercial / tertiaire", industriel: "Industriel", micro_reseau: "Micro-réseau / site isolé", reseau: "Réseau / utility", autre: "Autre" } as const;

export type Kind = "num" | "int" | "pct" | "text" | "long" | "date" | "bool" | "url";
export type FieldDef = { key: string; label: string; unit?: string; kind: Kind; group: string; min?: number };
export const GROUPS = ["Identification", "Caractéristiques électriques", "Énergie utilisable et SOC", "Rendements et limites", "Durée de vie", "Installation et sécurité", "Coûts", "Sources et validation"] as const;
const g = (group: (typeof GROUPS)[number], defs: Omit<FieldDef, "group">[]) => defs.map((d) => ({ ...d, group }));

export const FIELDS: FieldDef[] = [
  ...g("Identification", [{ key: "product_ref", label: "Référence produit", kind: "text" }, { key: "chemistry_detail", label: "Précision de la technologie", kind: "text" }, { key: "description", label: "Description", kind: "long" }]),
  ...g("Caractéristiques électriques", [
    { key: "nominal_voltage_v", label: "Tension nominale", unit: "V", kind: "num" }, { key: "capacity_ah", label: "Capacité nominale", unit: "Ah", kind: "num" },
    { key: "energy_kwh", label: "Énergie nominale", unit: "kWh", kind: "num" }, { key: "max_charge_kw", label: "Puissance max. de charge", unit: "kW", kind: "num", min: 0 },
    { key: "max_discharge_kw", label: "Puissance max. de décharge", unit: "kW", kind: "num", min: 0 }, { key: "max_charge_a", label: "Courant max. de charge", unit: "A", kind: "num", min: 0 },
    { key: "max_discharge_a", label: "Courant max. de décharge", unit: "A", kind: "num", min: 0 }, { key: "voltage_min_v", label: "Tension minimale", unit: "V", kind: "num", min: 0 },
    { key: "voltage_max_v", label: "Tension maximale", unit: "V", kind: "num", min: 0 }]),
  ...g("Énergie utilisable et SOC", [
    { key: "dod_pct", label: "Profondeur de décharge (DoD)", unit: "%", kind: "pct" }, { key: "soc_min_pct", label: "SOC minimum", unit: "%", kind: "pct" },
    { key: "soc_max_pct", label: "SOC maximum", unit: "%", kind: "pct" }, { key: "usable_kwh", label: "Capacité utilisable déclarée", unit: "kWh", kind: "num" },
    { key: "warranty_limits", label: "Limites liées à la garantie", kind: "text" }]),
  ...g("Rendements et limites", [
    { key: "rte_pct", label: "Rendement aller-retour", unit: "%", kind: "pct" }, { key: "charge_eff_pct", label: "Rendement de charge", unit: "%", kind: "pct" },
    { key: "discharge_eff_pct", label: "Rendement de décharge", unit: "%", kind: "pct" }, { key: "temp_min_c", label: "Température min. de fonctionnement", unit: "°C", kind: "num" },
    { key: "temp_max_c", label: "Température max. de fonctionnement", unit: "°C", kind: "num" }, { key: "temp_recommended_c", label: "Température recommandée", unit: "°C", kind: "num" },
    { key: "cooling", label: "Ventilation / refroidissement", kind: "text" }, { key: "has_bms", label: "BMS intégré", kind: "bool" }, { key: "safety_notes", label: "Contraintes de sécurité", kind: "long" }]),
  ...g("Durée de vie", [
    { key: "cycles", label: "Nombre de cycles annoncé", unit: "cycles", kind: "int" }, { key: "cycle_conditions", label: "Conditions des cycles (DoD, T°, régime)", kind: "text" },
    { key: "calendar_years", label: "Durée de vie calendaire", unit: "ans", kind: "num" }, { key: "eol_capacity_pct", label: "Capacité résiduelle garantie", unit: "%", kind: "pct" },
    { key: "degradation_pct_year", label: "Dégradation annuelle documentée", unit: "%/an", kind: "pct" }, { key: "degradation_source", label: "Source de la dégradation", kind: "text" },
    { key: "warranty", label: "Conditions de garantie", kind: "long" }]),
  ...g("Installation et sécurité", [
    { key: "mass_kg", label: "Masse", unit: "kg", kind: "num" }, { key: "length_mm", label: "Longueur", unit: "mm", kind: "num" }, { key: "width_mm", label: "Largeur", unit: "mm", kind: "num" },
    { key: "height_mm", label: "Hauteur", unit: "mm", kind: "num" }, { key: "ip_rating", label: "Indice IP", kind: "text" }, { key: "installation_location", label: "Installation intérieure / extérieure", kind: "text" },
    { key: "certifications", label: "Normes et certifications déclarées", kind: "text" }, { key: "installation_notes", label: "Contraintes d’installation et maintenance", kind: "long" }]),
  ...g("Coûts", [
    { key: "price", label: "Prix d’achat (par unité)", unit: "devise", kind: "num", min: 0 }, { key: "currency", label: "Devise", kind: "text" }, { key: "price_date", label: "Date du prix", kind: "date" },
    { key: "install_cost", label: "Coût d’installation", unit: "devise", kind: "num", min: 0 }, { key: "replacement_cost", label: "Coût de remplacement", unit: "devise", kind: "num", min: 0 },
    { key: "maintenance_cost", label: "Coût de maintenance", unit: "devise/an", kind: "num", min: 0 }, { key: "cost_source", label: "Source du prix", kind: "text" }]),
  ...g("Sources et validation", [
    { key: "doc_url", label: "Lien vers la documentation", kind: "url" }, { key: "sheet_version", label: "Version de la fiche", kind: "text" },
    { key: "published_on", label: "Date de publication", kind: "date" }, { key: "consulted_on", label: "Date de consultation", kind: "date" },
    { key: "page_ref", label: "Référence page / tableau", kind: "text" }, { key: "comments", label: "Commentaires de l’ingénieur", kind: "long" }]),
];
export const NUMERIC = FIELDS.filter((f) => ["num", "int", "pct"].includes(f.kind));

type Opt = "chemistry_detail" | "published_on" | "consulted_on" | "currency" | "doc_url" | "application" | "acquisition_method" | "cycle_conditions" | "degradation_source" | "product_ref" | "usable_kwh" | "energy_kwh" | "nominal_voltage_v" | "cycles" | "owner_id";
export type Sheet = Record<string, any> & { [K in Opt]?: any } & { name: string; manufacturer: string; chemistry: keyof typeof CHEMISTRIES; source: string; status: keyof typeof STATUSES };
const v = (s: Sheet, k: string): number | null => (s[k] == null || s[k] === "" ? null : Number(s[k]));

export function sheetErrors(s: Sheet): string[] {
  const e: string[] = [];
  if (!s.name?.trim()) e.push("Le nom commercial est obligatoire.");
  if (!s.manufacturer?.trim()) e.push("Le fabricant est obligatoire.");
  if (!s.source?.trim()) e.push("La source documentaire est obligatoire.");
  if (s.chemistry === "other" && !s.chemistry_detail?.trim()) e.push("Précisez la technologie pour « Autre ».");
  for (const f of NUMERIC) {
    const x = v(s, f.key); if (x == null) continue;
    if (!Number.isFinite(x)) e.push(`${f.label} : valeur numérique invalide.`);
    else if (f.kind === "pct" && (x < 0 || x > 100)) e.push(`${f.label} doit être compris entre 0 et 100 %.`);
    else if (f.kind === "int" && (!Number.isInteger(x) || x <= 0)) e.push(`${f.label} doit être un entier positif.`);
    else if (!f.key.startsWith("temp_") && (f.min === 0 ? x < 0 : x <= 0)) e.push(`${f.label} doit être ${f.min === 0 ? "positif ou nul" : "strictement positif"}.`);
  }
  const lo = v(s, "soc_min_pct"), hi = v(s, "soc_max_pct");
  if (lo != null && hi != null && lo >= hi) e.push("Le SOC minimum doit être strictement inférieur au SOC maximum.");
  const tl = v(s, "temp_min_c"), th = v(s, "temp_max_c");
  if (tl != null && th != null && tl > th) e.push("La température minimale dépasse la température maximale.");
  const vl = v(s, "voltage_min_v"), vh = v(s, "voltage_max_v");
  if (vl != null && vh != null && vl > vh) e.push("La tension minimale dépasse la tension maximale.");
  if (s.published_on && s.consulted_on && s.consulted_on < s.published_on) e.push("La date de consultation précède la date de publication.");
  if (["price", "install_cost", "replacement_cost", "maintenance_cost"].some((k) => v(s, k) != null) && !s.currency?.trim()) e.push("Indiquez la devise des coûts.");
  if (s.doc_url && !/^https?:\/\//.test(s.doc_url)) e.push("Le lien de documentation doit commencer par http:// ou https://.");
  return e;
}

/** Contrôle indicatif : V × Ah ÷ 1 000 comparé à l'énergie déclarée. Ne remplace jamais la donnée fabricant. */
export function energyCheck(s: Sheet) {
  const V = v(s, "nominal_voltage_v"), Ah = v(s, "capacity_ah"), E = v(s, "energy_kwh");
  if (V == null || Ah == null || E == null) return null;
  const computed = (V * Ah) / 1000;
  return { computed, declared: E, gapPct: (Math.abs(computed - E) / E) * 100 };
}
/** Énergie utilisable estimée = énergie nominale × DoD, uniquement si la capacité utilisable n'est pas déclarée. */
export function usableEstimate(s: Sheet) {
  if (v(s, "usable_kwh") != null) return null;
  const E = v(s, "energy_kwh"), dod = v(s, "dod_pct");
  return E != null && dod != null ? { kwh: (E * dod) / 100, formula: "Énergie nominale × DoD ÷ 100 (seule réduction appliquée)" } : null;
}
export function costPerKwh(s: Sheet) {
  const p = v(s, "price"); if (p == null || !s.currency) return [];
  const out: { label: string; value: number }[] = [];
  const E = v(s, "energy_kwh"), U = v(s, "usable_kwh");
  if (E) out.push({ label: `${s.currency}/kWh nominal`, value: p / E });
  if (U) out.push({ label: `${s.currency}/kWh utilisable déclaré`, value: p / U });
  return out;
}

export function sheetWarnings(s: Sheet): string[] {
  const w: string[] = [];
  const c = energyCheck(s);
  if (c && c.gapPct > 5) w.push(`Tension × capacité ÷ 1 000 = ${c.computed.toFixed(2)} kWh, écart de ${c.gapPct.toFixed(1)} % avec l’énergie déclarée (${c.declared} kWh). Vérifiez la fiche.`);
  const dod = v(s, "dod_pct"), lo = v(s, "soc_min_pct"), hi = v(s, "soc_max_pct");
  if (dod != null && lo != null && hi != null && hi > lo && Math.abs(hi - lo - dod) > 1) w.push(`La plage SOC (${hi - lo} %) ne correspond pas au DoD déclaré (${dod} %). Ces deux contraintes ne doivent pas être cumulées.`);
  const E = v(s, "energy_kwh"), U = v(s, "usable_kwh");
  if (E != null && U != null && U > E) w.push("La capacité utilisable déclarée dépasse l’énergie nominale.");
  const r = v(s, "rte_pct"), ce = v(s, "charge_eff_pct"), de = v(s, "discharge_eff_pct");
  if (r != null && ce != null && de != null && r > (ce * de) / 100 + 1) w.push("Le rendement aller-retour dépasse le produit des rendements de charge et de décharge.");
  const V = v(s, "nominal_voltage_v");
  for (const [kw, a, l] of [["max_charge_kw", "max_charge_a", "charge"], ["max_discharge_kw", "max_discharge_a", "décharge"]] as const) {
    const P = v(s, kw), I = v(s, a);
    if (P != null && I != null && V != null && Math.abs((V * I) / 1000 - P) / Math.max(P, 1e-9) > 0.2) w.push(`Puissance de ${l} (${P} kW) peu cohérente avec tension × courant (${((V * I) / 1000).toFixed(2)} kW).`);
  }
  const tr = v(s, "temp_recommended_c"), tl = v(s, "temp_min_c"), th = v(s, "temp_max_c");
  if (tr != null && ((tl != null && tr < tl) || (th != null && tr > th))) w.push("La température recommandée est hors de la plage de fonctionnement.");
  if (v(s, "cycles") != null && !s.cycle_conditions?.trim()) w.push("Le nombre de cycles n’est pas accompagné de ses conditions (DoD, température, régime).");
  if (v(s, "degradation_pct_year") != null && !s.degradation_source?.trim()) w.push("La dégradation annuelle n’a pas de source : elle sera traitée comme une hypothèse.");
  return w;
}

/** Conditions supplémentaires pour passer une fiche au statut « validé » (battery-model/1.0.0). */
export function validationGateErrors(s: Sheet): string[] {
  const e: string[] = [];
  if (!s.acquisition_method) e.push("La méthode d’obtention des caractéristiques est obligatoire pour valider une fiche.");
  if (s.nominal_voltage_v == null && s.capacity_ah == null && s.energy_kwh == null) e.push("Valider exige au moins une caractéristique électrique documentée (tension, capacité ou énergie nominale).");
  if (s.chemistry === "other" && !s.chemistry_detail?.trim()) e.push("Précisez la technologie pour « Autre » avant validation.");
  return e;
}
/** Transitions de statut autorisées (hors contrôle de rôle, effectué côté serveur et base). */
export function statusChangeErrors(s: Sheet, from: keyof typeof STATUSES, to: keyof typeof STATUSES): string[] {
  if (from === to) return [];
  if (to === "validated") return [...sheetErrors(s), ...validationGateErrors(s)];
  if (from === "validated" || from === "rejected") {
    if (to === "unverified") return ["Une fiche validée ou rejetée ne peut pas redevenir « Non vérifié » : utilisez « À examiner » ou « Archivé »."];
  }
  return [];
}

export type StorageConfig = { module_count: number | null; series_count: number | null; parallel_count: number | null; soc_min_pct: number | null; soc_max_pct: number | null; rte_pct: number | null; charge_eff_pct: number | null; discharge_eff_pct: number | null; usable_energy_limit_kwh: number | null; retained_cost: number | null; currency: string | null };
export function configErrors(c: StorageConfig): string[] {
  const e: string[] = [];
  if (c.module_count == null || !Number.isInteger(c.module_count) || c.module_count <= 0) e.push("Le nombre de modules doit être un entier positif.");
  for (const k of ["series_count", "parallel_count"] as const) if (c[k] != null && (!Number.isInteger(c[k]) || c[k]! <= 0)) e.push("Série et parallèle doivent être des entiers positifs.");
  if (c.series_count != null && c.parallel_count != null && c.module_count != null && c.series_count * c.parallel_count !== c.module_count) e.push("Série × parallèle doit être égal au nombre de modules.");
  for (const k of ["soc_min_pct", "soc_max_pct", "rte_pct", "charge_eff_pct", "discharge_eff_pct"] as const) if (c[k] != null && (c[k]! < 0 || c[k]! > 100)) e.push("Les pourcentages doivent être compris entre 0 et 100.");
  if (c.soc_min_pct != null && c.soc_max_pct != null && c.soc_min_pct >= c.soc_max_pct) e.push("Le SOC minimum doit être strictement inférieur au SOC maximum.");
  if (c.usable_energy_limit_kwh != null && c.usable_energy_limit_kwh <= 0) e.push("La limite d’énergie utilisable doit être positive.");
  if (c.retained_cost != null && (c.retained_cost < 0 || !c.currency)) e.push("Un coût retenu doit être positif et accompagné de sa devise.");
  return e;
}
/** Totaux nominaux = nombre de modules × valeurs de la fiche ; puissance seulement si la limite par module est connue. */
export function configTotals(c: StorageConfig, s: Sheet) {
  const n = c.module_count ?? 0, E = v(s, "energy_kwh"), Pc = v(s, "max_charge_kw"), Pd = v(s, "max_discharge_kw");
  return { energyKwh: E != null && n ? n * E : null, chargeKw: Pc != null && n ? n * Pc : null, dischargeKw: Pd != null && n ? n * Pd : null };
}
