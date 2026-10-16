import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { WorkspacePage } from "@/components/app/page";
import { listTechnologyCatalog } from "@/lib/storage.functions";

const META = "Référentiel des familles de technologies étudiées par la plateforme et accès à la bibliothèque de stockage par batteries.";
export const Route = createFileRoute("/_authenticated/technologies/")({
  head: () => ({ meta: [{ title: "Technologies — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Technologies — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Overview,
});

function Overview() {
  const { data = [], isLoading } = useQuery({ queryKey: ["technology-catalog"], queryFn: () => listTechnologyCatalog() });
  return <WorkspacePage eyebrow="Référentiel technique" title="Technologies" description={META}>
    {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> :
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.map((t) => <div key={t.id} className="border border-border bg-background p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t.category}</p><h2 className="mt-1 font-semibold">{t.name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.description}</p>
        {t.code === "BATTERY" && <Link to="/technologies/storage" className="mt-3 inline-block text-sm text-primary hover:underline">Bibliothèque des fiches batteries →</Link>}
      </div>)}</div>}
  </WorkspacePage>;
}
