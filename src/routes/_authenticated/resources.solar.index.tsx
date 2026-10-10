import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getSolarAccess, listSolar } from "@/lib/solar.functions";
import { DATA_NATURES, SOLAR_STATUSES } from "@/features/resources/solar/solar-model";
import { NatureBadge, StatusBadge, fmt, periodText } from "@/features/resources/solar/solar-ui";
import { SolarEvolution } from "@/features/resources/solar/solar-evolution";

const META = "Jeux de données solaires par localité ou site : GHI, DNI, DHI, températures, ensoleillement — avec unités, sources, périodes et statut de validation.";
export const Route = createFileRoute("/_authenticated/resources/solar/")({
  head: () => ({ meta: [{ title: "Ressource solaire — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Ressource solaire — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SolarList,
});

const sel = "h-9 border border-input bg-background px-2 text-sm";

function SolarList() {
  const { data: rows, isLoading, error } = useQuery({ queryKey: ["solar"], queryFn: () => listSolar() });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [nature, setNature] = useState(""); const [loc, setLoc] = useState("");
  const all = rows ?? [];
  const localities = [...new Map(all.map((r) => [r.locality_id, r.locality_name ?? "—"])).entries()];
  const shown = all.filter((r) => (!status || r.status === status) && (!nature || r.data_nature === nature) && (!loc || r.locality_id === loc) &&
    (!q || `${r.locality_name} ${r.site_name ?? ""} ${r.source} ${r.reference ?? ""} ${r.country ?? ""}`.toLowerCase().includes(q.toLowerCase())));
  const action = access?.canWrite ? <Button asChild><Link to="/resources/solar/new"><Plus />Nouveau jeu</Link></Button> : null;

  return (
    <WorkspacePage eyebrow="Ressources / Solaire" title="Ressource solaire" description={META} action={action}>
      {access && !access.canWrite && <p className="mb-4 border border-border bg-muted p-3 text-sm">Votre rôle est en lecture seule. Un administrateur peut vous attribuer le rôle Ingénieur pour saisir des données.</p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Rechercher" placeholder="Rechercher (localité, source, référence…)" className={`${sel} min-w-64 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtrer par localité" className={sel} value={loc} onChange={(e) => setLoc(e.target.value)}><option value="">Toutes localités</option>{localities.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <select aria-label="Filtrer par statut" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option>{Object.entries(SOLAR_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Filtrer par nature" className={sel} value={nature} onChange={(e) => setNature(e.target.value)}><option value="">Toutes natures</option>{Object.entries(DATA_NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : all.length === 0 ? (
        <EmptyState title="Aucune donnée solaire" description="Aucun jeu de données solaire n’est enregistré. Aucune valeur n’est affichée tant qu’elle n’a pas été saisie avec sa source." />
      ) : (
        <>
        <SolarEvolution rows={shown} />
        <div className="overflow-x-auto border border-border bg-background">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>{["Localité / site", "GHI", "DNI", "DHI", "T moy.", "Source", "Période", "Nature", "Statut"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                  <td className="px-3 py-2"><Link to="/resources/solar/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.locality_name}</Link>{r.site_name && <span className="block text-xs text-muted-foreground">Site : {r.site_name}</span>}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(r.ghi, r.ghiUnit)}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(r.dni, r.dniUnit)}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(r.dhi, r.dhiUnit)}</td>
                  <td className="px-3 py-2 tabular-nums">{fmt(r.tavg, "°C")}</td>
                  <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                  <td className="px-3 py-2 text-muted-foreground">{periodText(r)}</td>
                  <td className="px-3 py-2"><NatureBadge nature={r.data_nature} /></td>
                  <td className="px-3 py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Aucun résultat pour ces filtres.</td></tr>}
            </tbody>
          </table>
        </div>
        </>
      )}
    </WorkspacePage>
  );
}
