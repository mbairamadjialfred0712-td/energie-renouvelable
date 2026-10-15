import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getSolarAccess } from "@/lib/solar.functions";
import { listBiomass } from "@/lib/biomass.functions";
import { listResources } from "@/lib/resources.functions";
import { BIOMASS_NATURES, BIOMASS_STATUSES, BIOMASS_TYPES, LHV_BASES } from "@/features/resources/biomass/biomass-model";
import { BiomassCharts, BiomassNatureBadge, BiomassStatusBadge, fmt, lhvText, periodText, typeText } from "@/features/resources/biomass/biomass-ui";
import { ResourceEvolution } from "@/features/resources/resource-evolution";
import { BiomassReferences } from "@/features/resources/biomass-references";

const META = "Jeux de données de biomasse par localité ou site : type, quantité, humidité, PCI et disponibilité — avec unités, sources, périodes et statut.";
export const Route = createFileRoute("/_authenticated/resources/biomass/")({
  head: () => ({ meta: [{ title: "Ressource biomasse — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Ressource biomasse — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: BiomassList,
});

const sel = "h-9 border border-input bg-background px-2 text-sm";

function BiomassList() {
  const { data: rows, isLoading, error } = useQuery({ queryKey: ["biomass"], queryFn: () => listBiomass() });
  const { data: evo } = useQuery({ queryKey: ["resources", "biomass"], queryFn: () => listResources({ data: { type: "biomass" } }) });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [nature, setNature] = useState(""); const [loc, setLoc] = useState(""); const [type, setType] = useState(""); const [basis, setBasis] = useState("");
  const all = rows ?? [];
  const localities = [...new Map(all.map((r) => [r.locality_id, r.locality_name ?? "—"])).entries()];
  const shown = all.filter((r) => (!status || r.status === status) && (!nature || r.data_nature === nature) && (!loc || r.locality_id === loc) && (!type || r.type === type) && (!basis || r.lhv_basis === basis) &&
    (!q || `${r.locality_name} ${r.site_name ?? ""} ${typeText(r)} ${r.source} ${r.reference ?? ""} ${r.quality ?? ""} ${periodText(r)}`.toLowerCase().includes(q.toLowerCase())));
  const ids = new Set(shown.map((r) => r.id));
  const action = access?.canWrite ? <Button asChild><Link to="/resources/biomass/new"><Plus />Nouveau jeu</Link></Button> : null;

  return (
    <WorkspacePage eyebrow="Ressources / Biomasse" title="Ressource biomasse" description={META} action={action}>
      {access && !access.canWrite && <p className="mb-4 border border-border bg-muted p-3 text-sm">Votre rôle est en lecture seule. Un administrateur peut vous attribuer le rôle Ingénieur pour saisir des données.</p>}
      <div className="mb-4 grid gap-3 sm:grid-cols-4">{[["Jeux enregistrés", all.length], ["Jeux validés", all.filter((r) => r.status === "validated").length], ["Types distincts", new Set(all.map((r) => r.type)).size], ["Localités couvertes", localities.length]].map(([k, v]) => <div key={k} className="border border-border bg-background p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-xl font-semibold tabular-nums">{v}</p></div>)}</div>
      <div className="mb-4 flex flex-wrap gap-2">
        <input aria-label="Rechercher" placeholder="Rechercher (localité, type, source, période…)" className={`${sel} min-w-64 flex-1`} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Filtrer par localité" className={sel} value={loc} onChange={(e) => setLoc(e.target.value)}><option value="">Toutes localités</option>{localities.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
        <select aria-label="Filtrer par type" className={sel} value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous types</option>{BIOMASS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        <select aria-label="Filtrer par base du PCI" className={sel} value={basis} onChange={(e) => setBasis(e.target.value)}><option value="">Toutes bases PCI</option>{Object.entries(LHV_BASES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Filtrer par statut" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option>{Object.entries(BIOMASS_STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <select aria-label="Filtrer par origine" className={sel} value={nature} onChange={(e) => setNature(e.target.value)}><option value="">Toutes origines</option>{Object.entries(BIOMASS_NATURES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      </div>
      {error && <p className="text-destructive">{(error as Error).message}</p>}
      {isLoading ? <p className="text-muted-foreground">Chargement…</p> : all.length === 0 ? (
        <EmptyState title="Aucune donnée de biomasse" description="Aucun jeu de biomasse combustible n’est enregistré. Aucune valeur n’est affichée tant qu’elle n’a pas été saisie avec sa source." />
      ) : (
        <>
          <BiomassCharts rows={shown} />
          <ResourceEvolution rows={(evo ?? []).filter((r) => ids.has(r.id))} type="biomass" />
          <div className="overflow-x-auto border border-border bg-background">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs uppercase text-muted-foreground"><tr>{["Localité / site", "Type", "Quantité", "Humidité", "PCI", "Source", "Période", "Origine", "Statut"].map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/50">
                    <td className="px-3 py-2"><Link to="/resources/biomass/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.locality_name}</Link>{r.site_name && <span className="block text-xs text-muted-foreground">Site : {r.site_name}</span>}</td>
                    <td className="px-3 py-2">{typeText(r)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(r.quantity, r.unit)}</td>
                    <td className="px-3 py-2 tabular-nums">{fmt(r.moisture, "%")}</td>
                    <td className="px-3 py-2 tabular-nums">{lhvText(r)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.source}</td>
                    <td className="px-3 py-2 text-muted-foreground">{periodText(r)}</td>
                    <td className="px-3 py-2"><BiomassNatureBadge nature={r.data_nature} /></td>
                    <td className="px-3 py-2"><BiomassStatusBadge status={r.status} /></td>
                  </tr>
                ))}
                {shown.length === 0 && <tr><td colSpan={9} className="px-3 py-6 text-center text-muted-foreground">Aucun résultat pour ces filtres.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="mt-8"><BiomassReferences /></div>
    </WorkspacePage>
  );
}
