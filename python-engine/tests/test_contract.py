import pytest
from fastapi.testclient import TestClient
from app.core import security
from app.core.config import get_settings
from app.main import app

KEY = "k" * 40
VALID = {"schema_version": "1.0", "engine": "wind",
         "input_data": {"power": {"value": 10, "unit": "kWc", "nature": "assumption"}},
         "source_references": [{"label": "Saisie utilisateur"}]}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("ENGINE_SHARED_KEY", KEY)
    monkeypatch.setenv("SUPABASE_URL", "https://auth.example")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "pub")
    get_settings.cache_clear()

    async def fake_verify(token):
        if token != "good":
            raise security.EngineError(security.ErrorCode.unauthorized, "Jeton utilisateur invalide ou expiré.")
        return "user-1"
    monkeypatch.setattr(security, "verify_user_token", fake_verify)
    yield TestClient(app)
    get_settings.cache_clear()


H = {"X-Engine-Key": KEY, "Authorization": "Bearer good"}


def test_health_and_capabilities_declare_only_implemented(client):
    assert client.get("/api/v1/health").json()["auth_configured"] is True
    engines = client.get("/api/v1/capabilities").json()["engines"]
    assert engines and all(e["status"] == "not_implemented" and e["version"] is None for e in engines if e["engine"] not in ("photovoltaic", "battery"))


def test_auth_required(client):
    assert client.post("/api/v1/simulations/validate", json=VALID).status_code == 401
    bad = client.post("/api/v1/simulations/validate", json=VALID, headers={**H, "Authorization": "Bearer bad"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "unauthorized"


def test_unconfigured_key_means_unavailable(client, monkeypatch):
    monkeypatch.setenv("ENGINE_SHARED_KEY", "")
    get_settings.cache_clear()
    r = client.post("/api/v1/simulations/validate", json=VALID, headers=H)
    assert r.status_code == 503 and r.json()["error"]["code"] == "engine_unavailable"


def test_malformed_rejected(client):
    r = client.post("/api/v1/simulations/validate", json={"engine": "PV!", "input_data": {}, "requested_by": "x"}, headers=H)
    assert r.status_code == 422 and r.json()["error"]["code"] == "invalid_input"


def test_validate_flags_units_and_missing(client):
    body = {**VALID, "input_data": {"power": {"value": 10, "nature": "assumption"},
                                    "ghi": {"value": None, "unit": "kWh/m²/j", "nature": "measured"}}}
    r = client.post("/api/v1/simulations/validate", json=body, headers=H).json()
    codes = {e["code"] for e in r["validation_errors"]}
    assert r["valid"] is False and {"missing_unit", "missing_value"} <= codes
    assert r["engine_available"] is False


def test_run_refuses_unimplemented_engine(client):
    r = client.post("/api/v1/simulations", json=VALID, headers=H)
    assert r.status_code == 503 and r.json()["error"]["code"] == "engine_unavailable"
    assert "results" not in r.json()


def test_unknown_simulation_404(client):
    r = client.get("/api/v1/simulations/abc/results", headers=H)
    assert r.status_code == 404 and r.json()["error"]["code"] == "simulation_not_found"
