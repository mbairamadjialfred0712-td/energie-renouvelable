import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { backTarget } from "./back-target";

export function ContextNavigation() {
  const location = useLocation();
  if (location.pathname === "/dashboard") return null;
  const target = backTarget(location.pathname);
  return <nav aria-label="Navigation de retour" className="flex flex-wrap items-center gap-2 border-b border-border bg-background px-5 py-2 sm:px-8 lg:px-10">
    <Button asChild variant="ghost" size="sm"><Link to={target.to} search={previous => ({ ...previous, ...location.search })}><ArrowLeft />Retour</Link></Button>
    <ChevronRight className="h-3 w-3 text-muted-foreground" />
    <Link to={target.to} search={previous => ({ ...previous, ...location.search })} className="text-xs text-muted-foreground hover:text-primary">{target.label}</Link>
  </nav>;
}