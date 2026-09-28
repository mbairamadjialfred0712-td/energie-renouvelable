export type ProjectFieldKind = "provided" | "assumption";

export type ProjectDataField = {
  id?: string;
  section: string;
  fieldKey: string;
  label: string;
  value: string;
  unit: string;
  fieldKind: ProjectFieldKind;
  source: string;
  dataPeriod: string;
  quality: string;
  notes: string;
  sortOrder: number;
};

export type AnalysisItem = {
  title: string;
  explanation: string;
  fieldReferences: string[];
};

export type ProjectAnalysisResult = {
  missingInformation: AnalysisItem[];
  declaredAssumptions: AnalysisItem[];
  verificationPoints: AnalysisItem[];
  scopeNote: string;
};

export const PROJECT_SECTIONS = [
  "Territoire",
  "Demande",
  "Ressources",
  "Technologies",
  "Économie",
  "Sources et hypothèses",
] as const;

export const PROJECT_FIELD_TEMPLATES: ProjectDataField[] = [
  { section: "Territoire", fieldKey: "site_name", label: "Site ou localité", value: "", unit: "", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 10 },
  { section: "Territoire", fieldKey: "latitude", label: "Latitude", value: "", unit: "°", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 20 },
  { section: "Territoire", fieldKey: "longitude", label: "Longitude", value: "", unit: "°", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 30 },
  { section: "Demande", fieldKey: "annual_demand", label: "Consommation annuelle", value: "", unit: "kWh/an", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 40 },
  { section: "Demande", fieldKey: "peak_power", label: "Puissance de pointe", value: "", unit: "kW", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 50 },
  { section: "Demande", fieldKey: "demand_growth", label: "Croissance de la demande", value: "", unit: "%/an", fieldKind: "assumption", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 60 },
  { section: "Ressources", fieldKey: "solar_ghi", label: "Irradiation solaire GHI", value: "", unit: "kWh/m²/j", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 70 },
  { section: "Ressources", fieldKey: "wind_speed", label: "Vitesse moyenne du vent", value: "", unit: "m/s", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 80 },
  { section: "Ressources", fieldKey: "biomass_quantity", label: "Biomasse disponible", value: "", unit: "t/an", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 90 },
  { section: "Technologies", fieldKey: "technologies_considered", label: "Technologies envisagées", value: "", unit: "", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 100 },
  { section: "Technologies", fieldKey: "target_capacity", label: "Puissance installée cible", value: "", unit: "kW", fieldKind: "assumption", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 110 },
  { section: "Économie", fieldKey: "project_lifetime", label: "Durée du projet", value: "", unit: "ans", fieldKind: "assumption", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 120 },
  { section: "Économie", fieldKey: "discount_rate", label: "Taux d’actualisation", value: "", unit: "%", fieldKind: "assumption", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 130 },
  { section: "Économie", fieldKey: "budget", label: "Budget indicatif", value: "", unit: "", fieldKind: "assumption", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 140 },
  { section: "Sources et hypothèses", fieldKey: "study_objective", label: "Objectif de l’étude", value: "", unit: "", fieldKind: "provided", source: "", dataPeriod: "", quality: "", notes: "", sortOrder: 150 },
];