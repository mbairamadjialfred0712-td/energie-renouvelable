import type { ScientificAssumption, ScientificResult } from "../simulation/contracts";
export type FinancialInput = { currency: string; capex?: number; annualOpex?: number; lifetimeYears?: number; assumptions: ScientificAssumption[] };
export type FinancialResult = ScientificResult & { key: "LCOE" | "NPV" | "IRR" | "PAYBACK" | "CASH_FLOW" };
