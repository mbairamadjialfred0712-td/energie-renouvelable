import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { checkDemographySources, listPopulationImports, runPopulationImportNow } from "@/lib/demography-watch.functions";
import { WATCH_STATUS_LABELS, type WatchStatus } from "@/features/geography/demography-watch";
import { metaFor } from "@/features/geography/form-helpers";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/geography/demography-watch")({
  head: () => metaFor("Suivi démographique", "Détection des nouvelles publications démographiques et des valeurs à vérifier."),
  component: WatchPage,
});

const fmt = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(n));
const FLAGGED: WatchStatus[] = ["newer_publication", "value_mismatch"];

function WatchPage() {
  const run = useServerFn(checkDemographySources);
  const m = useMutation({ mutationFn: () => run() });
  const [filter, setFilter] = useState<"flagged" | "stored" | "all">("flagged");
  const rows = useMemo(() => {
    const all = m.data?.rows ?? [];
    if (filter === "flagged") return all.filter((r) => FLAGGED.includes(r.status));
    if (filter === "stored") return all.filter((r) => r.stored.value !== null);
    return all;
  }, [m.data, filter]);
  const counts = useMemo(() => {
    const c: Partial<Record<WatchStatus, number>> = {};
    for (const r of m.data?.rows ?? []) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [m.data]);

  return (
    <div className="space-y-6 px-5 py-8 sm:px-8 lg:px-10">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Territoires / Démographie</p>
        <h1 className="text-2xl font-semibold">Suivi des sources démographiques</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Compare les populations enregistrées avec la dernière publication de la Banque mondiale (indicateur SP.POP.TOTL).
          L’import automatique hebdomadaire ne remplit que les pays vides ou déjà issus de la Banque mondiale ; une valeur d’une autre source (ex. ANStat) n’est jamais écrasée.
          Une valeur d’une autre source ou d’une autre année n’est jamais comparée comme si elle était équivalente.
        </p>
      </div>
      <ImportPanel />
      <Button onClick={() => m.mutate()} disabled={m.isPending}>{m.isPending ? "Vérification…" : "Vérifier les publications"}</Button>
      {m.error && <p className="text-sm text-destructive">{(m.error as Error).message}</p>}
      {m.data && (
        <>
          <div className="text-sm text-muted-foreground">
            Vérifié le {new Date(m.data.checkedAt).toLocaleString("fr-FR")}
            {m.data.sourceLastUpdated && ` — dernière mise à jour Banque mondiale : ${m.data.sourceLastUpdated}`}
          </div>
          {m.data.sourceError && <p className="text-sm text-destructive">{m.data.sourceError}</p>}
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.keys(WATCH_STATUS_LABELS) as WatchStatus[]).map((s) => (
              <span key={s} className="rounded border border-border px-2 py-1">{WATCH_STATUS_LABELS[s]} : {counts[s] ?? 0}</span>
            ))}
          </div>
          <div className="flex gap-2">
            {([["flagged", "À vérifier"], ["stored", "Pays renseignés"], ["all", "Tous"]] as const).map(([k, l]) => (
              <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>
            ))}
          </div>
          <div className="overflow-x-auto rounded border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left"><tr>
                <th className="p-2">Pays</th><th className="p-2">Valeur enregistrée</th><th className="p-2">Publication Banque mondiale</th><th className="p-2">Statut</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 && <tr><td colSpan={4} className="p-4 text-muted-foreground">Aucun pays dans cette sélection.</td></tr>}
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2 font-medium">{r.name} <span className="text-muted-foreground">{r.iso3 ?? ""}</span></td>
                    <td className="p-2">{fmt(r.stored.value)}{r.stored.year ? ` (${r.stored.year})` : ""}<div className="text-xs text-muted-foreground">{r.stored.source ?? "Source non renseignée"}</div></td>
                    <td className="p-2">{r.external ? `${fmt(r.external.value)} (${r.external.year})` : "—"}<div className="text-xs text-muted-foreground">{r.external ? "Estimation Banque mondiale" : ""}</div></td>
                    <td className={`p-2 ${FLAGGED.includes(r.status) ? "font-medium text-destructive" : ""}`}>
                      {WATCH_STATUS_LABELS[r.status]}{r.relativeGap != null && r.status === "value_mismatch" ? ` (${(r.relativeGap * 100).toFixed(2)} %)` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  updated: "Mis à jour", kept_other_source: "Conservé (autre source)", missing: "Sans donnée Banque mondiale", unchanged: "Inchangé",
};

function ImportPanel() {
  const qc = useQueryClient();
  const list = useServerFn(listPopulationImports);
  const runNow = useServerFn(runPopulationImportNow);
  const q = useQuery({ queryKey: ["population-imports"], queryFn: () => list() });
  const run = useMutation({ mutationFn: () => runNow(), onSettled: () => { qc.invalidateQueries({ queryKey: ["population-imports"] }); qc.invalidateQueries({ queryKey: ["countries"] }); } });
  const last = q.data?.runs[0];
  const missing: { name: string; iso3: string | null; has_value: boolean }[] = last?.missing_countries ?? [];
  return (
    <section className="space-y-3 rounded border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Import automatique Banque mondiale</h2>
        <Button size="sm" variant="outline" onClick={() => run.mutate()} disabled={run.isPending}>{run.isPending ? "Import…" : "Importer maintenant (admin)"}</Button>
      </div>
      {run.error && <p className="text-sm text-destructive">{(run.error as Error).message}</p>}
      {!last && !q.isLoading && <p className="text-sm text-muted-foreground">Aucun import exécuté pour l’instant.</p>}
      {last && (
        <div className="space-y-2 text-sm">
          <p>
            Dernier import : {new Date(last.started_at).toLocaleString("fr-FR")} ({last.trigger === "schedule" ? "planifié" : "manuel"}) —{" "}
            <span className={last.status === "failed" ? "text-destructive font-medium" : ""}>{last.status === "success" ? "réussi" : last.status === "failed" ? "échec" : "en cours"}</span>
            {last.error && ` : ${last.error}`}
          </p>
          {last.status === "success" && <p className="text-muted-foreground">{last.countries_total} pays : {last.updated_count} mis à jour, {last.unchanged_count} inchangés, {last.kept_other_source_count} conservés (autre source), {missing.length} sans donnée.</p>}
          {missing.length > 0 && (
            <div role="alert" className="rounded border border-destructive/50 bg-destructive/10 p-3">
              <p className="font-medium text-destructive">Alerte : {missing.length} pays sans donnée Banque mondiale après l’import</p>
              <p className="text-xs text-muted-foreground">Valeur existante conservée lorsqu’elle existe ; à renseigner ou vérifier manuellement (code ISO3 manquant ou absent de la Banque mondiale).</p>
              <p className="mt-1 text-xs">{missing.map((c) => `${c.name}${c.iso3 ? ` (${c.iso3})` : " (ISO3 manquant)"}${c.has_value ? "" : " — aucune valeur"}`).join(" · ")}</p>
            </div>
          )}
          {(q.data?.history.length ?? 0) > 0 && (
            <details><summary className="cursor-pointer">Changements du dernier import</summary>
              <table className="mt-2 w-full text-xs"><thead className="text-left"><tr><th className="p-1">Pays</th><th className="p-1">Action</th><th className="p-1">Avant</th><th className="p-1">Banque mondiale</th></tr></thead>
                <tbody>{q.data!.history.map((h: any) => (
                  <tr key={h.id} className="border-t border-border"><td className="p-1">{h.countries?.name}</td><td className="p-1">{ACTION_LABELS[h.action]}</td>
                    <td className="p-1">{fmt(h.previous_population)}{h.previous_year ? ` (${h.previous_year})` : ""} {h.previous_source ? `— ${h.previous_source}` : ""}</td>
                    <td className="p-1">{fmt(h.observed_population)}{h.observed_year ? ` (${h.observed_year})` : ""}</td></tr>))}</tbody></table>
            </details>
          )}
          {q.data && q.data.runs.length > 1 && (
            <details><summary className="cursor-pointer">Historique des imports</summary>
              <ul className="mt-2 space-y-1 text-xs">{q.data.runs.map((r: any) => (
                <li key={r.id}>{new Date(r.started_at).toLocaleString("fr-FR")} — {r.status === "success" ? `${r.updated_count} mis à jour, ${(r.missing_countries ?? []).length} sans donnée` : `échec${r.error ? ` : ${r.error}` : ""}`}</li>))}</ul>
            </details>
          )}
        </div>
      )}
    </section>
  );
}
