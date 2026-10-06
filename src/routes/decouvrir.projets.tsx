import { createFileRoute, Link } from "@tanstack/react-router";
import { ClipboardList, Sparkles, FileDown, History } from "lucide-react";
import { PublicShell } from "@/components/app/public-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/decouvrir/projets")({
  head: () => ({ meta: [{ title: "Fiches projet — Énergie Renouvelable" }, { name: "description", content: "Fiches projet traçables : données fournies, hypothèses, pré-analyse IA et export PDF." }, { property: "og:title", content: "Fiches projet — Énergie Renouvelable" }, { property: "og:description", content: "Structurez vos projets énergétiques avec traçabilité complète." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: PublicProjects,
});

const features = [
  { icon: ClipboardList, title: "Données et hypothèses séparées", text: "Chaque valeur porte son unité, sa source, sa période et sa qualité. Les hypothèses sont signalées comme telles." },
  { icon: Sparkles, title: "Pré-analyse IA", text: "Liste les informations manquantes, les hypothèses et les points à vérifier — sans calculer ni inventer de résultat." },
  { icon: History, title: "Historique des modifications", text: "Chaque changement est journalisé pour faciliter la vérification." },
  { icon: FileDown, title: "Export PDF", text: "Fiche complète exportable avec données, unités, sources et historique." },
];

function PublicProjects() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-5xl p-5 sm:p-8">
        <h1 className="text-3xl font-semibold">Fiches projet</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Les projets sont privés : ils ne sont visibles que par leur auteur. Voici ce que le module permet.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, text }) => <div key={title} className="border border-border bg-background p-6"><Icon className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">{title}</h2><p className="mt-2 text-sm text-muted-foreground">{text}</p></div>)}
        </div>
        <Button asChild className="mt-6"><Link to="/register">Créer mon premier projet</Link></Button>
      </main>
    </PublicShell>
  );
}
