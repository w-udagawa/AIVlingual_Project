"""
Configuration management using Pydantic Settings
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings"""
    
    # API Keys
    GEMINI_API_KEY: str
    AZURE_SPEECH_KEY: str = ""
    AZURE_SPEECH_REGION: str = "japaneast"
    NOTION_TOKEN: str = ""
    NOTION_DATABASE_ID: str = ""
    YOUTUBE_API_KEY: str = ""
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "default-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    LOG_LEVEL: str = "info"
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "http://localhost:5173"]
    
    # OBS WebSocket (optional)
    OBS_WEBSOCKET_HOST: str = "localhost"
    OBS_WEBSOCKET_PORT: int = 4455
    OBS_WEBSOCKET_PASSWORD: str = ""
    
    # Audio Processing
    AUDIO_SAMPLE_RATE: int = 16000
    AUDIO_CHUNK_DURATION_MS: int = 20
    VAD_AGGRESSIVENESS: int = 2  # 0-3, higher is more aggressive
    
    # AI Settings
    GEMINI_MODEL: str = "gemini-2.0-flash"
    MAX_CONVERSATION_TURNS: int = 10
    AI_TEMPERATURE: float = 0.7
    STREAM_ENABLED: bool = True  # Enable streaming responses
    
    # Database
    DATABASE_URL: str = "sqlite:///./aivlingual.db"
    
    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()


settings = get_settings()