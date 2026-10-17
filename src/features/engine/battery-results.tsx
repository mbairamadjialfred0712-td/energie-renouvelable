import {CartesianGrid,Line,LineChart,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
export function BatteryResults({series}:{series:{key:string;unit:string;values:number[]}[]}){
 const soc=series.find(s=>s.key==='soc')?.values??[],ens=series.find(s=>s.key==='energy_not_served')?.values??[];
 const rows=soc.map((value,i)=>({hour:i+1,soc:value,ens:ens[i]}));
 return <section className="space-y-3"><h2 className="font-semibold">Niveau C — état de charge et énergie non servie</h2><p className="text-sm text-muted-foreground">SOC en fin d’heure, exprimé en énergie stockée (kWh). Déficit non couvert affiché séparément ; aucun approvisionnement réseau simulé.</p><div className="h-72"><ResponsiveContainer><LineChart data={rows}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="hour"/><YAxis/><Tooltip/><Line type="linear" dataKey="soc" name="Énergie stockée (kWh)" stroke="var(--color-primary)" dot={false}/><Line type="linear" dataKey="ens" name="Énergie non servie (kWh)" stroke="var(--color-destructive)" dot={false}/></LineChart></ResponsiveContainer></div></section>;
}
