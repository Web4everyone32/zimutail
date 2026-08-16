from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    app_name: str = "Zimutail API"
    app_version: str = "0.2.0"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    frontend_url: str = "http://localhost:5173"
    database_url: str = "sqlite:///./zimutail.db"
    jwt_secret: str = "development-only-change-me"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 30

    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("environment")
    @classmethod
    def validate_environment(cls, value: str) -> str:
        allowed = {"development", "test", "production"}
        if value not in allowed:
            raise ValueError(f"environment must be one of: {', '.join(sorted(allowed))}")
        return value

    @property
    def cors_origins(self) -> list[str]:
        origins = [self.frontend_url]
        if self.environment != "production":
            origins.extend(["http://127.0.0.1:5173", "http://localhost:5173"])
        return sorted(set(origins))


@lru_cache
def get_settings() -> Settings:
    return Settings()
