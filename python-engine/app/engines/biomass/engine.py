"""Primary biomass balance only; approved scope, physical validation pending."""
from datetime import date, timedelta
from math import isfinite
from calendar import monthrange
from app.api.schemas.contract import Issue, ResultValue, SimulationRequest
from app.engines.base import EngineOutput

VERSION = "1.0.0"
METHOD = "E primaire (MWh/an) = masse reçue (t/an) × PCI reçu (MJ/kg) / 3,6 ; aucune fraction ni conversion électrique"
UNAVAILABLE = {
    "mobilisable_mass": "Méthode de mobilisation et recouvrement des fractions non validés ; aucun total déduit.",
    "useful_thermal_energy": "Procédé thermique et rendement applicable non documentés dans cette V1.",
    "gross_electric_energy": "Procédé électrique et rendement applicable non documentés dans cette V1.",
    "net_electric_energy": "Conversion électrique, auxiliaires et pertes non modélisés dans cette V1.",
}
REQUIRED = {
    "resource_id": {"-"}, "site_id": {"-"}, "status": {"-"}, "period_start": {"-"}, "period_end": {"-"},
    "mass": {"t/an"}, "pci": {"MJ/kg"}, "moisture": {"%"}, "mass_basis": {"-"}, "pci_basis": {"-"},
    "moisture_basis": {"-"}, "basis_compatibility": {"-"}, "quality": {"-"},
}
LEVELS = {"theoretical", "technical", "sustainable", "collectable", "deliverable", "used_elsewhere"}


def annual_period(start, end):
    try:
        if not isinstance(start, str) or not isinstance(end, str): return False
        a, b = date.fromisoformat(start), date.fromisoformat(end)
        if a.isoformat() != start or b.isoformat() != end or not 1900 <= a.year < 2200: return False
        anniversary = a.replace(year=a.year + 1, day=min(a.day, monthrange(a.year + 1, a.month)[1]))
        return b == anniversary - timedelta(days=1)
    except (ValueError, TypeError):
        return False


class BiomassPrimaryEngine:
    name = "biomass"
    version = VERSION
    description = "Bilan primaire de la quantité recensée, sans mobilisation ni conversion"
    required_inputs = REQUIRED

    def validate(self, request: SimulationRequest):
        errors, warnings = [], []
        def error(key, message): errors.append(Issue(field=f"input_data.{key}", code="biomass_invalid", message=message))
        values = request.input_data
        allowed = set(REQUIRED) | {"fraction"} | {"level_" + x for x in LEVELS}
        if request.timeseries is not None: error("timeseries", "Aucune série ni profil fabriqué accepté pour ce bilan annuel.")
        for key in values:
            if key not in allowed: error(key, "Paramètre hors périmètre primaire : aucun rendement, PCS ou cumul accepté.")
        for key, units in REQUIRED.items():
            v = values.get(key)
            if v is None or v.value is None: error(key, "Valeur obligatoire absente, jamais remplacée par zéro."); continue
            if v.unit not in units: error(key, "Unité incompatible ; aucune conversion implicite.")
            if not v.source or len(v.source.strip()) < 2: error(key, "Source ou justification documentée obligatoire.")
            if v.nature.value == "calculated": error(key, "Entrée calculée refusée.")
        def raw(key): return values[key].value if key in values else None
        for key in ["mass", "pci", "moisture", "fraction"] + ["level_" + x for x in LEVELS]:
            if key not in values: continue
            v = raw(key)
            if isinstance(v, bool) or not isinstance(v, (int, float)) or not isfinite(v): error(key, "Nombre fini strict requis."); continue
            if key in {"mass", "pci"} and v <= 0: error(key, "Valeur strictement positive requise.")
            if key in {"moisture", "fraction"} and not 0 <= v <= 100: error(key, "Plage admise du catalogue : 0 à 100 %, convention explicite requise.")
            if key.startswith("level_") and (v < 0 or values[key].unit != "t/an"): error(key, "Niveau enregistré positif ou nul en t/an requis.")
            if key == "fraction" and values[key].unit != "%": error(key, "Fraction en % requise ; non appliquée.")
            if not values[key].source or not values[key].source.strip(): error(key, "Source du niveau/fraction obligatoire.")
        for key, expected in [("status", "validated"), ("mass_basis", "as_received"), ("pci_basis", "as_received")]:
            if raw(key) != expected: error(key, "Fiche validée et bases matière reçue concordantes requises ; aucune conversion depuis la matière sèche.")
        if raw("moisture_basis") not in ("wet", "dry"): error("moisture_basis", "Convention d'humidité base humide ou sèche documentée requise.")
        confirmation = values.get("basis_compatibility")
        if confirmation is None or confirmation.value is not True or len((confirmation.source or "").strip()) < 10:
            error("basis_compatibility", "Compatibilité masse/PCI/humidité à confirmer avec une justification documentée.")
        for key in ["resource_id", "site_id", "quality"]:
            if not isinstance(raw(key), str) or not raw(key).strip(): error(key, "Identifiant/qualité explicite requis.")
        if not annual_period(raw("period_start"), raw("period_end")): error("period_end", "Douze mois complets datés requis, aucune annualisation.")
        if len(request.source_references) != 1 or request.source_references[0].table != "biomass_resources" or request.source_references[0].record_id != raw("resource_id"):
            error("resource_id", "Une seule fiche biomasse identifiée par sa source est acceptée ; aucun cumul.")
        elif request.source_references[0].period != f"{raw('period_start')} / {raw('period_end')}":
            error("period_end", "Période de la source incohérente avec le bilan.")
        if request.assumptions: error("assumptions", "Les déclarations documentées doivent figurer dans les entrées ; aucune hypothèse de conversion admise.")
        warnings.append(Issue(code="primary_only", message="Énergie primaire de la quantité recensée : ni quantité mobilisable ni chaleur utile ni électricité. Fraction non appliquée ; aucun cumul de fiches."))
        warnings.append(Issue(code="scientific_validation_pending", message="Périmètre V1 approuvé ; qualité, compatibilité physique et références à valider par l'ingénieur. Humidité non corrigée."))
        return errors, warnings

    def run(self, request):
        errors, _ = self.validate(request)
        if errors: raise ValueError(" ".join(e.message for e in errors))
        mass, pci = request.input_data["mass"].value, request.input_data["pci"].value
        energy = mass * (pci / 3.6)
        if not isfinite(energy) or energy <= 0: raise ValueError("Bilan hors plage numérique ; aucun résultat partiel.")
        results = {"primary_energy": ResultValue(value=energy, unit="MWh/an", method=METHOD)}
        for key, reason in UNAVAILABLE.items(): results[key] = ResultValue(value=None, unit="t/an" if key == "mobilisable_mass" else "MWh/an", method=reason)
        return EngineOutput(results=results, timeseries={}, metadata={"scientific_validation": "pending", "boundary": "recorded_primary", "fraction_applied": False, "moisture_conversion": "none", "aggregation": "single_resource", "resource_id": request.input_data["resource_id"].value, "unavailable_reasons": UNAVAILABLE})
