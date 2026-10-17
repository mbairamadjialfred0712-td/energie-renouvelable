"""Manufactured arithmetic fixtures only, never measured winds or real turbine references."""
import math
from copy import deepcopy
import pytest
from app.engines.wind.engine import WindEngine, speed_ms
from app.api.schemas.contract import SimulationRequest
from tests.test_contract import client, H

ENGINE = WindEngine()
def fixture(level="A"):
    def val(x, unit="-"): return {"value":x,"unit":unit,"nature":"assumption","source":"Arithmetic test only"}
    data = {"level":val(level),"site_id":val("00000000-0000-4000-8000-000000000002"),"measurement_height":val(10,"m"),"wind_basis":val("period_mean"),"period_start":val("2024-02-29T00:00:00Z"),"period_end":val("2024-02-29T02:00:00Z")}
    if level == "B": data.update({"swept_area":val(100,"m²"),"air_density":val(1.2,"kg/m³")})
    if level == "C": data.update({"air_density":val(1.2,"kg/m³"),"hub_height":val(10,"m"),"rotor_diameter":val(10,"m"),"rated_power":val(1000,"W"),"curve_density":val(1.2,"kg/m³"),"turbine_reference":val("Manufactured test, not turbine"),"curve_conditions":val("Arithmetic only"),"curve_speeds":val([0,5,10],"m/s"),"curve_powers":val([0,500,1000],"W")})
    return {"engine":"wind","engine_version":"1.0.0","schema_version":"1.0","project_id":"00000000-0000-4000-8000-000000000001","input_data":data,"source_references":[{"label":"Arithmetic test"}],"timeseries":{"timestamps":["2024-02-29T00:00:00Z","2024-02-29T01:00:00Z"],"utc_offset_hours":0,"series":{"wind_speed":{"values":[5,10],"unit":"m/s","nature":"assumption","source":"Test only"}}}}

@pytest.mark.parametrize("value,unit,expected",[(36,"km/h",10),(10,"m/s",10),(1,"kn",1852/3600)])
def test_explicit_conversion(value,unit,expected): assert speed_ms(value,unit) == pytest.approx(expected)

@pytest.mark.parametrize("v,u",[(-1,"m/s"),(1,"mph"),(None,"m/s"),(True,"m/s"),(float("inf"),"m/s")])
def test_invalid_speed(v,u):
    with pytest.raises(ValueError): speed_ms(v,u)

def test_resource_arithmetic_and_no_electricity():
    out=ENGINE.run(SimulationRequest(**fixture()))
    assert out.results["mean_wind_speed"].value == 7.5
    assert out.results["min_wind_speed"].value == 5
    assert out.results["max_wind_speed"].value == 10
    assert out.results["turbine_energy"].value is None
    assert out.results["annual_turbine_energy"].value is None
    assert out.metadata["representativeness"] == "not_established"
    assert out.metadata["distribution"][0]["frequency_pct"] == 50

def test_kinetic_flux_not_cube_of_mean():
    out=ENGINE.run(SimulationRequest(**fixture("B")))
    assert out.timeseries["kinetic_power"].values == [7500,60000]
    assert out.results["kinetic_energy"].value == 67.5
    assert out.results["mean_kinetic_power"].value == 33750
    assert out.results["mean_kinetic_power"].value != .5*1.2*100*7.5**3
    assert out.results["turbine_energy"].value is None

def test_linear_documented_test_curve():
    r=fixture("C");r["timeseries"]["series"]["wind_speed"]["values"]=[2.5,7.5]
    out=ENGINE.run(SimulationRequest(**r))
    assert out.timeseries["turbine_power"].values == [250,750]
    assert out.results["turbine_energy"].value == 1
    assert out.results["capacity_factor"].value == 50
    assert out.results["annual_turbine_energy"].value is None

@pytest.mark.parametrize("change",["height_absent","height_zero","surface_zero","surface_negative","density_missing","density_invalid","height_mismatch","density_mismatch","alpha","curve_missing","curve_duplicate","curve_length","curve_negative","curve_overrated","out_of_range","gap","duplicate","disorder","missing","negative","unit","basis","source","period","directions","leap","assumptions","monotonic"])
def test_invalid_wind(change):
    r=fixture("B" if change.startswith("surface") or change in ("density_missing","density_invalid") else "C"); d=r["input_data"];ts=r["timeseries"]
    if change=="height_absent": del d["measurement_height"]
    elif change=="height_zero": d["measurement_height"]["value"]=0
    elif change=="surface_zero": d["swept_area"]["value"]=0
    elif change=="surface_negative": d["swept_area"]["value"]=-1
    elif change=="density_missing": del d["air_density"]
    elif change=="density_invalid": d["air_density"]["value"]=-1
    elif change=="height_mismatch": d["hub_height"]["value"]=50
    elif change=="density_mismatch": d["curve_density"]["value"]=1.3
    elif change=="alpha": d["alpha"]=deepcopy(d["measurement_height"])
    elif change=="curve_missing": del d["curve_powers"]
    elif change=="curve_duplicate": d["curve_speeds"]["value"]=[0,5,5]
    elif change=="curve_length": d["curve_powers"]["value"]=[0,500]
    elif change=="curve_negative": d["curve_powers"]["value"]=[0,-500,1000]
    elif change=="curve_overrated": d["curve_powers"]["value"]=[0,500,2000]
    elif change=="out_of_range": ts["series"]["wind_speed"]["values"][0]=11
    elif change=="gap": ts["timestamps"][1]="2024-02-29T03:00:00Z"
    elif change=="duplicate": ts["timestamps"][1]=ts["timestamps"][0]
    elif change=="disorder": ts["timestamps"].reverse()
    elif change=="missing": ts["series"]["wind_speed"]["values"][0]=None
    elif change=="negative": ts["series"]["wind_speed"]["values"][0]=-1
    elif change=="unit": ts["series"]["wind_speed"]["unit"]="mph"
    elif change=="basis": d["wind_basis"]["value"]="instantaneous"
    elif change=="source": ts["series"]["wind_speed"]["source"]=""
    elif change=="period": d["period_end"]["value"]="2025-01-01T00:00:00Z"
    elif change=="directions": ts["series"]["wind_direction"]={"values":[0,360],"unit":"°","nature":"assumption","source":"test"}
    elif change=="leap": ts["leap_day_convention"]="omit_feb29"
    elif change=="assumptions": r["assumptions"]={"a":deepcopy(d["measurement_height"])}
    elif change=="monotonic": d["rated_speed"]=deepcopy(d["measurement_height"]);d["rated_speed"]["unit"]="m/s"; d["curve_powers"]["value"]=[0,900,800]
    with pytest.raises(ValueError): ENGINE.run(SimulationRequest(**r))

def test_api_wind_and_capability(client):
    cap=client.get("/api/v1/capabilities").json()
    assert next(e for e in cap["engines"] if e["engine"]=="wind")["version"]=="1.0.0"
    assert client.post("/api/v1/simulations/validate",json=fixture("C"),headers=H).json()["valid"]
    out=client.post("/api/v1/simulations",json=fixture("C"),headers=H)
    assert out.status_code==200 and out.json()["results"]["turbine_energy"]["value"]==1.5

def test_api_no_auth_no_results(client):
    out=client.post("/api/v1/simulations",json=fixture())
    assert out.status_code==401 and "results" not in out.json()

@pytest.mark.parametrize("bad",[True,"5",None])
def test_api_bad_speed_no_results(client,bad):
    r=fixture();r["timeseries"]["series"]["wind_speed"]["values"][0]=bad
    out=client.post("/api/v1/simulations",json=r,headers=H)
    assert out.status_code==422 and "results" not in out.json()

def test_direction_frequency():
    r=fixture();r["timeseries"]["series"]["wind_direction"]={"values":[0,90],"unit":"°","nature":"assumption","source":"test"}
    out=ENGINE.run(SimulationRequest(**r));assert out.metadata["direction_sectors"][0]["frequency_pct"]==50

def test_complete_day_no_incomplete_month():
    r=fixture("C");r["timeseries"]["timestamps"]=[f"2024-02-29T{h:02}:00:00Z" for h in range(24)];r["timeseries"]["series"]["wind_speed"]["values"]=[5]*24;r["input_data"]["period_end"]["value"]="2024-03-01T00:00:00Z"
    out=ENGINE.run(SimulationRequest(**r));assert out.results["daily_turbine_energy_2024-02-29"].value==12
    assert not any(k.startswith("monthly_") for k in out.results)

def test_complete_leap_year_not_extrapolated():
    from datetime import datetime,timedelta
    r=fixture("C"); start=datetime(2024,1,1); r["timeseries"]["timestamps"]=[(start+timedelta(hours=h)).strftime("%Y-%m-%dT%H:00:00Z") for h in range(8784)];r["timeseries"]["series"]["wind_speed"]["values"]=[5]*8784;r["input_data"]["period_start"]["value"]="2024-01-01T00:00:00Z";r["input_data"]["period_end"]["value"]="2025-01-01T00:00:00Z"
    out=ENGINE.run(SimulationRequest(**r));assert out.results["annual_turbine_energy"].value==4392
    assert out.metadata["representativeness"]=="not_established"
    assert len([k for k in out.results if k.startswith("monthly_")])==12

def test_wind_service_missing_key_no_results(client,monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("ENGINE_SHARED_KEY","");get_settings.cache_clear()
    out=client.post("/api/v1/simulations",json=fixture(),headers=H)
    assert out.status_code==503 and "results" not in out.json()

def test_wind_wrong_key_no_results(client):
    out=client.post("/api/v1/simulations",json=fixture(),headers={**H,"X-Engine-Key":"wrong"})
    assert out.status_code==401 and "results" not in out.json()

def test_rotor_diameter_geometry():
    r=fixture("B");r["input_data"]["rotor_diameter"]={"value":10,"unit":"m","nature":"assumption","source":"Arithmetic only"}
    r["input_data"]["swept_area"]["value"]=25*math.pi
    out=ENGINE.run(SimulationRequest(**r))
    assert out.timeseries["kinetic_power"].values[0] == pytest.approx(.5*1.2*25*math.pi*125)

def test_rotor_area_mismatch_rejected():
    r=fixture("B");r["input_data"]["rotor_diameter"]={"value":10,"unit":"m","nature":"assumption","source":"Arithmetic only"}
    with pytest.raises(ValueError,match="Surface incompatible"): ENGINE.run(SimulationRequest(**r))

def test_curve_sources_bound_to_reference():
    r=fixture("C");r["input_data"]["curve_powers"]["source"]="Different document"
    with pytest.raises(ValueError,match="référence documentaire"): ENGINE.run(SimulationRequest(**r))

def test_zero_documented_cut_in_allowed():
    r=fixture("C");r["input_data"]["cut_in"]={"value":0,"unit":"m/s","nature":"assumption","source":"Arithmetic only"}
    assert ENGINE.run(SimulationRequest(**r)).results["turbine_energy"].value == 1.5

def test_overflow_api_no_results(client):
    r=fixture();r["timeseries"]["series"]["wind_speed"]["values"]=[1e308,1e308]
    out=client.post("/api/v1/simulations",json=r,headers=H)
    assert out.status_code==422 and "results" not in out.json()

def test_incomplete_hour_refused():
    r=fixture("C");r["timeseries"]["timestamps"][1]="2024-02-29T01:30:00Z"
    with pytest.raises(ValueError): ENGINE.run(SimulationRequest(**r))