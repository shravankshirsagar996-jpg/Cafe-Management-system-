from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "Cafe & Restaurant Management System"
    DATABASE_URL: str = "sqlite:///./cafe_management.db"
    SECRET_KEY: str = "dev-secret-key"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()