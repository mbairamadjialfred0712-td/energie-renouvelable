import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sun, Wind, Leaf, Recycle } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { getDashboardSummary } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/resources/")({
  head: () => ({ meta: [{ title: "Ressources énergétiques — Énergie Renouvelable" }, { name: "description", content: "Fiches de ressources solaires, éoliennes, biomasse et déchets par localité, avec pré-analyse IA." }, { property: "og:title", content: "Ressources énergétiques — Énergie Renouvelable" }, { property: "og:description", content: "Fiches de ressources par localité avec traçabilité et pré-analyse IA." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: ResourcesOverview,
});

const cards = [
  { type: "solar", to: "/resources/solar", label: "Solaire", icon: Sun, hint: "GHI, DNI, DHI, températures" },
  { type: "wind", to: "/resources/wind", label: "Éolien", icon: Wind, hint: "Vitesse, hauteur, direction" },
  { type: "biomass", to: "/resources/biomass", label: "Biomasse", icon: Leaf, hint: "Quantité, humidité, PCI" },
  { type: "waste", to: "/resources/waste", label: "Déchets", icon: Recycle, hint: "Flux, PCI, valorisation" },
] as const;

function ResourcesOverview() {
  const { data, isLoading } = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => getDashboardSummary() });
  return (
    <WorkspacePage eyebrow="Données / Ressources" title="Ressources énergétiques" description="Une fiche par ressource et par localité. Chaque fiche peut recevoir une pré-analyse IA qui liste les manques, hypothèses et points à vérifier — sans calculer ni inventer de valeur.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ type, to, label, icon: Icon, hint }) => (
          <Link key={type} to={to} className="border border-border bg-background p-5 transition-colors hover:border-primary">
            <div className="flex items-center justify-between"><span className="font-medium">{label}</span><Icon className="h-5 w-5 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{isLoading ? "…" : data?.resourcesByType[type] ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">fiche(s) · {hint}</p>
          </Link>
        ))}
      </div>
    </WorkspacePage>
  );
}
