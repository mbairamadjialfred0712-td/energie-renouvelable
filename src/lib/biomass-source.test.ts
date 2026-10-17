import {expect,it} from "vitest";
import {prepareBiomassSource} from "./biomass-source.server";
import {buildBiomassRequest,type BiomassCatalogue} from "@/features/engine/biomass-input";
const id="00000000-0000-4000-8000-000000000001";
const row:BiomassCatalogue={id,site_id:id,status:"validated",source:"Test",quality:"Test only",quantity:3.6,unit:"t/an",lhv:10,lhv_basis:"as_received",lhv_method:"Test method",moisture:20,period_start:"2024-01-01",period_end:"2024-12-31",data_nature:"assumption",fraction:50,levels:{}};
const request=()=>buildBiomassRequest(row,id,{moistureBasis:"wet",justification:"Test basis compatibility",confirmed:true});
function mock(overrides:Record<string,unknown>={},error:string|null=null){const tables:Record<string,unknown>={energy_resources:{id,validation_status:"validated",locality_id:id,source:"Stored source",quality:"Stored quality"},biomass_resources:{id,site_id:id,biomass_status:"validated",annual_quantity_t:3.6,quantity_unit:"t/an",calorific_value_mj_kg:10,lhv_basis:"as_received",lhv_method:"Stored method",moisture_pct:20,period_start:"2024-01-01",period_end:"2024-12-31",data_nature:"assumption",exploitable_fraction_pct:50,availability_levels:{}},study_sites:{id,locality_id:id},projects:{id,locality_id:id},...overrides};return {from:(table:string)=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:tables[table],error})};return q;}} as unknown as Parameters<typeof prepareBiomassSource>[0];}
it("uses recorded data, not browser mass or PCI",async()=>{const r=request();const mass=r.input_data["mass"];if(mass)mass.value=999;const out=await prepareBiomassSource(mock(),r,id);expect(out.request.input_data["mass"]?.value).toBe(3.6);expect(out.request.input_data["pci"]?.source).toBe("Stored source — Stored method");});
it("refuses missing recorded resource",async()=>await expect(prepareBiomassSource(mock(),request(),undefined)).rejects.toThrow());
it("refuses inaccessible resource",async()=>await expect(prepareBiomassSource(mock({energy_resources:null}),request(),id)).rejects.toThrow());
it("refuses unvalidated parent",async()=>await expect(prepareBiomassSource(mock({energy_resources:{id,validation_status:"pending"}}),request(),id)).rejects.toThrow());
it("refuses mismatched project locality",async()=>await expect(prepareBiomassSource(mock({projects:{id,locality_id:"other"}}),request(),id)).rejects.toThrow());
it("refuses missing site",async()=>await expect(prepareBiomassSource(mock({study_sites:null}),request(),id)).rejects.toThrow());
it("refuses read failures",async()=>await expect(prepareBiomassSource(mock({},"read failed"),request(),id)).rejects.toThrow());
it("requires recorded compatibility declaration",async()=>{const r=request();const d=r.input_data["basis_compatibility"];if(d)d.value=false;await expect(prepareBiomassSource(mock(),r,id)).rejects.toThrow();});
