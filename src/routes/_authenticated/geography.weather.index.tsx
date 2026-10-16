import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { metaFor } from "@/features/geography/form-helpers";
import { WeatherList, weatherListOptions, weatherAccessOptions } from "@/features/weather/weather-ui";
export const Route = createFileRoute("/_authenticated/geography/weather/")({
  validateSearch: z.object({locality:z.string().uuid().optional(),site:z.string().uuid().optional()}),
  head:()=>metaFor("Fiches météo par site","Données météo horaires réelles par site et localité : rayonnements, température, vent, sources et validation."),
  loader:async ({context})=>{await Promise.all([context.queryClient.ensureQueryData(weatherListOptions),context.queryClient.ensureQueryData(weatherAccessOptions)]);},
  component:()=>{const search=Route.useSearch();return <WeatherList {...search}/>;},
});