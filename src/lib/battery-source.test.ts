import {it,expect} from 'vitest';
import {prepareBatterySource} from './battery-source.server';
import {BATTERY_PARAMS} from '@/features/engine/battery-contract';
import type {SimulationRequest} from '@/features/engine/engine-contract';
const fixture=():SimulationRequest=>({engine:'battery',schema_version:'1.0',input_data:Object.fromEntries([...BATTERY_PARAMS.map(p=>[p.key,{value:p.key==='usable_energy_kwh'?10:p.key.includes('power')?5:p.key==='soc_min_pct'?10:p.key==='soc_max_pct'?90:p.key==='initial_soc_pct'?50:100,unit:p.unit,nature:'assumption' as const}]),['strategy',{value:'self_consumption',unit:'-',nature:'assumption' as const}]]),assumptions:{},source_references:[],timeseries:{timestamps:['2024-01-01T00:00:00'],utc_offset_hours:0,timestamp_convention:'period_start',series:{pv_energy:{values:[0],unit:'kWh',nature:'calculated'},demand_energy:{values:[1],unit:'kWh',nature:'measured',source:'Arithmetic test'}}}});
const id='00000000-0000-4000-8000-000000000001';
function client(overrides:Record<string,unknown>={}){
 const tables:Record<string,unknown>={project_storage_configs:{id,project_id:id,datasheet_id:id,status:'validated',snapshot:{meta:{datasheet_id:id,snapshot_at:'2024',source:'Test'},sheet:{energy_kwh:10,max_charge_kw:5,max_discharge_kw:5}},module_count:1,soc_min_pct:10,soc_max_pct:90,charge_eff_pct:100,discharge_eff_pct:100,usable_energy_limit_kwh:null},simulations:{id,status:'completed',engine_version:'photovoltaic 1.0.0',project_id:id,locality_id:id,name:'Test',parameters:{request:{timeseries:{timestamps:['2024-01-01T00:00:00'],utc_offset_hours:0}}}},simulation_results:{timeseries:{values:[0]},unit:'kWh'},...overrides};
 return {from:(table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:tables[table],error:null}),single:async()=>({data:tables[table],error:null})};return q;}};
}
it('rebuilds nominal, PV and parameters from recorded data',async()=>{const r=fixture();const e=r.input_data['usable_energy_kwh'];if(e)e.value=999;const out=await prepareBatterySource(client(),r,id,id);expect(out.request.input_data['usable_energy_kwh']?.value).toBe(10);expect(out.request.timeseries?.series['pv_energy']?.values).toEqual([0]);expect(out.projectId).toBe(id);});
it('requires recorded config and PV identifiers',async()=>await expect(prepareBatterySource(client(),fixture())).rejects.toThrow());
it('refuses unvalidated config',async()=>await expect(prepareBatterySource(client({project_storage_configs:{status:'unverified'}}),fixture(),id,id)).rejects.toThrow());
it('refuses absent snapshot',async()=>await expect(prepareBatterySource(client({project_storage_configs:{status:'validated',snapshot:null}}),fixture(),id,id)).rejects.toThrow());
it('refuses foreign project PV',async()=>await expect(prepareBatterySource(client({simulations:{status:'completed',engine_version:'photovoltaic',project_id:'other'}}),fixture(),id,id)).rejects.toThrow());
it('refuses demand without source',async()=>{const r=fixture();const d=r.timeseries?.series['demand_energy'];if(d)d.source='';await expect(prepareBatterySource(client(),r,id,id)).rejects.toThrow();});
it('refuses mismatched demand dates',async()=>{const r=fixture();if(r.timeseries)r.timeseries.timestamps=['2023-01-01T00:00:00'];await expect(prepareBatterySource(client(),r,id,id)).rejects.toThrow();});
