import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Sun, Wind, Leaf, Recycle, ArrowRight } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { TerritoryMap } from "@/features/geography/territory-map";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/features/catalog/use-inventory";
import { CatalogControls } from "@/features/catalog/catalog-controls";
import { catalogSearch, summarizeInventory } from "@/features/catalog/inventory";
import { getDashboardSummary } from "@/lib/dashboard.functions";

export const Route = createFileRoute("/_authenticated/resources/")({
  head: () => ({ meta: [{ title: "Ressources énergétiques — Énergie Renouvelable" }, { name: "description", content: "Fiches de ressources solaires, éoliennes, biomasse et déchets par localité, avec pré-analyse IA." }, { property: "og:title", content: "Ressources énergétiques — Énergie Renouvelable" }, { property: "og:description", content: "Fiches de ressources par localité avec traçabilité et pré-analyse IA." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  validateSearch: catalogSearch,
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
  const filter = Route.useSearch(); const navigate = Route.useNavigate(); const inventory = useInventory(filter);
  return (
    <WorkspacePage eyebrow="Données / Ressources" title="Ressources énergétiques" description="Une fiche par ressource et par localité. Chaque fiche peut recevoir une pré-analyse IA qui liste les manques, hypothèses et points à vérifier — sans calculer ni inventer de valeur.">
      <CatalogControls filter={filter} localities={inventory.localities} onChange={value => navigate({ search: value, replace: true })} />
      {inventory.error ? <p role="alert" className="text-destructive">Les fiches n’ont pas pu être chargées. Aucun compteur n’est disponible.</p> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ type, to, label, icon: Icon, hint }) => {
          const counts = summarizeInventory(inventory[type]);
          return <article key={type} className="flex flex-col border border-border bg-background p-5">
            <div className="flex items-center justify-between"><h2 className="font-semibold">{label}</h2><Icon className="h-5 w-5 text-primary" /></div>
            <p className="mt-4 text-3xl font-semibold tabular-nums">{inventory.isPending ? "…" : counts.registered}</p>
            <p className="mt-1 text-xs text-muted-foreground">fiches enregistrées · {hint}</p>
            <p className="mt-2 text-sm text-muted-foreground">{inventory.isPending ? "…" : `${counts.validated} validées · ${counts.localities} localités`}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-4"><Button asChild variant="outline" size="sm"><Link to={to} search={filter}>Voir les ressources<ArrowRight /></Link></Button>
              {type !== "waste" && <><Button asChild variant="ghost" size="sm"><Link to="/technologies" search={filter}>Technologies<ArrowRight /></Link></Button><Button asChild variant="ghost" size="sm"><Link to="/simulations/new" search={{ tab: type === "solar" ? "pv" : type }}>Configurer un calcul<ArrowRight /></Link></Button></>}
            </div>
            {type === "waste" && <p className="mt-3 text-xs text-muted-foreground">Aucun moteur déchets raccordé.</p>}
          </article>;
        })}
      </div>}
      <section className="mt-8 space-y-3"><h2 className="text-lg font-semibold">Carte des localités avec ressources</h2><p className="text-sm text-muted-foreground">{data?.resourcePoints.length ?? 0} localités documentées · {data?.biomassReferences ?? 0} observations de stock de biomasse séparées, non géolocalisées.</p>{!isLoading && <TerritoryMap points={(data?.resourcePoints ?? []).map((p: { id: string; name: string; latitude: number; longitude: number; detail: string }) => ({ ...p, kind: "locality" as const }))} />}</section>
      <h2 className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Indicateurs solaires (données enregistrées)</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([["Localités avec données solaires", summarizeInventory(inventory.solar).localities], ["Jeux solaires validés", summarizeInventory(inventory.solar).validated], ["Jeux en attente de vérification", inventory.solar.filter(r => ["unverified", "in_review"].includes(r.status)).length], ["Sources distinctes", new Set(inventory.solar.map(r => r.source)).size]] as const).map(([l, v]) => (
          <div key={l} className="border border-border bg-background p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{inventory.isPending || inventory.error ? "—" : v ?? 0}</p></div>
        ))}
      </div>
    </WorkspacePage>
  );
}
