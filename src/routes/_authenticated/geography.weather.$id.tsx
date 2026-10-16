import { createFileRoute } from "@tanstack/react-router";
import { metaFor } from "@/features/geography/form-helpers";
import { WeatherDetail, weatherDetailOptions, weatherAccessOptions } from "@/features/weather/weather-ui";
export const Route = createFileRoute("/_authenticated/geography/weather/$id")({
  head:()=>metaFor("Détail météo du site","Série météo horaire sourcée : GHI, DNI, DHI, température, vent, unités natives et contrôle de complétude."),
  loader:async ({context,params})=>{await Promise.all([context.queryClient.ensureQueryData(weatherDetailOptions(params.id)),context.queryClient.ensureQueryData(weatherAccessOptions)]);},
  component:()=>{const {id}=Route.useParams();return <WeatherDetail id={id}/>;},
});