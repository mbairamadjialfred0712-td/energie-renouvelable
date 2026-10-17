import { batteryRequestSchema } from '@/features/engine/battery-contract';
import type { SimulationRequest } from '@/features/engine/engine-contract';
import type { ConfigSnapshot } from '@/features/storage/battery-model';
import { readSimulationSeries } from './engine-access.server';
/** Rebuild protected inputs from recorded config snapshot + completed PV under user RLS. */
export async function prepareBatterySource(sb:any,request:SimulationRequest,configId?:string,pvId?:string){
 if(!configId||!pvId)throw new Error('Configuration projet et simulation PV enregistrées requises.');
 const {data:c,error}=await sb.from('project_storage_configs').select('*').eq('id',configId).maybeSingle();
 if(error||!c||c.status!=='validated')throw new Error('Configuration inaccessible ou non validée.');
 const snap=c.snapshot as ConfigSnapshot|null;
 if(!snap?.sheet||snap.meta.datasheet_id!==c.datasheet_id)throw new Error('Instantané complet requis ; actualisation explicite nécessaire.');
 const {data:pv,error:pe}=await sb.from('simulations').select('id,status,engine_version,project_id,locality_id').eq('id',pvId).maybeSingle();
 if(pe||!pv||pv.status!=='completed'||!pv.engine_version?.startsWith('photovoltaic')||pv.project_id!==c.project_id)throw new Error('PV terminé du même projet requis.');
 const series=await readSimulationSeries(sb,pvId,'series_ac_energy');
 if(!series||series.unit!=='kWh'||!request.timeseries||request.timeseries.timestamps.length!==series.timestamps.length||request.timeseries.timestamps.some((t,i)=>t!==series.timestamps[i]))throw new Error('Périodes PV et demande incompatibles.');
 if(!request.timeseries.series['demand_energy']?.source?.trim())throw new Error('Source de la demande horaire requise.');
 const nominal=Number(snap.sheet.energy_kwh)*Number(c.module_count);
 if(!Number.isFinite(nominal)||nominal<=0)throw new Error('Énergie nominale documentée dans l’instantané requise ; aucune capacité supposée.');
 const values:Record<string,number>={usable_energy_kwh:nominal,charge_power_max_kw:Number(snap.sheet['max_charge_kw'])*Number(c.module_count),discharge_power_max_kw:Number(snap.sheet['max_discharge_kw'])*Number(c.module_count),soc_min_pct:c.soc_min_pct,soc_max_pct:c.soc_max_pct,charge_eff_pct:c.charge_eff_pct,discharge_eff_pct:c.discharge_eff_pct};
 for(const [k,v] of Object.entries(values)){if(v===null||typeof v!=='number'||!Number.isFinite(v))throw new Error(`Valeur retenue absente : ${k}.`);}
 const window=nominal*(Number(c.soc_max_pct)-Number(c.soc_min_pct))/100;
 if(c.usable_energy_limit_kwh!==null&&window>c.usable_energy_limit_kwh+1e-9)throw new Error('La plage SOC dépasse la limite utilisable retenue ; ajuster explicitement la configuration.');
 const inputs={...request.input_data};
 for(const [k,v] of Object.entries(values))inputs[k]={value:v,unit:k.includes('pct')?'%':k.includes('power')?'kW':'kWh',nature:'assumption',source:`Configuration ${configId} — instantané ${snap.meta.snapshot_at} — ${c.justification??snap.meta.source}`.slice(0,500)};
 const rebuilt:SimulationRequest={...request,project_id:c.project_id,input_data:inputs,source_references:[{label:`Configuration stockage ${configId}`,table:'project_storage_configs',record_id:configId},{label:`Production PV ${pvId}`,table:'simulations',record_id:pvId},{label:request.timeseries.series['demand_energy'].source.trim().slice(0,300)}],timeseries:{...request.timeseries,utc_offset_hours:series.utcOffset,series:{pv_energy:{values:series.values,unit:'kWh',nature:'calculated',source:`Simulation ${pvId}`},demand_energy:request.timeseries.series['demand_energy']}}};
 batteryRequestSchema.parse(rebuilt);
 return {request:rebuilt,projectId:c.project_id as string,localityId:pv.locality_id as string|null,provenance:{configuration:c,pv_simulation_id:pvId,snapshot:snap,demand_source:request.timeseries.series['demand_energy'].source,demand_project_confirmed:true}};
}
