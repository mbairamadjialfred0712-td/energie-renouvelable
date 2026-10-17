"""Bilan cylindro-parabolique prescrit 1.0.0. Voir docs/VALIDATION_CSP.md.

DNI*A est une puissance de référence normale. eta_effectif doit déjà inclure
l'incidence et les pertes optiques documentées ; aucune géométrie n'est déduite.
Un bilan négatif est conservé signé, jamais écrêté ou déclaré chaleur utile.
"""
import calendar
import math
from datetime import datetime, timedelta, timezone
from uuid import UUID
from app.api.schemas.contract import Issue, SimulationRequest, ResultValue, SeriesOut
from app.engines.base import EngineOutput


class CspBalanceEngine:
    name = "csp"
    version = "1.0.0"
    description = "Cylindro-parabolique — bilan prescrit, validation scientifique en attente"
    required_inputs = {
        "site_id": {"-"}, "technology": {"-"}, "aperture_area": {"m²"},
        "optical_efficiency": {"-"}, "thermal_loss": {"W"}, "fluid": {"-"},
        "operating_temperature": {"°C"}, "conditions": {"-"},
        "period_start": {"-"}, "period_end": {"-"}, "dni_basis": {"-"},
        "optical_basis": {"-"},
    }
    required_series = {"dni": {"W/m²"}}
    optional_inputs = {"cycle_efficiency": {"-"}, "auxiliary_power": {"W"}}

    def validate(self, req: SimulationRequest):
        errors, warnings = [], []
        def err(field, message):
            errors.append(Issue(field=field, code="invalid_csp_input", message=message))
        allowed = {**self.required_inputs, **self.optional_inputs}
        for k in req.input_data:
            if k not in allowed:
                err(f"input_data.{k}", "Champ CSP inconnu ou non pris en charge (stockage inclus).")
        if req.assumptions:
            err("assumptions", "Hypothèses CSP à déclarer dans les paramètres documentés, aucun champ libre ignoré.")
        if not req.project_id:
            err("project_id", "Projet requis.")
        else:
            try: UUID(req.project_id)
            except (ValueError, TypeError): err("project_id", "Identifiant projet invalide.")
        numeric = {"aperture_area", "optical_efficiency", "thermal_loss", "operating_temperature", "cycle_efficiency", "auxiliary_power"}
        for k, units in allowed.items():
            v = req.input_data.get(k)
            if v is None:
                if k in self.required_inputs: err(k, "Paramètre CSP obligatoire manquant.")
                continue
            if v.unit not in units: err(k, f"Unité attendue : {', '.join(units)}. Aucune conversion implicite.")
            if not v.source or not v.source.strip(): err(k, "Source/référence ou justification documentaire obligatoire.")
            if v.nature.value == "calculated": err(k, "Nature d'entrée calculée interdite.")
            if k in numeric:
                x = v.value
                if isinstance(x, bool) or not isinstance(x, (float, int)) or not math.isfinite(x):
                    err(k, "Nombre fini requis, sans valeur de substitution.")
                    continue
                if k == "aperture_area" and x <= 0: err(k, "Surface strictement positive en m².")
                if k in {"optical_efficiency", "cycle_efficiency"} and not 0 < x <= 1: err(k, "Rendement dans ]0,1].")
                if k in {"thermal_loss", "auxiliary_power"} and x < 0: err(k, "Puissance de perte/consommation non négative en W.")
                if k == "operating_temperature" and x < -273.15: err(k, "Température inférieure au zéro absolu.")
            elif not isinstance(v.value, str) or not v.value.strip(): err(k, "Texte documenté requis.")
        def val(k):
            v = req.input_data.get(k)
            return v.value if v else None
        if val("technology") != "parabolic_trough": err("technology", "Seul le bilan cylindro-parabolique est pris en charge ; tour/Fresnel/dish indisponibles.")
        if val("dni_basis") != "period_mean": err("dni_basis", "DNI moyen sur chaque heure requis ; observations instantanées non assimilées.")
        if val("optical_basis") != "effective_includes_incidence": err("optical_basis", "Rendement effectif documenté incluant incidence/cosinus requis, pas seulement à incidence normale.")
        try: UUID(str(val("site_id")))
        except (ValueError, TypeError): err("site_id", "Identifiant site invalide.")
        ts = req.timeseries
        if ts is None:
            err("timeseries", "Série DNI obligatoire.")
            return errors, warnings
        if ts.utc_offset_hours != 0 or ts.leap_day_convention is not None:
            err("timeseries", "UTC uniquement, jours bissextiles conservés ; aucune suppression du 29 février.")
        dates = []
        for t in ts.timestamps:
            try:
                d = datetime.strptime(t, "%Y-%m-%dT%H:00:00Z").replace(tzinfo=timezone.utc)
                if d.strftime("%Y-%m-%dT%H:00:00Z") != t: raise ValueError()
                dates.append(d)
            except (ValueError, TypeError): err("timestamps", "Horodatage UTC au début d'heure invalide.")
        if not dates or len(dates) != len(ts.timestamps) or any(b - a != timedelta(hours=1) for a, b in zip(dates, dates[1:])):
            err("timestamps", "Série vide, trou, doublon, désordre ou pas différent de 1 heure.")
        if dates:
            if val("period_start") != ts.timestamps[0] or val("period_end") != (dates[-1] + timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z"):
                err("period", "Couverture différente de [début, fin exclusive) déclarée.")
        if set(ts.series) != {"dni"}: err("timeseries.series", "Seule la série DNI est acceptée dans ce bilan ; aucun GHI substitué.")
        dni = ts.series.get("dni")
        if dni is None: err("dni", "DNI absent.")
        else:
            if dni.unit != "W/m²": err("dni.unit", "DNI moyen W/m² requis ; Wh/m²/kWh/m² ne sont pas une puissance.")
            if not dni.source or not dni.source.strip(): err("dni.source", "Source DNI obligatoire.")
            if dni.nature.value == "calculated": err("dni.nature", "Entrée calculée interdite.")
            if len(dni.values) != len(ts.timestamps): err("dni", "Longueur de série incohérente.")
            if any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or x < 0 for x in dni.values): err("dni", "DNI manquant, non numérique, négatif ou non fini : calcul refusé.")
        if not req.source_references: err("source_references", "Provenance obligatoire.")
        warnings.append(Issue(code="screening_not_validated", message="Bilan prescrit non prédictif, sans géométrie, pilotage, stockage ni validation scientifique acquise. Conditions et coefficients à valider par Joël."))
        return errors, warnings

    def run(self, req: SimulationRequest):
        errors, warnings = self.validate(req)
        if errors: raise ValueError(" ; ".join(e.message for e in errors))
        def value(k): return req.input_data[k].value
        ts = req.timeseries
        if ts is None: raise ValueError("Série absente.")
        incident = [float(x) * float(value("aperture_area")) for x in ts.series["dni"].values]
        captured = [x * float(value("optical_efficiency")) for x in incident]
        losses = [float(value("thermal_loss"))] * len(incident)
        balance = [a - b for a, b in zip(captured, losses)]
        if not all(math.isfinite(x) for a in (incident, captured, losses, balance) for x in a): raise ValueError("Bilan non fini : paramètres trop grands.")
        series = {}
        results = {}
        def power(key, values, method):
            if not all(math.isfinite(x) for x in values): raise ValueError("Sortie non finie.")
            energy = math.fsum(values) / 1000
            if not math.isfinite(energy): raise ValueError("Énergie non finie.")
            series[key + "_power"] = SeriesOut(values=values, unit="W", method=method)
            results[key + "_energy"] = ResultValue(value=energy, unit="kWh", method="Σ P_moyenne × 1 h / 1000 ; " + method)
        power("incident", incident, "DNI_moyen × surface ; référence normale sur ouverture")
        power("captured", captured, "Puissance directe × rendement optique effectif documenté")
        power("thermal_loss", losses, "Perte moyenne prescrite constante, conditions documentées")
        power("thermal_balance", balance, "Capture − pertes ; bilan SIGNÉ, pas chaleur utile garantie")
        reasons = {}
        useful_ok = all(x >= 0 for x in balance)
        if useful_ok: power("useful_thermal", balance, "Capture − pertes, tous les pas non négatifs ; pas de pilotage simulé")
        else: reasons["useful_thermal_energy"] = "Pertes > capture sur au moins une heure ; bilan signé conservé. Arrêt/refroidissement/alimentation externe non modélisés ; chaleur utile indisponible, sans écrêtage."
        cycle = req.input_data.get("cycle_efficiency")
        aux = req.input_data.get("auxiliary_power")
        if cycle and useful_ok:
            gross = [x * float(cycle.value) for x in balance]
            power("gross_electric", gross, "Chaleur utile au cycle × rendement prescrit, aucune courbe à charge partielle")
            if aux:
                auxiliary = [float(aux.value)] * len(balance)
                power("auxiliary", auxiliary, "Consommation moyenne prescrite constante")
                power("net_electric", [x-y for x,y in zip(gross, auxiliary)], "Brut − auxiliaires ; signé, valeur négative = import")
            else: reasons["net_electric_energy"] = "Consommations auxiliaires absentes : net indisponible, jamais assimilé au brut."
        else:
            reasons["gross_electric_energy"] = "Rendement de cycle absent ou chaleur utile indisponible."
            reasons["net_electric_energy"] = "Puissance brute indisponible."
        if "auxiliary_energy" not in results:
            if aux: power("auxiliary", [float(aux.value)] * len(balance), "Consommation moyenne prescrite documentée")
            else: reasons["auxiliary_energy"] = "Consommations auxiliaires non renseignées."
        for k, reason in reasons.items(): results[k] = ResultValue(value=None, unit="kWh", method="Indisponible : " + reason)
        first = datetime.strptime(ts.timestamps[0], "%Y-%m-%dT%H:00:00Z")
        end = datetime.strptime(str(value("period_end")), "%Y-%m-%dT%H:00:00Z")
        annual = first == datetime(first.year, 1, 1) and end == datetime(first.year+1, 1, 1) and len(incident) == (8784 if calendar.isleap(first.year) else 8760)
        total_incident = results["incident_energy"].value
        results["capture_efficiency"] = ResultValue(value=results["captured_energy"].value / total_incident * 100 if total_incident else None, unit="%", method="100 × énergie captée / énergie directe ; indisponible si dénominateur nul")
        for key, s in list(series.items()):
            for kind, length in (("daily", 10), ("monthly", 7)):
                groups = {}
                for t, p in zip(ts.timestamps, s.values): groups.setdefault(t[:length], []).append(p)
                for date, values in groups.items():
                    count = 24 if kind == "daily" else calendar.monthrange(int(date[:4]), int(date[5:7]))[1]*24
                    if len(values) == count:
                        results[f"{kind}_{key[:-6]}_energy_{date}"] = ResultValue(value=math.fsum(values)/1000, unit="kWh", method="Somme des heures complètes UTC, sans extrapolation")
        return EngineOutput(results=results, timeseries=series, warnings=[], metadata={
            "model": "prescribed-trough-balance", "scientific_validation": "pending", "time_standard": "UTC", "interval_hours": 1,
            "coverage": "full_calendar_year" if annual else "declared_period_only", "period_end_exclusive": value("period_end"),
            "unavailable_reasons": reasons, "signed_thermal_balance": True,
            "limits": "Rendement effectif constant ; pertes et auxiliaires prescrits appliqués à chaque heure, nuit incluse. Température et fluide enregistrés comme conditions, non simulés ; pas de modèle de géométrie, HTF, démarrage, stockage, dégradation ou optimisation.",
        })