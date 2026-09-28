import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WorkspacePage } from "@/components/app/page";
import { ProjectEditor, createEditorValue } from "@/features/projects/project-editor";
import { createProject } from "@/lib/projects.functions";

export const Route=createFileRoute("/_authenticated/projects/new")({head:()=>({meta:[{title:"Nouveau projet — Énergie Renouvelable"},{name:"description",content:"Créer une fiche énergétique structurée et traçable."},{property:"og:title",content:"Nouveau projet — Énergie Renouvelable"},{property:"og:description",content:"Créer une fiche énergétique structurée et traçable."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]}),component:NewProjectPage});

function NewProjectPage(){
  const navigate=useNavigate();const queryClient=useQueryClient();
  const mutation=useMutation({mutationFn:createProject,onSuccess:async({id})=>{await queryClient.invalidateQueries({queryKey:["projects"]});toast.success("Fiche projet créée.");navigate({to:"/projects/$id",params:{id}});},onError:(error)=>toast.error(error instanceof Error?error.message:"La fiche n’a pas pu être créée.")});
  return <WorkspacePage eyebrow="Projets / Création" title="Nouvelle fiche projet" description="Renseignez uniquement les informations disponibles et marquez explicitement les hypothèses."><div className="mx-auto max-w-6xl"><ProjectEditor initialValue={createEditorValue()} submitLabel="Créer la fiche" busy={mutation.isPending} onSubmit={(value)=>mutation.mutate({data:value})}/></div></WorkspacePage>;
}