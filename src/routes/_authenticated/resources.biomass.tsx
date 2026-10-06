import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/features/resources/resource-manager";
export const Route = createFileRoute("/_authenticated/resources/biomass")({
  head: () => ({ meta: [{ title: "Ressource biomasse — Énergie Renouvelable" }, { name: "description", content: "Fiche biomasse : type, quantité, humidité, pouvoir calorifique et fraction réellement exploitable." }, { property: "og:title", content: "Ressource biomasse — Énergie Renouvelable" }, { property: "og:description", content: "Fiche biomasse : type, quantité, humidité, pouvoir calorifique et fraction réellement exploitable." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <ResourceManager type="biomass" title="Ressource biomasse" description="Fiche biomasse : type, quantité, humidité, pouvoir calorifique et fraction réellement exploitable." />,
});
