"""Accès aux simulations. PostgreSQL (tables simulations / simulation_results) reste la source de référence.

Non branché à cette étape : la persistance est assurée par le serveur Lovable après réception d'un résultat
« completed ». Un dépôt PostgreSQL pourra être ajouté ici sans modifier les routes ni les moteurs.
"""
from typing import Protocol
from app.api.schemas.contract import SimulationResponse


class SimulationRepository(Protocol):
    async def get(self, simulation_id: str, user_id: str) -> SimulationResponse | None: ...


class NoRepository:
    async def get(self, simulation_id: str, user_id: str) -> SimulationResponse | None:
        return None
