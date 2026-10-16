import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { metaFor } from "@/features/geography/form-helpers";
import { WeatherNew, weatherSitesOptions, weatherAccessOptions } from "@/features/weather/weather-ui";
export const Route = createFileRoute("/_authenticated/geography/weather/new")({
  validateSearch:z.object({locality:z.string().uuid().optional(),site:z.string().uuid().optional()}),
  head:()=>metaFor("Importer une fiche météo","Import contrôlé CSV/Excel et NASA POWER des rayonnements, températures et vents horaires d’un site."),
  loader:async ({context})=>{await Promise.all([context.queryClient.ensureQueryData(weatherSitesOptions),context.queryClient.ensureQueryData(weatherAccessOptions)]);},
  component:()=>{const search=Route.useSearch();return <WeatherNew {...search}/>;},
});