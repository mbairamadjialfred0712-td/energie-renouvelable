import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "@/lib/dashboard.functions";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { TerritoryMap, type MapPoint } from "@/features/geography/territory-map";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Tableau de bord énergétique — Énergie Renouvelable" }, { name: "description", content: "Ressources, demande et projets alimentés par le référentiel Territoires." }, { property: "og:title", content: "Tableau de bord énergétique — Énergie Renouvelable" }, { property: "og:description", content: "Vue d’ensemble factuelle des ressources, de la demande et des projets." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Dashboard,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const STATUS: Record<string, string> = { draft: "Brouillon", preliminary_study: "Étude préliminaire", feasibility: "Faisabilité", design: "Conception", financing: "Financement", procurement: "Approvisionnement", implementation: "Réalisation", completed: "Terminé" };

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="bg-background p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>{hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}</div>;
}

function Dashboard() {
  const { data: d, isLoading, error } = useQuery({ queryKey: ["dashboard-summary"], queryFn: () => getDashboardSummary() });
  const v = (n: number | undefined) => (isLoading ? "…" : fmt(n ?? 0));
  const points: MapPoint[] = [
    ...(d?.localityPoints ?? []).map((p) => ({ ...p, kind: "locality" as const })),
    ...(d?.sitePoints ?? []).map((p) => ({ ...p, kind: "site" as const, detail: p.site_type })),
  ];
  return (
    <WorkspacePage eyebrow="Vue d’ensemble" title="Tableau de bord énergétique" description="Indicateurs comptés uniquement à partir des données enregistrées. Aucune valeur n’est estimée." action={<Button asChild><Link to="/projects/new">Nouveau projet</Link></Button>}>
      {error && <p className="mb-4 text-sm text-destructive">Les indicateurs n’ont pas pu être chargés.</p>}
      <h2 className="mb-3 font-semibold">Territoires</h2>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Pays" value={v(d?.countries)} /><Stat label="Régions" value={v(d?.regions)} /><Stat label="Départements" value={v(d?.departments)} />
        <Stat label="Localités" value={v(d?.localities)} /><Stat label="Sites d’étude" value={v(d?.sites)} />
        <Stat label="Population géolocalisée" value={v(d?.populationGeolocated)} hint="Somme des populations renseignées (source indiquée par localité)" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <section className="border border-border bg-background p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Ressources</h2><Link to="/resources" className="text-sm text-primary">Ouvrir</Link></div>
          <p className="mt-1 text-xs text-muted-foreground">{v(d?.resources)} fiche(s) · {v(d?.resourcesValidated)} validée(s) · {v(d?.localitiesWithResources)} localité(s) couvertes</p>
          <ul className="mt-4 space-y-2 text-sm">
            {(["solar", "wind", "biomass", "waste"] as const).map((t) => <li key={t} className="flex justify-between border-b border-border pb-2"><span>{{ solar: "Solaire", wind: "Éolien", biomass: "Biomasse", waste: "Déchets" }[t]}</span><span className="tabular-nums">{v(d?.resourcesByType[t])}</span></li>)}
          </ul>
        </section>
        <section className="border border-border bg-background p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Demande énergétique</h2><Link to="/demand" className="text-sm text-primary">Ouvrir</Link></div>
          <p className="mt-1 text-xs text-muted-foreground">{v(d?.demands)} enregistrement(s) de demande</p>
          {d && Object.keys(d.demandByStatus).length > 0 && (
            <p className="mt-1 text-xs text-muted-foreground">{Object.entries(d.demandByStatus).map(([s, n]) => `${STATUS_LABELS[s] ?? s} : ${n}`).join(" · ")}</p>
          )}
          {d && Object.keys(d.demandBySector).length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Aucune demande enregistrée.</p> : (
            <ul className="mt-4 space-y-2 text-sm">
              {Object.entries(d?.demandBySector ?? {}).map(([s, x]) => (
                <li key={s} className="border-b border-border pb-2">
                  <div className="flex justify-between"><span>{s}</span><span className="text-muted-foreground tabular-nums">{x.count} demande(s)</span></div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-muted-foreground">Mesuré{x.measuredSkipped ? ` (${x.measuredSkipped} exclu : mesures incohérentes)` : ""}</span>
                    <span className="tabular-nums">{x.withMeasured ? `${fmt(Math.round(x.measuredKwh))} kWh (${x.withMeasured}/${x.count})` : "—"}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Estimé (inventaire, mois de 30 j)</span>
                    <span className="tabular-nums">{x.withEstimate ? `${fmt(Math.round(x.estimatedMonthlyKwh))} kWh/mois (${x.withEstimate}/${x.count})` : "—"}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Valeurs mesurées issues des relevés enregistrés ; valeurs estimées calculées depuis l’inventaire d’équipements. Les deux ne sont jamais confondues ni additionnées.</p>
        </section>
        <section className="border border-border bg-background p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">Projets</h2><Link to="/projects" className="text-sm text-primary">Ouvrir</Link></div>
          <p className="mt-1 text-xs text-muted-foreground">{v(d?.projects)} projet(s) · {v(d?.simulations)} simulation(s) · {v(d?.scenarios)} scénario(s)</p>
          <ul className="mt-4 space-y-2 text-sm">
            {Object.entries(d?.projectsByStatus ?? {}).map(([s, n]) => <li key={s} className="flex justify-between border-b border-border pb-2"><span>{STATUS[s] ?? s}</span><span className="tabular-nums">{n}</span></li>)}
          </ul>
          {(d?.recentProjects ?? []).length > 0 && <div className="mt-4 space-y-1 text-sm">{d!.recentProjects.map((p: any) => <Link key={p.id} to="/projects/$id" params={{ id: p.id }} className="block truncate text-primary hover:underline">{p.name}</Link>)}</div>}
        </section>
      </div>

      <section className="mt-6 border border-border bg-background p-5">
        <h2 className="font-semibold">Carte des localités et sites</h2>
        <p className="mb-4 text-sm text-muted-foreground">{points.length} point(s) avec coordonnées GPS enregistrées.</p>
        {!isLoading && <TerritoryMap points={points} />}
      </section>
    </WorkspacePage>
  );
}
