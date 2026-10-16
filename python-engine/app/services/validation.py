"""Validation structurelle, unités et cohérences élémentaires — sans calcul scientifique."""
from app.api.schemas.contract import InputValue, Issue, SimulationRequest
from app.engines.registry import PLANNED, get_engine


def validate_request(req: SimulationRequest) -> tuple[list[Issue], list[Issue]]:
    errors: list[Issue] = []
    warnings: list[Issue] = []
    if req.engine not in PLANNED:
        errors.append(Issue(field="engine", code="unknown_engine", message=f"Moteur inconnu : {req.engine}."))
        return errors, warnings
    for scope, values in (("input_data", req.input_data), ("assumptions", req.assumptions)):
        for key, v in values.items():
            _check_value(f"{scope}.{key}", v, errors, warnings)
    engine = get_engine(req.engine)
    if engine is None:
        warnings.append(Issue(field="engine", code="engine_not_implemented",
                              message="Ce moteur n'est pas encore implémenté : aucune simulation ne sera exécutée."))
    else:
        if req.engine_version and req.engine_version != engine.version:
            errors.append(Issue(field="engine_version", code="engine_version_incompatible",
                                message=f"Version demandée {req.engine_version}, disponible {engine.version}."))
        for name, units in engine.required_inputs.items():
            v = req.input_data.get(name)
            if v is None or v.value is None:
                errors.append(Issue(field=f"input_data.{name}", code="missing_parameter", message="Paramètre requis manquant."))
            elif v.unit not in units:
                errors.append(Issue(field=f"input_data.{name}", code="incompatible_units",
                                    message=f"Unité « {v.unit} » non acceptée ; attendue : {', '.join(sorted(units))}. Aucune conversion implicite."))
        e2, w2 = engine.validate(req)
        errors += e2
        warnings += w2
    if not req.source_references:
        warnings.append(Issue(field="source_references", code="no_sources", message="Aucune source déclarée."))
    return errors, warnings


def _check_value(field: str, v: InputValue, errors: list[Issue], warnings: list[Issue]) -> None:
    if v.value is None:
        errors.append(Issue(field=field, code="missing_value",
                            message="Valeur absente : elle ne sera jamais remplacée par zéro ou une valeur arbitraire."))
    numeric = isinstance(v.value, (int, float)) and not isinstance(v.value, bool) or isinstance(v.value, list)
    if numeric and not v.unit:
        errors.append(Issue(field=field, code="missing_unit", message="Une valeur numérique doit porter une unité explicite."))
    if v.nature.value == "calculated":
        errors.append(Issue(field=field, code="invalid_nature", message="Une entrée ne peut pas être déclarée « calculée par le moteur »."))
    if v.nature.value in ("measured", "external") and not v.source:
        warnings.append(Issue(field=field, code="missing_source", message="Donnée mesurée/externe sans source."))
    if v.nature.value == "estimate":
        warnings.append(Issue(field=field, code="estimate", message="Donnée estimée : ne pas présenter comme une mesure."))
