import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/page";
import { EngineStatusCard } from "@/features/engine/engine-status-card";
import { PvSimulationForm } from "@/features/engine/pv-simulation-form";
import { BatterySimulationForm } from "@/features/engine/battery-simulation-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/simulations/new")({
  head: () => ({ meta: [{ title: "Nouvelle simulation horaire — Énergie Renouvelable" }, { name: "description", content: "Simulations horaires photovoltaïque et stockage batterie par le moteur scientifique Python." }, { property: "og:title", content: "Nouvelle simulation horaire" }, { property: "og:description", content: "Configuration traçable d’une simulation horaire PV ou batterie." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WorkspacePage eyebrow="Simulations / Nouvelle" title="Nouvelle simulation horaire" description="Moteur scientifique Python. Résultats indicatifs, à valider par l’ingénieur.">
      <div className="space-y-6"><EngineStatusCard />
        <Tabs defaultValue="pv"><TabsList><TabsTrigger value="pv">Photovoltaïque (PVWatts v8)</TabsTrigger><TabsTrigger value="battery">Batterie (réservoir + rendements)</TabsTrigger></TabsList>
          <TabsContent value="pv" className="mt-5"><PvSimulationForm /></TabsContent>
          <TabsContent value="battery" className="mt-5"><BatterySimulationForm /></TabsContent>
        </Tabs>
      </div>
    </WorkspacePage>
  ),
});
