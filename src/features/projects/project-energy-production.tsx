import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listResources } from "@/lib/resources.functions";
import { getSolarAccess } from "@/lib/solar.functions";
import { getTechnicalSettings } from "@/lib/technical-settings.functions";
import { calculateProjectEnergy } from "@/lib/energy-production.functions";
import { isAnnualPeriod } from "@/services/simulation/solar-pv-engine";
import { WIND_METHOD, BIOMASS_METHOD } from "@/services/simulation/annual-energy-engine";
import type { ProjectRecord } from "@/lib/projects.functions";
export function ProjectEnergyProduction({record,type}:{record:ProjectRecord;type:"wind"|"biomass"}){
const qc=useQueryClient();const [resourceId,setResourceId]=useState("");const [power,setPower]=useState("");const [assumptions,setAssumptions]=useState("");
const resources=useQuery({queryKey:["resources",type],queryFn:()=>listResources({data:{type}})});const settings=useQuery({queryKey:["technical-settings"],queryFn:()=>getTechnicalSettings()});const access=useQuery({queryKey:["solar-access"],queryFn:()=>getSolarAccess()});
const current=settings.data?.settings.find(s=>s.technology===type);const eligible=(resources.data??[]).filter(r=>r.validation_status==="validated"&&isAnnualPeriod(r.detail["period_start"],r.detail["period_end"])&&(!record.project.localityId||record.project.localityId===r.locality_id)&&(type==="wind"?Number(r.detail["capacity_factor_pct"])>0:Number(r.detail["annual_quantity_t"])>0&&Number(r.detail["calorific_value_mj_kg"])>0&&Number(r.detail["exploitable_fraction_pct"])>0));const selected=eligible.find(r=>r.id===resourceId);
const calculate=useMutation({mutationFn:calculateProjectEnergy,onSuccess:async()=>{await qc.invalidateQueries({queryKey:["project",record.project.id]});}});const title=type==="wind"?"éolienne":"biomasse";
return <section className="space-y-5 py-4"><h2 className="text-lg font-semibold">Estimation annuelle {title}</h2><p className="text-sm text-muted-foreground">{type==="wind"?"Facteur de charge brut documenté requis. Une vitesse moyenne ne permet pas de calculer une production. Sans courbe de puissance ni profil horaire.":"Tonnage et PCI sur matière reçue, fraction exploitable documentée. Pas de correction automatique d’humidité ni d’assimilation du stock forestier à un combustible annuel."}</p>
{!current&&<p className="text-sm text-muted-foreground">Paramètres techniques non configurés. <Link to="/settings" className="text-primary underline">Configuration</Link></p>}
{access.data?.canWrite&&<form className="space-y-4 border-y border-border py-5" onSubmit={e=>{e.preventDefault();if(!current)return;calculate.mutate({data:{projectId:record.project.id,resourceId,settingsId:current.id,powerKw:type==="wind"?Number(power):0,assumptions}});}}>
<label className="block space-y-2 text-sm">Jeu {title} validé<Select value={resourceId} onValueChange={setResourceId}><SelectTrigger aria-label={`Jeu ${title} validé`}><SelectValue placeholder="Sélectionner un jeu annuel"/></SelectTrigger><SelectContent>{eligible.map(r=><SelectItem key={r.id} value={r.id}>{r.locality_name} · {String(r.detail["period_start"])} → {String(r.detail["period_end"])} · {r.source}</SelectItem>)}</SelectContent></Select></label>
{resources.isLoading?<p className="text-sm">Chargement…</p>:resources.error?<p role="alert" className="text-destructive">{resources.error.message}</p>:!eligible.length&&<p className="text-sm text-muted-foreground">Aucun jeu validé annuel disposant des paramètres nécessaires.</p>}
{selected&&<dl className="grid gap-2 text-sm sm:grid-cols-2">{(type==="wind"?[['Facteur de charge brut (%)',selected.detail['capacity_factor_pct']]]:[['Quantité (t/an)',selected.detail['annual_quantity_t']],['PCI reçu (MJ/kg)',selected.detail['calorific_value_mj_kg']],['Fraction exploitable (%)',selected.detail['exploitable_fraction_pct']]]).map(([k,v])=><div key={String(k)}><dt className="text-muted-foreground">{String(k)}</dt><dd>{String(v)}</dd></div>)}</dl>}
{type==="wind"&&<label className="block space-y-2 text-sm">Puissance installée (kW)<Input aria-label="Puissance éolienne (kW)" required type="number" min="0.001" max="1000000000" step="any" value={power} onChange={e=>setPower(e.target.value)}/></label>}
{current&&<p className="text-sm">Rendement net : {current.efficiency} · Conversion : {current.conversion_efficiency}{type==="wind"?" (non appliquée)":""} · Durée de vie : {current.lifetime_years} ans · Paramètres du {new Date(current.created_at).toLocaleString("fr-FR")}</p>}
<label className="block space-y-2 text-sm">Hypothèses et justification {type==="wind"?"du facteur de charge brut":"du PCI sur matière reçue"}<Textarea aria-label={`Hypothèses ${title}`} required minLength={10} maxLength={4000} value={assumptions} onChange={e=>setAssumptions(e.target.value)}/></label>
<p className="text-xs text-muted-foreground">{type==="wind"?WIND_METHOD:BIOMASS_METHOD}. Durée de vie documentaire uniquement.</p>
<Button type="submit" disabled={!selected||!current||calculate.isPending}><Calculator/>{calculate.isPending?"Calcul en cours…":`Estimer la production ${title}`}</Button>{calculate.error&&<p role="alert" className="text-sm text-destructive">{calculate.error.message}</p>}{calculate.isSuccess&&<p role="status" className="text-sm text-primary">Estimation enregistrée avec sources et paramètres.</p>}</form>}
{record.energyProductions.filter(p=>p.technology===type).map(p=><article key={p.id} className="space-y-3 border-b border-border py-4"><h3 className="text-xl font-semibold">{Number(p.production_kwh).toLocaleString("fr-FR",{maximumFractionDigits:2})} kWh/an <span className="text-sm font-normal text-muted-foreground">— estimation indicative</span></h3><p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleString("fr-FR")} · {p.engine_version}</p><p className="text-sm">{p.method}</p><dl className="grid gap-2 text-sm sm:grid-cols-2">{Object.entries(p.input_snapshot&&typeof p.input_snapshot==="object"&&!Array.isArray(p.input_snapshot)?p.input_snapshot:{}).map(([key,value])=><div key={key} className="min-w-0"><dt className="text-muted-foreground">{key}</dt><dd className="break-words">{typeof value==="object"?JSON.stringify(value):String(value??"—")}</dd></div>)}</dl></article>)}
{!record.energyProductions.some(p=>p.technology===type)&&<p className="text-sm text-muted-foreground">Aucune estimation enregistrée.</p>}</section>;
}
