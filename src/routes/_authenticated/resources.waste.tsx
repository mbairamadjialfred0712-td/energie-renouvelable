import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/features/resources/resource-manager";
export const Route = createFileRoute("/_authenticated/resources/waste")({
  head: () => ({ meta: [{ title: "Ressource déchets — Énergie Renouvelable" }, { name: "description", content: "Fiche déchets : flux, caractéristiques énergétiques et méthode de valorisation." }, { property: "og:title", content: "Ressource déchets — Énergie Renouvelable" }, { property: "og:description", content: "Fiche déchets : flux, caractéristiques énergétiques et méthode de valorisation." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <ResourceManager type="waste" title="Ressource déchets" description="Fiche déchets : flux, caractéristiques énergétiques et méthode de valorisation." />,
});
