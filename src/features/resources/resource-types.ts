export type ResourceType = "solar" | "wind" | "biomass" | "waste";

export type DetailField = { key: string; label: string; unit?: string; kind: "number" | "text"; min?: number; max?: number };

export const RESOURCE_DETAILS: Record<ResourceType, { table: "solar_resources" | "wind_resources" | "biomass_resources" | "waste_resources"; label: string; fields: DetailField[] }> = {
  solar: {
    table: "solar_resources",
    label: "Solaire",
    fields: [
      { key: "ghi_kwh_m2_day", label: "GHI", unit: "kWh/m²/j", kind: "number", min: 0 },
      { key: "dni_kwh_m2_day", label: "DNI", unit: "kWh/m²/j", kind: "number", min: 0 },
      { key: "dhi_kwh_m2_day", label: "DHI", unit: "kWh/m²/j", kind: "number", min: 0 },
      { key: "annual_irradiation_kwh_m2", label: "Irradiation annuelle", unit: "kWh/m²/an", kind: "number", min: 0 },
      { key: "avg_temperature_c", label: "Température moyenne", unit: "°C", kind: "number" },
      { key: "min_temperature_c", label: "Température minimale", unit: "°C", kind: "number" },
      { key: "max_temperature_c", label: "Température maximale", unit: "°C", kind: "number" },
      { key: "sunshine_hours", label: "Durée d’ensoleillement", unit: "h/an", kind: "number", min: 0 },
    ],
  },
  wind: {
    table: "wind_resources",
    label: "Éolien",
    fields: [
      { key: "average_speed_ms", label: "Vitesse moyenne", unit: "m/s", kind: "number", min: 0 },
      { key: "maximum_speed_ms", label: "Vitesse maximale", unit: "m/s", kind: "number", min: 0 },
      { key: "measurement_height_m", label: "Hauteur de mesure", unit: "m", kind: "number", min: 0 },
      { key: "direction_deg", label: "Direction dominante", unit: "°", kind: "number", min: 0, max: 360 },
      { key: "air_density_kg_m3", label: "Densité de l’air", unit: "kg/m³", kind: "number", min: 0 },
      { key: "capacity_factor_pct", label: "Facteur de capacité (documenté)", unit: "%", kind: "number", min: 0, max: 100 },
    ],
  },
  biomass: {
    table: "biomass_resources",
    label: "Biomasse",
    fields: [
      { key: "biomass_type", label: "Type de biomasse", kind: "text" },
      { key: "annual_quantity_t", label: "Quantité disponible", unit: "t/an", kind: "number", min: 0 },
      { key: "moisture_pct", label: "Humidité", unit: "%", kind: "number", min: 0, max: 100 },
      { key: "calorific_value_mj_kg", label: "Pouvoir calorifique", unit: "MJ/kg", kind: "number", min: 0 },
      { key: "exploitable_fraction_pct", label: "Fraction exploitable", unit: "%", kind: "number", min: 0, max: 100 },
      { key: "energy_potential_mwh", label: "Potentiel énergétique documenté", unit: "MWh/an", kind: "number", min: 0 },
    ],
  },
  waste: {
    table: "waste_resources",
    label: "Déchets",
    fields: [
      { key: "waste_type", label: "Type de déchet", kind: "text" },
      { key: "annual_quantity_t", label: "Quantité", unit: "t/an", kind: "number", min: 0 },
      { key: "moisture_pct", label: "Humidité", unit: "%", kind: "number", min: 0, max: 100 },
      { key: "calorific_value_mj_kg", label: "Pouvoir calorifique", unit: "MJ/kg", kind: "number", min: 0 },
      { key: "energy_potential_mwh", label: "Potentiel énergétique documenté", unit: "MWh/an", kind: "number", min: 0 },
      { key: "recovery_method", label: "Méthode de valorisation", kind: "text" },
    ],
  },
};

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = { solar: "Solaire", wind: "Éolien", biomass: "Biomasse", waste: "Déchets" };
