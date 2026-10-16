import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { EngineStatusCard } from "@/features/engine/engine-status-card";
import { listSimulations } from "@/lib/engine.functions";

const opts = queryOptions({ queryKey: ["simulations"], queryFn: () => listSimulations() });
const STATUS: Record<string, string> = { draft: "Brouillon", queued: "En attente", running: "En cours", completed: "Terminée", failed: "Échouée" };

export const Route = createFileRoute("/_authenticated/simulations/")({
  head: () => ({ meta: [{ title: "Simulations — Énergie Renouvelable" }, { name: "description", content: "Simulations énergétiques exécutées par le moteur scientifique, avec statut et traçabilité." }, { property: "og:title", content: "Simulations — Énergie Renouvelable" }, { property: "og:description", content: "Simulations énergétiques traçables." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(opts),
  component: Page,
});

function Page() {
  const { data } = useSuspenseQuery(opts);
  return (
    <WorkspacePage eyebrow="Études / Simulations" title="Simulations" description="Exécutées uniquement par le moteur scientifique Python. Aucun résultat n’est affiché sans calcul réel." action={<Button asChild><Link to="/simulations/new">Simulation PV horaire</Link></Button>}>
      <div className="max-w-5xl space-y-6">
        <EngineStatusCard />
        {data.length === 0 ? <p className="text-sm text-muted-foreground">Aucune simulation enregistrée.</p> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-muted-foreground"><th className="py-2">Nom</th><th>Statut</th><th>Moteur</th><th>Période</th><th>Créée</th></tr></thead>
            <tbody>{data.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-2"><Link to="/simulations/$id/results" params={{ id: s.id }} className="underline">{s.name}</Link></td>
                <td>{STATUS[s.status] ?? s.status}</td><td>{s.engine_version ?? "—"}</td>
                <td>{s.period_start ?? "—"} → {s.period_end ?? "—"}</td><td>{new Date(s.created_at).toLocaleString("fr-FR")}</td>
              </tr>))}</tbody>
          </table>
        )}
      </div>
    </WorkspacePage>
  );
}
