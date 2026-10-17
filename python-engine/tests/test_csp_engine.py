"""Manufactured arithmetic cases, not measured resource/plant data or science validation.

Reference equations: NREL/TP-5500-51825 boundaries as documented in VALIDATION_CSP.md.
Coefficients below are TEST fixtures, never defaults or recommended technical values.
"""
from copy import deepcopy
import pytest
from app.api.schemas.contract import SimulationRequest
from app.engines.csp.engine import CspBalanceEngine
from tests.test_contract import client, H

ENGINE = CspBalanceEngine()
def fixture():
    def val(x, unit="-"):
        return {"value": x, "unit": unit, "nature": "assumption", "source": "Manufactured arithmetic test only, not plant data"}
    return {
        "engine": "csp", "engine_version": "1.0.0", "schema_version": "1.0",
        "project_id": "00000000-0000-4000-8000-000000000001",
        "input_data": {
            "site_id": val("00000000-0000-4000-8000-000000000002"), "technology": val("parabolic_trough"),
            "aperture_area": val(100, "m²"), "optical_efficiency": val(.5), "thermal_loss": val(1000, "W"),
            "operating_temperature": val(300, "°C"), "fluid": val("test fluid, not a recommended HTF"),
            "conditions": val("Test only: constant documented conditions"), "dni_basis": val("period_mean"),
            "optical_basis": val("effective_includes_incidence"), "period_start": val("2024-02-29T00:00:00Z"),
            "period_end": val("2024-02-29T02:00:00Z"),
        },
        "source_references": [{"label": "Manufactured verification of energy-balance algebra, not scientific validation"}],
        "timeseries": {"timestamps": ["2024-02-29T00:00:00Z", "2024-02-29T01:00:00Z"], "utc_offset_hours": 0,
                       "series": {"dni": {"values": [800, 600], "unit": "W/m²", "nature": "assumption", "source": "Test only"}}},
    }

def test_reference_balance_and_optional_unknowns():
    out = ENGINE.run(SimulationRequest(**fixture()))
    assert out.results["incident_energy"].value == 140
    assert out.results["captured_energy"].value == 70
    assert out.results["thermal_loss_energy"].value == 2
    assert out.results["thermal_balance_energy"].value == 68
    assert out.results["useful_thermal_energy"].value == 68
    assert out.results["gross_electric_energy"].value is None
    assert out.results["net_electric_energy"].value is None
    assert out.results["capture_efficiency"].value == 50
    assert out.metadata["coverage"] == "declared_period_only"
    assert "gross_electric_energy" in out.metadata["unavailable_reasons"]

def test_documented_cycle_and_aux_balance():
    req = fixture()
    req["input_data"]["cycle_efficiency"] = {"value": .4, "unit": "-", "nature": "assumption", "source": "Test only"}
    req["input_data"]["auxiliary_power"] = {"value": 500, "unit": "W", "nature": "assumption", "source": "Test only"}
    out = ENGINE.run(SimulationRequest(**req))
    assert out.results["gross_electric_energy"].value == pytest.approx(27.2)
    assert out.results["auxiliary_energy"].value == 1
    assert out.results["net_electric_energy"].value == pytest.approx(26.2)

def test_negative_heat_is_signed_not_silent_zero():
    req = fixture(); req["timeseries"]["series"]["dni"]["values"] = [0, 0]
    out = ENGINE.run(SimulationRequest(**req))
    assert out.results["thermal_balance_energy"].value == -2
    assert out.results["useful_thermal_energy"].value is None
    assert "useful_thermal_power" not in out.timeseries
    assert out.results["capture_efficiency"].value is None

@pytest.mark.parametrize("field,value,unit", [
    ("aperture_area", 0, "m²"), ("aperture_area", -1, "m²"), ("aperture_area", 2, "kW"),
    ("optical_efficiency", 1.1, "-"), ("optical_efficiency", 0, "-"),
    ("thermal_loss", -1, "W"), ("thermal_loss", 2, "Wh"), ("cycle_efficiency", 1.1, "-"),
    ("operating_temperature", -300, "°C"), ("auxiliary_power", -1, "W"),
    ("technology", "tower", "-"), ("dni_basis", "instantaneous", "-"),
    ("optical_basis", "normal_incidence", "-"),
])
def test_invalid_technical_parameters(field, value, unit):
    req = fixture(); req["input_data"][field] = {"value": value, "unit": unit, "nature": "assumption", "source": "Test only"}
    with pytest.raises(ValueError): ENGINE.run(SimulationRequest(**req))

@pytest.mark.parametrize("change", ["absent_dni", "negative", "energy_unit", "missing", "duplicate", "disorder", "gap", "incomplete", "offset", "leap_omit", "unknown_series", "unknown_param", "loss_absent", "source_absent", "storage", "period", "assumptions"])
def test_invalid_contract_or_series(change):
    r = fixture(); ts = r["timeseries"]
    if change == "absent_dni": ts["series"] = {}
    elif change == "negative": ts["series"]["dni"]["values"][0] = -1
    elif change == "energy_unit": ts["series"]["dni"]["unit"] = "kWh/m²"
    elif change == "missing": ts["series"]["dni"]["values"][0] = None
    elif change == "duplicate": ts["timestamps"][1] = ts["timestamps"][0]
    elif change == "disorder": ts["timestamps"].reverse()
    elif change == "gap": ts["timestamps"][1] = "2024-02-29T02:00:00Z"
    elif change == "incomplete": ts["series"]["dni"]["values"].pop()
    elif change == "offset": ts["utc_offset_hours"] = 1
    elif change == "leap_omit": ts["leap_day_convention"] = "omit_feb29"
    elif change == "unknown_series": ts["series"]["ghi"] = deepcopy(ts["series"]["dni"])
    elif change == "unknown_param": r["input_data"]["invented"] = deepcopy(r["input_data"]["thermal_loss"])
    elif change == "loss_absent": del r["input_data"]["thermal_loss"]
    elif change == "source_absent": r["input_data"]["thermal_loss"]["source"] = ""
    elif change == "storage": r["input_data"]["thermal_storage"] = deepcopy(r["input_data"]["thermal_loss"])
    elif change == "period": r["input_data"]["period_end"]["value"] = "2024-03-01T00:00:00Z"
    elif change == "assumptions": r["assumptions"] = {"unknown": deepcopy(r["input_data"]["thermal_loss"])}
    with pytest.raises(ValueError): ENGINE.run(SimulationRequest(**r))

def test_api_validate_and_run(client):
    body = fixture()
    assert client.post("/api/v1/simulations/validate", json=body, headers=H).json()["valid"] is True
    response = client.post("/api/v1/simulations", json=body, headers=H)
    assert response.status_code == 200
    out = response.json()
    assert out["status"] == "completed" and out["results"]["thermal_balance_energy"]["value"] == 68
    assert out["results"]["net_electric_energy"]["value"] is None
    assert out["calculation_metadata"]["scientific_validation"] == "pending"

def test_api_failed_calculation_has_no_results(client):
    body = fixture(); body["timeseries"]["series"] = {}
    r = client.post("/api/v1/simulations", json=body, headers=H)
    assert r.status_code == 422 and "results" not in r.json()

def test_api_unauthorized_csp(client):
    assert client.post("/api/v1/simulations", json=fixture()).status_code == 401

def test_api_unknown_top_level(client):
    assert client.post("/api/v1/simulations", json={**fixture(), "arbitrary": 2}, headers=H).status_code == 422

def test_api_service_unconfigured(client, monkeypatch):
    from app.core.config import get_settings
    monkeypatch.setenv("ENGINE_SHARED_KEY", ""); get_settings.cache_clear()
    assert client.post("/api/v1/simulations", json=fixture(), headers=H).status_code == 503

@pytest.mark.parametrize("bad", [True, "800"])
def test_api_strict_numeric_dni(client, bad):
    r = fixture(); r["timeseries"]["series"]["dni"]["values"][0] = bad
    assert client.post("/api/v1/simulations", json=r, headers=H).status_code == 422

def test_complete_daily_aggregation_without_false_annual():
    r = fixture()
    r["timeseries"]["timestamps"] = [f"2024-02-29T{h:02d}:00:00Z" for h in range(24)]
    r["timeseries"]["series"]["dni"]["values"] = [800]*24
    r["input_data"]["period_end"]["value"] = "2024-03-01T00:00:00Z"
    out = ENGINE.run(SimulationRequest(**r))
    assert out.results["daily_incident_energy_2024-02-29"].value == 1920
    assert out.metadata["coverage"] == "declared_period_only"
    assert not any(k.startswith("monthly_") for k in out.results)

def test_net_negative_is_import_not_clipped():
    r = fixture()
    r["input_data"]["cycle_efficiency"] = {"value": .4, "unit": "-", "nature": "assumption", "source": "Test only"}
    r["input_data"]["auxiliary_power"] = {"value": 20000, "unit": "W", "nature": "assumption", "source": "Test only"}
    out = ENGINE.run(SimulationRequest(**r))
    assert out.results["net_electric_energy"].value == pytest.approx(-12.8)