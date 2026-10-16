from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict

SCHEMA_VERSION = "1.0"
SERVICE_VERSION = "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    engine_env: str = "development"
    engine_shared_key: str = ""
    supabase_url: str = ""
    supabase_publishable_key: str = ""
    cors_origins: str = ""
    max_body_bytes: int = 1_000_000

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
