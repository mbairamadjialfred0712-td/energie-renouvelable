import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { WorkspacePage } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { TechnicalSettings } from "@/features/settings/technical-settings";
import { getTechnicalSettings } from "@/lib/technical-settings.functions";
const options=queryOptions({queryKey:["technical-settings"],queryFn:()=>getTechnicalSettings()});
export const Route=createFileRoute("/_authenticated/settings")({head:()=>({meta:[{title:"Paramètres techniques — Énergie Renouvelable"},{name:"description",content:"Rendements et durées de vie partagés et versionnés pour les projets."},{property:"og:title",content:"Paramètres techniques — Énergie Renouvelable"},{property:"og:description",content:"Configuration technique traçable des estimations énergétiques."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),loader:({context})=>context.queryClient.ensureQueryData(options),component:Settings});
function Settings(){const {data}=useSuspenseQuery(options);return <WorkspacePage eyebrow="Administration / Configuration" title="Paramètres techniques" description="Valeurs partagées par tous les projets · versions conservées dans chaque estimation." action={data.isAdmin?<Button asChild variant="outline"><Link to="/testers">Accès des testeurs</Link></Button>:undefined}><div className="max-w-5xl"><TechnicalSettings data={data}/></div></WorkspacePage>;}
