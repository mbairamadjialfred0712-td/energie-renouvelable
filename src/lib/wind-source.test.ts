import { expect, it } from "vitest";
import { prepareWindSource } from "./wind-source.server";
import type { SimulationRequest } from "@/features/engine/engine-contract";
type Client = Parameters<typeof prepareWindSource>[0];
const id="00000000-0000-4000-8000-000000000001";
const val=(value:string|number,unit="-")=>({value,unit,nature:"assumption" as const,source:"test"});
const req: SimulationRequest={engine:"wind",engine_version:"1.0.0",schema_version:"1.0",project_id:id,input_data:{level:val("A"),site_id:val(id),wind_basis:val("period_mean"),measurement_height:val(999,"m"),period_start:val("forged"),period_end:val("forged")},assumptions:{},source_references:[{label:"test"}],timeseries:null};
function mock(status="validated",site=id,project=id,height=10) {
 const tables:Record<string,unknown>={site_weather_datasets:{id,status,site_id:id,locality_id:id,time_standard:"UTC",wind_height_m:height,source:"Test",reference:"Test",data_nature:"measured",samples:[{timestamp:"2024-01-01T00:00:00Z",wind_speed:5,ghi:null,dni:null,dhi:null,temp_air:null}]},study_sites:site?{id,locality_id:site}:null,projects:{id,locality_id:project}};
 return {from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:tables[table],error:null})})})})} as unknown as Client;
}
it("rebuilds height, period and series from stored weather",async()=>{const p=await prepareWindSource(mock(),req,id,true);expect(p.request.input_data["measurement_height"]?.value).toBe(10);expect(p.request.timeseries?.series["wind_speed"]?.values).toEqual([5]);expect(p.request.input_data["period_end"]?.value).toBe("2024-01-01T01:00:00Z");});
it("requires recorded weather id",async()=>await expect(prepareWindSource(mock(),req,undefined,true)).rejects.toThrow());
it("refuses unvalidated weather",async()=>await expect(prepareWindSource(mock("unverified"),req,id,true)).rejects.toThrow());
it("refuses inaccessible site",async()=>await expect(prepareWindSource(mock("validated",""),req,id,true)).rejects.toThrow());
it("refuses mismatched project locality",async()=>await expect(prepareWindSource(mock("validated",id,"other"),req,id,true)).rejects.toThrow());
it("refuses reassigned site",async()=>await expect(prepareWindSource(mock("validated","other"),req,id,true)).rejects.toThrow());
it("refuses missing positive height",async()=>await expect(prepareWindSource(mock("validated",id,id,0),req,id,true)).rejects.toThrow());
it("refuses unconfirmed means",async()=>await expect(prepareWindSource(mock(),req,id,false)).rejects.toThrow());