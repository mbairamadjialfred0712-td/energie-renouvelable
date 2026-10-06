import { createFileRoute } from "@tanstack/react-router";
import { ResourceManager } from "@/features/resources/resource-manager";
export const Route = createFileRoute("/_authenticated/resources/solar")({
  head: () => ({ meta: [{ title: "Ressource solaire — Énergie Renouvelable" }, { name: "description", content: "Fiche solaire par localité : GHI, DNI, DHI, irradiation, températures — sans confondre mesure, estimation et hypothèse." }, { property: "og:title", content: "Ressource solaire — Énergie Renouvelable" }, { property: "og:description", content: "Fiche solaire par localité : GHI, DNI, DHI, irradiation, températures — sans confondre mesure, estimation et hypothèse." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => <ResourceManager type="solar" title="Ressource solaire" description="Fiche solaire par localité : GHI, DNI, DHI, irradiation, températures — sans confondre mesure, estimation et hypothèse." />,
});
