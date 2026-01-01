from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List, Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Database
    database_url: str = "sqlite:///./data/folio.db"

    # ComfyUI
    comfyui_url: str = "http://localhost:8188"

    # Storage
    storage_path: str = "./storage"

    # Models
    models_path: str = "./models"

    # CORS
    cors_origins: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    # SGLang
    sglang_host: str = "localhost"
    sglang_port: int = 30000
    default_model: str = "meta-llama/Llama-3.2-1B-Instruct"
    hf_token: Optional[str] = None

    # Testing
    testing: bool = False


settings = Settings()
