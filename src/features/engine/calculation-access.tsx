import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CALCULATION_SCOPES } from "./calculation-scope";

export function CalculationAccess() {
  return <section aria-label="Calculs et périmètres" className="space-y-4">
    <h2 className="text-lg font-semibold">Calculs et périmètres</h2>
    <p className="text-sm text-muted-foreground">Tests logiciels et calculs enregistrés ne constituent pas une validation scientifique. Les entrées sont contrôlées à chaque calcul.</p>
    <div className="divide-y divide-border border-y border-border">
      {Object.entries(CALCULATION_SCOPES).map(([engine, item]) => <article key={engine} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div><h3 className="font-semibold">{item.name}</h3><p className="mt-1 text-xs font-medium text-primary">{item.status}</p><p className="mt-2 text-sm">{item.scope}</p><p className="mt-2 text-xs text-muted-foreground"><strong>Entrées requises : </strong>{item.required}</p><p className="mt-1 text-xs text-muted-foreground"><strong>Limites : </strong>{item.limits}</p></div>
        <Button asChild variant="outline" size="sm"><Link to="/simulations/new" search={{ tab: item.tab }}>Configurer<ArrowRight /></Link></Button>
      </article>)}
    </div>
    <div className="grid gap-4 sm:grid-cols-3">
      <article className="space-y-2"><h3 className="font-semibold">Hybride multi-filières</h3><p className="text-xs font-medium">Préparation et comparaison</p><p className="text-sm text-muted-foreground">Résultats individuels compatibles côte à côte ; dispatch éolien + batterie et PV + éolien + batterie non implémenté.</p><Button asChild variant="outline" size="sm"><Link to="/scenarios">Préparer les scénarios<ArrowRight /></Link></Button></article>
      <article className="space-y-2"><h3 className="font-semibold">Optimisation bornée</h3><p className="text-xs font-medium">Calcul dans l’application</p><p className="text-sm text-muted-foreground">Sélection exhaustive de 1 à 12 candidats batterie enregistrés compatibles selon l’énergie non servie ; aucun dimensionnement de nouvelles capacités.</p><Button asChild variant="outline" size="sm"><Link to="/scenarios">Scénarios et optimisation<ArrowRight /></Link></Button></article>
      <article className="space-y-2"><h3 className="font-semibold">Analyse économique</h3><p className="text-xs font-medium">Calcul dans l’application</p><p className="text-sm text-muted-foreground">LCOE, flux, VAN, TRI et retours avec hypothèses sourcées ; persistance complète et comparaison économique encore partielles.</p><Button asChild variant="outline" size="sm"><Link to="/finance" search={{ project: undefined }}><BarChart3 />Analyse financière</Link></Button></article>
    </div>
  </section>;
}