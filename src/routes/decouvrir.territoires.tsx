import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/components/app/public-shell";
import { TerritoryMap } from "@/features/geography/territory-map";
import { getPublicTerritories } from "@/lib/public.functions";

export const Route = createFileRoute("/decouvrir/territoires")({
  head: () => ({ meta: [{ title: "Territoires de référence — Énergie Renouvelable" }, { name: "description", content: "Pays, régions, départements et localités de Côte d’Ivoire et du Togo issus de GeoNames, avec carte." }, { property: "og:title", content: "Territoires de référence — Énergie Renouvelable" }, { property: "og:description", content: "Référentiel géographique ouvert et cartographié pour les études énergétiques." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PublicTerritories,
});

const fmt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(n));

function PublicTerritories() {
  const { data, isLoading, error } = useQuery({ queryKey: ["public-territories"], queryFn: () => getPublicTerritories() });
  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl p-5 sm:p-8">
        <h1 className="text-3xl font-semibold">Territoires de référence</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Source : {data?.source ?? "GeoNames"}. Populations et altitudes issues d’une base ouverte : ce sont des estimations, pas des mesures.</p>
        {error && <p className="mt-4 text-sm text-destructive">Les données n’ont pas pu être chargées.</p>}
        <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-4">
          {[["Pays", data?.countries], ["Régions", data?.regions], ["Départements", data?.departments], ["Localités", data?.localities]].map(([l, v]) => (
            <div key={l as string} className="bg-background p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{isLoading ? "…" : fmt(v as number)}</p></div>
          ))}
        </div>
        <section className="mt-6 border border-border bg-background p-5">
          <h2 className="mb-4 font-semibold">Localités de plus de 10 000 habitants</h2>
          {data && <TerritoryMap points={data.localityRows.map((l) => ({ id: l.id, name: l.name, latitude: l.latitude, longitude: l.longitude, kind: "locality" as const, detail: l.population ? `${fmt(l.population)} hab.` : null }))} />}
        </section>
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="border border-border bg-background">
            <h2 className="border-b border-border p-4 font-semibold">Régions</h2>
            <table className="w-full text-sm"><thead className="bg-muted/60 text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Région</th><th className="px-4 py-2">Pays</th><th className="px-4 py-2 text-right">Départements</th></tr></thead>
              <tbody>{data?.regionRows.map((r) => <tr key={r.id} className="border-t border-border"><td className="px-4 py-2">{r.name}</td><td className="px-4 py-2">{r.country}</td><td className="px-4 py-2 text-right tabular-nums">{r.departments}</td></tr>)}</tbody></table>
          </section>
          <section className="border border-border bg-background">
            <h2 className="border-b border-border p-4 font-semibold">Principales localités</h2>
            <div className="max-h-[600px] overflow-y-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-muted text-left text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-2">Localité</th><th className="px-4 py-2">Département</th><th className="px-4 py-2 text-right">Population (hab.)</th></tr></thead>
              <tbody>{data?.localityRows.map((l) => <tr key={l.id} className="border-t border-border"><td className="px-4 py-2">{l.name}</td><td className="px-4 py-2 text-muted-foreground">{l.department ?? "Non précisé par la source"}</td><td className="px-4 py-2 text-right tabular-nums">{fmt(l.population)}</td></tr>)}</tbody></table></div>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
