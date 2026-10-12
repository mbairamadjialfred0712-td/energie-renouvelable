export const technologyCodes = ["PV", "WIND", "BIOMASS", "CSP", "BATTERY"] as const;
export type TechnologyCode = (typeof technologyCodes)[number];
export type TechnologyEngineStatus = "contract_ready" | "annual_estimate_connected" | "validated_engine_connected";
export const engineRegistry: Record<TechnologyCode, TechnologyEngineStatus> = {
  PV: "annual_estimate_connected", WIND: "contract_ready", BIOMASS: "contract_ready", CSP: "contract_ready", BATTERY: "contract_ready",
};
