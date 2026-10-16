"""Structure d'erreur uniforme. Aucun détail interne ni secret n'est renvoyé."""
from enum import Enum
from fastapi import Request
from fastapi.responses import JSONResponse


class ErrorCode(str, Enum):
    invalid_input = "invalid_input"
    incompatible_units = "incompatible_units"
    missing_parameter = "missing_parameter"
    engine_unavailable = "engine_unavailable"
    engine_version_incompatible = "engine_version_incompatible"
    simulation_not_found = "simulation_not_found"
    unauthorized = "unauthorized"
    forbidden = "forbidden"
    payload_too_large = "payload_too_large"
    timeout = "timeout"
    internal_error = "internal_error"


STATUS = {
    ErrorCode.invalid_input: 422, ErrorCode.incompatible_units: 422, ErrorCode.missing_parameter: 422,
    ErrorCode.engine_unavailable: 503, ErrorCode.engine_version_incompatible: 409,
    ErrorCode.simulation_not_found: 404, ErrorCode.unauthorized: 401, ErrorCode.forbidden: 403,
    ErrorCode.payload_too_large: 413, ErrorCode.timeout: 504, ErrorCode.internal_error: 500,
}


class EngineError(Exception):
    def __init__(self, code: ErrorCode, message: str, details: list[dict] | None = None):
        self.code, self.message, self.details = code, message, details or []


def error_body(code: ErrorCode, message: str, details: list[dict] | None = None) -> dict:
    return {"error": {"code": code.value, "message": message, "details": details or []}}


async def engine_error_handler(_: Request, exc: EngineError) -> JSONResponse:
    return JSONResponse(error_body(exc.code, exc.message, exc.details), status_code=STATUS[exc.code])
