import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { checkDemographySources } from "@/lib/demography-watch.functions";
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
          Rien n’est mis à jour automatiquement : chaque signalement doit être vérifié puis saisi manuellement dans la fiche Pays.
          Une valeur d’une autre source ou d’une autre année n’est jamais comparée comme si elle était équivalente.
        </p>
      </div>
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
