import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Map, Sun, Activity, FlaskConical, Layers3, LineChart, FolderKanban, Upload, FileText, Settings, LogOut, Menu, X, Database, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logoAsset from "@/assets/energie-renouvelable-logo.png.asset.json";
import { Button } from "@/components/ui/button";

const nav = [
  { label: "Tableau de bord", to: "/dashboard", icon: LayoutDashboard },
  { label: "Territoires", to: "/geography", icon: Map },
  { label: "Ressources", to: "/resources", icon: Sun },
  { label: "Demande", to: "/demand", icon: Activity },
  { label: "Technologies", to: "/technologies", icon: Database },
  { label: "Simulations", to: "/simulations", icon: FlaskConical },
  { label: "Scénarios", to: "/scenarios", icon: Layers3 },
  { label: "Analyse financière", to: "/finance", icon: LineChart },
  { label: "Projets", to: "/projects", icon: FolderKanban },
  { label: "Importations", to: "/imports", icon: Upload },
  { label: "Rapports", to: "/reports", icon: FileText },
  { label: "Paramètres", to: "/settings", icon: Settings },
] as const;

export function AppShell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const signOut = async () => { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); navigate({ to: "/login", replace: true }); };
  return <div className="min-h-screen bg-workspace lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
    <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
      <Button size="icon" variant="ghost" aria-label="Ouvrir la navigation" onClick={() => setOpen(true)}><Menu /></Button>
      <img src={logoAsset.url} alt="Énergie Renouvelable" className="h-10 w-auto max-w-44 object-contain" />
      <span className="h-2 w-2 rounded-full bg-status-ready" title="Services opérationnels" />
    </header>
    {open && <button className="fixed inset-0 z-40 bg-overlay lg:hidden" aria-label="Fermer la navigation" onClick={() => setOpen(false)} />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar transition-transform lg:sticky lg:top-0 lg:h-screen lg:w-auto ${open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
      <div className="grid h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-sidebar-border px-5">
        <img src={logoAsset.url} alt="Énergie Renouvelable" className="h-14 w-full object-contain object-left" />
        <Button size="icon" variant="ghost" className="lg:hidden" aria-label="Fermer" onClick={() => setOpen(false)}><X /></Button>
      </div>
      <div className="px-5 pb-2 pt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-sidebar-muted">Espace d’étude</div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
        {nav.map(({ label, to, icon: Icon }) => <Link key={to} to={to} onClick={() => setOpen(false)} className="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent" activeProps={{ className: "bg-sidebar-accent text-sidebar-primary shadow-sm" }}><Icon className="h-[18px] w-[18px] shrink-0" /><span className="min-w-0 truncate">{label}</span><ChevronRight className="ml-auto h-3.5 w-3.5 opacity-45" /></Link>)}
      </nav>
      <div className="border-t border-sidebar-border p-3"><Button variant="ghost" className="w-full justify-start" onClick={signOut}><LogOut />Se déconnecter</Button></div>
    </aside>
    <main className="min-w-0"><Outlet /></main>
  </div>;
}
