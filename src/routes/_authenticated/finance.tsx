import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FinanceCalculator } from "@/features/finance/finance-ui";
import { getProjectFinance } from "@/lib/finance.functions";

const title = "Analyse financière — Énergie Renouvelable";
const description = "Calculateur déterministe du coût actualisé de l'énergie (LCOE) : CAPEX, OPEX, dégradation, remplacements et taux d'actualisation.";

export const Route = createFileRoute("/_authenticated/finance")({
  validateSearch: (s: Record<string, unknown>) => ({ project: typeof s.project === "string" ? s.project : undefined }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const { project } = Route.useSearch();
  const { data } = useQuery({
    queryKey: ["project-finance", project],
    queryFn: () => getProjectFinance({ data: { projectId: project! } }),
    enabled: !!project,
  });
  const a = data?.assumptions ?? null;
  const linked = data?.linkedProduction ?? null;
  const initial = a ? {
    currency: a.currency,
    capex: String(a.capex),
    annualOpex: String(a.annual_opex),
    lifetimeYears: String(a.lifetime_years),
    discountRatePct: String(a.discount_rate_pct),
    yearOneProductionKwh: String(linked ? linked.annualKwh : a.year_one_production_kwh ?? ""),
    degradationPctPerYear: String(a.degradation_pct_per_year),
  } : undefined;
  const initialReplacements = a ? ((a.replacements as { year: number; cost: number }[]) ?? []).map((r) => ({ year: String(r.year), cost: String(r.cost) })) : undefined;
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Études / Finance</p>
        <h1 className="text-2xl font-semibold">Analyse financière</h1>
        <p className="text-sm text-muted-foreground">
          Calcul formel du LCOE à partir d'hypothèses explicites. Aucune valeur par défaut cachée ; chaque résultat est relié à ses entrées.
        </p>
        {project && a && <p className="text-sm text-muted-foreground">Hypothèses du projet chargées{linked ? ` ; production année 1 issue de la simulation « ${linked.name} » (valeur enregistrée, non recalculée)` : ""}.</p>}
        {project && !a && data && <p className="text-sm text-muted-foreground">Ce projet n’a pas d’hypothèses financières enregistrées.</p>}
      </header>
      {(!project || data) && <FinanceCalculator key={project ?? "blank"} initial={initial} initialReplacements={initialReplacements} />}
    </div>
  );
}
