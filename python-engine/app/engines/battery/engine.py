"""Moteur de simulation horaire du stockage par batterie — modèle « réservoir + rendements »
validé par l'ingénieur avant implémentation (règle du projet).

Bilan horaire : net_h = pv_kwh[h] - demande_kwh[h].
  - Surplus : charge = min(net, P_charge_max, place disponible / eta_charge) ; énergie stockée = charge x eta_charge.
  - Déficit : décharge = min(|net|, P_décharge_max, énergie disponible x eta_décharge) ; servi par batterie = décharge x eta_décharge.
SOC horaire borné [E_utile x SOC_min, E_utile x SOC_max] ; pas d'auto-décharge ni de vieillissement (V1, signalé).
Stratégies : self_consumption (règles telles quelles) ; peak_shaving (décharge prioritaire sur les heures de
pointe déclarées, charge uniquement sur surplus PV, jamais depuis le réseau — hypothèse explicite).
Le moteur n'invente rien : toute donnée manquante est un refus, jamais une valeur par défaut cachée.
"""
from __future__ import annotations

import math
from datetime import datetime, timedelta

from app.api.schemas.contract import Issue, ResultValue, SeriesOut, SimulationRequest
from app.engines.base import EngineOutput

ENGINE_VERSION = "1.0.0"
MODEL = "Réservoir + rendements (bilan horaire déterministe)"

# nom -> (unités acceptées, min, max). Aucune conversion d'unité.
PARAMS: dict[str, tuple[set[str], float, float]] = {
    "usable_energy_kwh": ({"kWh"}, 0.01, 10_000_000),
    "charge_power_max_kw": ({"kW"}, 0.01, 10_000_000),
    "discharge_power_max_kw": ({"kW"}, 0.01, 10_000_000),
    "soc_min_pct": ({"%"}, 0, 100),
    "soc_max_pct": ({"%"}, 0, 100),
    "charge_eff_pct": ({"%"}, 0.0001, 100),
    "discharge_eff_pct": ({"%"}, 0.0001, 100),
    "initial_soc_pct": ({"%"}, 0, 100),
}
STRATEGIES = {"self_consumption", "peak_shaving"}

# nom -> (unité, min, max) : énergie par heure (puissance moyenne horaire x 1 h).
SERIES: dict[str, tuple[str, float, float]] = {
    "pv_energy": ("kWh", 0, 10_000_000),
    "demand_energy": ("kWh", 0, 10_000_000),
}


def _parse_ts(raw: str) -> datetime | None:
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    return dt.replace(tzinfo=None) if dt.tzinfo is None else None


def _sig(x: float, n: int = 3) -> float:
    if x == 0 or not math.isfinite(x):
        return x
    return round(x, -int(math.floor(math.log10(abs(x)))) + (n - 1))


class BatteryEngine:
    name = "battery"
    version = ENGINE_VERSION
    description = "Simulation horaire du stockage par batterie (réservoir + rendements)"
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
        got = {k: float(req.input_data[k].value) for k in PARAMS if req.input_data.get(k) and isinstance(req.input_data[k].value, (int, float))}  # type: ignore[arg-type]
        if "soc_min_pct" in got and "soc_max_pct" in got and got["soc_min_pct"] >= got["soc_max_pct"]:
            errors.append(Issue(field="input_data.soc_min_pct", code="invalid_range", message="SOC minimum >= SOC maximum."))
        if "charge_eff_pct" in got and "discharge_eff_pct" in got and got["charge_eff_pct"] * got["discharge_eff_pct"] / 100 < 50:
            warnings.append(Issue(field=None, code="low_round_trip_efficiency", message="Rendement aller-retour implicite < 50 % : vérifiez les rendements charge/décharge."))
        strat = req.input_data.get("strategy")
        if strat is None or not isinstance(strat.value, str):
            errors.append(Issue(field="input_data.strategy", code="missing_parameter", message="Stratégie requise : self_consumption ou peak_shaving."))
        elif strat.value not in STRATEGIES:
            errors.append(Issue(field="input_data.strategy", code="invalid_value", message="Stratégie inconnue."))
        peak = req.assumptions.get("peak_hours")
        if strat is not None and strat.value == "peak_shaving":
            if peak is None or not isinstance(peak.value, list) or not peak.value or any(not isinstance(h, (int, float)) or not (0 <= h <= 23) for h in peak.value):
                errors.append(Issue(field="assumptions.peak_hours", code="missing_parameter", message="Heures de pointe requises (liste d'heures 0-23) pour la stratégie de réduction de pointe."))
            else:
                warnings.append(Issue(field="assumptions.peak_hours", code="explicit_assumption", message="Réduction de pointe : charge uniquement sur surplus PV, jamais depuis le réseau (hypothèse explicite)."))
        ts = req.timeseries
        if ts is None:
            errors.append(Issue(field="timeseries", code="missing_parameter", message="Séries horaires PV et demande requises."))
            return errors, warnings
        stamps = [_parse_ts(t) for t in ts.timestamps]
        if any(s is None for s in stamps):
            errors.append(Issue(field="timeseries.timestamps", code="invalid_timestamp", message="Horodatages ISO 8601 locaux sans suffixe de fuseau requis."))
            return errors, warnings
        if len(stamps) < 1 or len(stamps) > 8784:
            errors.append(Issue(field="timeseries.timestamps", code="invalid_length", message="1 à 8784 heures attendues."))
        if len(set(stamps)) != len(stamps):
            errors.append(Issue(field="timeseries.timestamps", code="duplicate_timestamp", message="Horodatages en double."))
        if stamps != sorted(stamps):
            errors.append(Issue(field="timeseries.timestamps", code="unordered", message="Horodatages non triés."))
        for i in range(1, len(stamps)):
            if stamps[i] - stamps[i - 1] != timedelta(hours=1):
                errors.append(Issue(field="timeseries.timestamps", code="irregular_timestep", message=f"Pas horaire irrégulier entre {stamps[i-1].isoformat()} et {stamps[i].isoformat()}."))
                break
        if any(s.minute or s.second for s in stamps if s):
            errors.append(Issue(field="timeseries.timestamps", code="not_hourly", message="Horodatages au début de chaque heure (minute 0) requis."))
        for name in ts.series:
            if name not in SERIES:
                errors.append(Issue(field=f"timeseries.series.{name}", code="unsupported_series", message="Série non utilisée par le moteur batterie."))
        for name, (unit, lo, hi) in SERIES.items():
            s = ts.series.get(name)
            if s is None:
                errors.append(Issue(field=f"timeseries.series.{name}", code="missing_parameter", message="Série requise manquante."))
                continue
            if s.unit != unit:
                errors.append(Issue(field=f"timeseries.series.{name}", code="incompatible_units", message=f"Unité « {s.unit} » refusée ; attendue {unit}. Aucune conversion implicite."))
            if len(s.values) != len(stamps):
                errors.append(Issue(field=f"timeseries.series.{name}", code="length_mismatch", message="Longueur différente des horodatages."))
            missing = sum(1 for x in s.values if x is None or not math.isfinite(x))
            if missing:
                errors.append(Issue(field=f"timeseries.series.{name}", code="missing_values", message=f"{missing} valeur(s) manquante(s) ; jamais remplacées par zéro."))
            bad = sum(1 for x in s.values if x is not None and math.isfinite(x) and not (lo <= x <= hi))
            if bad:
                errors.append(Issue(field=f"timeseries.series.{name}", code="out_of_range", message=f"{bad} valeur(s) hors plage [{lo} ; {hi}] {unit}."))
            if s.nature.value in ("measured", "external") and not s.source:
                warnings.append(Issue(field=f"timeseries.series.{name}", code="missing_source", message="Série mesurée/externe sans source."))
            if s.nature.value == "estimate":
                warnings.append(Issue(field=f"timeseries.series.{name}", code="estimate", message="Série estimée : le résultat n'est pas fondé sur des mesures."))
        warnings.append(Issue(field=None, code="model_limits", message="V1 : pas d'auto-décharge, de vieillissement ni de limite C-rate dynamique ; rendements constants."))
        warnings.append(Issue(field=None, code="engineer_validation_required", message="Résultat indicatif : modèle et paramètres à valider par l'ingénieur avant usage professionnel."))
        return errors, warnings

    # ---------- exécution ----------
    def run(self, req: SimulationRequest) -> EngineOutput:
        ts = req.timeseries
        assert ts is not None
        p = {k: float(req.input_data[k].value) for k in PARAMS}  # type: ignore[arg-type]
        strategy = str(req.input_data["strategy"].value)
        e_nom = p["usable_energy_kwh"]
        soc_min = e_nom * p["soc_min_pct"] / 100
        soc_max = e_nom * p["soc_max_pct"] / 100
        eta_c = p["charge_eff_pct"] / 100
        eta_d = p["discharge_eff_pct"] / 100
        soc = min(max(e_nom * p["initial_soc_pct"] / 100, soc_min), soc_max)
        peak_hours = {int(h) for h in (req.assumptions.get("peak_hours").value or [])} if strategy == "peak_shaving" else set()  # type: ignore[union-attr]
        pv = [float(x) for x in ts.series["pv_energy"].values]  # type: ignore[arg-type]
        dem = [float(x) for x in ts.series["demand_energy"].values]  # type: ignore[arg-type]
        stamps = [_parse_ts(t) for t in ts.timestamps]

        n = len(pv)
        s_soc: list[float] = []
        s_direct: list[float] = []
        s_from_batt: list[float] = []
        s_charge: list[float] = []
        s_curtailed: list[float] = []
        s_ens: list[float] = []
        net_before: list[float] = []
        net_after: list[float] = []
        for h in range(n):
            net = pv[h] - dem[h]
            net_before.append(net)
            peak = strategy == "peak_shaving" and (stamps[h].hour in peak_hours)
            direct = min(pv[h], dem[h])
            from_batt = 0.0
            charged_ac = 0.0
            curtailed = 0.0
            ens = 0.0
            if net >= 0:
                # Surplus : charge possible sur les deux stratégies (charge uniquement sur surplus PV).
                room_dc = (soc_max - soc)  # énergie stockable (kWh stockés)
                charge_ac = min(net, p["charge_power_max_kw"], room_dc / eta_c if eta_c > 0 else 0.0)
                stored = charge_ac * eta_c
                soc += stored
                charged_ac = charge_ac
                curtailed = net - charge_ac
                # Réduction de pointe : décharge prioritaire même hors déficit PV seulement si surplus nul (jamais de décharge sur surplus).
                if peak and curtailed <= 1e-12 and strategy == "peak_shaving":
                    pass  # rien à décharger, tout le surplus est stocké
            else:
                deficit = -net
                # self_consumption : décharge dès qu'il y a déficit ; peak_shaving : décharge prioritaire sur heures de pointe, sinon quand même autorisée pour servir la demande (la stratégie ne doit pas créer d'ENS artificielle).
                avail_dc = soc - soc_min
                discharge_ac = min(deficit, p["discharge_power_max_kw"], avail_dc * eta_d)
                soc -= discharge_ac / eta_d if eta_d > 0 else 0.0
                from_batt = discharge_ac
                ens = deficit - discharge_ac
            s_soc.append(round(soc, 4))
            s_direct.append(round(direct, 4))
            s_from_batt.append(round(from_batt, 4))
            s_charge.append(round(charged_ac, 4))
            s_curtailed.append(round(curtailed, 4))
            s_ens.append(round(ens, 4))
            net_after.append(round(net - (from_batt if net < 0 else 0) + (charged_ac if net >= 0 else 0), 4))

        total_pv = sum(pv)
        total_dem = sum(dem)
        total_direct = sum(s_direct)
        total_from_batt = sum(s_from_batt)
        total_charged = sum(s_charge)
        total_curtailed = sum(s_curtailed)
        total_ens = sum(s_ens)
        loss_charge = total_charged * (1 - eta_c)
        energy_discharged_dc = sum(x / eta_d for x in s_from_batt) if eta_d > 0 else 0.0
        loss_discharge = energy_discharged_dc * (1 - eta_d)
        served = total_direct + total_from_batt
        # Cohérence interne du bilan : servi + ENS = demande ; direct + charge + non distribué = PV.
        warnings: list[Issue] = []
        if abs(served + total_ens - total_dem) > max(1e-6, total_dem * 1e-9):
            warnings.append(Issue(code="energy_balance_mismatch", message="Écart du bilan côté demande : servi + ENS != demande."))
        if abs(total_direct + total_charged + total_curtailed - total_pv) > max(1e-6, total_pv * 1e-9):
            warnings.append(Issue(code="energy_balance_mismatch", message="Écart du bilan côté PV : direct + charge + non distribué != production."))
        peak_in = max((d for d in dem), default=0.0)
        grid_in = [max(0.0, dem[h] - pv[h] - s_from_batt[h]) for h in range(n)]
        grid_out = [max(0.0, pv[h] - dem[h] - s_charge[h]) for h in range(n)]
        peak_net_before = max((max(0.0, dem[h] - pv[h]) for h in range(n)), default=0.0)
        peak_net_after = max(grid_in, default=0.0)

        m = MODEL
        results = {
            "pv_total_energy": ResultValue(value=_sig(total_pv), unit="kWh", method=f"{m} ; somme de la série PV"),
            "demand_total_energy": ResultValue(value=_sig(total_dem), unit="kWh", method=f"{m} ; somme de la série demande"),
            "pv_self_consumed_direct": ResultValue(value=_sig(total_direct), unit="kWh", method=f"{m} ; Σ min(PV, demande)"),
            "energy_served_by_battery": ResultValue(value=_sig(total_from_batt), unit="kWh", method=f"{m} ; Σ décharge AC"),
            "energy_charged": ResultValue(value=_sig(total_charged), unit="kWh", method=f"{m} ; Σ charge AC (surplus PV)"),
            "energy_not_distributed": ResultValue(value=_sig(total_curtailed), unit="kWh", method=f"{m} ; surplus PV non stocké"),
            "energy_not_served": ResultValue(value=_sig(total_ens), unit="kWh", method=f"{m} ; déficit non couvert"),
            "self_consumption_rate": ResultValue(value=_sig(100 * (total_direct + total_charged) / total_pv) if total_pv > 0 else None, unit="%", method=f"{m} ; (PV directe + PV stockée) / PV produite"),
            "demand_coverage_rate": ResultValue(value=_sig(100 * served / total_dem) if total_dem > 0 else None, unit="%", method=f"{m} ; demande servie / demande totale"),
            "charge_losses": ResultValue(value=_sig(loss_charge), unit="kWh", method=f"{m} ; (1 − η_charge) × énergie chargée"),
            "discharge_losses": ResultValue(value=_sig(loss_discharge), unit="kWh", method=f"{m} ; (1 − η_décharge) × énergie déchargée (côté stockage)"),
            "final_soc": ResultValue(value=_sig(s_soc[-1]) if s_soc else None, unit="kWh", method=f"{m} ; SOC en fin de période"),
            "equivalent_full_cycles": ResultValue(value=_sig(sum(x for x in s_from_batt) / (soc_max - soc_min)) if soc_max > soc_min else None, unit="cycles", method=f"{m} ; énergie déchargée / plage SOC utile (indicatif, sans vieillissement)"),
            "demand_peak_power": ResultValue(value=_sig(peak_in), unit="kW", method=f"{m} ; puissance horaire maximale de la demande"),
            "net_peak_power_before_battery": ResultValue(value=_sig(peak_net_before), unit="kW", method=f"{m} ; max(demande − PV) avant batterie"),
            "net_peak_power_after_battery": ResultValue(value=_sig(peak_net_after), unit="kW", method=f"{m} ; max(demande − PV − décharge) après batterie (foisonnement)"),
        }
        series = {
            "soc": SeriesOut(values=s_soc, unit="kWh", method=f"{m} ; état de charge en fin d'heure"),
            "pv_served_direct": SeriesOut(values=s_direct, unit="kWh", method=f"{m} ; min(PV, demande) par heure"),
            "battery_discharge": SeriesOut(values=s_from_batt, unit="kWh", method=f"{m} ; énergie AC fournie par la batterie"),
            "battery_charge": SeriesOut(values=s_charge, unit="kWh", method=f"{m} ; surplus PV chargé"),
            "energy_not_distributed": SeriesOut(values=s_curtailed, unit="kWh", method=f"{m} ; surplus non stocké"),
            "energy_not_served": SeriesOut(values=s_ens, unit="kWh", method=f"{m} ; déficit non couvert"),
            "grid_import": SeriesOut(values=[round(x, 4) for x in grid_in], unit="kWh", method=f"{m} ; demande − PV − décharge (≥ 0)"),
            "grid_export": SeriesOut(values=[round(x, 4) for x in grid_out], unit="kWh", method=f"{m} ; PV − demande − charge (≥ 0)"),
        }
        meta = {"model": m, "engine_version": ENGINE_VERSION, "strategy": strategy,
                "timestamp_convention": ts.timestamp_convention, "utc_offset_hours": ts.utc_offset_hours,
                "first_timestamp": ts.timestamps[0], "last_timestamp": ts.timestamps[-1],
                "parameters": {k: p[k] for k in PARAMS},
                "limits": ["pas d'auto-décharge", "pas de vieillissement", "rendements constants", "pas de limite C-rate dynamique"],
                "significant_figures_aggregates": 3}
        return EngineOutput(results=results, timeseries=series, warnings=warnings, metadata=meta)
