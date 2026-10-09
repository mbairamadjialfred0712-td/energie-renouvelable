import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Pencil, Sparkles, Trash2, XCircle } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { deleteSolar, getSolar, getSolarAccess, setSolarStatus } from "@/lib/solar.functions";
import { runResourcePreAnalysis, listResources } from "@/lib/resources.functions";
import { SolarForm } from "@/features/resources/solar/solar-form";
import { SolarComparison } from "@/features/resources/solar/solar-compare";
import { HELP, solarWarnings, type SolarStatus } from "@/features/resources/solar/solar-model";
import { NatureBadge, StatusBadge, fmt, periodText } from "@/features/resources/solar/solar-ui";

export const Route = createFileRoute("/_authenticated/resources/solar/$id")({
  head: () => ({ meta: [{ title: "Fiche ressource solaire — Énergie Renouvelable" }, { name: "description", content: "Fiche détaillée d’un jeu de données solaires : localisation, GHI/DNI/DHI, températures, source, qualité et comparaison." }, { property: "og:title", content: "Fiche ressource solaire — Énergie Renouvelable" }, { property: "og:description", content: "Jeu de données solaires tracé : unités, source, période et statut." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: SolarDetail,
});

function Row({ label, value, help }: { label: string; value: React.ReactNode; help?: string | undefined }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0"><dt className="text-muted-foreground" title={help}>{label}</dt><dd className="text-right font-medium tabular-nums">{value}</dd></div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-border bg-background p-5"><h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</h2><dl>{children}</dl></section>;
}

function SolarDetail() {
  const { id } = Route.useParams(); const qc = useQueryClient(); const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["solar", id], queryFn: () => getSolar({ data: { id } }) });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const { data: analyses } = useQuery({ queryKey: ["resources", "solar"], queryFn: () => listResources({ data: { type: "solar" } }) });
  const [editing, setEditing] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const status = useMutation({ mutationFn: (s: SolarStatus) => setSolarStatus({ data: { id, status: s } }), onSuccess: () => qc.invalidateQueries(), onError: (e: Error) => setMsg(e.message) });
  const analyse = useMutation({ mutationFn: () => runResourcePreAnalysis({ data: { id } }), onSuccess: () => qc.invalidateQueries(), onError: (e: Error) => setMsg(e.message) });

  if (isLoading) return <WorkspacePage eyebrow="Ressources / Solaire" title="Chargement…" description=""><span /></WorkspacePage>;
  if (!data) return <WorkspacePage eyebrow="Ressources / Solaire" title="Jeu introuvable" description="Ce jeu de données n’existe pas ou n’est pas accessible."><Link to="/resources/solar" className="text-primary">← Retour</Link></WorkspacePage>;
  const r = data.item;
  const canEdit = !!access && (access.isAdmin || (access.canWrite && access.userId === r.owner_id));
  const analysis = analyses?.find((a) => a.id === id)?.latest_analysis;
  const warnings = solarWarnings({ ...r, periodStart: r.period_start, periodEnd: r.period_end });

  const actions = canEdit && !editing ? (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil />Modifier</Button>
      {r.status !== "validated" && <Button size="sm" onClick={() => status.mutate("validated")}><CheckCircle2 />Valider</Button>}
      {r.status !== "rejected" && <Button variant="outline" size="sm" onClick={() => status.mutate("rejected")}><XCircle />Rejeter</Button>}
      {r.status !== "archived" && <Button variant="outline" size="sm" onClick={() => status.mutate("archived")}><Archive />Archiver</Button>}
      <Button variant="ghost" size="sm" onClick={async () => { if (!confirm("Supprimer définitivement ce jeu de données ?")) return; try { await deleteSolar({ data: { id } }); qc.invalidateQueries(); navigate({ to: "/resources/solar" }); } catch (e) { setMsg((e as Error).message); } }}><Trash2 />Supprimer</Button>
    </div>
  ) : null;

  return (
    <WorkspacePage eyebrow="Ressources / Solaire" title={`${r.locality_name ?? "—"}${r.site_name ? ` · ${r.site_name}` : ""}`} description={`Source : ${r.source} · Période : ${periodText(r)}`} action={actions}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><StatusBadge status={r.status} /><NatureBadge nature={r.data_nature} />
        {r.status !== "validated" && <span className="text-xs text-muted-foreground">Donnée provisoire : non utilisée par défaut par les futurs moteurs de calcul.</span>}
        <Link to="/geography/localities/$id" params={{ id: r.locality_id }} className="ml-auto text-sm text-primary hover:underline">Voir la localité →</Link>
      </div>
      {msg && <p className="mb-4 text-sm text-destructive">{msg}</p>}
      {editing ? (
        <SolarForm row={r} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries(); }} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Localisation">
              <Row label="Pays / Région / Département" value={[r.country, r.region, r.department].filter(Boolean).join(" / ") || "—"} />
              <Row label="Localité" value={r.locality_name} /><Row label="Site d’étude" value={r.site_name ?? "—"} />
              <Row label="Coordonnées" value={(r.site_latitude ?? r.latitude) !== null ? `${fmt(r.site_latitude ?? r.latitude)}°, ${fmt(r.site_longitude ?? r.longitude)}°${r.site_latitude !== null ? " (site)" : " (localité)"}` : "Non renseignées"} />
            </Card>
            <Card title="Ressource solaire">
              <Row label="GHI" help={HELP["ghi"]} value={fmt(r.ghi, r.ghiUnit)} /><Row label="DNI" help={HELP["dni"]} value={fmt(r.dni, r.dniUnit)} /><Row label="DHI" help={HELP["dhi"]} value={fmt(r.dhi, r.dhiUnit)} />
              <Row label="Irradiation annuelle" value={fmt(r.annual, "kWh/m²/an")} />
              <Row label="Température moy. / min / max" value={`${fmt(r.tavg)} / ${fmt(r.tmin)} / ${fmt(r.tmax)} °C`} />
              <Row label="Ensoleillement" help={HELP["sunshine"]} value={fmt(r.sunshine, r.sunshineUnit)} />
            </Card>
            <Card title="Source">
              <Row label="Origine" value={r.source} /><Row label="Référence" value={r.reference ?? "—"} /><Row label="Période" value={periodText(r)} />
              <Row label="Méthode d’obtention" value={r.acquisition_method ?? "—"} /><Row label="Date de collecte" value={r.collected_on ?? "—"} />
            </Card>
            <Card title="Qualité">
              <Row label="Statut" value={<StatusBadge status={r.status} />} /><Row label="Qualité" value={r.quality ?? "—"} />
              <Row label="Notes" value={<span className="whitespace-pre-wrap font-normal">{r.notes ?? "—"}</span>} />
              <Row label="Dernière modification" value={new Date(r.updated_at).toLocaleString("fr-FR")} />
            </Card>
          </div>
          {warnings.length > 0 && <div className="border border-border bg-muted p-3 text-sm"><p className="font-medium">Points inhabituels à vérifier :</p><ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          <section className="border border-border bg-background p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Pré-analyse IA</h2>
              {canEdit && <Button size="sm" variant="outline" disabled={analyse.isPending} onClick={() => analyse.mutate()}><Sparkles />{analyse.isPending ? "Analyse…" : "Lancer"}</Button>}</div>
            {analysis?.status === "completed" ? (
              <div className="space-y-3 text-sm">{([["Informations manquantes", analysis.missing_information], ["Hypothèses déclarées", analysis.declared_assumptions], ["Points à vérifier", analysis.verification_points]] as const).map(([t, items]) => (
                <div key={t}><p className="font-semibold">{t} ({items.length})</p><ul className="mt-1 space-y-1">{items.map((it, i) => <li key={i} className="border-l-2 border-primary pl-3"><b>{it.title}</b> — <span className="text-muted-foreground">{it.explanation}</span></li>)}</ul></div>))}
                <p className="text-xs text-muted-foreground">{analysis.scope_note}</p></div>
            ) : <p className="text-sm text-muted-foreground">{analysis?.status === "failed" ? analysis.error_message : "Aucune pré-analyse. Elle signale les manques sans calculer ni inventer de valeur."}</p>}
          </section>
          <section><h2 className="mb-3 text-lg font-semibold">Autres jeux pour cette localité</h2><SolarComparison rows={data.siblings} currentId={r.id} /></section>
        </div>
      )}
    </WorkspacePage>
  );
}
