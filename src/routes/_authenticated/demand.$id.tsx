import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { deleteDemand, getDemand, getDemandAccess, setDemandStatus } from "@/lib/demand.functions";
import { METHODS, PRIORITIES, STATUSES, SUPPLY_SOURCES, equipmentEnergy } from "@/features/demand/demand-engine";
import { ConsumptionSummary, DemandCharts, DemandStatusBadge, categoryText, fmt, periodText } from "@/features/demand/demand-ui";

const META = "Fiche détaillée d’une demande énergétique : localisation, équipements, consommation, profil, sources, hypothèses et historique.";
export const Route = createFileRoute("/_authenticated/demand/$id")({
  head: () => ({ meta: [{ title: "Fiche demande énergétique — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Fiche demande énergétique — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: DemandDetail,
});

const H = ({ children }: { children: React.ReactNode }) => <h2 className="mt-8 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{children}</h2>;
function Dl({ items }: { items: [string, React.ReactNode][] }) {
  return <dl className="mt-3 grid gap-x-6 gap-y-2 border border-border bg-background p-4 text-sm sm:grid-cols-2">{items.map(([k, v]) => <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2"><dt className="text-muted-foreground">{k}</dt><dd className="break-words">{v ?? "—"}</dd></div>)}</dl>;
}
const yn = (v: boolean | null | undefined) => (v == null ? "—" : v ? "Oui" : "Non");

function DemandDetail() {
  const { id } = Route.useParams(); const navigate = useNavigate(); const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["demand", id], queryFn: () => getDemand({ data: { id } }) });
  const { data: access } = useQuery({ queryKey: ["demand-access"], queryFn: () => getDemandAccess() });
  const setStatus = useServerFn(setDemandStatus); const del = useServerFn(deleteDemand);
  const [msg, setMsg] = useState<string | null>(null);
  if (isLoading) return <WorkspacePage eyebrow="Données / Demande" title="Demande" description="Chargement…"><span /></WorkspacePage>;
  if (error || !data) return <WorkspacePage eyebrow="Données / Demande" title="Demande introuvable" description="Cette fiche n’existe pas ou vous n’y avez pas accès."><Link to="/demand" className="text-primary">Retour</Link></WorkspacePage>;
  const d = data.item; const s = d.supply;
  const canEdit = !!access && (access.isAdmin || (access.canWrite && d.owner_id === access.userId));
  const change = async (status: keyof typeof STATUSES) => { try { await setStatus({ data: { id, status } }); setMsg(null); qc.invalidateQueries(); } catch (e) { setMsg((e as Error).message); } };
  return <WorkspacePage eyebrow="Données / Demande" title={d.name} description={`${categoryText(d)} · ${d.locality_name ?? ""} · ${periodText(d)}`}
    action={canEdit ? <div className="flex gap-2"><Button asChild variant="outline"><Link to="/demand/$id/edit" params={{ id }}><Pencil />Modifier</Link></Button><Button variant="ghost" aria-label="Supprimer" onClick={async () => { if (!confirm("Supprimer définitivement cette demande ?")) return; try { await del({ data: { id } }); qc.invalidateQueries(); navigate({ to: "/demand" }); } catch (e) { setMsg((e as Error).message); } }}><Trash2 /></Button></div> : null}>
    <div className="flex flex-wrap items-center gap-2"><DemandStatusBadge status={d.status} />
      {canEdit && Object.entries(STATUSES).filter(([k]) => k !== d.status && (access!.canValidate || !["validated", "rejected"].includes(k))).map(([k, l]) => <Button key={k} size="sm" variant="outline" onClick={() => change(k as keyof typeof STATUSES)}>{k === "validated" ? "Valider" : k === "rejected" ? "Rejeter" : `→ ${l}`}</Button>)}
      {!canEdit && <span className="text-xs text-muted-foreground">Consultation seule</span>}</div>
    {msg && <p role="alert" className="mt-2 text-sm text-destructive">{msg}</p>}
    <H>Identité et localisation</H>
    <Dl items={[["Catégorie", categoryText(d)], ["Consommateur", d.consumer_name], ["Usagers / habitants", d.users_count?.toLocaleString("fr-FR")], ["Pays", d.country], ["Région", d.region], ["Département", d.department], ["Localité", <Link to="/geography/localities/$id" params={{ id: d.locality_id }} className="text-primary hover:underline">{d.locality_name}</Link>], ["Site", d.site_name], ["Description", d.description]]} />
    <H>Équipements ({d.equipment.length})</H>
    {!d.equipment.length ? <p className="mt-3 text-sm text-muted-foreground">Aucun équipement inventorié.</p> : <div className="mt-3 overflow-x-auto border border-border bg-background"><table className="w-full text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-2">Équipement</th><th className="p-2">Qté</th><th className="p-2">P unitaire</th><th className="p-2">h/j</th><th className="p-2">j/sem</th><th className="p-2">Facteur</th><th className="p-2">Priorité</th><th className="p-2">kWh/j (moy.)</th></tr></thead>
      <tbody className="divide-y divide-border">{d.equipment.map((e) => <tr key={e.id}><td className="p-2">{e.name}{e.category ? ` · ${e.category}` : ""}</td><td className="p-2">{e.quantity}</td><td className="p-2">{fmt(e.unit_power, e.power_unit, 4)}</td><td className="p-2">{e.hours_per_day}</td><td className="p-2">{e.days_per_week}</td><td className="p-2">{e.usage_factor != null ? <span title={`${e.usage_factor_definition} — ${e.usage_factor_source}`}>{e.usage_factor}</span> : "—"}</td><td className="p-2">{PRIORITIES[e.priority]}</td><td className="p-2">{fmt(equipmentEnergy(e)?.avgDailyKwh, "")}</td></tr>)}</tbody></table></div>}
    <H>Résumé de consommation</H><div className="mt-3"><ConsumptionSummary d={d} /></div>
    <H>Visualisations</H><div className="mt-3"><DemandCharts d={d} /></div>
    <H>Profil et hypothèses</H>
    <Dl items={[["Période de référence", periodText(d)], ["Jours ouvrés / non ouvrés", d.weekday_variation], ["Variation saisonnière", d.seasonal_variation], ["Croissance prévisionnelle", d.growth_rate_pct != null ? `${d.growth_rate_pct} %/an (hypothèse)` : null], ["Historique de consommation", yn(d.has_history)], ["Criticité", d.criticality], ["Hypothèses", d.assumptions]]} />
    <H>Alimentation existante et contraintes</H>
    <Dl items={[["Source actuelle", s.current_source ? SUPPLY_SOURCES[s.current_source as keyof typeof SUPPLY_SOURCES] : null], ["Fiabilité", s.reliability], ["Coupures mesurées", s.outage_hours != null ? `${s.outage_hours} h/jour` : null], ["Groupe électrogène", yn(s.has_genset)], ["Installation existante", s.existing_installation], ["Autonomie souhaitée", s.autonomy], ["Délestage", s.load_shedding], ["Charges critiques", s.critical_loads], ["Contraintes du site", s.site_constraints]]} />
    <H>Sources et validation</H>
    <Dl items={[["Source", d.source], ["Référence", d.reference], ["Méthode", d.acquisition_method ? METHODS[d.acquisition_method as keyof typeof METHODS] : null], ["Unité / base temporelle", d.data_time_basis], ["Auteur de la collecte", d.collected_by], ["Commentaires", d.comments], ["Créée le", new Date(d.created_at).toLocaleString("fr-FR")], ["Modifiée le", new Date(d.updated_at).toLocaleString("fr-FR")]]} />
    <H>Historique des modifications</H>
    <ul className="mt-3 divide-y divide-border border border-border bg-background text-sm">{data.history.map((h) => <li key={h.id} className="px-4 py-2"><span className="text-muted-foreground">{new Date(h.created_at).toLocaleString("fr-FR")}</span> · {h.action === "created" ? "Création" : h.action === "status" ? "Changement de statut" : "Modification"}{h.action !== "created" && <span className="text-muted-foreground"> — {Object.keys(h.changes).join(", ")}</span>}</li>)}{!data.history.length && <li className="px-4 py-2 text-muted-foreground">Aucun historique.</li>}</ul>
  </WorkspacePage>;
}
