"""Wind 1.0.0; approved V1 conventions, physical validation pending.

Only interval-mean hourly UTC observations, no annualization, height/density
correction, generic turbine curve, losses, Weibull, wake or dispatch model.
Linear interpolation is restricted to the supplied documented curve domain.
"""
import calendar
import math
from bisect import bisect_right
from datetime import datetime, timedelta
from uuid import UUID
from app.api.schemas.contract import Issue, SimulationRequest, ResultValue, SeriesOut
from app.engines.base import EngineOutput


def speed_ms(value, unit):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or value < 0:
        raise ValueError("Vitesse manquante, négative ou non finie.")
    if unit == "m/s": return float(value)
    if unit == "km/h": return value / 3.6
    if unit == "kn": return value * 1852 / 3600
    raise ValueError("Unité vent non prise en charge : m/s, km/h ou kn requis.")


class WindEngine:
    name = "wind"
    version = "1.0.0"
    description = "A ressource / B flux cinétique / C courbe documentée ; validation physique en attente"
    required_inputs = {"level": {"-"}, "site_id": {"-"}, "measurement_height": {"m"},
                       "period_start": {"-"}, "period_end": {"-"}, "wind_basis": {"-"}}
    required_series = {"wind_speed": {"m/s", "km/h", "kn"}}
    numeric = {"measurement_height": "m", "air_density": "kg/m³", "swept_area": "m²",
               "hub_height": "m", "rotor_diameter": "m", "rated_power": "W", "curve_density": "kg/m³",
               "cut_in": "m/s", "rated_speed": "m/s", "cut_out": "m/s"}
    text = {"turbine_reference", "curve_conditions"}
    arrays = {"curve_speeds": "m/s", "curve_powers": "W"}

    def validate(self, req: SimulationRequest):
        errors, warnings = [], []
        def err(k, text): errors.append(Issue(field=k, code="invalid_wind_input", message=text))
        def val(k): return req.input_data[k].value if k in req.input_data else None
        allowed = set(self.required_inputs) | set(self.numeric) | self.text | set(self.arrays)
        level = val("level")
        if level not in ("A", "B", "C"): err("level", "Niveau A, B ou C requis.")
        if req.assumptions: err("assumptions", "Hypothèses libres non prises en charge ; documenter chaque paramètre.")
        for k, item in req.input_data.items():
            if k not in allowed: err(k, "Champ non pris en charge, aucune extrapolation ou perte silencieuse."); continue
            if not item.source or not item.source.strip(): err(k, "Source ou justification obligatoire.")
            if item.nature.value == "calculated": err(k, "Entrée calculée non autorisée.")
            unit = self.numeric.get(k) or self.arrays.get(k) or "-"
            if item.unit != unit: err(k, f"Unité {unit} requise.")
            if k in self.numeric:
                if isinstance(item.value, bool) or not isinstance(item.value, (int, float)) or not math.isfinite(item.value) or item.value <= 0:
                    err(k, "Nombre fini strictement positif requis.")
            elif k in self.arrays:
                if not isinstance(item.value, list) or len(item.value) < 2 or len(item.value) > 1000 or any(isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or x < 0 for x in item.value):
                    err(k, "Courbe : 2 à 1 000 nombres finis non négatifs requis.")
            elif not isinstance(item.value, str) or not item.value.strip(): err(k, "Texte non vide requis.")
        required = set(self.required_inputs)
        if level == "B": required |= {"swept_area", "air_density"}
        if level == "C": required |= {"air_density", "hub_height", "rotor_diameter", "rated_power", "curve_density", "turbine_reference", "curve_conditions", "curve_speeds", "curve_powers"}
        for k in required:
            if val(k) is None: err(k, "Paramètre obligatoire manquant pour ce niveau.")
        for k, value in (("site_id", val("site_id")), ("project_id", req.project_id)):
            try: UUID(str(value))
            except (ValueError, TypeError): err(k, "Identifiant UUID requis.")
        if val("wind_basis") != "period_mean": err("wind_basis", "Moyenne représentative de chaque heure à confirmer.")
        ts = req.timeseries
        if ts is None: err("timeseries", "Observations horaires obligatoires."); return errors, warnings
        if ts.utc_offset_hours != 0 or ts.leap_day_convention is not None: err("timeseries", "UTC, début d’heure et 29 février conservé requis.")
        dates = []
        for t in ts.timestamps:
            try:
                d = datetime.strptime(t, "%Y-%m-%dT%H:00:00Z")
                if d.strftime("%Y-%m-%dT%H:00:00Z") != t: raise ValueError()
                dates.append(d)
            except (ValueError, TypeError): err("timestamps", "Date UTC de début d’heure invalide.")
        if not dates or len(dates) != len(ts.timestamps) or any(b-a != timedelta(hours=1) for a,b in zip(dates, dates[1:])):
            err("timestamps", "Série vide, trou, doublon, désordre ou pas différent de 1 h.")
        if dates and (val("period_start") != ts.timestamps[0] or val("period_end") != (dates[-1]+timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z")):
            err("period", "Période différente de la couverture réelle [début, fin exclusive).")
        if set(ts.series) - {"wind_speed", "wind_direction"}: err("series", "Série non prise en charge.")
        speeds = []
        wind = ts.series.get("wind_speed")
        if not wind: err("wind_speed", "Vent absent.")
        for k, s in ts.series.items():
            if len(s.values) != len(ts.timestamps): err(k, "Longueur incohérente.")
            if not s.source or not s.source.strip() or s.nature.value == "calculated": err(k, "Source et nature d’observation requises.")
            try:
                if k == "wind_speed": speeds = [speed_ms(x, s.unit) for x in s.values]
                elif k == "wind_direction":
                    if s.unit != "°" or any(isinstance(x, bool) or not isinstance(x, (int,float)) or not math.isfinite(x) or not 0 <= x < 360 for x in s.values): raise ValueError("Directions en degrés dans [0,360[, sans valeurs manquantes.")
            except ValueError as e: err(k, str(e))
        if level == "C" and not errors:
            if val("hub_height") != val("measurement_height"): err("hub_height", "Hauteurs différentes : extrapolation non prise en charge, aucune valeur alpha par défaut.")
            if val("air_density") != val("curve_density"): err("curve_density", "Densité incompatible avec la courbe ; correction non prise en charge.")
            xs, ys = val("curve_speeds"), val("curve_powers")
            if len(xs) != len(ys) or any(b <= a for a,b in zip(xs,xs[1:])): err("curve", "Vitesses de courbe strictement croissantes, longueurs égales.")
            if any(y > val("rated_power") for y in ys): err("curve", "Puissance de courbe supérieure à la puissance nominale.")
            if speeds and (min(speeds) < xs[0] or max(speeds) > xs[-1]): err("curve", "Vitesse hors domaine documenté : aucune extrapolation ni écrêtage implicite.")
            cut_in, rated, cut_out = val("cut_in"), val("rated_speed"), val("cut_out")
            if cut_in is not None and cut_out is not None and cut_in >= cut_out: err("cut_out", "Arrêt doit être supérieur au démarrage.")
            if rated is not None and ((cut_in is not None and rated < cut_in) or (cut_out is not None and rated >= cut_out)): err("rated_speed", "Vitesse nominale incohérente.")
            if cut_in is not None and any(x < cut_in and y != 0 for x,y in zip(xs,ys)): err("cut_in", "Courbe non nulle sous démarrage déclaré.")
            if cut_out is not None and any(x >= cut_out and y != 0 for x,y in zip(xs,ys)): err("cut_out", "Courbe non nulle à/après arrêt déclaré.")
            # Monotonicity applies only to the rising branch when a rated speed is specified.
            if rated is not None:
                branch = [y for x,y in zip(xs,ys) if (cut_in is None or x >= cut_in) and x <= rated]
                if any(b < a for a,b in zip(branch,branch[1:])): err("curve", "Branche de montée non monotone avant vitesse nominale.")
        if not req.source_references: err("source_references", "Provenance obligatoire.")
        warnings.append(Issue(code="wind_limits", message="Moyennes horaires : variabilité sous-horaire non reconstruite. Représentativité annuelle et validation physique non acquises ; aucun sillage, correction ou perte simulés."))
        if speeds and max(speeds) > 25: warnings.append(Issue(code="unusual_wind", message="Vitesse observée > 25 m/s : unité et qualité à vérifier, données non modifiées."))
        return errors, warnings

    def run(self, req: SimulationRequest):
        errors, _ = self.validate(req)
        if errors: raise ValueError(" ; ".join(e.message for e in errors))
        ts = req.timeseries
        if ts is None: raise ValueError("Série absente.")
        def val(k): return req.input_data[k].value
        s = ts.series["wind_speed"]
        speeds = [speed_ms(x,s.unit) for x in s.values]
        results, series, reasons = {}, {}, {}
        def scalar(k,v,unit,method):
            if v is not None and not math.isfinite(v): raise ValueError("Résultat non fini.")
            results[k] = ResultValue(value=v, unit=unit, method=method)
        scalar("mean_wind_speed", math.fsum(speeds)/len(speeds), "m/s", "Moyenne arithmétique des moyennes horaires, pas moyenne de v³")
        scalar("min_wind_speed", min(speeds), "m/s", "Minimum observé sur la période")
        scalar("max_wind_speed", max(speeds), "m/s", "Maximum observé sur la période")
        scalar("observed_hours", len(speeds), "h", "Nombre d’intervalles UTC continus de 1 h")
        series["observed_wind_speed"] = SeriesOut(values=speeds, unit="m/s", method=f"Observation {s.nature.value} ; conversion explicite {s.unit} → m/s, pas d’extrapolation")
        distribution = []
        # Empirical discrete distribution; no invented Weibull or arbitrary bins.
        counts = {}
        for v in speeds: counts[v] = counts.get(v,0)+1
        for v,count in sorted(counts.items()): distribution.append({"speed_ms": v, "count": count, "frequency_pct": count/len(speeds)*100})
        directions = None
        if "wind_direction" in ts.series:
            counts = [0]*8
            for v in ts.series["wind_direction"].values: counts[int(((v+22.5)%360)//45)] += 1
            directions = [{"sector": k, "count": c, "frequency_pct": c/len(speeds)*100} for k,c in zip(["N","NE","E","SE","S","SO","O","NO"],counts)]
        def power(k, values, method):
            if any(not math.isfinite(x) for x in values): raise ValueError("Puissance non finie.")
            series[k] = SeriesOut(values=values, unit="W", method=method)
            scalar(k.replace("_power","_energy"), math.fsum(values)/1000, "kWh", "Σ P_h × 1 h / 1000 ; "+method)
        level = val("level")
        if level == "B":
            try: powers = [.5*val("air_density")*val("swept_area")*v**3 for v in speeds]
            except OverflowError: raise ValueError("Flux non fini.")
            power("kinetic_power", powers, "0,5 × rho × A × v³ ; FLUX CINÉTIQUE, PAS ÉLECTRIQUE")
            scalar("mean_kinetic_power", math.fsum(powers)/len(powers), "W", "Moyenne de 0,5 rho A v³, jamais 0,5 rho A moyenne(v)³")
        if level == "C":
            xs, ys = val("curve_speeds"), val("curve_powers")
            powers = []
            for v in speeds:
                i = min(bisect_right(xs,v)-1, len(xs)-2)
                p = ys[i] + (ys[i+1]-ys[i])*(v-xs[i])/(xs[i+1]-xs[i])
                # At documented cut-out, stop is explicit, not an extrapolated clamp.
                if "cut_out" in req.input_data and v >= val("cut_out"): p = 0
                if "cut_in" in req.input_data and v < val("cut_in"): p = 0
                powers.append(p)
            power("turbine_power", powers, "Interpolation linéaire de la courbe fournie ; conditions compatibles ; brut sans pertes supposées")
            scalar("capacity_factor", math.fsum(powers)/(val("rated_power")*len(powers))*100, "%", "100 × énergie brute / (puissance nominale × heures observées)")
        else:
            reasons["turbine_energy"] = "Niveau C non demandé ; courbe et conditions de turbine non appliquées. Flux cinétique non électrique."
            scalar("turbine_energy", None, "kWh", reasons["turbine_energy"])
            scalar("capacity_factor", None, "%", "Turbine non calculée")
            reasons["capacity_factor"] = "Puissance électrique de turbine indisponible."
        first = datetime.strptime(ts.timestamps[0], "%Y-%m-%dT%H:00:00Z")
        end = datetime.strptime(val("period_end"), "%Y-%m-%dT%H:00:00Z")
        annual = first == datetime(first.year,1,1) and end == datetime(first.year+1,1,1) and len(speeds) == (8784 if calendar.isleap(first.year) else 8760)
        for key,s in list(series.items()):
            if s.unit != "W": continue
            for kind,length in (("daily",10),("monthly",7)):
                groups = {}
                for t,p in zip(ts.timestamps,s.values): groups.setdefault(t[:length],[]).append(p)
                for date,values in groups.items():
                    n = 24 if kind == "daily" else calendar.monthrange(int(date[:4]),int(date[5:7]))[1]*24
                    if len(values) == n: scalar(f"{kind}_{key.replace('_power','_energy')}_{date}", math.fsum(values)/1000,"kWh","Somme des heures UTC complètes uniquement")
        if level == "C" and annual: scalar("annual_turbine_energy",results["turbine_energy"].value,"kWh","Année civile complète observée, aucune annualisation")
        else:
            scalar("annual_turbine_energy",None,"kWh","Indisponible : niveau C et année civile complète requis")
            reasons["annual_turbine_energy"] = "Pas de production turbine sur année civile complète ; aucune extrapolation annuelle."
        return EngineOutput(results=results, timeseries=series, warnings=[], metadata={
            "level": level, "model": "documented-wind-v1", "scientific_validation": "pending", "time_standard": "UTC", "interval_hours": 1,
            "coverage": "full_calendar_year" if annual else "declared_period_only", "representativeness": "not_established", "coverage_pct": 100,
            "measurement_height_m": val("measurement_height"), "period_end_exclusive": val("period_end"), "distribution": distribution, "direction_sectors": directions,
            "unavailable_reasons": reasons, "conversion": f"{ts.series['wind_speed'].unit} → m/s", "limits": "Moyennes horaires, pas de reconstitution sous-horaire. Aucune extrapolation hauteur/densité, perte, Weibull, sillage ou annualisation. Représentativité climatologique et validation physique à confirmer."
        })