"""
Application configuration via environment variables.

Uses pydantic-settings so all values can be overridden with env vars
or a .env file during local development.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables.

    Feature flags (USE_*) default to True for production-like behaviour.
    Set them to False in local development to avoid needing GCP credentials.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -----------------------------------------------------------------------
    # Google Cloud
    # -----------------------------------------------------------------------
    PROJECT_ID: str = Field(default="my-gcp-project", description="GCP project ID")
    REGION: str = Field(default="us-central1", description="GCP region for Vertex AI")

    # -----------------------------------------------------------------------
    # Feature Flags
    # -----------------------------------------------------------------------
    USE_GEMINI: bool = Field(
        default=True,
        description="Enable Vertex AI Gemini for AI insights (requires GCP credentials)",
    )
    USE_FIRESTORE: bool = Field(
        default=True,
        description="Enable Firestore persistence (requires GCP credentials)",
    )
    USE_BIGQUERY: bool = Field(
        default=True,
        description="Enable BigQuery analytics logging (requires GCP credentials)",
    )
    USE_PUBSUB: bool = Field(
        default=True,
        description="Enable Pub/Sub event publishing (requires GCP credentials)",
    )

    # -----------------------------------------------------------------------
    # BigQuery
    # -----------------------------------------------------------------------
    BIGQUERY_DATASET: str = Field(
        default="carbon_analytics",
        description="BigQuery dataset containing carbon analytics tables",
    )
    BIGQUERY_TABLE: str = Field(
        default="carbon_events",
        description="BigQuery table for anonymised carbon event logging",
    )

    # -----------------------------------------------------------------------
    # Pub/Sub
    # -----------------------------------------------------------------------
    PUBSUB_TOPIC: str = Field(
        default="carbon-insights",
        description="Pub/Sub topic name for carbon insight events",
    )

    # -----------------------------------------------------------------------
    # Gemini / Vertex AI
    # -----------------------------------------------------------------------
    GEMINI_MODEL: str = Field(
        default="gemini-1.5-flash",
        description="Vertex AI Generative Model identifier",
    )

    # -----------------------------------------------------------------------
    # Application
    # -----------------------------------------------------------------------
    ENVIRONMENT: str = Field(
        default="development",
        description="Runtime environment: development | staging | production",
    )
    LOG_LEVEL: str = Field(
        default="INFO",
        description="Python logging level: DEBUG | INFO | WARNING | ERROR",
    )
    MAX_HISTORY_ENTRIES: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum number of history entries returned per device",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return cached application settings (singleton)."""
    return Settings()
