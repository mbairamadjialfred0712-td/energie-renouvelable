import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Eye, Pencil, Sparkles, Trash2, XCircle } from "lucide-react";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { getSolarAccess } from "@/lib/solar.functions";
import { deleteWind, getWind, setWindStatus } from "@/lib/wind.functions";
import { runResourcePreAnalysis, listResources } from "@/lib/resources.functions";
import { WindForm } from "@/features/resources/wind/wind-form";
import { windWarnings, type WindStatus } from "@/features/resources/wind/wind-model";
import { WindComparison, WindDatasetCharts, WindNatureBadge, WindStatusBadge, fmt, periodText } from "@/features/resources/wind/wind-ui";

export const Route = createFileRoute("/_authenticated/resources/wind/$id")({
  head: () => ({ meta: [{ title: "Fiche ressource éolienne — Énergie Renouvelable" }, { name: "description", content: "Fiche détaillée d’un jeu de données de vent : localisation, vitesses, hauteur, direction, source, qualité et comparaison." }, { property: "og:title", content: "Fiche ressource éolienne — Énergie Renouvelable" }, { property: "og:description", content: "Jeu de données de vent tracé : unités, source, période et statut." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: WindDetail,
});

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between gap-4 border-b border-border py-2 text-sm last:border-0"><dt className="text-muted-foreground">{label}</dt><dd className="min-w-0 break-words text-right font-medium tabular-nums">{value}</dd></div>;
}
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="min-w-0 border border-border bg-background p-5"><h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{title}</h2><dl>{children}</dl></section>;
}

function WindDetail() {
  const { id } = Route.useParams(); const qc = useQueryClient(); const navigate = useNavigate();
  const { data, isLoading } = useQuery({ queryKey: ["wind", id], queryFn: () => getWind({ data: { id } }) });
  const { data: access } = useQuery({ queryKey: ["solar-access"], queryFn: () => getSolarAccess() });
  const { data: analyses } = useQuery({ queryKey: ["resources", "wind"], queryFn: () => listResources({ data: { type: "wind" } }) });
  const [editing, setEditing] = useState(false); const [msg, setMsg] = useState<string | null>(null);
  const status = useMutation({ mutationFn: (s: WindStatus) => setWindStatus({ data: { id, status: s } }), onSuccess: () => qc.invalidateQueries(), onError: (e: Error) => setMsg(e.message) });
  const analyse = useMutation({ mutationFn: () => runResourcePreAnalysis({ data: { id } }), onSuccess: () => qc.invalidateQueries(), onError: (e: Error) => setMsg(e.message) });

  if (isLoading) return <WorkspacePage eyebrow="Ressources / Éolien" title="Chargement…" description=""><span /></WorkspacePage>;
  if (!data) return <WorkspacePage eyebrow="Ressources / Éolien" title="Jeu introuvable" description="Ce jeu de données n’existe pas ou n’est pas accessible."><Link to="/resources/wind" className="text-primary">← Retour</Link></WorkspacePage>;
  const r = data.item;
  const canEdit = !!access && (access.isAdmin || (access.canWrite && access.userId === r.owner_id));
  const analysis = analyses?.find((a) => a.id === id)?.latest_analysis;
  const warnings = windWarnings({ ...r, periodStart: r.period_start, periodEnd: r.period_end, timeseries: r.timeseries ?? [], distribution: r.distribution ?? [] });

  const actions = canEdit && !editing ? (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil />Modifier</Button>
      {r.status !== "in_review" && r.status !== "validated" && <Button variant="outline" size="sm" onClick={() => status.mutate("in_review")}><Eye />En vérification</Button>}
      {r.status !== "validated" && <Button size="sm" onClick={() => status.mutate("validated")}><CheckCircle2 />Valider</Button>}
      {r.status !== "rejected" && <Button variant="outline" size="sm" onClick={() => status.mutate("rejected")}><XCircle />Rejeter</Button>}
      {r.status !== "archived" && <Button variant="outline" size="sm" onClick={() => status.mutate("archived")}><Archive />Archiver</Button>}
      <Button variant="ghost" size="sm" onClick={async () => { if (!confirm("Supprimer définitivement ce jeu de données ?")) return; try { await deleteWind({ data: { id } }); qc.invalidateQueries(); navigate({ to: "/resources/wind" }); } catch (e) { setMsg((e as Error).message); } }}><Trash2 />Supprimer</Button>
    </div>
  ) : null;

  return (
    <WorkspacePage eyebrow="Ressources / Éolien" title={`${r.locality_name ?? "—"}${r.site_name ? ` · ${r.site_name}` : ""}`} description={`Source : ${r.source} · Période : ${periodText(r)}`} action={actions}>
      <div className="mb-4 flex flex-wrap items-center gap-2"><WindStatusBadge status={r.status} /><WindNatureBadge nature={r.data_nature} />
        {(r.data_nature === "estimate" || r.data_nature === "assumption") && <span className="text-xs font-medium">Valeur non mesurée.</span>}
        {r.status !== "validated" && <span className="text-xs text-muted-foreground">Donnée provisoire : non utilisée par les calculs de projet.</span>}
        <Link to="/geography/localities/$id" params={{ id: r.locality_id }} className="ml-auto text-sm text-primary hover:underline">Voir la localité →</Link>
      </div>
      {msg && <p role="alert" className="mb-4 text-sm text-destructive">{msg}</p>}
      {editing ? (
        <WindForm row={r} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); qc.invalidateQueries(); }} />
      ) : (
        <div className="min-w-0 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Localisation">
              <Row label="Pays / Région / Département" value={[r.country, r.region, r.department].filter(Boolean).join(" / ") || "—"} />
              <Row label="Localité" value={r.locality_name} /><Row label="Site d’étude" value={r.site_name ?? "—"} />
            </Card>
            <Card title="Mesures du vent">
              <Row label="Vitesse moyenne" value={fmt(r.avg, "m/s")} /><Row label="Hauteur de mesure" value={fmt(r.height, "m")} />
              <Row label="Direction dominante" value={fmt(r.direction, "°")} /><Row label="Période" value={periodText(r)} />
              <Row label="Série temporelle / distribution" value={`${r.timeseries?.length ?? 0} obs. / ${r.distribution?.length ?? 0} classes`} />
            </Card>
            <Card title="Paramètres complémentaires">
              <Row label="Vitesse maximale" value={fmt(r.max, "m/s")} /><Row label="Densité de l’air" value={fmt(r.density, "kg/m³")} />
              <Row label="Facteur de capacité estimé" value={fmt(r.cf, "%")} /><Row label="Méthode / origine du FC" value={r.cf_method ?? "—"} />
              <Row label="Méthode d’obtention" value={r.acquisition_method ?? "—"} />
            </Card>
            <Card title="Source et validation">
              <Row label="Source" value={r.source} /><Row label="Référence" value={r.reference ?? "—"} /><Row label="Date de collecte" value={r.collected_on ?? "—"} />
              <Row label="Qualité" value={r.quality ?? "—"} /><Row label="Notes" value={<span className="whitespace-pre-wrap font-normal">{r.notes ?? "—"}</span>} />
              <Row label="Dernière modification" value={new Date(r.updated_at).toLocaleString("fr-FR")} />
            </Card>
          </div>
          {warnings.length > 0 && <div className="border border-border bg-muted p-3 text-sm"><p className="font-medium">Points inhabituels à vérifier :</p><ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>}
          <WindDatasetCharts row={r} />
          <section className="border border-border bg-background p-5">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Pré-analyse IA</h2>
              {canEdit && <Button size="sm" variant="outline" disabled={analyse.isPending} onClick={() => analyse.mutate()}><Sparkles />{analyse.isPending ? "Analyse…" : "Lancer"}</Button>}</div>
            {analysis?.status === "completed" ? (
              <div className="space-y-3 text-sm">{([["Informations manquantes", analysis.missing_information], ["Hypothèses déclarées", analysis.declared_assumptions], ["Points à vérifier", analysis.verification_points]] as const).map(([t, items]) => (
                <div key={t}><p className="font-semibold">{t} ({items.length})</p><ul className="mt-1 space-y-1">{items.map((it, i) => <li key={i} className="break-words border-l-2 border-primary pl-3"><b>{it.title}</b> — <span className="text-muted-foreground">{it.explanation}</span></li>)}</ul></div>))}
                <p className="text-xs text-muted-foreground">{analysis.scope_note}</p></div>
            ) : <p className="text-sm text-muted-foreground">{analysis?.status === "failed" ? analysis.error_message : "Aucune pré-analyse. Elle signale les manques sans calculer ni inventer de valeur."}</p>}
          </section>
          <section><h2 className="mb-3 text-lg font-semibold">Jeux de vent pour cette localité</h2><WindComparison rows={data.siblings} currentId={r.id} /></section>
        </div>
      )}
    </WorkspacePage>
  );
}
