import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getSolarAccess } from "@/lib/solar.functions";
import { listWind } from "@/lib/wind.functions";
import { listResources } from "@/lib/resources.functions";
import { WIND_NATURES, WIND_STATUSES } from "@/features/resources/wind/wind-model";
import { WindNatureBadge, WindStatusBadge, fmt, periodText } from "@/features/resources/wind/wind-ui";
import { ResourceEvolution } from "@/features/resources/resource-evolution";

const META = "Jeux de données de vent par localité ou site : vitesse, hauteur, direction, densité — avec unités, sources, périodes et statut de validation.";
export const Route = createFileRoute("/_authenticated/resources/wind/")({
  head: () => ({ meta: [{ title: "Ressource éolienne — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Ressource éolienne — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WindList,
});

const sel = "h-9 border border-input bg-background px-2 text-sm";

function WindList() {
  const { data: rows, isLoading, error } = useQuery({ queryKey: ["wind"], queryFn: () => listWind() });
  const { data: evo } = useQuery({ queryKey: ["resources", "wind"], queryFn: () => listResources({ data: { type: "wind" } }) });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [nature, setNature] = useState(""); const [loc, setLoc] = useState(""); const [height, setHeight] = useState("");
  const all = rows ?? [];
  const localities = [...new Map(all.map((r) => [r.locality_id, r.locality_name ?? "—"])).entries()];
  const heights = [...new Set(all.map((r) => r.height).filter((h): h is number => h !== null))].sort((a, b) => a - b);
  const shown = all.filter((r) => (!status || r.status === status) && (!nature || r.data_nature === nature) && (!loc || r.locality_id === loc) && (!height || String(r.height) === height) &&
    (!q || `${r.locality_name} ${r.site_name ?? ""} ${r.source} ${r.reference ?? ""} ${r.quality ?? ""} ${periodText(r)}`.toLowerCase().includes(q.toLowerCase())));
  const ids = new Set(shown.map((r) => r.id));
  const action = access?.canWrite ? <Button asChild><Link to="/resources/wind/new"><Plus />Nouveau jeu</Link></Button> : null;
  const validated = all.filter((r) => r.status === "validated").length;

  return (
    <WorkspacePage eyebrow="Ressources / Éolien" title="Ressource éolienne" description={META} action={action}>
      {access && !access.canWrite && <p className="mb-4 border border-border bg-muted p-3 text-sm">Votre rôle est en lecture seule. Un administrateur peut vous attribuer le rôle Ingénieur pour saisir des données.</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-3">{[["Jeux enregistrés", all.length], ["Jeux validés", validated], ["Localités couvertes", localities.length]].map(([k, v]) => <div key={k} className="border border-border bg-background p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-xl font-semibold tabular-nums">{v}</p></div>)}</div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Rechercher" placeholder="Rechercher (localité, source, période, qualité…)" className={`${sel} min-w-64 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtrer par localité" className={sel} value={loc} onChange={(e) => setLoc(e.target.value)}><option value="">Toutes localités</option>{localities.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <select aria-label="Filtrer par hauteur" className={sel} value={height} onChange={(e) => setHeight(e.target.value)}><option value="">Toutes hauteurs</option>{heights.map((h) => <option key={h} value={String(h)}>{h} m</option>)}</select>
        <select aria-label="Filtrer par statut" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option>{Object.entries(WIND_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Filtrer par nature" className={sel} value={nature} onChange={(e) => setNature(e.target.value)}><option value="">Toutes natures</option>{Object.entries(WIND_NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : all.length === 0 ? (
        <EmptyState title="Aucune donnée éolienne" description="Aucun jeu de données de vent n’est enregistré. Aucune valeur n’est affichée tant qu’elle n’a pas été saisie avec sa source." />
      ) : (
        <>
          <ResourceEvolution rows={(evo ?? []).filter((r) => ids.has(r.id))} type="wind" />
          <div className="overflow-x-auto border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>{["Localité / site", "Vitesse moy.", "Hauteur", "Direction", "Source", "Période", "Nature", "Statut"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2"><Link to="/resources/wind/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.locality_name}</Link>{r.site_name && <span className="block text-xs text-muted-foreground">Site : {r.site_name}</span>}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(r.avg, "m/s")}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(r.height, "m")}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(r.direction, "°")}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                    <td className="px-3 py-2 text-muted-foreground">{periodText(r)}</td>
                    <td className="px-3 py-2"><WindNatureBadge nature={r.data_nature} /></td>
                    <td className="px-3 py-2"><WindStatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Aucun résultat pour ces filtres.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </WorkspacePage>
  );
}
