import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Plus } from "lucide-react";
import { demandsToCsv, downloadCsv } from "@/features/demand/demand-csv";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getDemandAccess, listDemands } from "@/lib/demand.functions";
import { CATEGORIES, STATUSES, inventoryTotal } from "@/features/demand/demand-engine";
import { CategoryChart, DemandStatusBadge, categoryText, fmt, periodText } from "@/features/demand/demand-ui";

const META = "Collectez, consultez et validez les besoins énergétiques des localités et sites, avec équipements, mesures, sources et statuts.";
export const Route = createFileRoute("/_authenticated/demand/")({
  head: () => ({ meta: [{ title: "Demande énergétique — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Demande énergétique — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DemandList,
});

const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";
function DemandList() {
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ["demands"], queryFn: () => listDemands() });
  const { data: access } = useQuery({ queryKey: ["demand-access"], queryFn: () => getDemandAccess() });
  const [q, setQ] = useState(""); const [cat, setCat] = useState(""); const [st, setSt] = useState(""); const [year, setYear] = useState("");
  const years = [...new Set(rows.flatMap((r) => [r.period_start, r.period_end]).filter(Boolean).map((d) => d!.slice(0, 4)))].sort();
  const shown = useMemo(() => rows.filter((r) => {
    const hay = [r.name, r.locality_name, r.site_name, CATEGORIES[r.category], r.consumer_detail, r.consumer_name].join(" ").toLowerCase();
    if (q && !hay.includes(q.toLowerCase())) return false;
    if (cat && r.category !== cat) return false;
    if (st && r.status !== st) return false;
    if (year && !((r.period_start ?? "9999") <= `${year}-12-31` && (r.period_end ?? r.period_start ?? "0000") >= `${year}-01-01`)) return false;
    return true;
  }), [rows, q, cat, st, year]);
  const measured = rows.filter((r) => r.measurements.length).length;
  const inventories = rows.filter((r) => inventoryTotal(r.equipment).complete).length;
  return <WorkspacePage eyebrow="Données / Demande" title="Demande énergétique" description={META}
    action={<div className="flex gap-2"><Button variant="outline" disabled={!shown.length} onClick={() => downloadCsv(demandsToCsv(shown), `demandes-energetiques-${new Date().toISOString().slice(0, 10)}.csv`)}><Download />Exporter CSV ({shown.length})</Button>{access?.canWrite && <Button asChild><Link to="/demand/new"><Plus />Nouvelle demande</Link></Button>}</div>}>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[["Fiches", rows.length], ["Validées", rows.filter((r) => r.status === "validated").length], ["Avec mesures", measured], ["Inventaires complets", inventories]].map(([l, v]) => <div key={l} className="border border-border bg-background p-4"><p className="text-xs text-muted-foreground">{l}</p><p className="mt-1 text-2xl font-semibold">{v}</p></div>)}
    </div>
    <div className="mt-4 grid gap-2 border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <input className={sel} placeholder="Rechercher : nom, localité, site, catégorie" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Catégorie" className={sel} value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Toutes catégories</option>{Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select aria-label="Statut" className={sel} value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tous statuts</option>{Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select aria-label="Période" className={sel} value={year} onChange={(e) => setYear(e.target.value)}><option value="">Toutes périodes</option>{years.map((y) => <option key={y}>{y}</option>)}</select>
    </div>
    <div className="mt-4">
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !rows.length ? <EmptyState title="Aucune demande énergétique" description="Aucune donnée n’est enregistrée. Les indicateurs et graphiques apparaîtront à partir des fiches saisies." /> :
        <div className="overflow-x-auto border border-border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">Étude</th><th className="p-3">Catégorie</th><th className="p-3">Localité / site</th><th className="p-3">Période</th><th className="p-3">Estimation (kWh/j)</th><th className="p-3">Mesures</th><th className="p-3">Statut</th></tr></thead>
          <tbody className="divide-y divide-border">{shown.map((r) => { const inv = inventoryTotal(r.equipment); return <tr key={r.id}><td className="p-3"><Link to="/demand/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.name}</Link></td><td className="p-3">{categoryText(r)}</td><td className="p-3">{r.locality_name ?? "—"}{r.site_name ? ` · ${r.site_name}` : ""}</td><td className="p-3">{periodText(r)}</td><td className="p-3">{inv.complete ? fmt(inv.avgDailyKwh, "") : "—"}</td><td className="p-3">{r.measurements.length || "—"}</td><td className="p-3"><DemandStatusBadge status={r.status} /></td></tr>; })}
            {!shown.length && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Aucune fiche ne correspond aux filtres.</td></tr>}</tbody></table></div>}
    </div>
    {rows.length > 0 && <div className="mt-4"><CategoryChart rows={shown} /></div>}
  </WorkspacePage>;
}
