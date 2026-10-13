import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { WindForm } from "@/features/resources/wind/wind-form";

const META = "Enregistrer un nouveau jeu de données de vent rattaché à une localité ou un site, avec unités, source, période et statut.";
export const Route = createFileRoute("/_authenticated/resources/wind/new")({
  validateSearch: z.object({ locality: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Nouveau jeu éolien — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Nouveau jeu éolien — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewWind,
});

function NewWind() {
  const navigate = useNavigate(); const qc = useQueryClient(); const { locality } = Route.useSearch();
  return (
    <WorkspacePage eyebrow="Ressources / Éolien" title="Nouveau jeu de données de vent" description="Chaque ajout crée un jeu distinct : aucune donnée existante n’est écrasée. Laissez vide toute valeur non disponible.">
      <WindForm row={null} defaultLocalityId={locality} onCancel={() => navigate({ to: "/resources/wind" })}
        onSaved={(id) => { qc.invalidateQueries(); navigate({ to: "/resources/wind/$id", params: { id } }); }} />
    </WorkspacePage>
  );
}
