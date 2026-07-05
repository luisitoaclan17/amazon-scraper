import os
from pydantic_settings import BaseSettings
from pathlib import Path

# Base directories
BASE_DIR = Path(__file__).resolve().parent.parent.parent

class Settings(BaseSettings):
    # App Settings
    PROJECT_NAME: str = "Amazon Product Data Automation"
    API_V1_STR: str = "/api"
    
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/amazon_research"
    
    # Redis & Broker
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Security
    JWT_SECRET: str = "8f95c477be7e3c98d67a1bf6bc537bc2851a8f90ab61c8db1f3b23c21aef42bb"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    # Scraper
    PLAYWRIGHT_HEADLESS: bool = True
    SCRAPE_DELAY_MIN: int = 2
    SCRAPE_DELAY_MAX: int = 5
    PAGE_TIMEOUT: int = 30000  # ms
    
    # File Storage Paths
    EXPORTS_DIR: Path = BASE_DIR / "exports"
    LOGS_DIR: Path = BASE_DIR / "logs"
    SCREENSHOTS_DIR: Path = BASE_DIR / "screenshots"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

# Ensure directories exist
settings.EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
settings.LOGS_DIR.mkdir(parents=True, exist_ok=True)
settings.SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
