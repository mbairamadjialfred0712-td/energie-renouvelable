import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { getSimulation } from "@/lib/engine.functions";

const opts = (id: string) => queryOptions({ queryKey: ["simulation", id], queryFn: () => getSimulation({ data: { id } }) });
const STATUS: Record<string, string> = { draft: "Brouillon", queued: "En attente", running: "En cours", completed: "Terminée", failed: "Échouée" };
const LABELS: Record<string, string> = { annual_ac_energy: "Énergie AC annuelle", specific_yield: "Productible spécifique", capacity_factor_ac_basis_dc: "Facteur de capacité (base DC)", annual_poa_irradiation: "Irradiation annuelle dans le plan" };

export const Route = createFileRoute("/_authenticated/simulations/$id/results")({
  head: () => ({ meta: [{ title: "Résultats de simulation — Énergie Renouvelable" }, { name: "description", content: "Résultats calculés avec méthodes, sources et hypothèses traçables." }, { property: "og:title", content: "Résultats de simulation" }, { property: "og:description", content: "Résultats de simulation traçables." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context, params }) => context.queryClient.ensureQueryData(opts(params.id)),
  component: Results,
});

function Results() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(opts(id));
  if (!data) return <WorkspacePage eyebrow="Simulations" title="Simulation introuvable" description="Elle n’existe pas ou vous n’y avez pas accès."><EmptyState title="Aucune simulation" description="Aucun résultat n’est affiché." /></WorkspacePage>;
  const { simulation: s, results } = data;
  const scalars = results.filter((r) => !r.result_type.startsWith("series_") && !r.result_type.startsWith("monthly_"));
  const monthly = results.filter((r) => r.result_type.startsWith("monthly_ac_energy_")).sort((a, b) => a.result_type.localeCompare(b.result_type)).map((r) => ({ month: r.result_type.slice(-7), kWh: r.value }));
  const meta = { warnings: results[0]?.warnings ?? [] };
  return (
    <WorkspacePage eyebrow="Simulations / Résultats" title={s.name} description={`Statut : ${STATUS[s.status] ?? s.status}${s.engine_version ? ` · moteur ${s.engine_version}` : ""}`} action={<Link to="/simulations/new" className="text-sm underline">Nouvelle simulation</Link>}>
      <div className="max-w-5xl space-y-6">
        {s.status === "failed" && (
          <section className="rounded-lg border border-destructive p-5 text-sm">
            <h2 className="font-semibold text-destructive">Échec — aucun résultat produit</h2>
            <p className="mt-1">{data.error?.message}</p>
            {data.error && data.error.details.length > 0 && <ul className="mt-2 list-disc pl-6">{data.error.details.map((d, i) => <li key={i}>{d.field ? `${d.field} : ` : ""}{d.message}</li>)}</ul>}
          </section>
        )}
        {s.status === "completed" && <>
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">Valeurs calculées par {s.engine_version ?? "le moteur scientifique"}. Résultat indicatif : modèle et paramètres à valider par l’ingénieur.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {scalars.map((r) => <div key={r.result_type} className="rounded-lg border p-4"><p className="text-xs text-muted-foreground">{LABELS[r.result_type] ?? r.result_type}</p><p className="mt-1 text-2xl font-semibold">{r.value?.toLocaleString("fr-FR")} <span className="text-base font-normal">{r.unit}</span></p><p className="mt-1 text-xs text-muted-foreground">{r.calculation_method}</p></div>)}
          </div>
          {monthly.length > 0 && <section className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">Énergie AC mensuelle (kWh, somme des heures)</h2>
            <div className="h-64"><ResponsiveContainer><BarChart data={monthly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Bar dataKey="kWh" fill="var(--color-primary)" /></BarChart></ResponsiveContainer></div>
          </section>}
          {meta.warnings && meta.warnings.length > 0 && <section className="rounded-lg border p-4 text-sm"><h2 className="font-semibold">Avertissements</h2><ul className="mt-2 list-disc pl-6">{meta.warnings.map((w, i) => <li key={i}>{w.message}</li>)}</ul></section>}
        </>}
        <section className="rounded-lg border p-4 text-sm">
          <h2 className="font-semibold">Traçabilité des entrées</h2>
          <p className="mt-1 text-muted-foreground">Première heure : {data.firstTimestamp ?? "—"} · UTC{data.utcOffset !== null && data.utcOffset >= 0 ? "+" : ""}{data.utcOffset ?? "?"} · début d’heure</p>
          <p className="mt-1 text-muted-foreground">Dernière heure : {data.lastTimestamp ?? "—"} · Calcul terminé : {data.calculatedAt ?? (s.status === "completed" ? "Non enregistré dans l’historique ancien" : "Non exécuté ou non terminé")}</p>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(data.seriesMeta).map(([k, v]) => <li key={k}>{k} ({v.unit}) — {v.nature}{v.source ? ` · ${v.source}` : ""}</li>)}</ul>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(data.inputs).map(([k, v]) => <li key={k}>{k} = {String(v.value)} {v.unit} — {v.nature}</li>)}</ul>
          <ul className="mt-2 grid gap-1 sm:grid-cols-2">{Object.entries(data.assumptions).map(([k, v]) => <li key={k}>{k} = {String(v.value)} {v.unit} — {v.nature}</li>)}</ul>
        </section>
      </div>
    </WorkspacePage>
  );
}
