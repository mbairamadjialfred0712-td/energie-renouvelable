import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/page";
import { EngineStatusCard } from "@/features/engine/engine-status-card";
import { PvSimulationForm } from "@/features/engine/pv-simulation-form";

export const Route = createFileRoute("/_authenticated/simulations/new")({
  head: () => ({ meta: [{ title: "Nouvelle simulation PV horaire — Énergie Renouvelable" }, { name: "description", content: "Simulation photovoltaïque horaire PVWatts v8 à partir de séries météorologiques traçables." }, { property: "og:title", content: "Nouvelle simulation PV horaire" }, { property: "og:description", content: "Configuration traçable d’une simulation photovoltaïque horaire." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WorkspacePage eyebrow="Simulations / Nouvelle" title="Simulation photovoltaïque horaire" description="PVWatts v8 exécuté par le moteur scientifique Python. Résultat indicatif, à valider par l’ingénieur.">
      <div className="space-y-6"><EngineStatusCard /><PvSimulationForm /></div>
    </WorkspacePage>
  ),
});
