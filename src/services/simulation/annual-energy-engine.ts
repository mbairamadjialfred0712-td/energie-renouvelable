import { isAnnualPeriod, recordedDate } from "./solar-pv-engine";
export const WIND_METHOD = "E = P (kW) × heures de la période × FC brut / 100 × rendement net";
export const BIOMASS_METHOD = "E = quantité (t/an) × 1000 × PCI reçu (MJ/kg) / 3,6 × fraction exploitable / 100 × rendement net × rendement électrique";
function positive(value: number, maximum = Number.MAX_VALUE) { if (!Number.isFinite(value) || value <= 0 || value > maximum) throw new Error("Paramètre hors plage."); }
export function estimateWind(input: { powerKw: number; capacityFactorPct: number; efficiency: number; start: string; end: string }) {
 positive(input.powerKw, 1e9); positive(input.capacityFactorPct, 100); positive(input.efficiency, 1);
 if (!isAnnualPeriod(input.start, input.end)) throw new Error("Année complète requise.");
 const start = recordedDate(input.start), end = recordedDate(input.end);
 if (start === null || end === null) throw new Error("Dates invalides.");
 return { productionKwh: input.powerKw * ((end-start)/86400000+1)*24 * input.capacityFactorPct/100 * input.efficiency, method: WIND_METHOD, engineVersion: "wind-annual-estimate/1.0" };
}
export function estimateBiomass(input: { quantityT: number; pciMjKg: number; exploitablePct: number; efficiency: number; conversionEfficiency: number; start: string; end: string }) {
 positive(input.quantityT); positive(input.pciMjKg); positive(input.exploitablePct,100); positive(input.efficiency,1); positive(input.conversionEfficiency,1);
 if (!isAnnualPeriod(input.start,input.end)) throw new Error("Année complète requise.");
 const productionKwh = input.quantityT*1000*input.pciMjKg/3.6*input.exploitablePct/100*input.efficiency*input.conversionEfficiency;
 if (!Number.isFinite(productionKwh)) throw new Error("Dépassement de plage.");
 return { productionKwh, method: BIOMASS_METHOD, engineVersion: "biomass-annual-estimate/1.0" };
}
