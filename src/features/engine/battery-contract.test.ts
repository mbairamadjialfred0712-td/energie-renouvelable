import {expect,it} from 'vitest';
import {assertCompletedResponse} from './engine-response';
import {batteryRequestSchema,checkBatteryResponse,BATTERY_PARAMS} from './battery-contract';
import type {SimulationRequest,simulationResponse} from './engine-contract';
import type {z} from 'zod';
export function fixture():SimulationRequest{return {engine:'battery',schema_version:'1.0',engine_version:'1.1.0',input_data:Object.fromEntries([...BATTERY_PARAMS.map(p=>[p.key,{value:p.key==='usable_energy_kwh'?10:p.key.includes('power')?5:p.key==='soc_min_pct'?10:p.key==='soc_max_pct'?90:p.key==='initial_soc_pct'?50:100,unit:p.unit,nature:'assumption' as const}]),['strategy',{value:'self_consumption',unit:'-',nature:'assumption' as const}]]),assumptions:{},source_references:[],timeseries:{timestamps:['2024-01-01T00:00:00'],utc_offset_hours:0,timestamp_convention:'period_start',series:{pv_energy:{values:[0],unit:'kWh',nature:'calculated'},demand_energy:{values:[1],unit:'kWh',nature:'measured',source:'Arithmetic test'}}}};}
function reply():z.infer<typeof simulationResponse>{const result=(value:number|null,unit='kWh')=>({value,unit,nature:'calculated' as const,method:'Arithmetic test'});return {simulation_id:'test',engine:'battery',engine_version:'1.1.0',schema_version:'1.0',status:'completed',created_at:'test',completed_at:'test',warnings:[],validation_errors:[],results:Object.fromEntries(Object.entries({pv_total_energy:0,demand_total_energy:1,pv_self_consumed_direct:0,energy_served_by_battery:1,energy_charged:0,energy_not_distributed:0,energy_not_served:0,charge_losses:0,discharge_losses:0,final_soc:4}).map(([k,v])=>[k,result(v)]).concat([['self_consumption_rate',result(null,'%')],['demand_coverage_rate',result(100,'%')],['equivalent_full_cycles',result(.125,'cycles')],['demand_peak_power',result(1,'kW')],['net_peak_power_before_battery',result(1,'kW')],['net_peak_power_after_battery',result(0,'kW')]])),timeseries:Object.fromEntries(Object.entries({soc:4,pv_served_direct:0,battery_discharge:1,battery_charge:0,energy_not_distributed:0,energy_not_served:0,grid_import:0,grid_export:0}).map(([k,v])=>[k,{values:[v],unit:'kWh',method:'Arithmetic test'}])),calculation_metadata:{level:'C',step_hours:1,first_timestamp:'2024-01-01T00:00:00',last_timestamp:'2024-01-01T00:00:00'}};}
it('accepts a reproducible one-hour balance',()=>expect(()=>checkBatteryResponse(fixture(),reply())).not.toThrow());
for(const value of [-1,Infinity,NaN,true,'10'])it(`rejects invalid capacity ${value}`,()=>{const r=fixture();const x=r.input_data['usable_energy_kwh'];if(x)x.value=value;expect(batteryRequestSchema.safeParse(r).success).toBe(false);});
it('rejects initial SOC outside retained limits',()=>{const r=fixture();const x=r.input_data['initial_soc_pct'];if(x)x.value=0;expect(batteryRequestSchema.safeParse(r).success).toBe(false);});
it('rejects incompatible units',()=>{const r=fixture();const x=r.input_data['usable_energy_kwh'];if(x)x.unit='Wh';expect(batteryRequestSchema.safeParse(r).success).toBe(false);});
it('rejects missing profile',()=>{const r=fixture();r.timeseries=null;expect(batteryRequestSchema.safeParse(r).success).toBe(false);});
for(const stamps of [['2024-01-01T00:00:00','2024-01-01T00:00:00'],['2024-01-01T00:00:00','2024-01-01T02:00:00'],['2024-02-30T00:00:00']])it('rejects invalid chronological timestamps',()=>{const r=fixture();if(r.timeseries)r.timeseries.timestamps=stamps;expect(batteryRequestSchema.safeParse(r).success).toBe(false);});
it('rejects fabricated energy aggregate',()=>{const o=reply();const x=o.results['energy_served_by_battery'];if(x)x.value=2;expect(()=>checkBatteryResponse(fixture(),o)).toThrow();});
it('rejects missing SOC output',()=>{const o=reply();delete o.timeseries['soc'];expect(()=>checkBatteryResponse(fixture(),o)).toThrow();});
it('rejects SOC outside bounds',()=>{const o=reply();const x=o.timeseries['soc'];if(x)x.values=[100];expect(()=>checkBatteryResponse(fixture(),o)).toThrow();});

it('common persistence boundary rejects incomplete battery reply',()=>{const o=reply();delete o.timeseries['soc'];expect(()=>assertCompletedResponse(fixture(),o,'test')).toThrow();});

it('JSON roundtrip preserves balances without claiming a database save',()=>{
 const original=reply();const restored=JSON.parse(JSON.stringify(original));
 expect(()=>assertCompletedResponse(fixture(),restored,'test')).not.toThrow();
 expect(restored.results['demand_total_energy'].value).toBe(1);
 expect(restored.timeseries['soc'].values).toEqual([4]);
});
it('rejects serialized SOC corruption even with correct aggregate energy',()=>{
 const restored=JSON.parse(JSON.stringify(reply()));restored.timeseries.soc.values=[5];
 expect(()=>assertCompletedResponse(fixture(),restored,'test')).toThrow();
});
