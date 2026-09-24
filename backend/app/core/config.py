import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PROJECT_NAME: str = "LATROCORE"
    API_V1_PREFIX: str = "/api/v1"
    
    # Database
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: int = int(os.getenv("DB_PORT", "3306"))
    DB_USER: str = os.getenv("DB_USER", "root")
    DB_PASS: str = os.getenv("DB_PASS", "")
    DB_NAME: str = os.getenv("DB_NAME", "latrocore")
    
    # JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRES_MINUTES: int = int(os.getenv("JWT_EXPIRES_MINUTES", "10080"))
    
    @property
    def DATABASE_URL(self) -> str:
        import urllib.parse
        encoded_pass = urllib.parse.quote_plus(self.DB_PASS)
        return f"mysql+pymysql://{self.DB_USER}:{encoded_pass}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"


settings = Settings()
