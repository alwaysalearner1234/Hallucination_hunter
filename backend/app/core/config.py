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

    # Agent
    MAX_RETRIEVAL_ITERATIONS: int = 3
    MAX_SOURCES_PER_CLAIM: int = 5
    AGENT_TIMEOUT_SECONDS: int = 120

    # Rate limiting
    RATE_LIMIT_REQUESTS_PER_MINUTE: int = 20
    MAX_INPUT_LENGTH: int = 50000
    MAX_FILE_SIZE_MB: int = 10

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
