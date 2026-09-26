import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ShieldCheck, Database, GitCompareArrows } from "lucide-react";
import logoAsset from "@/assets/energie-renouvelable-logo.png.asset.json";

export function AuthLayout({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <main className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(480px,0.78fr)]">
    <section className="relative hidden overflow-hidden bg-brand-panel p-12 text-brand-panel-foreground lg:flex lg:flex-col lg:justify-between">
      <div className="brand-grid-dark absolute inset-0" aria-hidden="true" />
      <Link to="/" className="relative block w-72"><img src={logoAsset.url} alt="Énergie Renouvelable" className="w-full object-contain" /></Link>
      <div className="relative max-w-xl"><p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-highlight">Plateforme d’ingénierie énergétique</p><h1 className="mt-5 text-4xl font-semibold leading-tight">Des études traçables, des hypothèses explicites, des décisions documentées.</h1><div className="mt-10 grid gap-4 text-sm text-brand-panel-muted"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-brand-highlight"/><span>Données privées et accès contrôlés par rôle.</span></div><div className="flex gap-3"><Database className="mt-0.5 h-5 w-5 text-brand-highlight"/><span>Sources, unités et qualité conservées avec chaque donnée.</span></div><div className="flex gap-3"><GitCompareArrows className="mt-0.5 h-5 w-5 text-brand-highlight"/><span>Architecture prête pour les futurs moteurs scientifiques validés.</span></div></div></div>
      <p className="relative text-xs text-brand-panel-muted">Fondation V1 · Aucun résultat scientifique inventé</p>
    </section>
    <section className="flex items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-md"><Link to="/" className="mb-10 block w-56 lg:hidden"><img src={logoAsset.url} alt="Énergie Renouvelable" className="w-full" /></Link><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Accès sécurisé</p><h2 className="mt-3 text-3xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-8">{children}</div></div></section>
  </main>;
}
