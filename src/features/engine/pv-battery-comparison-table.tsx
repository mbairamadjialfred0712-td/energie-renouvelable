import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPvBatteryComparison } from "@/lib/pv-battery-comparison.functions";

const ENGINE_LABELS = { photovoltaic: "PV seul", battery: "PV + Batterie" } as const;

function fmt(value: number | null, unit: string): string {
  if (value === null) return "Non calculé";
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} ${unit}`;
}

export function PvBatteryComparisonTable() {
  const { data, isLoading, error } = useQuery({ queryKey: ["pv-battery-comparison"], queryFn: () => getPvBatteryComparison() });
  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement du tableau…</p>;
  if (error) return <p role="alert" className="text-sm text-destructive">Le tableau comparatif n’a pas pu être chargé.</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground">Aucune simulation PV ou batterie terminée à comparer.</p>;
  const periods = new Set(data.map((r) => `${r.periodStart}→${r.periodEnd}`));
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Comparaison multi-scénarios PV / Batterie</h2>
      <p className="text-sm text-muted-foreground">
        Valeurs enregistrées par le moteur, sans agrégation ni classement. « Non calculé » : le PV seul ne compare pas
        production et demande ; seule une simulation batterie établit couverture, autoconsommation et énergie non servie.
      </p>
      {periods.size > 1 && (
        <p role="note" className="text-sm text-muted-foreground">
          Les lignes couvrent des périodes différentes : les indicateurs ne sont pas directement comparables entre elles.
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2">Scénario</th><th>Configuration</th><th>Période</th>
            <th>Couverture de la demande</th><th>Autoconsommation PV</th><th>Énergie non servie</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="py-2"><Link to="/simulations/$id/results" params={{ id: r.id }} className="underline">{r.name}</Link></td>
              <td>{ENGINE_LABELS[r.engine]}</td>
              <td>{r.periodStart ?? "—"} → {r.periodEnd ?? "—"}</td>
              <td className="tabular-nums">{fmt(r.coverageRatePct, "%")}</td>
              <td className="tabular-nums">{fmt(r.selfConsumptionRatePct, "%")}</td>
              <td className="tabular-nums">{fmt(r.energyNotServedKwh, "kWh")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
