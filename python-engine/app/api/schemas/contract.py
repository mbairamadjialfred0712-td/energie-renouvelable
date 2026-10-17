"""Contrat API v1 — schémas de requête et de réponse communs."""
from datetime import datetime
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
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


class SeriesIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    values: list[float | None] = Field(max_length=8784)
    unit: str = Field(min_length=1, max_length=40)
    nature: DataNature
    source: str | None = Field(default=None, max_length=500)


class TimeSeriesIn(BaseModel):
    """Série horaire : horodatages ISO 8601 locaux (heure standard, sans heure d'été) au DÉBUT de chaque heure."""
    model_config = ConfigDict(extra="forbid")
    timestamps: list[str] = Field(max_length=8784)
    utc_offset_hours: float = Field(ge=-12, le=14)
    timestamp_convention: Literal["period_start"] = "period_start"
    leap_day_convention: Literal["omit_feb29"] | None = None
    series: dict[str, SeriesIn] = Field(max_length=20)


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
    timeseries: TimeSeriesIn | None = None

    @model_validator(mode="before")
    @classmethod
    def strict_battery_numbers(cls, raw):
        if isinstance(raw, dict) and raw.get("engine") == "battery":
            for key, item in (raw.get("input_data") or {}).items():
                if key != "strategy" and isinstance(item, dict):
                    value = item.get("value")
                    if isinstance(value, bool) or not isinstance(value, (int, float)):
                        raise ValueError("Batterie : paramètres strictement numériques requis.")
            ts = raw.get("timeseries")
            if isinstance(ts, dict):
                for series in (ts.get("series") or {}).values():
                    if isinstance(series, dict) and any(isinstance(v, bool) or (v is not None and not isinstance(v, (int, float))) for v in series.get("values", [])):
                        raise ValueError("Batterie : valeurs horaires numériques sans coercition.")
            peak = (raw.get("assumptions") or {}).get("peak_hours")
            if isinstance(peak, dict) and isinstance(peak.get("value"), list) and any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in peak["value"]):
                raise ValueError("Batterie : heures numériques explicites requises.")
        return raw

    @model_validator(mode="before")
    @classmethod
    def strict_biomass_numbers(cls, raw):
        if isinstance(raw, dict) and raw.get("engine") == "biomass":
            for key, item in (raw.get("input_data") or {}).items():
                if not isinstance(item, dict): continue
                value = item.get("value")
                if key in ("mass", "pci", "moisture", "fraction") or key.startswith("level_"):
                    if value is not None and (isinstance(value, bool) or not isinstance(value, (int, float))):
                        raise ValueError("Biomasse : valeurs strictement numériques, sans coercition.")
                if key == "basis_compatibility" and not isinstance(value, bool):
                    raise ValueError("Biomasse : confirmation booléenne explicite requise.")
        return raw

    @model_validator(mode="before")
    @classmethod
    def strict_wind_numbers(cls, raw):
        if isinstance(raw, dict) and raw.get("engine") == "wind":
            ts = raw.get("timeseries")
            if isinstance(ts, dict):
                collection = ts.get("series")
                if not isinstance(collection, dict): raise ValueError("Wind : dictionnaire de séries requis.")
                for series in collection.values():
                    if not isinstance(series, dict) or not isinstance(series.get("values"), list): raise ValueError("Wind : liste de valeurs requise.")
                    if any(isinstance(x, bool) or (x is not None and not isinstance(x, (int,float))) for x in series["values"]): raise ValueError("Wind : nombres stricts requis.")
            for item in (raw.get("input_data") or {}).values():
                if isinstance(item, dict) and isinstance(item.get("value"), list):
                    if any(isinstance(x,bool) or not isinstance(x,(int,float)) for x in item["value"]): raise ValueError("Wind : courbe numérique stricte requise.")
        return raw

    @model_validator(mode="before")
    @classmethod
    def strict_csp_series(cls, raw):
        # CSP-only guard before float coercion; preserve existing PV/battery contracts.
        if isinstance(raw, dict) and raw.get("engine") == "csp":
            ts = raw.get("timeseries")
            if isinstance(ts, dict):
                collection = ts.get("series")
                if not isinstance(collection, dict):
                    raise ValueError("CSP : dictionnaire de séries requis.")
                for series in collection.values():
                    if not isinstance(series, dict) or not isinstance(series.get("values"), list):
                        raise ValueError("CSP : chaque série doit contenir une liste de valeurs.")
                    if any(isinstance(x, bool) or (x is not None and not isinstance(x, (int, float))) for x in series["values"]):
                        raise ValueError("CSP : valeurs horaires strictement numériques, ni booléens ni texte.")
        return raw


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


class SeriesOut(BaseModel):
    values: list[float]
    unit: str
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
    timeseries: dict[str, "SeriesOut"] = {}
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
