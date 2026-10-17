"""Types partagés des moteurs (sans dépendance au registre, pour éviter les imports circulaires)."""
from dataclasses import dataclass, field
from app.api.schemas.contract import Issue, ResultValue, SeriesOut


@dataclass
class EngineOutput:
    results: dict[str, ResultValue]
    timeseries: dict[str, SeriesOut]
    warnings: list[Issue] = field(default_factory=list)
    metadata: dict = field(default_factory=dict)
