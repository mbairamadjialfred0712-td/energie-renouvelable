import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { SimulationRequest } from "@/features/engine/engine-contract";
import { buildBiomassRequest } from "@/features/engine/biomass-input";
export async function prepareBiomassSource(sb: SupabaseClient<Database>, request: SimulationRequest, resourceId: string | undefined) {
  if(!resourceId || !request.project_id || request.timeseries!=null) throw new Error("Fiche biomasse enregistrée et projet requis ; série navigateur refusée.");
  const parent=await sb.from("energy_resources").select("*").eq("id",resourceId).eq("resource_type","biomass").maybeSingle();
  const detail=await sb.from("biomass_resources").select("*").eq("resource_id",resourceId).maybeSingle();
  const p=parent.data, b=detail.data;
  if(parent.error || detail.error || !p || !b || p.validation_status!=="validated" || b.biomass_status!=="validated" || !b.site_id) throw new Error("Fiche inaccessible, non validée ou site manquant.");
  const [site,project]=await Promise.all([sb.from("study_sites").select("id,locality_id").eq("id",b.site_id).maybeSingle(),sb.from("projects").select("id,locality_id").eq("id",request.project_id).maybeSingle()]);
  if(site.error || project.error || site.data?.locality_id!==p.locality_id || project.data?.locality_id!==p.locality_id) throw new Error("Fiche, site, projet et localité incohérents ou inaccessibles.");
  const decl=request.input_data;
  const rawBasis=decl["moisture_basis"]?.value;
  const moistureBasis=rawBasis==="wet"||rawBasis==="dry"?rawBasis:"";
  const prepared=buildBiomassRequest({id:b.id,site_id:b.site_id,status:b.biomass_status,source:p.source,quality:p.quality,quantity:b.annual_quantity_t,unit:b.quantity_unit,lhv:b.calorific_value_mj_kg,lhv_basis:b.lhv_basis,lhv_method:b.lhv_method,moisture:b.moisture_pct,period_start:b.period_start,period_end:b.period_end,data_nature:b.data_nature,fraction:b.exploitable_fraction_pct,levels:b.availability_levels as Record<string,number|null>},request.project_id,{moistureBasis,justification:decl["basis_compatibility"]?.source??"",confirmed:decl["basis_compatibility"]?.value===true});
  return {request:prepared,localityId:p.locality_id,provenance:{resource:p,biomass:b,captured_at:new Date().toISOString(),declarations:{moistureBasis,justification:decl["basis_compatibility"]?.source},note:"Une fiche, aucune mobilisation calculée ; niveaux enregistrés sans cumul."}};
}