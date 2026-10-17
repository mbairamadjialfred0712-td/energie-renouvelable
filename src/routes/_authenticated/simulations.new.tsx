import { createFileRoute } from "@tanstack/react-router";
import { WorkspacePage } from "@/components/app/page";
import { EngineStatusCard } from "@/features/engine/engine-status-card";
import { PvSimulationForm } from "@/features/engine/pv-simulation-form";
import { BatterySimulationForm } from "@/features/engine/battery-simulation-form";
import { CspSimulationForm } from "@/features/engine/csp-simulation-form";
import { WindSimulationForm } from "@/features/engine/wind-simulation-form";
import { BiomassSimulationForm } from "@/features/engine/biomass-simulation-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_authenticated/simulations/new")({
  head: () => ({ meta: [{ title: "Nouvelle simulation et bilan biomasse — Énergie Renouvelable" }, { name: "description", content: "Simulations PV, batterie, CSP, éolien et bilan primaire biomasse documenté." }, { property: "og:title", content: "Nouvelle simulation et bilan biomasse — Énergie Renouvelable" }, { property: "og:description", content: "Configuration traçable des simulations et de l’énergie primaire biomasse." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: () => (
    <WorkspacePage eyebrow="Simulations / Nouvelle" title="Nouvelle simulation / bilan" description="Moteur scientifique Python. Résultats indicatifs, à valider par l’ingénieur.">
      <div className="space-y-6"><EngineStatusCard />
        <Tabs defaultValue="pv"><TabsList className="h-auto flex-wrap"><TabsTrigger value="pv">Photovoltaïque (PVWatts v8)</TabsTrigger><TabsTrigger value="battery">Batterie (réservoir + rendements)</TabsTrigger><TabsTrigger value="csp">CSP (bilan limité)</TabsTrigger><TabsTrigger value="wind">Éolien (A / B / C)</TabsTrigger><TabsTrigger value="biomass">Biomasse (énergie primaire)</TabsTrigger></TabsList>
          <TabsContent value="pv" className="mt-5"><PvSimulationForm /></TabsContent>
          <TabsContent value="battery" className="mt-5"><BatterySimulationForm /></TabsContent>
          <TabsContent value="csp" className="mt-5"><CspSimulationForm /></TabsContent>
          <TabsContent value="wind" className="mt-5"><WindSimulationForm /></TabsContent>
          <TabsContent value="biomass" className="mt-5"><BiomassSimulationForm /></TabsContent>
        </Tabs>
      </div>
    </WorkspacePage>
  ),
});
