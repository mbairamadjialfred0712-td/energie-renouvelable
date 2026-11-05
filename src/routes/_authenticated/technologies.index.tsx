import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sun, Wind, Leaf, Battery, ThermometerSun } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/features/catalog/use-inventory";
import { CatalogControls } from "@/features/catalog/catalog-controls";
import { catalogSearch, summarizeInventory } from "@/features/catalog/inventory";
import { listTechnologyCatalog } from "@/lib/storage.functions";
import { calculationScope } from "@/features/engine/calculation-scope";

const META = "Référentiel des technologies étudiées : données d'entrée, moteurs de calcul disponibles et limites de chaque filière.";

type Tab = "pv" | "battery" | "csp" | "wind" | "biomass";
type Action =
  | { label: string; kind: "sim"; tab: Tab }
  | { label: string; kind: "link"; to: "/resources/solar" | "/resources/wind" | "/resources/biomass" | "/technologies/storage" | "/geography/weather" };

/** Ce qui existe réellement dans l'application pour chaque filière. */
const TECH: Record<string, { status: string; scope: string; actions: Action[] }> = {
  PV: {
    status: "Implémenté · tests logiciels",
    scope: "Simulation horaire PVWatts v8 (NREL PySAM) sur une année météo validée de 8 760 h.",
    actions: [{ label: "Accéder à la simulation", kind: "sim", tab: "pv" }, { label: "Ressources solaires", kind: "link", to: "/resources/solar" }, { label: "Météo par site", kind: "link", to: "/geography/weather" }],
  },
  WIND: {
    status: "Implémenté · périmètre A/B/C",
    scope: "Niveaux A (statistiques de vent), B (flux cinétique) et C (courbe de puissance documentée) sur météo horaire validée.",
    actions: [{ label: "Accéder à la simulation", kind: "sim", tab: "wind" }, { label: "Ressources éoliennes", kind: "link", to: "/resources/wind" }],
  },
  BATTERY: {
    status: "Implémenté · stockage horaire",
    scope: "Bilan horaire PV + batterie à partir d'une fiche validée et d'une simulation PV terminée du même projet.",
    actions: [{ label: "Bibliothèque des fiches", kind: "link", to: "/technologies/storage" }, { label: "Accéder à la simulation", kind: "sim", tab: "battery" }],
  },
  BIOMASS: {
    status: "Partiel · primaire uniquement",
    scope: "Énergie primaire uniquement (t/an × PCI). Aucune conversion thermique ou électrique n'est calculée.",
    actions: [{ label: "Calculer le bilan primaire", kind: "sim", tab: "biomass" }, { label: "Ressources biomasse", kind: "link", to: "/resources/biomass" }],
  },
  CSP: {
    status: "Partiel · bilan prescrit",
    scope: "Bilan thermique signé ; électricité brute/nette conditionnelle aux paramètres et à la chaleur utile. Sans stockage ni dispatch.",
    actions: [{ label: "Accéder au bilan CSP", kind: "sim", tab: "csp" }, { label: "Ressources solaires (DNI)", kind: "link", to: "/resources/solar" }, { label: "Météo par site", kind: "link", to: "/geography/weather" }],
  },
};

export const Route = createFileRoute("/_authenticated/technologies/")({
  head: () => ({ meta: [{ title: "Technologies — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Technologies — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  validateSearch: catalogSearch,
  component: Overview,
});

const icons = { PV: Sun, WIND: Wind, BIOMASS: Leaf, BATTERY: Battery, CSP: ThermometerSun };
const engines: Record<string, string> = { PV: "photovoltaic", WIND: "wind", BIOMASS: "biomass", BATTERY: "battery", CSP: "csp" };

function Overview() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["technology-catalog"], queryFn: () => listTechnologyCatalog() });
  const filter = Route.useSearch(); const navigate = Route.useNavigate(); const inventory = useInventory(filter);
  return <WorkspacePage eyebrow="Référentiel technique" title="Technologies" description={META}>
    <CatalogControls filter={filter} localities={inventory.localities} onChange={value => navigate({ search: value, replace: true })} />
    {inventory.error && <p role="alert" className="mb-4 text-destructive">Les fiches associées n’ont pas pu être chargées. Compteurs indisponibles.</p>}
    {isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : error ? <p className="text-sm text-destructive">Le catalogue n'a pas pu être chargé.</p> :
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{data.map((t) => {
        const cfg = TECH[t.code];
        const audited = calculationScope(engines[t.code] ?? "");
        const Icon = icons[t.code as keyof typeof icons];
        const rows = t.code === "PV" || t.code === "CSP" ? inventory.solar : t.code === "WIND" ? inventory.wind : t.code === "BIOMASS" ? inventory.biomass : inventory.configs;
        const counts = summarizeInventory(rows);
        const completed = inventory.simulations.filter(r => r.engine === engines[t.code]).length;
        return <article key={t.id} className="flex flex-col border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">{t.category}</p>
            <Badge variant="secondary">{!t.active ? "Inactive" : cfg?.status ?? "Informatif"}</Badge>
          </div>
          <h2 className="mt-2 flex items-center gap-2 font-semibold">{Icon && <Icon className="h-5 w-5 text-primary" />}{t.name}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{audited?.scope ?? cfg?.scope ?? t.description}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-border py-3 text-xs">
            <div><dt className="text-muted-foreground">{t.code === "BATTERY" ? "Configurations enregistrées" : "Ressources enregistrées"}</dt><dd className="mt-1 text-lg font-semibold">{inventory.isPending || inventory.error ? "—" : counts.registered}</dd></div>
            <div><dt className="text-muted-foreground">Fiches validées</dt><dd className="mt-1 text-lg font-semibold">{inventory.isPending || inventory.error ? "—" : counts.validated}</dd></div>
            <div><dt className="text-muted-foreground">Localités couvertes</dt><dd className="mt-1 font-semibold">{inventory.isPending || inventory.error ? "—" : counts.localities}</dd></div>
            <div><dt className="text-muted-foreground">Calculs terminés (tous statuts de source)</dt><dd className="mt-1 font-semibold">{inventory.isPending || inventory.error ? "—" : completed}</dd></div>
          </dl>
          {t.code === "CSP" && <p className="mt-2 text-xs text-muted-foreground">{inventory.isPending || inventory.error ? "—" : inventory.solar.filter(r => r.dni !== null).length} fiches solaires avec DNI renseigné ; validation et météo horaire requises pour le bilan.</p>}
          {["PV", "WIND", "CSP"].includes(t.code) && <p className="mt-2 text-xs text-muted-foreground">Météo horaire : {inventory.isPending || inventory.error ? "—" : `${inventory.weather.length} fiches enregistrées, ${inventory.weather.filter(r => r.status === "validated").length} validées`}. Les fiches météo sont distinctes des ressources.</p>}
          {t.code === "BATTERY" && !inventory.error && inventory.configs.map(c => <Link key={c.id} to="/projects/$id/storage" params={{ id: c.project_id }} className="mt-2 text-xs text-primary hover:underline">Configuration du projet · {c.status === "validated" ? "Validée" : c.status}</Link>)}
          <p className="mt-2 text-xs text-muted-foreground"><strong>Entrées requises : </strong>{audited?.required ?? "Paramètres documentés requis."}</p>
          {audited && <p className="mt-2 text-xs text-muted-foreground"><strong>Limites : </strong>{audited.limits}</p>}
          <p className="mt-2 text-xs text-muted-foreground">Validation scientifique : à confirmer par l’ingénieur. Connexion du service distincte des tests et des calculs enregistrés.</p>
          {cfg && t.active && <div className="mt-auto flex flex-wrap gap-2 pt-4">{cfg.actions.map((a, i) => <Button key={i} asChild variant={i === 0 ? "default" : "outline"} size="sm" className="h-auto min-h-8 whitespace-normal text-left">{a.kind === "sim"
            ? <Link to="/simulations/new" search={{ tab: a.tab }}>{a.label}<ArrowRight /></Link>
            : <Link to={a.to} search={filter}>{a.label}<ArrowRight /></Link>}</Button>)}<Button asChild variant="ghost" size="sm"><Link to="/simulations">Résultats enregistrés<ArrowRight /></Link></Button></div>}

        </article>;
      })}</div>}
  </WorkspacePage>;
}
