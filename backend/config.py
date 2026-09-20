"""Application settings for CREDIFY.ai.

Everything is local-first: SQLite on disk, a joblib model artifact next to the
code, and no outbound network calls. That keeps the whole product runnable on a
judge's laptop with no internet connection.
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    app_name: str = "CREDIFY.ai"
    app_version: str = "1.0.0"
    debug: bool = True
    seed_on_startup: bool = False

    # SQLite lives beside the backend package so `uvicorn main:app` and
    # `python -m backend.seed` agree on the same file.
    database_url: str = f"sqlite:///{(BASE_DIR / 'scamshield.db').as_posix()}"

    secret_key: str = "credify-change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7

    model_path: Path = BASE_DIR / "ml" / "model.joblib"
    dataset_path: Path = BASE_DIR / "ml" / "dataset.csv"

    # Override with a JSON array in production, for example:
    # ["https://credify.vercel.app"]
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Scan bodies are truncated before they ever touch the database.
    max_stored_content_chars: int = 2000


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
