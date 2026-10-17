"""Tests du moteur PV horaire.

Données de TEST uniquement : fichier TMY3 NREL 723170 (Greensboro, Caroline du Nord, États-Unis) distribué
avec pvlib. Il ne représente aucun site du projet.
"""
import copy
import math
from pathlib import Path

import pvlib
import pytest
from fastapi.testclient import TestClient

from app.api.schemas.contract import SimulationRequest
from app.core import security
from app.core.config import get_settings
from app.engines.pv.engine import PVWattsV8Engine
from app.main import app

TMY = Path(pvlib.__file__).parent / "data" / "723170TYA.CSV"
KEY = "k" * 40
H = {"X-Engine-Key": KEY, "Authorization": "Bearer good"}


def _tmy_request() -> dict:
    data, meta = pvlib.iotools.read_tmy3(TMY, map_variables=True)
    # Le TMY3 contient 8760 lignes chronologiques (1er janv. 01:00 → 31 déc. 24:00, fin d'heure, années sources
    # mélangées). On les réindexe en début d'heure sur une année non bissextile de référence (1990).
    assert len(data) == 8760
    import datetime as _dt
    stamps = [(_dt.datetime(1990, 1, 1) + _dt.timedelta(hours=i)).isoformat() for i in range(8760)]
    def s(col, unit):
        return {"values": [float(x) for x in data[col]], "unit": unit, "nature": "external", "source": "NREL TMY3 723170 (test)"}
    v = lambda val, unit: {"value": val, "unit": unit, "nature": "assumption"}
    return {
        "schema_version": "1.0", "engine": "photovoltaic",
        "input_data": {
            "latitude": v(meta["latitude"], "°"), "longitude": v(meta["longitude"], "°"), "elevation": v(meta["altitude"], "m"),
            "system_capacity": v(4.0, "kWc"), "dc_ac_ratio": v(1.2, "-"), "inv_eff": v(96.0, "%"), "losses": v(14.08, "%"),
            "tilt": v(20.0, "°"), "azimuth": v(180.0, "°"), "module_type": v(0, "-"), "array_type": v(0, "-"), "gcr": v(0.4, "-"),
        },
        "assumptions": {"albedo": v(0.2, "-")},
        "source_references": [{"label": "NREL TMY3 723170 — jeu de test pvlib"}],
        "timeseries": {"timestamps": stamps, "utc_offset_hours": float(meta["TZ"]), "series": {
            "ghi": s("ghi", "W/m²"), "dni": s("dni", "W/m²"), "dhi": s("dhi", "W/m²"),
            "temp_air": s("temp_air", "°C"), "wind_speed": s("wind_speed", "m/s")}},
    }


@pytest.fixture(scope="module")
def base():
    return _tmy_request()


@pytest.fixture(scope="module")
def output(base):
    return PVWattsV8Engine().run(SimulationRequest.model_validate(base))


def _errors(body):
    errs, _ = PVWattsV8Engine().validate(SimulationRequest.model_validate(body))
    return {e.code for e in errs}


def test_valid_request_has_no_errors(base):
    assert _errors(base) == set()


def test_aggregates_match_hourly_series(output):
    hourly = output.timeseries["ac_energy"].values
    assert len(hourly) == 8760
    annual = output.results["annual_ac_energy"].value
    assert math.isclose(sum(hourly), annual, rel_tol=5e-3)  # agrégat à 3 chiffres significatifs
    monthly = sum(v.value for k, v in output.results.items() if k.startswith("monthly_ac_energy_"))
    assert math.isclose(monthly, annual, rel_tol=1e-2)
    assert math.isclose(sum(output.timeseries["daily_ac_energy"].values), sum(hourly), rel_tol=1e-6)
    assert not any(w.code == "aggregate_mismatch" for w in output.warnings)


def test_energy_is_power_times_one_hour(output):
    for w, e in zip(output.timeseries["ac_power"].values[:500], output.timeseries["ac_energy"].values[:500]):
        assert math.isclose(w / 1000, e, abs_tol=1e-3)


def test_night_produces_no_positive_ac(base, output):
    ghi = base["timeseries"]["series"]["ghi"]["values"]
    night = [ac for g, ac in zip(ghi, output.timeseries["ac_power"].values) if g == 0]
    assert night and max(night) <= 0  # PVWatts peut modéliser une consommation nocturne ≤ 0, jamais une production


def test_cross_check_with_pvlib_pvwatts_chain(base, output):
    """Contrôle croisé INDÉPENDANT, non une validation : chaîne pvlib (Perez, SAPM thermique, PVWatts DC/onduleur)
    proche de PVWatts mais non identique à v8. Tolérance large de 8 %."""
    import pandas as pd
    data, meta = pvlib.iotools.read_tmy3(TMY, map_variables=True)
    data.index = data.index - pd.Timedelta(minutes=30)
    loc = pvlib.location.Location(meta["latitude"], meta["longitude"], tz=f"Etc/GMT{-int(meta['TZ']):+d}", altitude=meta["altitude"])
    sp = loc.get_solarposition(data.index)
    poa = pvlib.irradiance.get_total_irradiance(20, 180, sp.apparent_zenith, sp.azimuth, data.dni, data.ghi, data.dhi,
                                                dni_extra=pvlib.irradiance.get_extra_radiation(data.index), model="perez", albedo=0.2)
    tc = pvlib.temperature.sapm_cell(poa.poa_global, data.temp_air, data.wind_speed, **pvlib.temperature.TEMPERATURE_MODEL_PARAMETERS["sapm"]["open_rack_glass_glass"])
    dc = pvlib.pvsystem.pvwatts_dc(poa.poa_global, tc, 4000, -0.0037) * (1 - 0.1408)
    ac = pvlib.inverter.pvwatts(dc, 4000 / 1.2, eta_inv_nom=0.96)
    ref = float(ac.clip(lower=0).sum()) / 1000
    assert math.isclose(output.results["annual_ac_energy"].value, ref, rel_tol=0.08)


@pytest.mark.parametrize("mutate,code", [
    (lambda b: b["timeseries"]["timestamps"].pop(), "incomplete_year"),
    (lambda b: b["timeseries"]["timestamps"].__setitem__(5, b["timeseries"]["timestamps"][4]), "duplicate_timestamp"),
    (lambda b: b["timeseries"]["series"]["ghi"]["values"].__setitem__(100, None), "missing_values"),
    (lambda b: b["timeseries"]["series"]["ghi"]["values"].__setitem__(100, -5), "out_of_range"),
    (lambda b: b["timeseries"]["series"]["temp_air"].__setitem__("unit", "K"), "incompatible_units"),
    (lambda b: b["timeseries"]["series"].pop("dni"), "missing_parameter"),
    (lambda b: b["timeseries"]["series"].__setitem__("snow", {"values": [0.0] * 8760, "unit": "cm", "nature": "measured"}), "unsupported_series"),
    (lambda b: b["timeseries"]["timestamps"].__setitem__(0, "pas une date"), "invalid_timestamp"),
    (lambda b: b["input_data"]["tilt"].__setitem__("value", 95), "out_of_range"),
    (lambda b: b["input_data"]["module_type"].__setitem__("value", 1.5), "not_integer"),
    (lambda b: b["assumptions"].clear(), "missing_parameter"),
])
def test_rejections(base, mutate, code):
    b = copy.deepcopy(base)
    mutate(b)
    assert code in _errors(b)


def test_reversed_order_rejected(base):
    b = copy.deepcopy(base)
    t = b["timeseries"]["timestamps"]
    t[10], t[11] = t[11], t[10]
    assert "irregular_timestep" in _errors(b)


def test_extreme_temperature_runs(base):
    b = copy.deepcopy(base)
    b["timeseries"]["series"]["temp_air"]["values"] = [55.0] * 8760
    hot = PVWattsV8Engine().run(SimulationRequest.model_validate(b)).results["annual_ac_energy"].value
    b["timeseries"]["series"]["temp_air"]["values"] = [-20.0] * 8760
    cold = PVWattsV8Engine().run(SimulationRequest.model_validate(b)).results["annual_ac_energy"].value
    assert cold > hot > 0


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ENGINE_SHARED_KEY", KEY)
    monkeypatch.setenv("SUPABASE_URL", "https://auth.example")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "pub")
    get_settings.cache_clear()

    async def fake_verify(token):
        if token != "good":
            raise security.EngineError(security.ErrorCode.unauthorized, "x")
        return "user-1"
    monkeypatch.setattr(security, "verify_user_token", fake_verify)
    yield TestClient(app)
    get_settings.cache_clear()


def test_api_declares_only_implemented(client):
    engines = {e["engine"]: e for e in client.get("/api/v1/capabilities").json()["engines"]}
    assert engines["photovoltaic"]["status"] == "available"
    assert engines["battery"]["status"] == "available"
    assert engines["csp"]["status"] == "available"
    assert engines["wind"]["status"] == "available"
    assert engines["biomass"]["status"] == "available"
    assert all(e["status"] == "not_implemented" for n, e in engines.items() if n not in ("photovoltaic", "battery", "csp", "wind", "biomass"))


def test_api_run_and_auth(client, base):
    assert client.post("/api/v1/simulations", json=base).status_code == 401
    r = client.post("/api/v1/simulations", json=base, headers=H)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "completed" and body["calculation_metadata"]["requested_by"] == "user-1"
    assert len(body["timeseries"]["ac_energy"]["values"]) == 8760


def test_api_invalid_never_returns_results(client, base):
    b = copy.deepcopy(base)
    b["timeseries"]["series"]["ghi"]["values"][0] = None
    r = client.post("/api/v1/simulations", json=b, headers=H)
    assert r.status_code == 422 and "results" not in r.json()


@pytest.mark.parametrize("key", ["latitude", "longitude", "elevation", "system_capacity", "dc_ac_ratio", "inv_eff", "losses", "tilt", "azimuth", "module_type", "array_type", "gcr"])
def test_each_required_parameter_missing(base, key):
    b = copy.deepcopy(base)
    del b["input_data"][key]
    assert "missing_parameter" in _errors(b)


@pytest.mark.parametrize("value", [True, "4", [4], float("inf"), float("nan")])
def test_non_numeric_or_nonfinite_parameter_rejected(base, value):
    b = copy.deepcopy(base)
    b["input_data"]["system_capacity"]["value"] = value
    assert _errors(b)


def test_wrong_parameter_unit_rejected(base):
    b = copy.deepcopy(base)
    b["input_data"]["system_capacity"]["unit"] = "W"
    assert "incompatible_units" in _errors(b)


def test_rolling_year_rejected(base):
    from datetime import datetime, timedelta
    b = copy.deepcopy(base)
    b["timeseries"]["timestamps"] = [(datetime(2023, 2, 1) + timedelta(hours=i)).isoformat() for i in range(8760)]
    assert "calendar_year" in _errors(b)


def leap_request(base):
    from datetime import datetime, timedelta
    b = copy.deepcopy(base)
    stamps = [datetime(2024, 1, 1) + timedelta(hours=i) for i in range(8784)]
    b["timeseries"]["timestamps"] = [s.isoformat() for s in stamps if (s.month, s.day) != (2, 29)]
    return b


def test_leap_requires_explicit_convention(base):
    assert "leap_convention_required" in _errors(leap_request(base))


def test_explicit_leap_year_omission_accepted(base):
    b = leap_request(base)
    b["timeseries"]["leap_day_convention"] = "omit_feb29"
    assert _errors(b) == set()


def test_microseconds_rejected(base):
    b = copy.deepcopy(base)
    b["timeseries"]["timestamps"] = [s + ".000001" for s in b["timeseries"]["timestamps"]]
    assert "not_hourly" in _errors(b)


def test_boolean_albedo_rejected(base):
    b = copy.deepcopy(base)
    b["assumptions"]["albedo"]["value"] = True
    assert "missing_parameter" in _errors(b)


def test_direct_run_rejects_invalid_data(base):
    b = copy.deepcopy(base)
    b["timeseries"]["series"]["ghi"]["values"][0] = None
    with pytest.raises(ValueError, match="Entrées PV invalides"):
        PVWattsV8Engine().run(SimulationRequest.model_validate(b))


def test_fixed_settings_traceable(output):
    assert output.metadata["fixed_settings"] == {"en_snowloss": 0, "bifaciality": 0, "dc_degradation": 0, "analysis_period_years": 1}
    assert output.metadata["pysam_version"] == "7.1.1.post1"
