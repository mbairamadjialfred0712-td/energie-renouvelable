"""Guard runtime selection for manual services and the Render blueprint."""
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def test_manual_render_service_uses_supported_python():
    assert (ROOT / ".python-version").read_text().strip() == "3.12.7"
    assert (ROOT / "python-engine" / ".python-version").read_text().strip() == "3.12.7"


def test_blueprint_matches_repository_runtime():
    blueprint = (ROOT / "render.yaml").read_text()
    assert "- key: PYTHON_VERSION\n        value: 3.12.7" in blueprint
    assert "rootDir: python-engine" in blueprint