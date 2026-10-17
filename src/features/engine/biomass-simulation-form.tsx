import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { getEngineStatus, runBiomassSimulation, validateSimulationRequest } from "@/lib/engine.functions";
import { listBiomass } from "@/lib/biomass.functions";
import { listProjects } from "@/lib/projects.functions";
import { AVAILABILITY_LEVELS, BIOMASS_NATURES } from "@/features/resources/biomass/biomass-model";
import { buildBiomassRequest, type BiomassDeclaration } from "./biomass-input";
import { BIOMASS_VERSION } from "./biomass-contract";

export function BiomassSimulationForm() {
  const navigate=useNavigate(), run=useServerFn(runBiomassSimulation), validate=useServerFn(validateSimulationRequest);
  const resources=useQuery({queryKey:["biomass"],queryFn:()=>listBiomass()}), projects=useQuery({queryKey:["projects"],queryFn:()=>listProjects()}), engine=useQuery({queryKey:["engine-status"],queryFn:()=>getEngineStatus()});
  const [name,setName]=useState(""),[project,setProject]=useState(""),[resource,setResource]=useState(""),[basis,setBasis]=useState<BiomassDeclaration["moistureBasis"]>(""),[justification,setJustification]=useState(""),[confirmed,setConfirmed]=useState(false),[busy,setBusy]=useState(false),[errors,setErrors]=useState<string[]>([]),[verified,setVerified]=useState(false);
  const selected=resources.data?.find(r=>r.id===resource);
  const online=engine.data?.state==="online" && engine.data.capabilities.engines.some(e=>e.engine==="biomass" && e.status==="available" && e.version===BIOMASS_VERSION);
  const fmt=(n:number|null|undefined,unit:string)=>n==null?"Non renseignée":`${n.toLocaleString("fr-FR")} ${unit}`;
  function makeRequest() {
    if(!selected || !project || name.trim().length<3) throw new Error("Nom, projet et fiche biomasse validée requis.");
    return buildBiomassRequest({...selected,id:selected.biomass_id},project,{moistureBasis:basis,justification,confirmed});
  }
  let ready=false; try {makeRequest();ready=true;} catch { /* No generated results. */ }
  async function submit(calculate:boolean) {
    setErrors([]);setVerified(false);
    try {
      const request=makeRequest();
      if(!calculate) {
        if(online) {setBusy(true);const v=await validate({data:request});if(!v.ok) throw new Error(v.message);if(!v.result.valid || !v.result.engine_available) {setErrors(v.result.validation_errors.map(e=>e.message));return;}}
        setVerified(true);return;
      }
      setBusy(true);
      const out=await run({data:{name:name.trim(),project_id:project,biomass_resource_id:resource,request}});
      await navigate({to:"/simulations/$id/results",params:{id:out.id}});
    } catch(e) {setErrors(e instanceof z.ZodError?e.issues.map(i=>i.message):[e instanceof Error?e.message:"Bilan refusé."]);} finally {setBusy(false);}
  }
  return <div className="max-w-4xl space-y-6" onChange={()=>setVerified(false)}>
    <header><h2 className="text-lg font-semibold">Biomasse — bilan d’énergie primaire</h2><p className="mt-1 text-sm text-muted-foreground">Version {BIOMASS_VERSION} · périmètre V1 approuvé · validation physique en attente</p></header>
    {!online && <p role="status" className="border-l-2 border-destructive pl-3 text-sm">Calcul indisponible : service non configuré, non joignable ou moteur biomasse non confirmé.</p>}
    {(resources.error || projects.error) && <p role="alert" className="text-destructive">Chargement des fiches ou projets impossible.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <div><Label htmlFor="biomass-name">Nom du bilan</Label><Input id="biomass-name" value={name} onChange={e=>setName(e.target.value)} /></div>
      <div><Label htmlFor="biomass-project">Projet</Label><select id="biomass-project" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={project} onChange={e=>setProject(e.target.value)}><option value="">Sélectionner</option>{projects.data?.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="sm:col-span-2"><Label htmlFor="biomass-resource">Fiche biomasse validée / site</Label><select id="biomass-resource" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={resource} onChange={e=>{setResource(e.target.value);setConfirmed(false);}}><option value="">Sélectionner</option>{resources.data?.filter(r=>r.status==="validated").map(r=><option key={r.id} value={r.id}>{r.type} — {r.locality_name} · {r.site_name??"Site manquant"}</option>)}</select></div>
    </div>
    {resources.data && !resources.data.some(r=>r.status==="validated") && <p className="text-sm text-muted-foreground">Aucune fiche biomasse validée accessible.</p>}
    {selected && <section className="space-y-3 border-y py-4 text-sm"><h3 className="font-semibold">Données enregistrées — {BIOMASS_NATURES[selected.data_nature]}</h3><dl className="grid gap-3 sm:grid-cols-2"><div><dt className="text-muted-foreground">Quantité recensée</dt><dd>{fmt(selected.quantity,selected.unit)}</dd></div><div><dt className="text-muted-foreground">PCI / base</dt><dd>{fmt(selected.lhv,"MJ/kg")} · {selected.lhv_basis==="as_received"?"matière reçue":selected.lhv_basis==="dry"?"matière sèche":"base manquante"}</dd></div><div><dt className="text-muted-foreground">Humidité</dt><dd>{fmt(selected.moisture,"%")}</dd></div><div><dt className="text-muted-foreground">Période</dt><dd>{selected.period_start??"—"} → {selected.period_end??"—"}</dd></div></dl><p>{selected.source} · {selected.quality??"Qualité non documentée"}</p><p>Méthode PCI : {selected.lhv_method??"Non renseignée"}</p><dl className="grid gap-2 sm:grid-cols-2">{Object.entries(AVAILABILITY_LEVELS).map(([k,label])=><div key={k}><dt className="text-muted-foreground">{label} (enregistré)</dt><dd>{fmt(selected.levels[k as keyof typeof AVAILABILITY_LEVELS],selected.unit)}</dd></div>)}</dl><p>Fraction exploitable : {fmt(selected.fraction,"%")} — non appliquée.</p></section>}
    <div><Label htmlFor="biomass-moisture-basis">Convention d’humidité documentée</Label><select id="biomass-moisture-basis" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={basis} onChange={e=>setBasis(e.target.value as BiomassDeclaration["moistureBasis"])}><option value="">Sélectionner</option><option value="wet">Base humide : eau / masse totale</option><option value="dry">Base sèche : eau / masse sèche</option></select></div>
    <div><Label htmlFor="biomass-justification">Source et justification de compatibilité masse / PCI / humidité</Label><Textarea id="biomass-justification" value={justification} onChange={e=>setJustification(e.target.value)} /></div>
    <div className="flex items-start gap-2"><Checkbox id="biomass-confirm" checked={confirmed} onCheckedChange={v=>{setConfirmed(v===true);setVerified(false);}}/><Label htmlFor="biomass-confirm">Je confirme la masse annuelle reçue, le PCI reçu et leur compatibilité avec l’humidité documentée.</Label></div>
    <p className="border-l-2 border-primary pl-3 text-sm">Énergie primaire recensée uniquement. Mobilisation, chaleur utile et électricité indisponibles : méthodes et procédés non validés. Aucune correction d’humidité, fraction appliquée ou somme entre fiches.</p>
    {errors.length>0 && <ul role="alert" className="list-disc pl-5 text-sm text-destructive">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}
    {verified && <p role="status" className="text-sm">{online?"Entrées acceptées par le moteur. Aucun calcul exécuté.":"Contrôles des paramètres réussis ; validation du service non disponible."}</p>}
    <div className="flex flex-wrap gap-3"><Button variant="outline" disabled={busy} onClick={()=>submit(false)}>Vérifier les paramètres</Button><Button disabled={busy||!ready||!online} onClick={()=>submit(true)}>{busy?"Vérification / calcul…":"Lancer le bilan primaire"}</Button></div>
  </div>;
}