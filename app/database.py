"""
Buhotech Labs - Base de Datos (SQLAlchemy Async).
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import create_engine
from app.config import settings

# Motor asíncrono para FastAPI
engine_kwargs = {"echo": False}
if "neon.tech" in settings.DATABASE_URL:
    engine_kwargs["connect_args"] = {"ssl": "require"}

async_engine = create_async_engine(settings.DATABASE_URL, **engine_kwargs)
AsyncSessionLocal = async_sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Motor síncrono para seed/scripts
sync_engine = create_engine(settings.DATABASE_URL_SYNC, echo=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency injection para obtener sesión de BD en cada request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Crea todas las tablas al iniciar la aplicación."""
    async with async_engine.begin() as conn:
        from app import models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)
