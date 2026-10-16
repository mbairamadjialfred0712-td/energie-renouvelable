"""Contrat API v1 — schémas de requête et de réponse communs."""
from datetime import datetime
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field
from app.core.config import SCHEMA_VERSION


class DataNature(str, Enum):
    measured = "measured"
    external = "external"        # API ou document externe
    estimate = "estimate"
    assumption = "assumption"    # hypothèse fournie par l'utilisateur
    calculated = "calculated"    # valeur produite par le moteur


class InputValue(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: float | int | str | bool | list[float] | None
    unit: str | None = Field(default=None, max_length=40)
    nature: DataNature
    source: str | None = Field(default=None, max_length=500)


class SourceReference(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: str = Field(min_length=1, max_length=300)
    url: str | None = Field(default=None, max_length=1000)
    period: str | None = Field(default=None, max_length=100)
    table: str | None = Field(default=None, max_length=80)
    record_id: str | None = Field(default=None, max_length=80)


class SimulationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    schema_version: Literal["1.0"] = SCHEMA_VERSION
    simulation_id: str | None = None
    project_id: str | None = None
    engine: str = Field(min_length=1, max_length=60, pattern=r"^[a-z_]+$")
    engine_version: str | None = Field(default=None, max_length=20)
    input_data: dict[str, InputValue] = Field(max_length=500)
    assumptions: dict[str, InputValue] = Field(default_factory=dict, max_length=200)
    source_references: list[SourceReference] = Field(default_factory=list, max_length=200)


class SimulationStatus(str, Enum):
    pending = "pending"
    running = "running"
    completed = "completed"
    failed = "failed"


class Issue(BaseModel):
    field: str | None = None
    code: str
    message: str


class ResultValue(BaseModel):
    value: float | None
    unit: str
    nature: Literal[DataNature.calculated] = DataNature.calculated
    method: str


class SimulationResponse(BaseModel):
    simulation_id: str | None
    status: SimulationStatus
    engine: str
    engine_version: str | None
    schema_version: str = SCHEMA_VERSION
    created_at: datetime
    completed_at: datetime | None = None
    results: dict[str, ResultValue] = {}
    input_summary: dict[str, Any] = {}
    assumptions: dict[str, InputValue] = {}
    source_references: list[SourceReference] = []
    warnings: list[Issue] = []
    validation_errors: list[Issue] = []
    calculation_metadata: dict[str, Any] = {}


class ValidationResponse(BaseModel):
    valid: bool
    engine: str
    engine_available: bool
    warnings: list[Issue]
    validation_errors: list[Issue]


class EngineCapability(BaseModel):
    engine: str
    status: Literal["available", "not_implemented"]
    version: str | None
    description: str
    required_inputs: list[str] = []


class CapabilitiesResponse(BaseModel):
    schema_version: str
    service_version: str
    engines: list[EngineCapability]


class HealthResponse(BaseModel):
    status: Literal["ok"]
    service_version: str
    schema_version: str
    environment: str
    auth_configured: bool
