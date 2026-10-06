import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/features/resources/resource-manager";
export const Route = createFileRoute("/_authenticated/resources/wind")({
  head: () => ({ meta: [{ title: "Ressource éolienne — Énergie Renouvelable" }, { name: "description", content: "Fiche éolienne par localité : vitesses, hauteur de mesure, direction et densité de l’air documentées." }, { property: "og:title", content: "Ressource éolienne — Énergie Renouvelable" }, { property: "og:description", content: "Fiche éolienne par localité : vitesses, hauteur de mesure, direction et densité de l’air documentées." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <ResourceManager type="wind" title="Ressource éolienne" description="Fiche éolienne par localité : vitesses, hauteur de mesure, direction et densité de l’air documentées." />,
});
