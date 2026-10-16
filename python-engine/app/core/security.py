"""Authentification : clé partagée serveur-à-serveur + jeton utilisateur vérifié auprès du backend d'auth.

L'identité n'est jamais lue depuis le corps JSON. `requested_by` est dérivé du jeton vérifié.
"""
import hmac
from dataclasses import dataclass
import httpx
from fastapi import Header
from .config import get_settings
from .errors import EngineError, ErrorCode


@dataclass(frozen=True)
class Caller:
    user_id: str


async def verify_user_token(token: str) -> str:
    s = get_settings()
    if not s.supabase_url or not s.supabase_publishable_key:
        raise EngineError(ErrorCode.engine_unavailable, "Vérification d'identité non configurée.")
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{s.supabase_url}/auth/v1/user",
                                 headers={"apikey": s.supabase_publishable_key, "Authorization": f"Bearer {token}"})
    except httpx.HTTPError:
        raise EngineError(ErrorCode.engine_unavailable, "Service d'identité injoignable.")
    if r.status_code != 200 or not r.json().get("id"):
        raise EngineError(ErrorCode.unauthorized, "Jeton utilisateur invalide ou expiré.")
    return r.json()["id"]


async def require_caller(x_engine_key: str = Header(default=""), authorization: str = Header(default="")) -> Caller:
    s = get_settings()
    if not s.engine_shared_key:
        raise EngineError(ErrorCode.engine_unavailable, "Clé de service non configurée.")
    if not hmac.compare_digest(x_engine_key.encode(), s.engine_shared_key.encode()):
        raise EngineError(ErrorCode.unauthorized, "Appelant non autorisé.")
    if not authorization.lower().startswith("bearer "):
        raise EngineError(ErrorCode.unauthorized, "Jeton utilisateur manquant.")
    return Caller(user_id=await verify_user_token(authorization[7:].strip()))
