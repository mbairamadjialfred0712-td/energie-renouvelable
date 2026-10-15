import { createFileRoute, Outlet } from "@tanstack/react-router";
export const Route = createFileRoute("/_authenticated/resources/biomass")({ component: () => <Outlet /> });
