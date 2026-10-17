"""Tests du moteur batterie (réservoir + rendements). Aucune valeur n'est inventée : rejets explicites."""
import pytest
from app.api.schemas.contract import DataNature, InputValue, SeriesIn, SimulationRequest, TimeSeriesIn
from app.engines.battery.engine import BatteryEngine

eng = BatteryEngine()

PARAMS = {
    "usable_energy_kwh": (10.0, "kWh"),
    "charge_power_max_kw": (5.0, "kW"),
    "discharge_power_max_kw": (5.0, "kW"),
    "soc_min_pct": (10.0, "%"),
    "soc_max_pct": (90.0, "%"),
    "charge_eff_pct": (95.0, "%"),
    "discharge_eff_pct": (95.0, "%"),
    "initial_soc_pct": (50.0, "%"),
}

def req(pv, dem, hours=None, strategy="self_consumption", peak=None, overrides=None, series_units=("kWh", "kWh")):
    n = hours or len(pv)
    ts = TimeSeriesIn(
        timestamps=[f"2024-01-{(i // 24) + 1:02d}T{i % 24:02d}:00:00" for i in range(n)],
        utc_offset_hours=0,
        series={
            "pv_energy": SeriesIn(values=list(pv), unit=series_units[0], nature=DataNature.external, source="simulation PV"),
            "demand_energy": SeriesIn(values=list(dem), unit=series_units[1], nature=DataNature.measured, source="compteur"),
        },
    )
    inputs = {k: InputValue(value=v, unit=u, nature=DataNature.assumption) for k, (v, u) in PARAMS.items()}
    inputs["strategy"] = InputValue(value=strategy, unit="-", nature=DataNature.assumption)
    for k, (v, u) in (overrides or {}).items():
        inputs[k] = InputValue(value=v, unit=u, nature=DataNature.assumption)
    assumptions = {}
    if peak is not None:
        assumptions["peak_hours"] = InputValue(value=peak, unit="h", nature=DataNature.assumption)
    return SimulationRequest(engine="battery", input_data=inputs, assumptions=assumptions, timeseries=ts)


def test_self_consumption_charge_and_discharge():
    # Jour 1 : surplus PV 6 kWh -> charge ; jour 2 : déficit -> décharge.
    pv = [6.0] + [0.0] * 47
    dem = [2.0] * 48
    out = eng.run(req(pv, dem))
    r = out.results
    assert r["energy_charged"].value == pytest.approx(4.0, abs=1e-3)  # surplus 6-2
    # stocké : 4 * 0.95 = 3.8 ; SOC initial 5 -> 8.8 (max 9)
    assert out.timeseries["soc"].values[0] == pytest.approx(8.8, abs=1e-3)
    # heure 1 : déficit 2, dispo (8.8-1)*0.95=7.41 > 2 -> décharge 2
    assert out.timeseries["battery_discharge"].values[1] == pytest.approx(2.0, abs=1e-3)
    assert out.timeseries["soc"].values[1] == pytest.approx(8.8 - 2 / 0.95, abs=1e-3)
    assert r["self_consumption_rate"].value == pytest.approx(100.0)
    assert r["charge_losses"].value == pytest.approx(0.2, abs=1e-3)


def test_soc_bounds_and_curtailment():
    pv = [50.0, 0.0]
    dem = [0.0, 0.0]
    out = eng.run(req(pv, dem))
    # charge max : min(50, 5, (9-5)/0.95) = 4.2105
    assert out.timeseries["battery_charge"].values[0] == pytest.approx((9.0 - 5.0) / 0.95, abs=1e-3)
    assert out.results["energy_not_distributed"].value == pytest.approx(50 - (9.0 - 5.0) / 0.95, abs=1e-3)
    assert out.timeseries["soc"].values[0] == pytest.approx(9.0, abs=1e-3)


def test_energy_not_served_when_battery_empty():
    pv = [0.0, 0.0]
    dem = [100.0, 100.0]
    out = eng.run(req(pv, dem))
    # décharge max 5 kW mais dispo (5-1)*0.95 = 3.8 -> 3.8 servis, ENS 96.2 par heure
    assert out.timeseries["battery_discharge"].values[0] == pytest.approx(3.8, abs=1e-3)
    assert out.timeseries["energy_not_served"].values[0] == pytest.approx(96.2, abs=1e-3)
    assert out.timeseries["soc"].values[0] == pytest.approx(1.0, abs=1e-3)


def test_coverage_and_peak_shaving():
    pv = [0.0] * 24
    dem = [1.0] * 23 + [3.0]  # pointe à 23h
    out = eng.run(req(pv, dem, strategy="peak_shaving", peak=[23]))
    assert out.results["net_peak_power_before_battery"].value == pytest.approx(3.0)
    # dispo initiale : (5-1)*0.95 = 3.8 ; déficit cumulé 23x1 + 3 = 26 > 3.8 -> batterie vide, ENS résiduelle
    assert out.results["net_peak_power_after_battery"].value <= 3.0
    assert out.results["energy_served_by_battery"].value == pytest.approx(3.8, abs=1e-3)
    assert out.results["energy_not_served"].value == pytest.approx(26 - 3.8, abs=1e-3)


def test_peak_shaving_requires_peak_hours():
    errors, _ = eng.validate(req([0.0], [1.0], strategy="peak_shaving"))
    assert any(e.code == "missing_parameter" and e.field == "assumptions.peak_hours" for e in errors)


def test_rejects_wrong_units_no_conversion():
    errors, _ = eng.validate(req([1.0], [1.0], series_units=("kW", "kWh")))
    assert any(e.code == "incompatible_units" for e in errors)


def test_rejects_missing_values_and_duplicates():
    errors, _ = eng.validate(req([1.0, None], [1.0, 1.0]))
    assert any(e.code == "missing_values" for e in errors)
    r = req([1.0, 1.0], [1.0, 1.0])
    r.timeseries.timestamps = ["2024-01-01T00:00:00", "2024-01-01T00:00:00"]
    errors, _ = eng.validate(r)
    assert any(e.code == "duplicate_timestamp" for e in errors)


def test_rejects_irregular_timestep_and_unsorted():
    r = req([1.0, 1.0], [1.0, 1.0])
    r.timeseries.timestamps = ["2024-01-01T00:00:00", "2024-01-01T02:00:00"]
    errors, _ = eng.validate(r)
    assert any(e.code == "irregular_timestep" for e in errors)
    r2 = req([1.0, 1.0], [1.0, 1.0])
    r2.timeseries.timestamps = ["2024-01-01T01:00:00", "2024-01-01T00:00:00"]
    errors2, _ = eng.validate(r2)
    assert any(e.code in ("unordered", "irregular_timestep") for e in errors2)


def test_rejects_invalid_soc_range():
    errors, _ = eng.validate(req([1.0], [1.0], overrides={"soc_min_pct": (95.0, "%")}))
    assert any(e.code == "invalid_range" for e in errors)


def test_reproducible():
    pv = [3.0] * 24
    dem = [2.0] * 24
    a = eng.run(req(pv, dem))
    b = eng.run(req(pv, dem))
    assert a.results == b.results and a.timeseries == b.timeseries


def test_energy_balance_no_warnings():
    pv = [4.0, 0.0, 0.0, 0.0]
    dem = [1.0, 1.0, 1.0, 1.0]
    out = eng.run(req(pv, dem))
    assert not [w for w in out.warnings if w.code == "energy_balance_mismatch"]
    r = out.results
    served = r["pv_self_consumed_direct"].value + r["energy_served_by_battery"].value
    assert served + r["energy_not_served"].value == pytest.approx(r["demand_total_energy"].value, abs=0.01)
