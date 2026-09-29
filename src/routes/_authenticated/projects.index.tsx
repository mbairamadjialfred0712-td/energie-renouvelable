import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, FileCheck2, Plus } from "lucide-react";
import { listProjects } from "@/lib/projects.functions";
import { WorkspacePage, EmptyState } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS = { draft: "Brouillon", preliminary_study: "Étude préliminaire", feasibility: "Faisabilité", design: "Conception", financing: "Financement", procurement: "Approvisionnement", implementation: "Mise en œuvre", completed: "Terminé" } as const;

export const Route=createFileRoute("/_authenticated/projects/")({head:()=>({meta:[{title:"Fiches projets — Énergie Renouvelable"},{name:"description",content:"Dossiers énergétiques structurés, sourcés et vérifiables."},{property:"og:title",content:"Fiches projets — Énergie Renouvelable"},{property:"og:description",content:"Dossiers énergétiques structurés, sourcés et vérifiables."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:ProjectsPage});

function ProjectsPage(){
  const {data,isLoading,error}=useQuery({queryKey:["projects"],queryFn:()=>listProjects()});
  return <WorkspacePage eyebrow="Pilotage / Projets" title="Fiches projets" description="Centralisez les données, unités, hypothèses, sources et vérifications de chaque étude." action={<Button asChild><Link to="/projects/new"><Plus />Nouveau projet</Link></Button>}>
    {error&&<p className="mb-5 text-sm text-destructive">Les projets n’ont pas pu être chargés.</p>}
    {!isLoading&&data?.length===0?<EmptyState title="Aucune fiche projet" description="Créez un premier dossier structuré. La pré-analyse restera manuelle et ne produira aucun résultat scientifique." actionLabel="Créer un projet" onAction={()=>window.location.assign("/projects/new")} />:<div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{data?.map((project)=><article key={project.id} className="flex min-h-56 flex-col border border-border bg-background p-5 shadow-panel">
      <div className="flex items-start justify-between gap-3"><div className="grid h-10 w-10 place-items-center rounded-md bg-muted text-primary"><FileCheck2 className="h-5 w-5"/></div><Badge variant="outline">{STATUS_LABELS[project.status]}</Badge></div>
      <h2 className="mt-5 text-lg font-semibold">{project.name}</h2><p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description||"Aucune description fournie."}</p>
      <div className="mt-auto flex items-end justify-between gap-4 pt-5"><div className="text-xs text-muted-foreground"><div>{project.fieldCount} donnée(s) enregistrée(s)</div><div>{project.analysisCount} pré-analyse(s)</div></div><Button variant="ghost" size="sm" asChild><Link to="/projects/$id" params={{id:project.id}}>Ouvrir <ArrowRight /></Link></Button></div>
    </article>)}</div>}
    {isLoading&&<div className="border border-border bg-background p-8 text-sm text-muted-foreground">Chargement des fiches…</div>}
  </WorkspacePage>;
}
