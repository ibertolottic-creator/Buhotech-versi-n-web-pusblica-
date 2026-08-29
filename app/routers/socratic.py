"""
Buhotech Labs - Tutor Socrático (Chat con el Búho Metodólogo 🦉).
Dimensión de la VI: Interacción Tutorial Socrática.
"""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, SocraticSession
from app.services.ai_orchestrator import ai_orchestrator
from app.config import settings

router = APIRouter(prefix="/socratic")
templates = Jinja2Templates(directory="app/templates")


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    user_id = request.cookies.get("user_id")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.get("/chat", response_class=HTMLResponse)
async def chat_page(request: Request, db: AsyncSession = Depends(get_db)):
    """Página del chat socrático con el Búho Metodólogo."""
    user = await get_current_user(request, db)
    if not user:
        return RedirectResponse("/", status_code=302)

    # Obtener o crear sesión socrática activa
    result = await db.execute(
        select(SocraticSession)
        .where(SocraticSession.user_id == user.id)
        .order_by(SocraticSession.updated_at.desc())
    )
    session = result.scalar_one_or_none()

    messages = session.messages if session else []

    return templates.TemplateResponse("socratic_chat.html", {
        "request": request,
        "user": user,
        "messages": messages,
        "session_id": session.id if session else None,
    })


@router.post("/api/chat")
async def send_message(request: Request, db: AsyncSession = Depends(get_db)):
    """Envía un mensaje al Búho Metodólogo y recibe respuesta socrática."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    user_message = data.get("message", "").strip()
    session_id = data.get("session_id")

    if not user_message:
        return JSONResponse({"error": "Mensaje vacío"}, status_code=400)

    # Obtener o crear sesión
    session = None
    if session_id:
        result = await db.execute(
            select(SocraticSession).where(
                SocraticSession.id == session_id,
                SocraticSession.user_id == user.id
            )
        )
        session = result.scalar_one_or_none()

    if not session:
        session = SocraticSession(user_id=user.id, messages=[])
        db.add(session)
        await db.flush()

    # Preparar historial para el orquestador
    history = session.messages[-10:]  # Últimos 10 mensajes para contexto

    # Llamar al orquestador de IA
    ai_response = await ai_orchestrator.chat(
        system_prompt=settings.SOCRATIC_SYSTEM_PROMPT,
        user_message=user_message,
        history=history,
    )

    # Actualizar sesión
    new_messages = list(session.messages)
    new_messages.append({"role": "user", "content": user_message})
    new_messages.append({"role": "assistant", "content": ai_response.text})
    session.messages = new_messages
    session.ai_provider = ai_response.provider
    session.ai_model = ai_response.model
    session.total_latency_ms = (session.total_latency_ms or 0) + ai_response.latency_ms
    session.total_interactions = (session.total_interactions or 0) + 1

    await db.commit()
    await db.refresh(session)

    return JSONResponse({
        "reply": ai_response.text,
        "provider": ai_response.provider,
        "latency_ms": ai_response.latency_ms,
        "session_id": session.id,
    })


@router.post("/api/new-session")
async def new_session(request: Request, db: AsyncSession = Depends(get_db)):
    """Inicia una nueva sesión socrática."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    topic = data.get("topic", "general")

    session = SocraticSession(user_id=user.id, messages=[], topic=topic)
    db.add(session)
    await db.commit()
    await db.refresh(session)

    return JSONResponse({"session_id": session.id, "topic": topic})
