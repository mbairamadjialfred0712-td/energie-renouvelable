import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { WorkspacePage } from "@/components/app/page";
import { SolarForm } from "@/features/resources/solar/solar-form";

const META = "Enregistrer un nouveau jeu de données solaires rattaché à une localité ou un site, avec unités, source, période et statut.";
export const Route = createFileRoute("/_authenticated/resources/solar/new")({
  validateSearch: z.object({ locality: z.string().uuid().optional() }),
  head: () => ({ meta: [{ title: "Nouveau jeu solaire — Énergie Renouvelable" }, { name: "description", content: META }, { property: "og:title", content: "Nouveau jeu solaire — Énergie Renouvelable" }, { property: "og:description", content: META }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: NewSolar,
});

function NewSolar() {
  const navigate = useNavigate(); const qc = useQueryClient(); const { locality } = Route.useSearch();
  return (
    <WorkspacePage eyebrow="Ressources / Solaire" title="Nouveau jeu de données solaires" description="Chaque ajout crée un jeu distinct : aucune donnée existante n’est écrasée. Laissez vide toute valeur non disponible.">
      <SolarForm row={null} defaultLocalityId={locality} onCancel={() => navigate({ to: "/resources/solar" })}
        onSaved={(id) => { qc.invalidateQueries(); navigate({ to: "/resources/solar/$id", params: { id } }); }} />
    </WorkspacePage>
  );
}
