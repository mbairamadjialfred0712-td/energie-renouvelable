import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { DemandForm } from "@/features/demand/demand-form";
import { getDemandAccess } from "@/lib/demand.functions";

const META = "Créer une demande énergétique en cinq étapes : localisation, équipements, profil, alimentation existante, sources et validation.";
export const Route = createFileRoute("/_authenticated/demand/new")({
  validateSearch: z.object({ locality: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Nouvelle demande énergétique — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Nouvelle demande énergétique — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewDemand,
});

function NewDemand() {
  const navigate = useNavigate(); const qc = useQueryClient(); const { locality } = Route.useSearch();
  const { data: access } = useQuery({ queryKey: ["demand-access"], queryFn: () => getDemandAccess() });
  return <WorkspacePage eyebrow="Données / Demande" title="Nouvelle demande énergétique" description="Renseignez uniquement des valeurs vérifiables ; laissez vide ce qui n’est pas connu.">
    {access && !access.canWrite ? <p className="text-sm text-muted-foreground">Votre rôle (lecteur) permet seulement la consultation.</p> :
      <DemandForm row={null} defaultLocalityId={locality} canValidate={!!access?.canValidate} onCancel={() => navigate({ to: "/demand" })} onSaved={(id) => { qc.invalidateQueries(); navigate({ to: "/demand/$id", params: { id } }); }} />}
  </WorkspacePage>;
}
