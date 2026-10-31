import { useQuery } from "@tanstack/react-query";
import { listSolar } from "@/lib/solar.functions";
import { listWind } from "@/lib/wind.functions";
import { listBiomass } from "@/lib/biomass.functions";
import { listResources } from "@/lib/resources.functions";
import { listWeather } from "@/lib/weather.functions";
import { getCatalogRecords } from "@/lib/catalog.functions";
import { filterInventory, type InventoryFilter } from "./inventory";
export function useInventory(filter: InventoryFilter) {
  const solar = useQuery({ queryKey: ["solar"], queryFn: () => listSolar() });
  const wind = useQuery({ queryKey: ["wind"], queryFn: () => listWind() });
  const biomass = useQuery({ queryKey: ["biomass"], queryFn: () => listBiomass() });
  const waste = useQuery({ queryKey: ["resources", "waste"], queryFn: () => listResources({ data: { type: "waste" } }) });
  const weather = useQuery({ queryKey: ["weather-list"], queryFn: () => listWeather() });
  const records = useQuery({ queryKey: ["catalog-records"], queryFn: () => getCatalogRecords() });
  const queries = [solar, wind, biomass, waste, weather, records];
  const all = [...(solar.data ?? []), ...(wind.data ?? []), ...(biomass.data ?? []), ...(weather.data ?? []).map(r => ({ ...r, locality_name: r.localities?.name }))];
  return {
    isPending: queries.some(q => q.isPending), error: queries.find(q => q.error)?.error,
    localities: [...new Map(all.map(r => [r.locality_id, r.locality_name ?? r.locality_id])).entries()],
    solar: filterInventory(solar.data ?? [], filter), wind: filterInventory(wind.data ?? [], filter), biomass: filterInventory(biomass.data ?? [], filter),
    waste: filterInventory((waste.data ?? []).map(r => ({ ...r, status: r.validation_status })), filter),
    weather: filterInventory(weather.data ?? [], filter),
    configs: filterInventory(records.data?.configs ?? [], filter),
    simulations: (records.data?.simulations ?? []).filter(r => !filter.locality || r.locality_id === filter.locality),
  };
}
