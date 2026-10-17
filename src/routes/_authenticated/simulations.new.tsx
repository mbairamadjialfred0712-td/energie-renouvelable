import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/page";
import { EngineStatusCard } from "@/features/engine/engine-status-card";
import { PvSimulationForm } from "@/features/engine/pv-simulation-form";
import { BatterySimulationForm } from "@/features/engine/battery-simulation-form";
import { CspSimulationForm } from "@/features/engine/csp-simulation-form";
import { WindSimulationForm } from "@/features/engine/wind-simulation-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/simulations/new")({
  head: () => ({ meta: [{ title: "Nouvelle simulation horaire — Énergie Renouvelable" }, { name: "description", content: "Simulations horaires PV, batterie, CSP prescrit et éolien A/B/C avec paramètres documentés." }, { property: "og:title", content: "Nouvelle simulation horaire — Énergie Renouvelable" }, { property: "og:description", content: "Configuration traçable PV, batterie, CSP limité et éolien par courbe documentée." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WorkspacePage eyebrow="Simulations / Nouvelle" title="Nouvelle simulation horaire" description="Moteur scientifique Python. Résultats indicatifs, à valider par l’ingénieur.">
      <div className="space-y-6"><EngineStatusCard />
        <Tabs defaultValue="pv"><TabsList className="h-auto flex-wrap"><TabsTrigger value="pv">Photovoltaïque (PVWatts v8)</TabsTrigger><TabsTrigger value="battery">Batterie (réservoir + rendements)</TabsTrigger><TabsTrigger value="csp">CSP (bilan limité)</TabsTrigger><TabsTrigger value="wind">Éolien (A / B / C)</TabsTrigger></TabsList>
          <TabsContent value="pv" className="mt-5"><PvSimulationForm /></TabsContent>
          <TabsContent value="battery" className="mt-5"><BatterySimulationForm /></TabsContent>
          <TabsContent value="csp" className="mt-5"><CspSimulationForm /></TabsContent>
          <TabsContent value="wind" className="mt-5"><WindSimulationForm /></TabsContent>
        </Tabs>
      </div>
    </WorkspacePage>
  ),
});
