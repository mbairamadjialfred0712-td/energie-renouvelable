import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { WorkspacePage } from "@/components/app/page";
import { BatteryForm } from "@/features/storage/battery-form";
import { getStorageAccess } from "@/lib/storage.functions";

const META = "Créer une fiche technique de batterie à partir d’une documentation fabricant, avec unités, sources et statut.";
export const Route = createFileRoute("/_authenticated/technologies/storage/new")({
  head: () => ({ meta: [{ title: "Nouvelle fiche batterie — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Nouvelle fiche batterie — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewSheet,
});

function NewSheet() {
  const navigate = useNavigate(); const qc = useQueryClient();
  const { data: access } = useQuery({ queryKey: ["storage-access"], queryFn: () => getStorageAccess() });
  return <WorkspacePage eyebrow="Technologies / Stockage" title="Nouvelle fiche technique" description="Renseignez uniquement les valeurs figurant dans la documentation ; laissez vide ce qui n’est pas documenté.">
    {access && !access.canWrite ? <p className="text-sm text-muted-foreground">Votre rôle permet seulement la consultation.</p> :
      <BatteryForm row={null} onCancel={() => navigate({ to: "/technologies/storage" })} onSaved={(id) => { qc.invalidateQueries(); navigate({ to: "/technologies/storage/$id", params: { id } }); }} />}
  </WorkspacePage>;
}
