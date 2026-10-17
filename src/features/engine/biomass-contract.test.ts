import {expect,it} from "vitest";
import {assertCompletedResponse} from "./engine-response";
import {buildBiomassRequest,type BiomassCatalogue} from "./biomass-input";
import {biomassRequestSchema,checkBiomassResponse} from "./biomass-contract";
import {simulationResponse} from "./engine-contract";
const row:BiomassCatalogue={id:"row-1",site_id:"site-1",status:"validated",source:"Arithmetic fixture",quality:"Arithmetic only",quantity:3.6,unit:"t/an",lhv:10,lhv_basis:"as_received",lhv_method:"Test method",moisture:20,period_start:"2024-01-01",period_end:"2024-12-31",data_nature:"assumption",fraction:50,levels:{deliverable:1}};
const req=()=>buildBiomassRequest(row,"00000000-0000-4000-8000-000000000001",{moistureBasis:"wet",justification:"Arithmetic test documentation",confirmed:true});
it("retains entered fractions and levels without computing mobilisation",()=>{const r=req();expect(r.input_data["fraction"]?.value).toBe(50);expect(r.input_data["level_deliverable"]?.value).toBe(1);expect(r.input_data["mass"]?.value).toBe(3.6);});
for(const [key,value] of [["mass",-1],["pci",0],["moisture",101],["moisture",null],["pci_basis","dry"],["moisture_basis",""],["period_end","2024-11-30"],["status","unverified"],["basis_compatibility",false]] as const) it(`refuses ${key} ${value}`,()=>{const r=req();const v=r.input_data[key];if(v)v.value=value;expect(biomassRequestSchema.safeParse(r).success).toBe(false);});
it("refuses source-free PCI",()=>{const r=req();const v=r.input_data["pci"];if(v)v.source="";expect(biomassRequestSchema.safeParse(r).success).toBe(false);});
it("refuses multi-resource aggregation",()=>{const r=req();r.source_references.push({...r.source_references[0],label:"Other"});expect(biomassRequestSchema.safeParse(r).success).toBe(false);});
function reply(){const reasons={mobilisable_mass:"No method",useful_thermal_energy:"No technology",gross_electric_energy:"No technology",net_electric_energy:"No auxiliaries"};return simulationResponse.parse({simulation_id:"test",status:"completed",engine:"biomass",engine_version:"1.0.0",schema_version:"1.0",created_at:"2026-10-17T00:00:00Z",completed_at:"2026-10-17T00:00:01Z",results:{primary_energy:{value:10,unit:"MWh/an",nature:"calculated",method:"Test arithmetic"},...Object.fromEntries(Object.entries(reasons).map(([k,v])=>[k,{value:null,unit:k==="mobilisable_mass"?"t/an":"MWh/an",nature:"calculated",method:v}]))},timeseries:{},warnings:[],validation_errors:[],calculation_metadata:{resource_id:"row-1",boundary:"recorded_primary",fraction_applied:false,moisture_conversion:"none",aggregation:"single_resource",scientific_validation:"pending",unavailable_reasons:reasons}});}
it("accepts arithmetic primary result with unavailable conversions",()=>expect(()=>checkBiomassResponse(req(),reply())).not.toThrow());
it("rejects fabricated electricity",()=>{const out=reply();const r=out.results["net_electric_energy"];if(r)r.value=0;expect(()=>checkBiomassResponse(req(),out)).toThrow();});
it("rejects inconsistent primary energy",()=>{const out=reply();const r=out.results["primary_energy"];if(r)r.value=5;expect(()=>checkBiomassResponse(req(),out)).toThrow();});
it("rejects foreign resource",()=>{const out=reply();out.calculation_metadata["resource_id"]="other";expect(()=>checkBiomassResponse(req(),out)).toThrow();});

it("applies biomass integrity at common persistence boundary",()=>{const out=reply();const r=out.results["primary_energy"];if(r)r.value=5;expect(()=>assertCompletedResponse(req(),out,"test")).toThrow();});
it("rejects mismatched reference period",()=>{const r=req();const source=r.source_references[0];if(source)source.period="2023";expect(biomassRequestSchema.safeParse(r).success).toBe(false);});
