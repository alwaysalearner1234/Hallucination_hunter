from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_ENV: str = "development"
    LOG_LEVEL: str = "INFO"
    BACKEND_CORS_ORIGINS: List[str] = ["http://localhost:8081", "exp://localhost:8081", "*"]

    # LLM
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    LLM_PROVIDER: str = "gemini"  # gemini | openai

    # Search
    TAVILY_API_KEY: str = ""

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://hh_user:hh_password@localhost:5432/hallucination_hunter"
    POSTGRES_USER: str = "hh_user"
    POSTGRES_PASSWORD: str = "hh_password"
    POSTGRES_DB: str = "hallucination_hunter"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Security
    JWT_SECRET: str = "change_this_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 43200  # 30 days

    # Per-install API keys (Phase 1, Week 2). Off in dev/test so the
    # mobile guest flow and existing tests keep working without a key;
    # staging/production set REQUIRE_API_KEY=true.
    REQUIRE_API_KEY: bool = False

    # Agent
    MAX_RETRIEVAL_ITERATIONS: int = 3
    MAX_SOURCES_PER_CLAIM: int = 5
    AGENT_TIMEOUT_SECONDS: int = 120

    # Phase 1, Week 3: parallel claim verification + per-claim budget.
    MAX_CLAIM_CONCURRENCY: int = 4
    CLAIM_TIMEOUT_SECONDS: int = 90

    # Phase 1, Week 4: downstream timeouts (seconds).
    SEARCH_TIMEOUT_SECONDS: int = 30
    LLM_TIMEOUT_SECONDS: int = 60

    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 20
    RATE_LIMIT_ENABLED: bool = True
    MAX_INPUT_length: int = 50000
    MAX_FILE_SIZE_MB: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
