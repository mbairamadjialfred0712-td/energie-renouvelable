import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicShell } from "@/components/app/public-shell";
import { Button } from "@/components/ui/button";
import { getPublicTerritories } from "@/lib/public.functions";

export const Route = createFileRoute("/decouvrir/tableau-de-bord")({
  head: () => ({ meta: [{ title: "Tableau de bord (démo) — Énergie Renouvelable" }, { name: "description", content: "Aperçu public du tableau de bord énergétique, alimenté par le référentiel territorial." }, { property: "og:title", content: "Tableau de bord (démo) — Énergie Renouvelable" }, { property: "og:description", content: "Aperçu public des indicateurs territoriaux de la plateforme." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PublicDashboard,
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);

function PublicDashboard() {
  const { data, isLoading } = useQuery({ queryKey: ["public-territories"], queryFn: () => getPublicTerritories() });
  const pop = (data?.localityRows ?? []).reduce((s, l) => s + (l.population ?? 0), 0);
  const v = (n: number | undefined) => (isLoading ? "…" : fmt(n ?? 0));
  return (
    <PublicShell>
      <main className="mx-auto max-w-7xl p-5 sm:p-8">
        <h1 className="text-3xl font-semibold">Tableau de bord énergétique — démonstration</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Les indicateurs territoriaux ci-dessous sont réels (GeoNames). Les ressources, la demande et les projets sont propres à chaque compte et ne s’affichent qu’après connexion.</p>
        <div className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
          {[["Pays", data?.countries], ["Régions", data?.regions], ["Départements", data?.departments], ["Localités", data?.localities], ["Population des localités (hab.)", pop]].map(([l, n]) => (
            <div key={l as string} className="bg-background p-5"><p className="text-sm text-muted-foreground">{l}</p><p className="mt-3 text-3xl font-semibold tabular-nums">{v(n as number)}</p></div>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Ressources (solaire, éolien, biomasse)", "Demande énergétique par secteur", "Projets par étape"].map((t) => (
            <div key={t} className="border border-dashed border-border bg-background p-6"><h2 className="font-semibold">{t}</h2><p className="mt-2 text-sm text-muted-foreground">Disponible dans votre espace, à partir de vos propres données sourcées.</p></div>
          ))}
        </div>
        <Button asChild className="mt-6"><Link to="/register">Créer un compte pour utiliser le tableau de bord</Link></Button>
      </main>
    </PublicShell>
  );
}
