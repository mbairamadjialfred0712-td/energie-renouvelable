from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from app.api.schemas.contract import (CapabilitiesResponse, HealthResponse, SimulationRequest, SimulationResponse,
                                      SimulationStatus, ValidationResponse)
from app.core.config import SCHEMA_VERSION, SERVICE_VERSION, get_settings
from app.core.errors import EngineError, ErrorCode
from app.core.security import Caller, require_caller
from app.engines.registry import capabilities, get_engine
from app.repositories.simulations import NoRepository
from app.services.validation import validate_request

router = APIRouter(prefix="/api/v1")
repo = NoRepository()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    s = get_settings()
    return HealthResponse(status="ok", service_version=SERVICE_VERSION, schema_version=SCHEMA_VERSION,
                          environment=s.engine_env,
                          auth_configured=bool(s.engine_shared_key and s.supabase_url and s.supabase_publishable_key))


@router.get("/capabilities", response_model=CapabilitiesResponse)
async def get_capabilities() -> CapabilitiesResponse:
    return CapabilitiesResponse(schema_version=SCHEMA_VERSION, service_version=SERVICE_VERSION, engines=capabilities())


@router.post("/simulations/validate", response_model=ValidationResponse)
async def validate(req: SimulationRequest, _: Caller = Depends(require_caller)) -> ValidationResponse:
    errors, warnings = validate_request(req)
    return ValidationResponse(valid=not errors, engine=req.engine, engine_available=get_engine(req.engine) is not None,
                              warnings=warnings, validation_errors=errors)


@router.post("/simulations", response_model=SimulationResponse)
async def run(req: SimulationRequest, caller: Caller = Depends(require_caller)) -> SimulationResponse:
    errors, warnings = validate_request(req)
    if errors:
        raise EngineError(ErrorCode.invalid_input, "Requête invalide.", [e.model_dump() for e in errors])
    engine = get_engine(req.engine)
    if engine is None:
        raise EngineError(ErrorCode.engine_unavailable, f"Le moteur « {req.engine} » n'est pas implémenté.")
    created = datetime.now(timezone.utc)
    results, engine_warnings = engine.run(req)
    return SimulationResponse(
        simulation_id=req.simulation_id, status=SimulationStatus.completed, engine=engine.name,
        engine_version=engine.version, created_at=created, completed_at=datetime.now(timezone.utc),
        results=results, input_summary={k: v.model_dump() for k, v in req.input_data.items()},
        assumptions=req.assumptions, source_references=req.source_references,
        warnings=warnings + engine_warnings,
        calculation_metadata={"requested_by": caller.user_id, "schema_version": SCHEMA_VERSION})


@router.get("/simulations/{simulation_id}", response_model=SimulationResponse)
async def get_simulation(simulation_id: str, caller: Caller = Depends(require_caller)) -> SimulationResponse:
    sim = await repo.get(simulation_id, caller.user_id)
    if sim is None:
        raise EngineError(ErrorCode.simulation_not_found, "Simulation introuvable ou inaccessible.")
    return sim


@router.get("/simulations/{simulation_id}/results", response_model=SimulationResponse)
async def get_results(simulation_id: str, caller: Caller = Depends(require_caller)) -> SimulationResponse:
    return await get_simulation(simulation_id, caller)
