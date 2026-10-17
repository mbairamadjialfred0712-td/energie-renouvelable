import { z } from "zod";

export const HYBRID_VERSION = "preparation-1.0";
export const TECHNOLOGIES = { photovoltaic: "Photovoltaïque", wind: "Éolien", biomass: "Biomasse", csp: "CSP", battery: "Batterie" } as const;
export const technologySchema = z.enum(["photovoltaic", "wind", "biomass", "csp", "battery"]);
export type Technology = z.infer<typeof technologySchema>;
const optionalId = z.string().uuid().nullable();
export const hybridConfigSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(3).max(200),
  projectId: optionalId,
  siteId: optionalId,
  demandId: optionalId,
  description: z.string().trim().max(4000),
  assumptions: z.string().trim().max(4000),
  constraints: z.string().trim().max(4000),
  reviewRequested: z.boolean(),
  components: z.array(z.object({
    technology: technologySchema,
    simulationId: optionalId,
    equipmentId: optionalId,
    weatherId: optionalId,
    power: z.number().finite().positive().nullable(),
    powerUnit: z.enum(["kW", "kWc", "kWh", "kWth"]),
    parameterSource: z.string().trim().max(500),
  }).strict()).max(5),
}).strict().superRefine((c, ctx) => {
  if (new Set(c.components.map(x => x.technology)).size !== c.components.length) ctx.addIssue({ code: "custom", message: "Une seule association par technologie." });
});
export type HybridConfig = z.infer<typeof hybridConfigSchema>;
export const emptyConfig = (): HybridConfig => ({ id: null, name: "", projectId: null, siteId: null, demandId: null, description: "", assumptions: "", constraints: "", reviewRequested: false, components: [] });
export const newComponent = (technology: Technology): HybridConfig["components"][number] => ({ technology, simulationId: null, equipmentId: null, weatherId: null, power: null, powerUnit: technology === "battery" ? "kWh" : technology === "photovoltaic" ? "kWc" : technology === "csp" ? "kWth" : "kW", parameterSource: "" });
export type HybridSimulation = {
  id: string; name: string; projectId: string | null; siteId: string | null;
  engine: string; version: string | null; status: string; periodStart: string | null; periodEnd: string | null;
  timestamps: string[]; utcOffset: number | null; convention: string | null;
  sources: unknown; assumptions: unknown; limits: string;
  results: { key: string; value: number | null; unit: string; method: string }[];
  series: { key: string; unit: string; values: (number | null)[] }[];
};
export type HybridOption = { id: string; name: string; projectId?: string | null; localityId?: string | null; siteId?: string | null; status?: string; source?: string | null; period?: string; technology?: string; snapshot?: unknown };
export type HybridData = {
  configs: { config: HybridConfig; updatedAt: string; history: { at: string; actor: string; config: HybridConfig }[] }[];
  projects: HybridOption[]; sites: HybridOption[]; demands: HybridOption[]; weather: HybridOption[]; equipment: HybridOption[];
  simulations: HybridSimulation[]; canWrite: boolean;
};

/** Checks only: no resampling, conversion, energy addition or dispatch. */
export function checkHourlySeries(s: Pick<HybridSimulation, "timestamps" | "utcOffset" | "convention" | "series">): string[] {
  const errors: string[] = [];
  if (s.utcOffset === null || !Number.isFinite(s.utcOffset)) errors.push("Fuseau horaire absent.");
  if (s.convention !== "period_start") errors.push("Convention de début de période absente ou incompatible.");
  if (!s.timestamps.length) errors.push("Horodatages absents.");
  if (new Set(s.timestamps).size !== s.timestamps.length) errors.push("Horodatages dupliqués.");
  const times = s.timestamps.map(t => Date.parse(/[zZ]|[+-]\d\d:\d\d$/.test(t) ? t : `${t}Z`));
  if (times.some(t => !Number.isFinite(t))) errors.push("Horodatage invalide.");
  if (times.some((t, i) => i > 0 && t - Number(times[i - 1]) !== 3_600_000)) errors.push("Pas non horaire, trou ou période discontinue.");
  if (!s.series.length) errors.push("Séries de résultats absentes.");
  for (const series of s.series) {
    if (series.values.length !== s.timestamps.length || series.values.some(v => v === null || !Number.isFinite(v))) errors.push(`Série incomplète : ${series.key}.`);
    if (!series.unit) errors.push(`Unité absente : ${series.key}.`);
  }
  return errors;
}

export function alignmentErrors(a: HybridSimulation, b: HybridSimulation): string[] {
  const errors = [...checkHourlySeries(a), ...checkHourlySeries(b)];
  if (a.utcOffset !== b.utcOffset) errors.push("Fuseaux incompatibles : aucune conversion automatique.");
  if (a.timestamps.length !== b.timestamps.length || a.timestamps.some((t, i) => t !== b.timestamps[i])) errors.push("Périodes ou horodatages non alignés.");
  return [...new Set(errors)];
}

export function evaluateHybrid(config: HybridConfig, data: Pick<HybridData, "projects" | "sites" | "demands" | "weather" | "equipment" | "simulations">) {
  const blockers: string[] = [];
  const project = data.projects.find(x => x.id === config.projectId);
  const site = data.sites.find(x => x.id === config.siteId);
  if (!project) blockers.push("Projet de référence absent ou inaccessible.");
  if (!site) blockers.push("Site de référence absent ou inaccessible.");
  if (project && site && (!project.localityId || !site.localityId || project.localityId !== site.localityId)) blockers.push("Localités du projet et du site non établies ou incompatibles.");
  if (config.components.length < 2) blockers.push("Au moins deux technologies distinctes sont nécessaires.");
  if (!config.assumptions.trim()) blockers.push("Hypothèses explicites manquantes.");
  if (!config.constraints.trim()) blockers.push("Contraintes de fonctionnement manquantes.");
  const demand = data.demands.find(x => x.id === config.demandId);
  if (!demand) blockers.push("Demande documentée non associée.");
  else {
    if (demand.siteId !== config.siteId) blockers.push("Demande non rattachée au site de référence.");
    if (demand.status !== "validated") blockers.push("Demande non validée.");
    blockers.push("Série de demande horodatée complète à fournir ; le profil quotidien n'est pas prolongé automatiquement.");
  }
  const comparisons: HybridSimulation[] = [];
  for (const component of config.components) {
    const label = TECHNOLOGIES[component.technology];
    if (component.power === null || !component.parameterSource.trim()) blockers.push(`${label} : puissance/capacité déclarée et source manquantes.`);
    const expected = component.technology === "battery" ? "kWh" : component.technology === "photovoltaic" ? "kWc" : component.technology === "csp" ? "kWth" : "kW";
    if (component.powerUnit !== expected) blockers.push(`${label} : unité déclarée incompatible (${expected} requis).`);
    if (component.technology === "battery" || component.technology === "biomass") {
      const eq = data.equipment.find(x => x.id === component.equipmentId && x.technology === component.technology);
      if (!eq) blockers.push(`${label} : équipement/ressource non associé.`);
      else {
        if (eq.status !== "validated") blockers.push(`${label} : équipement/ressource non validé.`);
        if (component.technology === "battery" && (eq.projectId !== config.projectId || !eq.snapshot)) blockers.push("Batterie : configuration du même projet et instantané requis.");
        if (component.technology === "biomass" && eq.siteId !== config.siteId) blockers.push("Biomasse : site de la ressource incompatible.");
      }
    } else {
      const weather = data.weather.find(x => x.id === component.weatherId);
      if (!weather || weather.siteId !== config.siteId || weather.status !== "validated") blockers.push(`${label} : météo validée du site requise.`);
    }
    const sim = data.simulations.find(x => x.id === component.simulationId);
    if (!sim) blockers.push(`${label} : aucun résultat individuel enregistré associé.`);
    else if (sim.engine !== component.technology || sim.projectId !== config.projectId) blockers.push(`${label} : résultat d'un autre moteur ou projet.`);
    else {
      if (sim.status === "completed" && sim.results.length) comparisons.push(sim);
      else blockers.push(`${label} : simulation ${sim.status}, sans résultats terminés disponibles.`);
      if (sim.siteId !== config.siteId) blockers.push(`${label} : site historique du résultat absent ou différent ; association de préparation uniquement.`);
      if (!sim.version) blockers.push(`${label} : version moteur absente.`);
      if (sim.engine !== "biomass") blockers.push(...checkHourlySeries(sim).map(x => `${label} : ${x}`));
    }
    if (component.technology === "biomass") blockers.push("Biomasse : énergie primaire annuelle, mobilisation et conversion électrique non validées ; aucune contribution électrique.");
    if (component.technology === "csp") blockers.push("CSP : chaleur distincte de l'électricité ; conversion et architecture communes à valider.");
    if (component.technology === "wind") blockers.push("Éolien : seule une courbe turbine documentée peut donner une production électrique, jamais le flux cinétique.");
  }
  for (const other of comparisons.slice(1)) {
    const first = comparisons[0];
    if (first) blockers.push(...alignmentErrors(first, other));
  }
  const unique = [...new Set(blockers)];
  return { blockers: unique, comparisons, status: config.reviewRequested ? "Validation scientifique requise" : unique.length ? "Données incomplètes" : "Brouillon", levelC: false as const,
    levelCReasons: ["Orchestration hybride et règles de dispatch non implémentées ; aucun bilan commun calculé.", "Service hébergé et persistance de bout en bout non vérifiés.", "Validation scientifique des interactions et contraintes requise par Joël."] };
}

/** Existing JSONB scenario envelope; user-editable configuration is never scientific evidence. */
export function decodeHybridEnvelope(value: unknown) {
  const schema = z.object({ kind: z.literal("hybrid_preparation"), modelVersion: z.literal(HYBRID_VERSION), config: hybridConfigSchema,
    history: z.array(z.object({ at: z.string(), actor: z.string(), config: hybridConfigSchema })).default([]) });
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}