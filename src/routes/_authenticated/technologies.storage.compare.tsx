import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { listDatasheets } from "@/lib/storage.functions";
import { CHEMISTRIES, NUMERIC } from "@/features/storage/battery-model";
import { StatusBadge, val } from "@/features/storage/battery-ui";

const META = "Comparer des fiches techniques de batteries champ par champ, avec unités et champs manquants signalés.";
export const Route = createFileRoute("/_authenticated/technologies/storage/compare")({
  validateSearch: z.object({ ids: z.string().optional() }),
  head: () => ({ meta: [{ title: "Comparaison de batteries — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Comparaison de batteries — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Compare,
});

function Compare() {
  const { ids = "" } = Route.useSearch();
  const { data: all = [] } = useQuery({ queryKey: ["battery-sheets"], queryFn: () => listDatasheets() });
  const rows = ids.split(",").map((id) => all.find((r) => r.id === id)).filter(Boolean) as typeof all;
  const fields = NUMERIC.filter((f) => rows.some((r) => r[f.key] != null));
  return <WorkspacePage eyebrow="Technologies / Stockage" title="Comparaison de fiches" description={META}>
    {rows.length < 2 ? <p className="text-sm text-muted-foreground">Sélectionnez au moins deux fiches dans la <Link to="/technologies/storage" className="text-primary">bibliothèque</Link>.</p> :
      <div className="overflow-x-auto border border-border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs"><tr><th className="p-3">Caractéristique (unité)</th>{rows.map((r) => <th key={r.id} className="p-3"><Link to="/technologies/storage/$id" params={{ id: r.id }} className="text-primary">{r.name}</Link><div className="font-normal text-muted-foreground">{r.manufacturer} · {CHEMISTRIES[r.chemistry]}</div><StatusBadge status={r.status} /></th>)}</tr></thead>
        <tbody className="divide-y divide-border">{fields.map((f) => { const missing = rows.some((r) => r[f.key] == null); return <tr key={f.key}><td className="p-3">{f.label}{f.unit ? ` (${f.unit})` : ""}{missing && <span className="ml-2 text-xs text-muted-foreground">· incomplet</span>}</td>{rows.map((r) => <td key={r.id} className={`p-3 ${r[f.key] == null ? "text-muted-foreground" : ""}`}>{r[f.key] == null ? "Non renseigné" : val(r[f.key], f.unit === "devise" ? r.currency ?? "" : f.unit ?? "")}</td>)}</tr>; })}</tbody></table>
        <p className="p-3 text-xs text-muted-foreground">Seuls les champs renseignés pour au moins une fiche sont affichés. Les coûts ne sont comparables que dans la même devise ; aucune conversion n’est faite. Les cycles annoncés dépendent de conditions propres à chaque fabricant.</p></div>}
  </WorkspacePage>;
}
