import os

from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker


def get_database_url():
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    database_host = os.getenv("DB_HOST")
    database_password = os.getenv("DB_PASSWORD")
    if database_host and database_password:
        return URL.create(
            "postgresql+psycopg2",
            username=os.getenv("DB_USER", "products_admin"),
            password=database_password,
            host=database_host,
            port=int(os.getenv("DB_PORT", "5432")),
            database=os.getenv("DB_NAME", "products"),
        )

    return "postgresql+psycopg2://postgres:postgres@localhost:5432/products_db"


engine = create_engine(get_database_url(), pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
