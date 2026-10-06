import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

const tabs = [
  { to: "/resources", label: "Vue d’ensemble", exact: true },
  { to: "/resources/solar", label: "Solaire" },
  { to: "/resources/wind", label: "Éolien" },
  { to: "/resources/biomass", label: "Biomasse" },
  { to: "/resources/waste", label: "Déchets" },
] as const;

export const Route = createFileRoute("/_authenticated/resources")({ component: ResourcesLayout });

function ResourcesLayout() {
  return (
    <div>
      <nav className="sticky top-0 z-20 flex gap-1 overflow-x-auto border-b border-border bg-background px-5 sm:px-8 lg:px-10">
        {tabs.map((tab) => (
          <Link key={tab.to} to={tab.to} activeOptions={{ exact: "exact" in tab }} className="whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground hover:text-foreground" activeProps={{ className: "border-primary text-foreground" }}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
