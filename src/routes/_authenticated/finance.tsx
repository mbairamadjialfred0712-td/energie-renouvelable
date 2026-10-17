import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FinanceCalculator } from "@/features/finance/finance-ui";
import { getProjectFinance } from "@/lib/finance.functions";

const title = "Analyse financière — Énergie Renouvelable";
const description = "Calculateur déterministe du coût actualisé de l'énergie (LCOE) : CAPEX, OPEX, dégradation, remplacements et taux d'actualisation.";

export const Route = createFileRoute("/_authenticated/finance")({
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
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">Études / Finance</p>
        <h1 className="text-2xl font-semibold">Analyse financière</h1>
        <p className="text-sm text-muted-foreground">
          Calcul formel du LCOE à partir d'hypothèses explicites. Aucune valeur par défaut cachée ; chaque résultat est relié à ses entrées.
        </p>
      </header>
      <FinanceCalculator />
    </div>
  );
}
