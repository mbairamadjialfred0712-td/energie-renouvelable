import type { HybridConfig, HybridData } from "@/features/hybrid/hybrid-model";

export function assertHybridWriter(roles: string[], userId: string, ownerId?: string) {
  if (!roles.includes("admin") && (!roles.includes("engineer") || (ownerId !== undefined && userId !== ownerId))) throw new Error("Seuls les ingénieurs propriétaires et administrateurs peuvent enregistrer cette configuration.");
}
/** Reject forged references; incomplete drafts with no reference remain saveable. */
export function assertHybridReferences(c: HybridConfig, data: HybridData) {
  const project = data.projects.find(p => p.id === c.projectId);
  const site = data.sites.find(s => s.id === c.siteId);
  if (c.projectId && !project) throw new Error("Projet inaccessible.");
  if (c.siteId && !site) throw new Error("Site inaccessible.");
  if (project && site && project.localityId && site.localityId && project.localityId !== site.localityId) throw new Error("Projet et site de localités différentes.");
  if (c.demandId && !data.demands.some(d => d.id === c.demandId && d.siteId === c.siteId)) throw new Error("Demande inaccessible ou d'un autre site.");
  for (const id of c.optimization?.candidateIds ?? []) {
    if (!data.simulations.some(s => s.id === id && s.projectId === c.projectId && (!s.siteId || s.siteId === c.siteId) && s.engine === "battery")) throw new Error("Candidat batterie inaccessible ou d'un autre site/projet.");
  }
  for (const id of c.comparison.scenarioIds) {
    const other = data.configs.find(r => r.config.id === id)?.config;
    if (!other) throw new Error("Scénario comparatif inaccessible ou illisible.");
    if (!c.siteId || other.siteId !== c.siteId) throw new Error("Comparaison inter-sites non autorisée.");
  }
  for (const x of c.components) {
    const sim = x.simulationId ? data.simulations.find(s => s.id === x.simulationId) : null;
    if (x.simulationId && (!sim || sim.projectId !== c.projectId || sim.engine !== x.technology)) throw new Error("Simulation inaccessible ou d'un autre projet/moteur.");
    if (sim && c.siteId && sim.siteId && sim.siteId !== c.siteId) throw new Error("Simulation rattachée à un autre site.");
    if (x.weatherId && !data.weather.some(w => w.id === x.weatherId && w.siteId === c.siteId)) throw new Error("Météo inaccessible ou d'un autre site.");
    if (x.equipmentId && !data.equipment.some(e => e.id === x.equipmentId && e.technology === x.technology && (x.technology === "battery" ? e.projectId === c.projectId : e.siteId === c.siteId))) throw new Error("Équipement inaccessible ou incompatible.");
  }
}