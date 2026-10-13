import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTechnicalSettings, getTechnicalSettings } from "@/lib/technical-settings.functions";
type Settings = Awaited<ReturnType<typeof getTechnicalSettings>>;
export function TechnicalSettings({ data }: { data: Settings }) {
 return <div className="space-y-8">{(["solar","wind","biomass"] as const).map(technology => <SettingsForm key={technology} technology={technology} data={data} />)}</div>;
}
function SettingsForm({ technology, data }: { technology: "solar"|"wind"|"biomass"; data: Settings }) {
 const current = data.settings.find(s => s.technology === technology);
 const [efficiency,setEfficiency] = useState(String(current?.efficiency ?? ""));
 const [conversion,setConversion] = useState(String(current?.conversion_efficiency ?? ""));
 const [lifetime,setLifetime] = useState(String(current?.lifetime_years ?? ""));
 const [justification,setJustification] = useState(""); const qc = useQueryClient();
 const save = useMutation({mutationFn:saveTechnicalSettings,onSuccess:async()=>{await qc.invalidateQueries({queryKey:["technical-settings"]}); setJustification("");}});
 const labels = {solar:"Solaire",wind:"Éolien",biomass:"Biomasse"};
 return <section className="border-b border-border pb-7"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{labels[technology]}</h2><span className="text-xs text-muted-foreground">{current ? `Version du ${new Date(current.created_at).toLocaleString("fr-FR")}` : "Non configuré"}</span></div>
 <form className="space-y-4" onSubmit={e=>{e.preventDefault();save.mutate({data:{technology,efficiency:Number(efficiency),conversion_efficiency:Number(conversion),lifetime_years:Number(lifetime),justification}});}}>
 <div className="grid gap-4 md:grid-cols-3">{[["Rendement net (0–1)",efficiency,setEfficiency],["Rendement de conversion (0–1)",conversion,setConversion],["Durée de vie (ans)",lifetime,setLifetime]].map(([label,value,setter])=><label key={String(label)} className="space-y-2 text-sm"><span>{String(label)}</span><Input aria-label={`${labels[technology]} — ${label}`} required disabled={!data.isAdmin} type="number" min={String(label).includes("vie")?1:0.001} max={String(label).includes("vie")?100:1} step={String(label).includes("vie")?1:"any"} value={String(value)} onChange={e=>(setter as (v:string)=>void)(e.target.value)} /></label>)}</div>
 <p className="text-sm text-muted-foreground">{technology==="solar"?"PR solaire = rendement net × rendement de conversion ; ne pas compter deux fois les mêmes pertes.":technology==="wind"?"Le facteur de charge brut inclut la conversion aérodynamique et électrique. Seul le rendement net est appliqué ; la conversion reste documentaire.":"Le rendement de conversion est électrique. Le PCI et le tonnage doivent être sur la même base de matière reçue."} La durée de vie n’est pas multipliée par la production annuelle.</p>
 {current && <p className="text-xs text-muted-foreground">Justification en vigueur : {current.justification}</p>}
 {data.isAdmin && <><label className="block space-y-2 text-sm">Source et justification<Textarea aria-label={`${labels[technology]} — Justification`} required minLength={10} maxLength={4000} value={justification} onChange={e=>setJustification(e.target.value)} /></label><Button disabled={save.isPending} type="submit"><Save />Enregistrer {labels[technology].toLowerCase()}</Button></>}
 {save.error && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}{save.isSuccess && <p role="status" className="text-sm text-primary">Nouvelle version enregistrée. Les estimations précédentes restent inchangées.</p>}
 </form></section>;
}
