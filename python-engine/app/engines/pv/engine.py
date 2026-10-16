"""Moteur photovoltaïque horaire — PVWatts v8 exécuté par NREL PySAM (module Pvwattsv8, licence BSD-3).

Le moteur n'implémente AUCUNE équation PV propre : il prépare, valide et transmet les données au module
officiel Pvwattsv8 de SAM, puis agrège ses sorties horaires. Voir docs/VALIDATION_PV.md.
"""
from __future__ import annotations

import math
from collections import OrderedDict
from datetime import datetime, timedelta
from importlib.metadata import version as pkg_version

import PySAM.Pvwattsv8 as pvwatts

from app.api.schemas.contract import Issue, ResultValue, SeriesOut, SimulationRequest
from app.engines.registry import EngineOutput

ENGINE_VERSION = "1.0.0"
MODEL = "PVWatts v8 (NREL SAM, via PySAM Pvwattsv8)"
HOURS = 8760

# nom -> (unités acceptées, min, max). Aucune conversion d'unité n'est effectuée.
PARAMS: dict[str, tuple[set[str], float, float]] = {
    "latitude": ({"°"}, -90, 90),
    "longitude": ({"°"}, -180, 180),
    "elevation": ({"m"}, -500, 9000),
    "system_capacity": ({"kWc"}, 0.05, 500_000),
    "dc_ac_ratio": ({"-"}, 0.5, 3),
    "inv_eff": ({"%"}, 90, 99.5),
    "losses": ({"%"}, -5, 99),
    "tilt": ({"°"}, 0, 90),
    "azimuth": ({"°"}, 0, 360),
    "module_type": ({"-"}, 0, 2),
    "array_type": ({"-"}, 0, 4),
    "gcr": ({"-"}, 0.01, 0.99),
}
INTEGER_PARAMS = {"module_type", "array_type"}

# nom -> (unité, min, max, clé SAM)
SERIES: dict[str, tuple[str, float, float, str]] = {
    "ghi": ("W/m²", 0, 1500, "gh"),
    "dni": ("W/m²", 0, 1500, "dn"),
    "dhi": ("W/m²", 0, 1000, "df"),
    "temp_air": ("°C", -60, 70, "tdry"),
    "wind_speed": ("m/s", 0, 75, "wspd"),
}
OPTIONAL_SERIES = {"albedo": ("-", 0, 1, "alb")}


def _parse_ts(raw: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo is None else None  # heure locale standard sans suffixe


def _sig(x: float, n: int = 3) -> float:
    if x == 0 or not math.isfinite(x):
        return x
    return round(x, -int(math.floor(math.log10(abs(x)))) + (n - 1))


class PVWattsV8Engine:
    name = "photovoltaic"
    version = ENGINE_VERSION
    description = "Production photovoltaïque horaire (PVWatts v8)"
    required_inputs = {k: v[0] for k, v in PARAMS.items()}
    required_series = {k: {v[0]} for k, v in SERIES.items()}

    # ---------- validation ----------
    def validate(self, req: SimulationRequest) -> tuple[list[Issue], list[Issue]]:
        errors: list[Issue] = []
        warnings: list[Issue] = []
        for name, (units, lo, hi) in PARAMS.items():
            v = req.input_data.get(name)
            if v is None or not isinstance(v.value, (int, float)) or isinstance(v.value, bool):
                continue  # absence / unité signalées par la validation générique
            if v.unit in units and not (lo <= float(v.value) <= hi):
                errors.append(Issue(field=f"input_data.{name}", code="out_of_range", message=f"Valeur hors plage [{lo} ; {hi}] {next(iter(units))}."))
            if name in INTEGER_PARAMS and float(v.value) != int(v.value):
                errors.append(Issue(field=f"input_data.{name}", code="not_integer", message="Code entier attendu."))
        ts = req.timeseries
        if ts is None:
            errors.append(Issue(field="timeseries", code="missing_parameter", message="Série météorologique horaire requise."))
            return errors, warnings
        stamps = [_parse_ts(t) for t in ts.timestamps]
        if any(s is None for s in stamps):
            errors.append(Issue(field="timeseries.timestamps", code="invalid_timestamp", message="Horodatages ISO 8601 locaux sans suffixe de fuseau requis (fuseau donné par utc_offset_hours)."))
            return errors, warnings
        if len(stamps) != HOURS:
            errors.append(Issue(field="timeseries.timestamps", code="incomplete_year", message=f"{len(stamps)} heures reçues ; PVWatts v8 horaire exige exactement {HOURS} heures (29 février exclu)."))
        if len(set(stamps)) != len(stamps):
            errors.append(Issue(field="timeseries.timestamps", code="duplicate_timestamp", message="Horodatages en double."))
        for i in range(1, len(stamps)):
            gap = stamps[i] - stamps[i - 1]
            if gap == timedelta(hours=1):
                continue
            skipped_leap = gap == timedelta(hours=25) and (stamps[i - 1] + timedelta(hours=1)).strftime("%m-%d") == "02-29"
            if not skipped_leap:
                errors.append(Issue(field="timeseries.timestamps", code="irregular_timestep", message=f"Pas de temps irrégulier ou désordonné entre {stamps[i-1].isoformat()} et {stamps[i].isoformat()}."))
                break
        if any(s.strftime("%m-%d") == "02-29" for s in stamps if s):
            errors.append(Issue(field="timeseries.timestamps", code="leap_day", message="Le 29 février doit être retiré (convention SAM 8760 h)."))
        if any(s.minute or s.second for s in stamps if s):
            errors.append(Issue(field="timeseries.timestamps", code="not_hourly", message="Horodatages au début de chaque heure (minute 0) requis."))
        expected = {**SERIES, **OPTIONAL_SERIES}
        for name in ts.series:
            if name not in expected:
                errors.append(Issue(field=f"timeseries.series.{name}", code="unsupported_series", message="Série non utilisée par PVWatts v8."))
        for name, (unit, lo, hi, _) in expected.items():
            s = ts.series.get(name)
            if s is None:
                if name in SERIES:
                    errors.append(Issue(field=f"timeseries.series.{name}", code="missing_parameter", message="Série requise manquante."))
                continue
            if s.unit != unit:
                errors.append(Issue(field=f"timeseries.series.{name}", code="incompatible_units", message=f"Unité « {s.unit} » refusée ; attendue {unit}. Aucune conversion implicite."))
            if len(s.values) != len(stamps):
                errors.append(Issue(field=f"timeseries.series.{name}", code="length_mismatch", message="Longueur différente des horodatages."))
            missing = sum(1 for x in s.values if x is None or not math.isfinite(x))
            if missing:
                errors.append(Issue(field=f"timeseries.series.{name}", code="missing_values", message=f"{missing} valeur(s) manquante(s) ; elles ne sont jamais remplacées par zéro."))
            bad = sum(1 for x in s.values if x is not None and math.isfinite(x) and not (lo <= x <= hi))
            if bad:
                errors.append(Issue(field=f"timeseries.series.{name}", code="out_of_range", message=f"{bad} valeur(s) hors plage [{lo} ; {hi}] {unit}."))
            if s.nature.value in ("measured", "external") and not s.source:
                warnings.append(Issue(field=f"timeseries.series.{name}", code="missing_source", message="Série mesurée/externe sans source."))
            if s.nature.value == "estimate":
                warnings.append(Issue(field=f"timeseries.series.{name}", code="estimate", message="Série estimée : le résultat n'est pas fondé sur des mesures."))
        if "albedo" not in ts.series:
            a = req.assumptions.get("albedo")
            if a is None or not isinstance(a.value, (int, float)) or a.unit != "-" or not (0 <= float(a.value) <= 1):
                errors.append(Issue(field="assumptions.albedo", code="missing_parameter", message="Albédo requis : série horaire ou hypothèse constante explicite (sans unité, 0–1)."))
        warnings.append(Issue(field=None, code="engineer_validation_required", message="Résultat indicatif : modèle et paramètres à valider par l'ingénieur avant usage professionnel."))
        return errors, warnings

    # ---------- exécution ----------
    def run(self, req: SimulationRequest) -> EngineOutput:
        ts = req.timeseries
        assert ts is not None
        stamps = [_parse_ts(t) for t in ts.timestamps]
        p = {k: float(req.input_data[k].value) for k in PARAMS}  # type: ignore[arg-type]
        resource: dict = {
            "lat": p["latitude"], "lon": p["longitude"], "elev": p["elevation"], "tz": ts.utc_offset_hours,
            "year": [s.year for s in stamps], "month": [s.month for s in stamps], "day": [s.day for s in stamps],
            "hour": [s.hour for s in stamps], "minute": [s.minute for s in stamps],
        }
        for name, (_, _, _, key) in {**SERIES, **OPTIONAL_SERIES}.items():
            if name in ts.series:
                resource[key] = [float(x) for x in ts.series[name].values]  # type: ignore[arg-type]
        if "albedo" not in ts.series:
            resource["alb"] = [float(req.assumptions["albedo"].value)] * HOURS  # type: ignore[arg-type]

        m = pvwatts.new()
        m.SolarResource.solar_resource_data = resource
        m.SystemDesign.system_capacity = p["system_capacity"]
        m.SystemDesign.dc_ac_ratio = p["dc_ac_ratio"]
        m.SystemDesign.inv_eff = p["inv_eff"]
        m.SystemDesign.losses = p["losses"]
        m.SystemDesign.tilt = p["tilt"]
        m.SystemDesign.azimuth = p["azimuth"]
        m.SystemDesign.module_type = int(p["module_type"])
        m.SystemDesign.array_type = int(p["array_type"])
        m.SystemDesign.gcr = p["gcr"]
        m.SystemDesign.en_snowloss = 0
        m.SystemDesign.bifaciality = 0
        m.Lifetime.analysis_period = 1
        m.Lifetime.system_use_lifetime_output = 0
        m.Lifetime.dc_degradation = [0.0]
        try:
            m.execute(0)
        except Exception as exc:  # erreur du modèle SAM → échec explicite
            raise ValueError(f"PVWatts v8 a refusé le calcul : {exc}") from None

        ac_w = list(m.Outputs.ac)
        dc_w = list(m.Outputs.dc)
        if len(ac_w) != HOURS:
            raise ValueError("Sortie PVWatts v8 de longueur inattendue.")
        hourly_kwh = [w / 1000.0 for w in ac_w]  # puissance moyenne horaire (W) × 1 h → Wh → kWh
        monthly: OrderedDict[str, float] = OrderedDict()
        daily: OrderedDict[str, float] = OrderedDict()
        for s, e in zip(stamps, hourly_kwh):
            monthly[s.strftime("%Y-%m")] = monthly.get(s.strftime("%Y-%m"), 0.0) + e
            daily[s.strftime("%Y-%m-%d")] = daily.get(s.strftime("%Y-%m-%d"), 0.0) + e
        annual = sum(hourly_kwh)
        sam_annual = float(m.Outputs.ac_annual)
        warnings: list[Issue] = []
        if sam_annual and abs(annual - sam_annual) / sam_annual > 1e-3:
            warnings.append(Issue(code="aggregate_mismatch", message="Écart > 0,1 % entre la somme horaire et le total annuel SAM."))
        method = MODEL
        results = {
            "annual_ac_energy": ResultValue(value=_sig(annual), unit="kWh", method=f"{method} ; somme des 8760 h"),
            "specific_yield": ResultValue(value=_sig(annual / p["system_capacity"]), unit="kWh/kWc", method=f"{method} ; énergie annuelle / puissance DC"),
            "capacity_factor_ac_basis_dc": ResultValue(value=_sig(float(m.Outputs.capacity_factor)), unit="%", method=f"{method} ; sortie capacity_factor (base puissance DC)"),
            "annual_poa_irradiation": ResultValue(value=_sig(sum(m.Outputs.poa) / 1000.0), unit="kWh/m²", method=f"{method} ; somme de poa"),
        }
        for k, v in monthly.items():
            results[f"monthly_ac_energy_{k}"] = ResultValue(value=_sig(v), unit="kWh", method=f"{method} ; somme horaire du mois")
        series = {
            "ac_energy": SeriesOut(values=[round(x, 4) for x in hourly_kwh], unit="kWh", method=f"{method} ; ac (W) × 1 h"),
            "ac_power": SeriesOut(values=[round(x, 1) for x in ac_w], unit="W", method=f"{method} ; sortie ac"),
            "dc_power": SeriesOut(values=[round(x, 1) for x in dc_w], unit="W", method=f"{method} ; sortie dc"),
            "poa_irradiance": SeriesOut(values=[round(x, 1) for x in m.Outputs.poa], unit="W/m²", method=f"{method} ; sortie poa"),
            "cell_temperature": SeriesOut(values=[round(x, 2) for x in m.Outputs.tcell], unit="°C", method=f"{method} ; sortie tcell"),
            "daily_ac_energy": SeriesOut(values=[round(v, 3) for v in daily.values()], unit="kWh", method="Somme des énergies horaires par jour local"),
        }
        meta = {"model": MODEL, "pysam_version": pkg_version("nrel-pysam"), "engine_version": ENGINE_VERSION,
                "timestamp_convention": ts.timestamp_convention, "utc_offset_hours": ts.utc_offset_hours,
                "first_timestamp": ts.timestamps[0], "last_timestamp": ts.timestamps[-1],
                "daily_dates": list(daily.keys()), "fixed_settings": {"en_snowloss": 0, "bifaciality": 0, "dc_degradation": 0, "analysis_period_years": 1},
                "significant_figures_aggregates": 3}
        return EngineOutput(results=results, timeseries=series, warnings=warnings, metadata=meta)
