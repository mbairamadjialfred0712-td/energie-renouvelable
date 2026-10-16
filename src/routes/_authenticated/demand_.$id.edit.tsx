import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspacePage } from "@/components/app/page";
import { DemandForm } from "@/features/demand/demand-form";
import { getDemand, getDemandAccess } from "@/lib/demand.functions";

const META = "Modifier une demande énergétique : chaque changement est conservé dans l’historique.";
export const Route = createFileRoute("/_authenticated/demand_/$id/edit")({
  head: () => ({ meta: [{ title: "Modifier la demande — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Modifier la demande — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: EditDemand,
});

function EditDemand() {
  const { id } = Route.useParams(); const navigate = useNavigate(); const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["demand", id], queryFn: () => getDemand({ data: { id } }) });
  const { data: access } = useQuery({ queryKey: ["demand-access"], queryFn: () => getDemandAccess() });
  return <WorkspacePage eyebrow="Données / Demande" title="Modifier la demande" description={META}>
    {isLoading || !access ? <p className="text-sm text-muted-foreground">Chargement…</p> : !data ? <p>Demande introuvable.</p> :
      !(access.isAdmin || (access.canWrite && data.item.owner_id === access.userId)) ? <p className="text-sm text-muted-foreground">Votre rôle ne permet pas de modifier cette demande.</p> :
      <DemandForm row={data.item} canValidate={access.canValidate} onCancel={() => navigate({ to: "/demand/$id", params: { id } })} onSaved={() => { qc.invalidateQueries(); navigate({ to: "/demand/$id", params: { id } }); }} />}
  </WorkspacePage>;
}
