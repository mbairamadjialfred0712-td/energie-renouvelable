import logging
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes.v1 import router
from app.core.config import SERVICE_VERSION, get_settings
from app.core.errors import EngineError, ErrorCode, engine_error_handler, error_body

log = logging.getLogger("engine")
app = FastAPI(title="Énergie Renouvelable — Moteur scientifique", version=SERVICE_VERSION, docs_url="/api/v1/docs",
              openapi_url="/api/v1/openapi.json")
app.add_middleware(CORSMiddleware, allow_origins=get_settings().origins, allow_methods=["GET", "POST"],
                   allow_headers=["Authorization", "Content-Type", "X-Engine-Key"])
app.add_exception_handler(EngineError, engine_error_handler)


@app.middleware("http")
async def limit_body(request: Request, call_next):
    size = request.headers.get("content-length")
    limit = get_settings().max_body_bytes
    if size:
        try:
            declared = int(size)
        except ValueError:
            return JSONResponse(error_body(ErrorCode.invalid_input, "Taille de requête invalide."), status_code=400)
        if declared < 0:
            return JSONResponse(error_body(ErrorCode.invalid_input, "Taille de requête invalide."), status_code=400)
        if declared > limit:
            return JSONResponse(error_body(ErrorCode.payload_too_large, "Requête trop volumineuse."), status_code=413)
    chunks = []
    received = 0
    async for chunk in request.stream():
        received += len(chunk)
        if received > limit:
            return JSONResponse(error_body(ErrorCode.payload_too_large, "Requête trop volumineuse."), status_code=413)
        chunks.append(chunk)
    request._body = b"".join(chunks)  # replay bounded body to the downstream parser
    return await call_next(request)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in e["loc"]), "code": e["type"], "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(error_body(ErrorCode.invalid_input, "Schéma de requête invalide.", details), status_code=422)


@app.exception_handler(Exception)
async def internal_handler(request: Request, exc: Exception):
    log.exception("Erreur interne sur %s", request.url.path)  # pas de corps ni d'en-têtes journalisés
    return JSONResponse(error_body(ErrorCode.internal_error, "Erreur interne."), status_code=500)


app.include_router(router)
