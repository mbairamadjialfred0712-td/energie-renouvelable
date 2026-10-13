import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
export const getBiomassReferences=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>{const {data,error}=await context.supabase.from("biomass_reference_observations").select("*").order("plot_id");if(error)throw new Error("Référentiel biomasse indisponible.");return data??[];});
