import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { BiomassForm } from "@/features/resources/biomass/biomass-form";

const META = "Enregistrer un jeu de données de biomasse rattaché à une localité ou un site : type, quantité, humidité, PCI, source, période et statut.";
export const Route = createFileRoute("/_authenticated/resources/biomass/new")({
  validateSearch: z.object({ locality: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Nouveau jeu biomasse — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Nouveau jeu biomasse — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewBiomass,
});

function NewBiomass() {
  const navigate = useNavigate(); const qc = useQueryClient(); const { locality } = Route.useSearch();
  return (
    <WorkspacePage eyebrow="Ressources / Biomasse" title="Nouveau jeu de données de biomasse" description="Chaque ajout crée un jeu distinct : aucune donnée existante n’est écrasée. Laissez vide toute valeur non disponible.">
      <BiomassForm row={null} defaultLocalityId={locality} onCancel={() => navigate({ to: "/resources/biomass" })}
        onSaved={(id) => { qc.invalidateQueries(); navigate({ to: "/resources/biomass/$id", params: { id } }); }} />
    </WorkspacePage>
  );
}
