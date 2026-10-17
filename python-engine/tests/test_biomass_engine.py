"""Arithmetic fixtures only, no real resources or process validation."""
import copy
import pytest
from app.api.schemas.contract import SimulationRequest
from app.engines.biomass.engine import BiomassPrimaryEngine
from app.services.validation import validate_request


def fixture():
    def v(value, unit="-"): return {"value": value, "unit": unit, "nature": "assumption", "source": "Arithmetic test documentation"}
    return {"schema_version":"1.0","engine":"biomass","engine_version":"1.0.0","input_data": {"resource_id":v("row-1"),"site_id":v("site-1"),"status":v("validated"),"quality":v("Arithmetic fixture only"),"mass":v(3.6,"t/an"),"pci":v(10,"MJ/kg"),"moisture":v(20,"%"),"mass_basis":v("as_received"),"pci_basis":v("as_received"),"moisture_basis":v("wet"),"basis_compatibility":v(True),"period_start":v("2024-01-01"),"period_end":v("2024-12-31")},"source_references":[{"label":"Arithmetic test","table":"biomass_resources","record_id":"row-1"}]}


def test_primary_units_and_no_electricity():
    req=SimulationRequest.model_validate(fixture())
    assert validate_request(req)[0]==[]
    out=BiomassPrimaryEngine().run(req)
    assert out.results["primary_energy"].value==pytest.approx(10)
    assert out.results["primary_energy"].unit=="MWh/an"
    for key in ("mobilisable_mass","useful_thermal_energy","gross_electric_energy","net_electric_energy"):
        assert out.results[key].value is None
        assert out.metadata["unavailable_reasons"][key]
    assert out.timeseries=={}


@pytest.mark.parametrize("key,value,unit",[("mass",-1,"t/an"),("mass",0,"t/an"),("mass",3.6,"kg/an"),("mass",3.6,"t/mois"),("pci",0,"MJ/kg"),("pci",10,"GJ/kg"),("pci_basis","dry","-"),("mass_basis","dry","-"),("moisture",None,"%"),("moisture",101,"%"),("moisture",-1,"%"),("moisture_basis","","-"),("status","unverified","-"),("period_end","2024-11-30","-"),("period_start","2024-02-30","-"),("basis_compatibility",False,"-"),("fraction",101,"%"),("efficiency",0.8,"-"),("mass",True,"t/an")])
def test_refuses_invalid_inputs(key,value,unit):
    body=fixture();body["input_data"][key]={"value":value,"unit":unit,"nature":"assumption","source":"Arithmetic documentation"}
    req=SimulationRequest.model_validate(body)
    assert validate_request(req)[0]
    with pytest.raises(ValueError): BiomassPrimaryEngine().run(req)


def test_missing_source():
    body=fixture();body["input_data"]["pci"]["source"]=""
    assert validate_request(SimulationRequest.model_validate(body))[0]


def test_no_double_count():
    body=fixture();body["source_references"].append(copy.deepcopy(body["source_references"][0]))
    assert validate_request(SimulationRequest.model_validate(body))[0]


def test_fraction_and_levels_not_applied():
    body=fixture();body["input_data"]["fraction"]={"value":50,"unit":"%","nature":"assumption","source":"Test"};body["input_data"]["level_deliverable"]={"value":1,"unit":"t/an","nature":"assumption","source":"Test"}
    out=BiomassPrimaryEngine().run(SimulationRequest.model_validate(body))
    assert out.results["primary_energy"].value==pytest.approx(10)
    assert out.results["mobilisable_mass"].value is None


def test_gj_kwh_arithmetic():
    body=fixture();body["input_data"]["mass"]["value"]=1;body["input_data"]["pci"]["value"]=3.6
    assert BiomassPrimaryEngine().run(SimulationRequest.model_validate(body)).results["primary_energy"].value==pytest.approx(1)


def test_overflow_no_output():
    body=fixture();body["input_data"]["mass"]["value"]=1e308;body["input_data"]["pci"]["value"]=1e308
    with pytest.raises(ValueError): BiomassPrimaryEngine().run(SimulationRequest.model_validate(body))
