import { z } from "zod";
import { simulationResponse, type SimulationRequest } from "@/features/engine/engine-contract";

export const FINANCE_VERSION = "1.0.0";
const finite = z.number().finite();
const replacement = z.object({ year: finite.int().min(1).max(100), cost: finite.nonnegative() }).strict();
const common = {
  currency: z.string().trim().min(1).max(10), lifetimeYears: finite.int().min(1).max(100),
  yearOneProductionKwh: finite.positive(), degradationPctPerYear: finite.min(0).max(100),
  replacements: z.array(replacement).max(50),
};
const lcoeInput = z.object({ ...common, capex: finite.positive(), annualOpex: finite.nonnegative(), discountRatePct: finite.gt(-100) }).strict();
const costItem = z.object({ label: z.string().trim().min(1).max(200), amount: finite.nonnegative(), source: z.string().trim().min(3).max(500), includedInOther: z.boolean().optional() }).strict();
const cashflowInput = z.object({
  ...common, realDiscountRatePct: finite.gt(-100), capexItems: z.array(costItem).min(1).max(100), opexItems: z.array(costItem).min(1).max(100),
  soldShare: finite.min(0).max(1), substitutedShare: finite.min(0).max(1), saleTariffPerKwh: finite.nonnegative().nullable(),
  referenceCostPerKwh: finite.nonnegative().nullable(), subsidy: finite.nonnegative(), residualValue: finite.nonnegative(),
}).strict().superRefine((v, ctx) => {
  if (v.soldShare + v.substitutedShare > 1) ctx.addIssue({ code: "custom", message: "Parts vendue et substituée : au plus 100 %." });
  if (v.soldShare > 0 && v.saleTariffPerKwh === null) ctx.addIssue({ code: "custom", message: "Tarif documenté requis pour la part vendue." });
  if (v.substitutedShare > 0 && v.referenceCostPerKwh === null) ctx.addIssue({ code: "custom", message: "Coût évité documenté requis pour la part substituée." });
});
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v, "Date documentaire invalide.");
const context = {
  evidence: z.object({ reference: z.string().trim().min(3).max(1000), date, costsConfirmed: z.literal(true) }).strict(),
  production: z.object({ simulationId: z.string().uuid().nullable(), source: z.string().trim().min(3).max(500), nature: z.enum(["measured", "external", "estimate", "assumption"]) }).strict(),
};
export const financePayloadSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("lcoe"), input: lcoeInput, ...context }).strict(),
  z.object({ mode: z.literal("cashflow"), input: cashflowInput, ...context, sensitivity: z.object({ variable: z.enum(["capex", "opex", "discount", "production", "tariff"]), deltasPct: z.array(finite.min(-90).max(90)).min(1).max(9) }).strict().optional() }).strict(),
]).superRefine((v, ctx) => {
  if (v.input.replacements.some(r => r.year > v.input.lifetimeYears)) ctx.addIssue({ code: "custom", message: "Remplacement hors durée d’étude." });
});
export type FinancePayload = z.infer<typeof financePayloadSchema>;
export const runFinanceSchema = z.object({ name: z.string().trim().min(3).max(200), projectId: z.string().uuid().nullable(), payload: financePayloadSchema }).strict();

const irr = z.discriminatedUnion("status", [z.object({ status: z.literal("ok"), ratePct: finite }), z.object({ status: z.literal("unavailable"), reason: z.string().min(1) })]);
const lcoeRow = z.object({ year: finite.int(), productionKwh: finite.nonnegative(), opex: finite.nonnegative(), replacementCost: finite.nonnegative(), totalCost: finite.nonnegative(), discountedCost: finite.nonnegative(), discountedEnergyKwh: finite.nonnegative() });
const lcoeResult = z.object({ rows: z.array(lcoeRow).min(1).max(100), totalDiscountedCost: finite.positive(), totalDiscountedEnergyKwh: finite.positive(), lcoePerKwh: finite.positive(), totalCapex: finite.positive(), totalReplacementCost: finite.nonnegative(), totalOpex: finite.nonnegative() });
const flowRow = z.object({ year: finite.int(), productionKwh: finite.nonnegative(), capex: finite.nonnegative(), opex: finite.nonnegative(), replacement: finite.nonnegative(), revenue: finite.nonnegative(), savings: finite.nonnegative(), subsidy: finite.nonnegative(), residual: finite.nonnegative(), net: finite, discounted: finite, cumulative: finite, cumulativeDiscounted: finite });
const cashflowResult = z.object({ rows: z.array(flowRow).min(2).max(101), totalCapex: finite.positive(), annualOpex: finite.nonnegative(), npv: finite, irr, simplePaybackYears: finite.nonnegative().nullable(), discountedPaybackYears: finite.nonnegative().nullable(), lcoePerKwh: finite.positive(), hasIncome: z.boolean(), warnings: z.array(z.string()) });
export const financeReportSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("lcoe"), result: lcoeResult }),
  z.object({ mode: z.literal("cashflow"), result: cashflowResult, sensitivity: z.array(z.object({ deltaPct: finite, npv: finite, irr, lcoePerKwh: finite.positive(), simplePaybackYears: finite.nonnegative().nullable() })).max(9) }),
]);
export type FinanceReport = z.infer<typeof financeReportSchema>;
export function financeRequest(payload: FinancePayload, projectId: string | null): SimulationRequest {
  return { schema_version: "1.0", engine: "finance", engine_version: FINANCE_VERSION, project_id: projectId,
    input_data: { finance_payload: { value: JSON.stringify(payload), unit: "-", nature: "external", source: payload.evidence.reference } }, assumptions: {}, timeseries: null,
    source_references: [{ label: payload.evidence.reference.slice(0, 300), period: payload.evidence.date }, { label: payload.production.source.slice(0, 300), ...(payload.production.simulationId ? { table: "simulations", record_id: payload.production.simulationId } : {}) }] };
}
export function checkFinanceResponse(request: SimulationRequest, raw: z.infer<typeof simulationResponse>, id: string): FinanceReport {
  if (raw.engine !== "finance" || raw.engine_version !== FINANCE_VERSION || raw.status !== "completed" || raw.simulation_id !== id || raw.schema_version !== "1.0" || !raw.completed_at || raw.validation_errors.length) throw new Error("Réponse économique incomplète ou étrangère.");
  const input = request.input_data["finance_payload"]?.value;
  if (typeof input !== "string") throw new Error("Entrées économiques absentes.");
  const payload = financePayloadSchema.parse(JSON.parse(input));
  if (JSON.stringify(raw.calculation_metadata["payload"]) !== JSON.stringify(payload)) throw new Error("Le moteur n’a pas confirmé les mêmes entrées économiques.");
  const report = financeReportSchema.parse(raw.calculation_metadata["report"]);
  const start = report.mode === "lcoe" ? 1 : 0;
  if (report.mode !== payload.mode || report.result.rows.length !== payload.input.lifetimeYears + (start === 0 ? 1 : 0) || report.result.rows.some((r, i) => r.year !== i + start)) throw new Error("Période économique incomplète.");
  if (raw.results["lcoe"]?.unit !== `${payload.input.currency}/kWh` || raw.results["lcoe"]?.value !== report.result.lcoePerKwh) throw new Error("LCOE incohérent avec le rapport.");
  if (report.mode === "cashflow") {
    if (raw.results["npv"]?.value !== report.result.npv || raw.results["npv"]?.unit !== payload.input.currency) throw new Error("VAN incohérente.");
    const deltas = payload.mode === "cashflow" ? payload.sensitivity?.deltasPct ?? [] : [];
    if (report.sensitivity.length !== deltas.length || report.sensitivity.some((r, i) => r.deltaPct !== deltas[i])) throw new Error("Sensibilité incomplète.");
  }
  return report;
}