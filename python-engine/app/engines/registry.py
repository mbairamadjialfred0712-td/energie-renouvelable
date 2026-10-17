"""Registre des moteurs. Un moteur n'est « available » que s'il possède une implémentation réelle.

Disponibilité de code uniquement ; ni déploiement ni validation scientifique implicites.
Pour ajouter un moteur : créer app/engines/<nom>.py exposant ENGINE (classe Engine) et l'enregistrer ici.
"""
from typing import Protocol
from dataclasses import dataclass, field
from app.api.schemas.contract import EngineCapability, Issue, SimulationRequest, ResultValue, SeriesOut


from app.engines.base import EngineOutput  # noqa: F401  (ré-exporté pour compatibilité)


class Engine(Protocol):
    name: str
    version: str
    description: str
    required_inputs: dict[str, set[str]]  # nom -> unités acceptées (aucune conversion implicite)

    def validate(self, request: SimulationRequest) -> tuple[list[Issue], list[Issue]]: ...

    def run(self, request: SimulationRequest) -> "EngineOutput": ...


PLANNED: dict[str, str] = {
    "photovoltaic": "Production photovoltaïque",
    "csp": "Solaire thermique à concentration",
    "wind": "Production éolienne",
    "biomass": "Conversion énergétique de la biomasse",
    "battery": "Simulation dynamique du stockage",
    "hybrid": "Systèmes hybrides",
    "optimization": "Optimisation",
    "finance": "Analyse économique",
}

def _load() -> dict[str, Engine]:
    engines: dict[str, Engine] = {}
    try:  # le moteur PV n'est déclaré que si PySAM (implémentation officielle PVWatts v8) est importable
        from app.engines.pv.engine import PVWattsV8Engine
        engines["photovoltaic"] = PVWattsV8Engine()
    except ImportError:
        pass
    from app.engines.battery.engine import BatteryEngine  # moteur propre, aucune dépendance optionnelle
    engines["battery"] = BatteryEngine()
    from app.engines.csp.engine import CspBalanceEngine
    engines["csp"] = CspBalanceEngine()
    from app.engines.wind.engine import WindEngine
    engines["wind"] = WindEngine()
    return engines


IMPLEMENTED: dict[str, Engine] = _load()


def capabilities() -> list[EngineCapability]:
    out = []
    for name, desc in PLANNED.items():
        eng = IMPLEMENTED.get(name)
        out.append(EngineCapability(
            engine=name, status="available" if eng else "not_implemented",
            version=eng.version if eng else None, description=desc,
            required_inputs=sorted(eng.required_inputs) + sorted(getattr(eng, "required_series", {})) if eng else []))
    return out


def get_engine(name: str) -> Engine | None:
    return IMPLEMENTED.get(name)
