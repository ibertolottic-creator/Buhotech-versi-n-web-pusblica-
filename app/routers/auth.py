"""
Buhotech Labs - Rutas de Autenticación.
"""
from fastapi import APIRouter, Request, Depends, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, generate_uuid

router = APIRouter()
templates = Jinja2Templates(directory="app/templates")


@router.get("/", response_class=HTMLResponse)
async def login_page(request: Request, db: AsyncSession = Depends(get_db)):
    """Página de inicio / login."""
    # Si ya hay sesión activa, redirigir al dashboard
    user_id = request.cookies.get("user_id")
    if user_id:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if user:
            if user.role == "admin":
                return RedirectResponse("/admin", status_code=302)
            return RedirectResponse("/dashboard", status_code=302)
    
    # Si no existe, crear respuesta
    response = templates.TemplateResponse(request, "login.html")
    # Borrar la cookie por si era inválida
    if user_id:
        response.delete_cookie("user_id")
    return response


@router.post("/login")
async def login(request: Request, username: str = Form(...), db: AsyncSession = Depends(get_db)):
    """Login o registro automático de estudiante."""
    username = username.strip().lower()
    if not username:
        return templates.TemplateResponse(request, "login.html", {"error": "Ingresa tu nombre de usuario"})

    # Buscar o crear usuario
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()

    if not user:
        user = User(id=generate_uuid(), username=username)
        db.add(user)
        await db.commit()
        await db.refresh(user)

    if user.role == "admin":
        response = RedirectResponse("/admin", status_code=302)
    else:
        response = RedirectResponse("/dashboard", status_code=302)
        
    response.set_cookie("user_id", user.id, httponly=True, max_age=86400 * 30)
    return response


@router.get("/logout")
async def logout():
    """Cerrar sesión."""
    response = RedirectResponse("/", status_code=302)
    response.delete_cookie("user_id")
    return response
