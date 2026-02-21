from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Database
    database_url: str = "sqlite:///./data/folio.db"

    # ComfyUI
    comfyui_url: str = "http://localhost:8188"

    # Storage
    storage_path: str = "./storage"

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # Testing
    testing: bool = False


settings = Settings()
