import { simulationRequest, type SimulationRequest, type simulationResponse } from './engine-contract';
import type { z } from 'zod';
export const BATTERY_VERSION = '1.1.0';
export const BATTERY_PARAMS = [
  {key:'usable_energy_kwh',label:'Capacité de référence avant limites SOC',unit:'kWh',min:0.01,max:1e7},
  {key:'charge_power_max_kw',label:'Puissance de charge max',unit:'kW',min:0.01,max:1e7},
  {key:'discharge_power_max_kw',label:'Puissance de décharge max',unit:'kW',min:0.01,max:1e7},
  {key:'soc_min_pct',label:'SOC minimum',unit:'%',min:0,max:100},
  {key:'soc_max_pct',label:'SOC maximum',unit:'%',min:0,max:100},
  {key:'charge_eff_pct',label:'Rendement de charge',unit:'%',min:0.0001,max:100},
  {key:'discharge_eff_pct',label:'Rendement de décharge',unit:'%',min:0.0001,max:100},
  {key:'initial_soc_pct',label:'SOC initial',unit:'%',min:0,max:100},
] as const;
export const batteryRequestSchema = simulationRequest.superRefine((r,ctx)=>{
 const err=(message:string)=>ctx.addIssue({code:'custom',message});
 if(r.engine!=='battery')err('Moteur batterie requis.');
 for(const p of BATTERY_PARAMS){const v=r.input_data[p.key];if(!v||typeof v.value!=='number'||!Number.isFinite(v.value)||v.value<p.min||v.value>p.max||v.unit!==p.unit)err(`${p.label} : nombre fini dans [${p.min}, ${p.max}] ${p.unit} requis.`);}
 const val=(k:string)=>Number(r.input_data[k]?.value);
 if(val('soc_min_pct')>=val('soc_max_pct'))err('SOC minimum doit être inférieur au maximum.');
 if(val('initial_soc_pct')<val('soc_min_pct')||val('initial_soc_pct')>val('soc_max_pct'))err('SOC initial hors limites ; aucune correction automatique.');
 const strategy=r.input_data['strategy']?.value;
 if(strategy!=='self_consumption'&&strategy!=='peak_shaving')err('Stratégie explicite requise.');
 if(strategy==='peak_shaving'){const h=r.assumptions['peak_hours']?.value;if(!Array.isArray(h)||!h.length||h.some(x=>!Number.isInteger(x)||x<0||x>23))err('Heures de pointe entières 0–23 requises.');}
 const ts=r.timeseries;
 if(!ts||!ts.timestamps.length){err('Profils horaires PV et demande requis.');return;}
 const stamps=ts.timestamps.map(t=>/^\d{4}-\d{2}-\d{2}T\d{2}:00:00$/.test(t)?Date.parse(t+'Z'):NaN);
 if(stamps.some((t,i)=>!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==ts.timestamps[i]||(i>0&&t-(stamps[i-1]??0)!==3600000)))err('Heures locales standard complètes, ordonnées et continues requises, sans doublons.');
 for(const key of ['pv_energy','demand_energy']){const s=ts.series[key];if(!s||s.unit!=='kWh'||s.values.length!==stamps.length||s.values.some(v=>v===null||!Number.isFinite(v)||v<0||v>1e7))err(`${key} : énergie horaire en kWh complète requise.`);}
 if(Object.keys(ts.series).some(k=>k!=='pv_energy'&&k!=='demand_energy'))err('Série batterie inconnue.');
});
export const BATTERY_LABELS:Record<string,string>={pv_total_energy:'Production PV sur la période',demand_total_energy:'Demande sur la période',pv_self_consumed_direct:'PV fourni directement',energy_served_by_battery:'Énergie délivrée par la batterie (AC)',energy_charged:'Énergie reçue en charge (AC)',energy_not_distributed:'Surplus non distribué',energy_not_served:'Énergie non servie',self_consumption_rate:'Taux d’autoconsommation PV',demand_coverage_rate:'Taux de couverture de la demande',charge_losses:'Pertes de charge',discharge_losses:'Pertes de décharge',final_soc:'État de charge final (énergie)',equivalent_full_cycles:'Cycles équivalents (retrait côté batterie)',demand_peak_power:'Puissance moyenne horaire maximale demandée',net_peak_power_before_battery:'Déficit horaire maximal avant batterie',net_peak_power_after_battery:'Déficit horaire maximal après batterie'};
/** Integrity checks, not a second dispatch engine. Verify stored inputs, every balance, bounds and aggregates. */
export function checkBatteryResponse(r:SimulationRequest,out:z.infer<typeof simulationResponse>){
 batteryRequestSchema.parse(r);
 const ts=r.timeseries;if(!ts)throw new Error('Séries absentes.');
 const num=(k:string)=>Number(r.input_data[k]?.value), E=num('usable_energy_kwh'),lo=E*num('soc_min_pct')/100,hi=E*num('soc_max_pct')/100,ec=num('charge_eff_pct')/100,ed=num('discharge_eff_pct')/100;
 const near=(a:number,b:number)=>{if(!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a-b)>1e-9*Math.max(1,Math.abs(a),Math.abs(b)))throw new Error('Bilan batterie incohérent avec les entrées.');};
 const keys=['soc','pv_served_direct','battery_discharge','battery_charge','energy_not_distributed','energy_not_served','grid_import','grid_export'];
 for(const k of keys){const s=out.timeseries[k];if(!s||s.unit!=='kWh'||s.values.length!==ts.timestamps.length||s.values.some(v=>!Number.isFinite(v)||v<0))throw new Error('Série batterie incomplète ou invalide.');}
 if(Object.keys(out.timeseries).some(k=>!keys.includes(k)))throw new Error('Série batterie étrangère.');
 const series=(k:string)=>out.timeseries[k]?.values??[],sum=(k:string)=>series(k).reduce((a,b)=>a+b,0),res=(k:string,v:number|null,unit='kWh')=>{const x=out.results[k];if(!x||x.unit!==unit||((v===null)!==(x.value===null)))throw new Error('Résultat batterie absent ou unité incohérente.');if(v!==null&&x.value!==null)near(x.value,v);};
 let previous=E*num('initial_soc_pct')/100;
 for(let i=0;i<ts.timestamps.length;i++){
  const pv=Number(ts.series['pv_energy']?.values[i]),dem=Number(ts.series['demand_energy']?.values[i]),soc=series('soc')[i]??NaN,direct=series('pv_served_direct')[i]??NaN,c=series('battery_charge')[i]??NaN,d=series('battery_discharge')[i]??NaN,ens=series('energy_not_served')[i]??NaN,surplus=series('energy_not_distributed')[i]??NaN;
  near(direct,Math.min(pv,dem));near(direct+c+surplus,pv);near(direct+d+ens,dem);near(soc,previous+c*ec-d/ed);
  if(soc<lo-1e-9||soc>hi+1e-9||c>num('charge_power_max_kw')+1e-9||d>num('discharge_power_max_kw')+1e-9||(c>0&&d>0))throw new Error('Limite batterie dépassée.');
  near(series('grid_import')[i]??NaN,ens);near(series('grid_export')[i]??NaN,surplus);previous=soc;
 }
 const pv=ts.series['pv_energy']?.values.reduce<number>((a,b)=>a+Number(b),0)??0,dem=ts.series['demand_energy']?.values.reduce<number>((a,b)=>a+Number(b),0)??0,direct=sum('pv_served_direct'),charged=sum('battery_charge'),discharged=sum('battery_discharge');
 for(const [k,v] of Object.entries({pv_total_energy:pv,demand_total_energy:dem,pv_self_consumed_direct:direct,energy_served_by_battery:discharged,energy_charged:charged,energy_not_distributed:sum('energy_not_distributed'),energy_not_served:sum('energy_not_served'),charge_losses:charged*(1-ec),discharge_losses:discharged/ed*(1-ed),final_soc:previous}))res(k,v);
 res('self_consumption_rate',pv>0?100*(direct+charged)/pv:null,'%');res('demand_coverage_rate',dem>0?100*(direct+discharged)/dem:null,'%');res('equivalent_full_cycles',discharged/ed/(hi-lo),'cycles');
 const max=(values:number[])=>Math.max(...values);
 res('demand_peak_power',max(ts.series['demand_energy']?.values.map(Number)??[]),'kW');res('net_peak_power_before_battery',max(ts.timestamps.map((_,i)=>Math.max(0,Number(ts.series['demand_energy']?.values[i])-Number(ts.series['pv_energy']?.values[i])))),'kW');res('net_peak_power_after_battery',max(series('energy_not_served')),'kW');
 if(out.calculation_metadata['level']!=='C'||out.calculation_metadata['step_hours']!==1||out.calculation_metadata['first_timestamp']!==ts.timestamps[0]||out.calculation_metadata['last_timestamp']!==ts.timestamps.at(-1))throw new Error('Métadonnées batterie incohérentes.');
}
