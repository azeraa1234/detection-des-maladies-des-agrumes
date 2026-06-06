"""
database.py — Async SQLAlchemy engine + session factory.
"""
import os
from sqlalchemy import event
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

# Load DATABASE_URL from the .env file in the same directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. Please fill in the backend/.env file."
    )

# Create the async engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # Set to True to log all SQL queries (useful for debugging)
)

# Enable foreign key support for SQLite
if "sqlite" in DATABASE_URL:
    @event.listens_for(engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Session factory — yields an AsyncSession for each request
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


async def get_db():
    """FastAPI dependency: yields a database session and closes it after the request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def init_db():
    """Create all tables in the database on startup (if they don't exist yet)."""
    from models import Base as ModelBase  # noqa: F401 — import models so they register
    async with engine.begin() as conn:
        await conn.run_sync(ModelBase.metadata.create_all)
