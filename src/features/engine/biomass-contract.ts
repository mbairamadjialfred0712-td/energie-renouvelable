import { z } from "zod";
import { simulationRequest, type SimulationRequest, type simulationResponse } from "./engine-contract";
export const BIOMASS_VERSION = "1.0.0";
export const BIOMASS_LABELS: Record<string, string> = { primary_energy: "Énergie primaire de la quantité recensée", mobilisable_mass: "Quantité mobilisable", useful_thermal_energy: "Chaleur utile", gross_electric_energy: "Électricité brute", net_electric_energy: "Électricité nette" };
export const BIOMASS_INPUT_LABELS: Record<string, string> = { mass: "Quantité recensée", pci: "PCI", moisture: "Humidité", mass_basis: "Base de masse", pci_basis: "Base du PCI", moisture_basis: "Convention d’humidité", basis_compatibility: "Compatibilité des bases confirmée", period_start: "Début de période", period_end: "Fin de période", status: "Statut de la fiche", resource_id: "Fiche", site_id: "Site", quality: "Qualité", fraction: "Fraction exploitable (non appliquée)" };
const levels = ["theoretical", "technical", "sustainable", "collectable", "deliverable", "used_elsewhere"];
export function biomassAnnualPeriod(start: unknown, end: unknown) {
  if (typeof start !== "string" || typeof end !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return false;
  const a = new Date(start + "T00:00:00Z"), b = new Date(end + "T00:00:00Z");
  if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime()) || a.toISOString().slice(0,10) !== start || b.toISOString().slice(0,10) !== end || a.getUTCFullYear() < 1900 || a.getUTCFullYear() >= 2200) return false;
  const year = a.getUTCFullYear()+1, month = a.getUTCMonth(), day = Math.min(a.getUTCDate(),new Date(Date.UTC(year,month+1,0)).getUTCDate());
  return b.getTime() === Date.UTC(year,month,day) - 86400000;
}
export const biomassRequestSchema = simulationRequest.superRefine((r,c) => {
  const err = (key: string, message: string) => c.addIssue({ code: "custom", path: ["input_data",key], message });
  if (r.engine !== "biomass" || r.engine_version !== BIOMASS_VERSION || r.timeseries != null || Object.keys(r.assumptions).length) err("engine", "Bilan primaire V1 sans série ni conversion requis.");
  const units: Record<string,string> = {resource_id:"-",site_id:"-",status:"-",period_start:"-",period_end:"-",mass:"t/an",pci:"MJ/kg",moisture:"%",mass_basis:"-",pci_basis:"-",moisture_basis:"-",basis_compatibility:"-",quality:"-"};
  for (const [k,unit] of Object.entries(units)) {
    const v = r.input_data[k];
    if (!v || v.value == null || v.unit !== unit || !v.source || v.source.trim().length < 2 || v.nature === "calculated") err(k,"Valeur, unité et source documentée obligatoires.");
  }
  for (const [k,v] of Object.entries(r.input_data)) {
    if (!(k in units) && k !== "fraction" && !levels.some(l => k === "level_"+l)) err(k,"Paramètre hors périmètre, aucun cumul ni rendement implicite.");
    if (["mass","pci","moisture","fraction"].includes(k) || k.startsWith("level_")) {
      if (typeof v.value !== "number" || !Number.isFinite(v.value)) { err(k,"Nombre fini requis."); continue; }
      if ((k === "mass" || k === "pci") && v.value <= 0) err(k,"Valeur strictement positive requise.");
      if (["moisture","fraction"].includes(k) && (v.value < 0 || v.value > 100)) err(k,"Plage admise : 0 à 100 %.");
      if (k === "fraction" && v.unit !== "%" || k.startsWith("level_") && (v.value < 0 || v.unit !== "t/an")) err(k,"Unité ou niveau invalide.");
      if (!v.source?.trim()) err(k,"Source obligatoire.");
    }
  }
  const val=(k:string)=>r.input_data[k]?.value;
  for (const [k,value] of [["status","validated"],["mass_basis","as_received"],["pci_basis","as_received"]]) if(val(k ?? "") !== value) err(k ?? "","Fiche validée et bases matière reçue concordantes requises.");
  if (!["wet","dry"].includes(String(val("moisture_basis")))) err("moisture_basis","Convention d’humidité documentée requise.");
  if (val("basis_compatibility") !== true || (r.input_data["basis_compatibility"]?.source?.trim().length ?? 0) < 10) err("basis_compatibility","Compatibilité des bases et justification requises.");
  for (const k of ["resource_id","site_id","quality"]) if(typeof val(k) !== "string" || !String(val(k)).trim()) err(k,"Identifiant/qualité requis.");
  if (!biomassAnnualPeriod(val("period_start"), val("period_end"))) err("period_end","Douze mois complets datés requis ; aucune annualisation.");
  if (r.source_references.length !== 1 || r.source_references[0]?.table !== "biomass_resources" || r.source_references[0]?.record_id !== val("resource_id")) err("resource_id","Une seule fiche sourcée par bilan ; aucun cumul.");
});
export function checkBiomassResponse(request: SimulationRequest, out: z.infer<typeof simulationResponse>) {
  biomassRequestSchema.parse(request);
  const energy=out.results["primary_energy"], mass=request.input_data["mass"]?.value, pci=request.input_data["pci"]?.value;
  // Integrity check only; not a browser-side calculation or fallback output.
  if(typeof mass !== "number" || typeof pci !== "number" || !energy || energy.unit !== "MWh/an" || energy.value == null || energy.value <= 0 || !Number.isFinite(energy.value) || Math.abs(energy.value*3.6/mass-pci)>1e-9*Math.max(1,pci)) throw new Error("Bilan primaire incohérent avec les entrées enregistrées.");
  const keys=["primary_energy","mobilisable_mass","useful_thermal_energy","gross_electric_energy","net_electric_energy"];
  if(Object.keys(out.results).length!==keys.length || Object.keys(out.timeseries).length) throw new Error("Sortie biomasse hors périmètre.");
  const reasons=out.calculation_metadata["unavailable_reasons"];
  for(const k of keys.slice(1)) {
    const r=out.results[k]; const reason = reasons && typeof reasons==="object" ? (reasons as Record<string,unknown>)[k] : null;
    if(!r || r.value!==null || r.unit!==(k==="mobilisable_mass"?"t/an":"MWh/an") || typeof reason!=="string" || !reason.trim() || r.method!==reason) throw new Error("Conversion indisponible sans motif, ou résultat inventé.");
  }
  if(out.calculation_metadata["resource_id"]!==request.input_data["resource_id"]?.value || out.calculation_metadata["boundary"]!=="recorded_primary" || out.calculation_metadata["fraction_applied"]!==false || out.calculation_metadata["moisture_conversion"]!=="none" || out.calculation_metadata["aggregation"]!=="single_resource" || out.calculation_metadata["scientific_validation"]!=="pending") throw new Error("Métadonnées biomasse incohérentes.");
}