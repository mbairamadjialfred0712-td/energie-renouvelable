import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getTerritorySummary } from "@/lib/geography.functions";
import { WorkspacePage } from "@/components/app/page";
import { TerritoryMap, type MapPoint } from "@/features/geography/territory-map";

export const Route = createFileRoute("/_authenticated/geography/")({
  head: () => ({
    meta: [
      { title: "Territoires — Énergie Renouvelable" },
      { name: "description", content: "Hiérarchie Pays → Région → Département → Localité → Site d’étude, avec carte des coordonnées réelles." },
      { property: "og:title", content: "Territoires — Énergie Renouvelable" },
      { property: "og:description", content: "Hiérarchie territoriale et cartographie des sites d’étude énergétiques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GeographyOverview,
});

function GeographyOverview() {
  const { data, isLoading, error } = useQuery({ queryKey: ["territory-summary"], queryFn: () => getTerritorySummary() });

  const levels = [
    { label: "Pays", value: data?.countries, to: "/geography/countries" },
    { label: "Régions", value: data?.regions, to: "/geography/regions" },
    { label: "Départements", value: data?.departments, to: "/geography/departments" },
    { label: "Localités", value: data?.localities, to: "/geography/localities" },
    { label: "Sites d’étude", value: data?.sites, to: "/geography/sites" },
  ] as const;

  const points: MapPoint[] = [
    ...(data?.localityPoints ?? []).map((p) => ({ id: p.id, name: p.name, latitude: Number(p.latitude), longitude: Number(p.longitude), kind: "locality" as const, detail: p.locality_type })),
    ...(data?.sitePoints ?? []).map((p) => ({ id: p.id, name: p.name, latitude: Number(p.latitude), longitude: Number(p.longitude), kind: "site" as const, detail: p.site_type })),
  ];

  return (
    <WorkspacePage eyebrow="Référentiel territorial" title="Territoires" description="Pays → Région → Département → Localité → Site d’étude. Seules les données saisies ou importées et validées sont affichées.">
      {error && <p className="mb-5 text-sm text-destructive">{(error as Error).message}</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {levels.map((level, index) => (
          <Link key={level.to} to={level.to} className="border border-border bg-background p-5 transition-colors hover:border-primary">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Niveau {index + 1}</p>
            <p className="mt-2 text-sm font-medium">{level.label}</p>
            <p className="mt-3 text-3xl font-semibold tabular-nums">{isLoading ? "…" : level.value ?? 0}</p>
          </Link>
        ))}
      </div>

      <section className="mt-6 border border-border bg-background p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Carte des coordonnées enregistrées</h2>
            <p className="text-sm text-muted-foreground">{points.length} point(s) disposant de coordonnées GPS (WGS84, degrés décimaux). Les enregistrements sans coordonnées ne sont pas positionnés.</p>
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" />Localité</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-status-ready" />Site d’étude</span>
          </div>
        </div>
        {!isLoading && <TerritoryMap points={points} />}
      </section>
    </WorkspacePage>
  );
}
