import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { GitCompare, Plus } from "lucide-react";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getStorageAccess, listDatasheets } from "@/lib/storage.functions";
import { APPLICATIONS, CHEMISTRIES, STATUSES } from "@/features/storage/battery-model";
import { StatusBadge, val } from "@/features/storage/battery-ui";

const META = "Bibliothèque des fiches techniques de batteries : fabricant, chimie, caractéristiques nominales, sources et statut de validation.";
export const Route = createFileRoute("/_authenticated/technologies/storage/")({
  head: () => ({ meta: [{ title: "Stockage par batteries — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Stockage par batteries — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: Library,
});

const sel = "h-9 rounded-md border border-input bg-background px-3 text-sm";
function Library() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading, error } = useQuery({ queryKey: ["battery-sheets"], queryFn: () => listDatasheets() });
  const { data: access } = useQuery({ queryKey: ["storage-access"], queryFn: () => getStorageAccess() });
  const [q, setQ] = useState(""); const [chem, setChem] = useState(""); const [st, setSt] = useState(""); const [app, setApp] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const shown = useMemo(() => rows.filter((r) => {
    const hay = [r.name, r.manufacturer, r.product_ref, CHEMISTRIES[r.chemistry], r.chemistry_detail].join(" ").toLowerCase();
    return (!q || hay.includes(q.toLowerCase())) && (!chem || r.chemistry === chem) && (!st || r.status === st) && (!app || r.application === app);
  }), [rows, q, chem, st, app]);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < 4 ? [...p, id] : p));
  return <WorkspacePage eyebrow="Technologies / Stockage" title="Stockage par batteries" description={META}
    action={<div className="flex gap-2">{picked.length >= 2 && <Button variant="outline" onClick={() => navigate({ to: "/technologies/storage/compare", search: { ids: picked.join(",") } })}><GitCompare />Comparer ({picked.length})</Button>}{access?.canWrite && <Button asChild><Link to="/technologies/storage/new"><Plus />Nouvelle fiche</Link></Button>}</div>}>
    <div className="grid gap-2 border border-border bg-background p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
      <input className={sel} placeholder="Rechercher : nom, fabricant, technologie, référence" value={q} onChange={(e) => setQ(e.target.value)} />
      <select aria-label="Chimie" className={sel} value={chem} onChange={(e) => setChem(e.target.value)}><option value="">Toutes chimies</option>{Object.entries(CHEMISTRIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select aria-label="Statut" className={sel} value={st} onChange={(e) => setSt(e.target.value)}><option value="">Tous statuts</option>{Object.entries(STATUSES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      <select aria-label="Application" className={sel} value={app} onChange={(e) => setApp(e.target.value)}><option value="">Toutes applications</option>{Object.entries(APPLICATIONS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
    </div>
    <div className="mt-4">
      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : isLoading ? <p className="text-sm text-muted-foreground">Chargement…</p> : !rows.length ? <EmptyState title="Aucune fiche technique" description="La bibliothèque est vide. Ajoutez des fiches à partir de documentations fabricant vérifiables." /> :
        <div className="overflow-x-auto border border-border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">Comparer</th><th className="p-3">Modèle</th><th className="p-3">Fabricant</th><th className="p-3">Chimie</th><th className="p-3">Énergie nominale</th><th className="p-3">Tension</th><th className="p-3">Cycles</th><th className="p-3">Statut</th></tr></thead>
          <tbody className="divide-y divide-border">{shown.map((r) => <tr key={r.id}><td className="p-3"><input type="checkbox" aria-label={`Comparer ${r.name}`} checked={picked.includes(r.id)} onChange={() => toggle(r.id)} /></td><td className="p-3"><Link to="/technologies/storage/$id" params={{ id: r.id }} className="font-medium text-primary hover:underline">{r.name}</Link>{r.product_ref ? <span className="text-muted-foreground"> · {r.product_ref}</span> : null}</td><td className="p-3">{r.manufacturer}</td><td className="p-3">{r.chemistry === "other" ? `Autre — ${r.chemistry_detail}` : CHEMISTRIES[r.chemistry]}</td><td className="p-3">{val(r.energy_kwh, "kWh")}</td><td className="p-3">{val(r.nominal_voltage_v, "V")}</td><td className="p-3">{val(r.cycles, "")}</td><td className="p-3"><StatusBadge status={r.status} /></td></tr>)}
            {!shown.length && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Aucune fiche ne correspond aux filtres.</td></tr>}</tbody></table></div>}
    </div>
  </WorkspacePage>;
}
