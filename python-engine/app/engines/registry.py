"""Registre des moteurs. Un moteur n'est « available » que s'il possède une implémentation réelle.

Aucun moteur scientifique n'est implémenté à cette étape (Prompt 8 : architecture uniquement).
Pour ajouter un moteur : créer app/engines/<nom>.py exposant ENGINE (classe Engine) et l'enregistrer ici.
"""
from typing import Protocol
from app.api.schemas.contract import EngineCapability, Issue, SimulationRequest, ResultValue


class Engine(Protocol):
    name: str
    version: str
    description: str
    required_inputs: dict[str, set[str]]  # nom -> unités acceptées (aucune conversion implicite)

    def run(self, request: SimulationRequest) -> tuple[dict[str, ResultValue], list[Issue]]: ...


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

IMPLEMENTED: dict[str, Engine] = {}


def capabilities() -> list[EngineCapability]:
    out = []
    for name, desc in PLANNED.items():
        eng = IMPLEMENTED.get(name)
        out.append(EngineCapability(
            engine=name, status="available" if eng else "not_implemented",
            version=eng.version if eng else None, description=desc,
            required_inputs=sorted(eng.required_inputs) if eng else []))
    return out


def get_engine(name: str) -> Engine | None:
    return IMPLEMENTED.get(name)
