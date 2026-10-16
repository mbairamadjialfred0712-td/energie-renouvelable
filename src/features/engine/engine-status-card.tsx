import { useQuery } from "@tanstack/react-query";
import { getEngineStatus } from "@/lib/engine.functions";

const LABEL: Record<string, string> = { not_configured: "Moteur de calcul non configuré", unreachable: "Moteur de calcul injoignable", error: "Moteur de calcul en erreur", online: "Moteur de calcul connecté" };

export function EngineStatusCard() {
  const { data, isPending } = useQuery({ queryKey: ["engine-status"], queryFn: () => getEngineStatus(), retry: false, staleTime: 60_000 });
  return (
    <section className="rounded-lg border bg-card p-5" aria-label="État du moteur scientifique">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">Moteur scientifique Python · API v1</p>
      <h2 className="mt-1 text-lg font-semibold">{isPending ? "Vérification…" : LABEL[data?.state ?? "error"]}</h2>
      {data && data.state !== "online" && <p className="mt-2 text-sm text-muted-foreground">{data.message} Aucune simulation ne peut être exécutée et aucun résultat n’est affiché à sa place.</p>}
      {data?.state === "online" && (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-muted-foreground">Service {data.health.service_version} · schéma {data.health.schema_version} · authentification {data.health.auth_configured ? "configurée" : "non configurée"}</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {data.capabilities.engines.map((e) => (
              <li key={e.engine} className="flex justify-between gap-2 rounded border px-3 py-1.5">
                <span>{e.description}</span>
                <span className={e.status === "available" ? "text-primary" : "text-muted-foreground"}>{e.status === "available" ? `v${e.version}` : "non implémenté"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
