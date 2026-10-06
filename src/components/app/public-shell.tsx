import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import logoAsset from "@/assets/energie-renouvelable-logo.png.asset.json";

const links = [
  { to: "/decouvrir/territoires", label: "Territoires" },
  { to: "/decouvrir/projets", label: "Projets" },
  { to: "/decouvrir/tableau-de-bord", label: "Tableau de bord" },
] as const;

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-workspace">
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5">
          <Link to="/" className="shrink-0"><img src={logoAsset.url} alt="Énergie Renouvelable" className="h-10 w-auto max-w-44 object-contain" /></Link>
          <nav className="hidden flex-1 gap-1 md:flex">
            {links.map((l) => <Link key={l.to} to={l.to} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "text-foreground bg-muted" }}>{l.label}</Link>)}
          </nav>
          <div className="ml-auto flex gap-2"><Button asChild variant="ghost" size="sm"><Link to="/login">Connexion</Link></Button><Button asChild size="sm"><Link to="/register">Créer un compte</Link></Button></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 md:hidden">
          {links.map((l) => <Link key={l.to} to={l.to} className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground" activeProps={{ className: "text-foreground font-medium" }}>{l.label}</Link>)}
        </nav>
      </header>
      <div className="border-b border-border bg-muted px-5 py-2 text-center text-xs text-muted-foreground">Démonstration en lecture seule — seules les données géographiques de référence publiques sont affichées. Les études et projets restent privés.</div>
      {children}
    </div>
  );
}
