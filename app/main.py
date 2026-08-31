"""
Buhotech Labs - Aplicación Principal FastAPI.
Punto de entrada del servidor Python.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, lessons, socratic, admin
from app.services.ai_orchestrator import ai_orchestrator

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s"
)
logger = logging.getLogger("buhotech")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida: inicializa BD y limpia recursos al cerrar."""
    logger.info(f"🦉 Iniciando {settings.APP_NAME} v{settings.APP_VERSION}")
    await init_db()
    logger.info("✅ Base de datos inicializada")
    logger.info(f"🤖 Orquestador de IA: {len(ai_orchestrator._providers)} proveedores listos")
    yield
    await ai_orchestrator.close()
    logger.info("🛑 Servidor detenido")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# --- Archivos estáticos ---
static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=str(static_dir)), name="static")

# Servir imágenes del banco Buhotech
if settings.IMAGES_DIR.exists():
    app.mount("/images", StaticFiles(directory=str(settings.IMAGES_DIR)), name="images")

# --- Registrar rutas ---
app.include_router(auth.router)
app.include_router(lessons.router)
app.include_router(socratic.router)
app.include_router(admin.router)

# --- Ruta de Dashboard (acceso directo) ---
templates = Jinja2Templates(directory="app/templates")


@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard_redirect(request: Request):
    """Redirige al dashboard de lecciones."""
    from app.routers.lessons import dashboard, get_db
    from app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        return await dashboard(request, db)


@app.get("/grades", response_class=HTMLResponse)
async def grades_page(request: Request):
    """Página de calificaciones del estudiante."""
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import User
    from app.services.grading_service import calculate_grades

    user_id = request.cookies.get("user_id")
    if not user_id:
        from fastapi.responses import RedirectResponse
        return RedirectResponse("/", status_code=302)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            from fastapi.responses import RedirectResponse
            return RedirectResponse("/", status_code=302)

        grades = await calculate_grades(user.id, db)

    return templates.TemplateResponse(request=request, name="grades.html", context={
        "request": request,
        "user": user,
        "grades": grades,
    })


@app.get("/report", response_class=HTMLResponse)
async def report_page(request: Request):
    """Página de reporte imprimible del estudiante con respuestas abiertas."""
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models import User, UserResponse, WorkshopSubmission
    from app.services.grading_service import calculate_grades

    user_id = request.cookies.get("user_id")
    if not user_id:
        from fastapi.responses import RedirectResponse
        return RedirectResponse("/", status_code=302)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            from fastapi.responses import RedirectResponse
            return RedirectResponse("/", status_code=302)

        grades = await calculate_grades(user.id, db)
        
        # Obtener respuestas a preguntas tipo TEXT
        text_responses = await db.execute(
            select(UserResponse).where(
                UserResponse.user_id == user_id,
            ).order_by(UserResponse.timestamp.asc())
        )
        all_responses = text_responses.scalars().all()
        # Filtraremos en el frontend o aquí. Mejor le pasamos todo o solo TEXT.
        # Las preguntas abiertas se guardan con selected_answer = texto largo.
        # Pero UserResponse solo guarda String(5) para selected_answer.
        # Wait, let me check how TEXT questions are saved in UserResponse!
        
        # Obtener talleres
        workshops = await db.execute(
            select(WorkshopSubmission).where(
                WorkshopSubmission.user_id == user_id
            ).order_by(WorkshopSubmission.timestamp.asc())
        )
        workshop_subs = workshops.scalars().all()

    return templates.TemplateResponse(request=request, name="report.html", context={
        "request": request,
        "user": user,
        "grades": grades,
        "responses": all_responses,
        "workshops": workshop_subs
    })

