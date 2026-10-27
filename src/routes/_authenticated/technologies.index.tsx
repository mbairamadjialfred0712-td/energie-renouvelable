import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { listTechnologyCatalog } from "@/lib/storage.functions";

const META = "Référentiel des technologies étudiées : données d'entrée, moteurs de calcul disponibles et limites de chaque filière.";

type Tab = "pv" | "battery" | "csp" | "wind" | "biomass";
type Action =
  | { label: string; kind: "sim"; tab: Tab }
  | { label: string; kind: "link"; to: "/resources/solar" | "/resources/wind" | "/resources/biomass" | "/technologies/storage" | "/geography/weather" };

/** Ce qui existe réellement dans l'application pour chaque filière. */
const TECH: Record<string, { status: string; scope: string; actions: Action[] }> = {
  PV: {
    status: "Moteur disponible",
    scope: "Simulation horaire PVWatts v8 (NREL PySAM) sur une année météo validée de 8 760 h.",
    actions: [{ label: "Accéder à la simulation", kind: "sim", tab: "pv" }, { label: "Ressources solaires", kind: "link", to: "/resources/solar" }, { label: "Météo par site", kind: "link", to: "/geography/weather" }],
  },
  WIND: {
    status: "Moteur disponible",
    scope: "Niveaux A (statistiques de vent), B (flux cinétique) et C (courbe de puissance documentée) sur météo horaire validée.",
    actions: [{ label: "Accéder à la simulation", kind: "sim", tab: "wind" }, { label: "Ressources éoliennes", kind: "link", to: "/resources/wind" }],
  },
  BATTERY: {
    status: "Moteur disponible",
    scope: "Bilan horaire PV + batterie à partir d'une fiche validée et d'une simulation PV terminée du même projet.",
    actions: [{ label: "Bibliothèque des fiches", kind: "link", to: "/technologies/storage" }, { label: "Accéder à la simulation", kind: "sim", tab: "battery" }],
  },
  BIOMASS: {
    status: "Bilan limité",
    scope: "Énergie primaire uniquement (t/an × PCI). Aucune conversion thermique ou électrique n'est calculée.",
    actions: [{ label: "Calculer le bilan primaire", kind: "sim", tab: "biomass" }, { label: "Ressources biomasse", kind: "link", to: "/resources/biomass" }],
  },
  CSP: {
    status: "Bilan limité",
    scope: "Bilan DNI limité, sans dispatch ni production électrique ; résultats non disponibles marqués comme tels.",
    actions: [{ label: "Accéder au bilan CSP", kind: "sim", tab: "csp" }, { label: "Météo par site", kind: "link", to: "/geography/weather" }],
  },
};

export const Route = createFileRoute("/_authenticated/technologies/")({
  head: () => ({ meta: [{ title: "Technologies — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Technologies — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Overview,
});

const btn = "inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted";

function Overview() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["technology-catalog"], queryFn: () => listTechnologyCatalog() });
  return <WorkspacePage eyebrow="Référentiel technique" title="Technologies" description={META}>
    {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : error ? <p className="text-sm text-destructive">Le catalogue n'a pas pu être chargé.</p> :
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.map((t) => {
        const cfg = TECH[t.code];
        return <article key={t.id} className="flex flex-col border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t.category}</p>
            <Badge variant={cfg?.status === "Moteur disponible" ? "default" : "secondary"}>{cfg?.status ?? "Informatif"}</Badge>
          </div>
          <h2 className="mt-1 font-semibold">{t.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{cfg?.scope ?? t.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">Résultats indicatifs, à valider par l'ingénieur.</p>
          {cfg && <div className="mt-auto flex flex-wrap gap-2 pt-4">{cfg.actions.map((a, i) => a.kind === "sim"
            ? <Link key={i} to="/simulations/new" search={{ tab: a.tab }} className={`${btn} ${i === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}>{a.label}<ArrowRight className="h-3.5 w-3.5" /></Link>
            : <Link key={i} to={a.to} className={`${btn} ${i === 0 ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}>{a.label}<ArrowRight className="h-3.5 w-3.5" /></Link>)}</div>}
        </article>;
      })}</div>}
  </WorkspacePage>;
}
