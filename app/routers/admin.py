"""
Buhotech Labs - Panel del Investigador / Docente (Admin).
Visualización de progreso y exportación de datos para SPSS.
"""
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, CompetencyGrade, UserResponse, SocraticSession
from app.services.grading_service import calculate_grades
from app.services.export_service import export_spss_csv
from app.services.ai_orchestrator import ai_orchestrator

router = APIRouter(prefix="/admin")
templates = Jinja2Templates(directory="app/templates")


async def get_admin_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    user_id = request.cookies.get("user_id")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user and user.role == "admin":
        return user
    return None


@router.get("/", response_class=HTMLResponse)
async def admin_dashboard(request: Request, db: AsyncSession = Depends(get_db)):
    """Panel principal del investigador."""
    admin = await get_admin_user(request, db)
    if not admin:
        return RedirectResponse("/", status_code=302)

    # Obtener todos los estudiantes con sus calificaciones
    result = await db.execute(
        select(User, CompetencyGrade)
        .outerjoin(CompetencyGrade, User.id == CompetencyGrade.user_id)
        .where(User.role == "student")
        .order_by(User.username)
    )
    students = []
    for user, grade in result.all():
        students.append({
            "id": user.id,
            "username": user.username,
            "xp": user.xp,
            "hearts": user.hearts,
            "module": user.unlocked_module,
            "saber": grade.saber_grade if grade else 0,
            "saber_hacer": grade.saber_hacer_grade if grade else 0,
            "saber_ser": grade.saber_ser_grade if grade else 0,
            "penalty": (grade.actitudinal_penalty if grade and hasattr(grade, "actitudinal_penalty") else 0) or 0,
            "final": grade.final_grade_20 if grade else 0,
            "total_q": grade.total_questions_answered if grade else 0,
        })

    # Estadísticas generales
    total_students = len(students)
    avg_final = sum(s["final"] for s in students) / total_students if total_students > 0 else 0

    # Estadísticas del orquestador de IA
    ai_stats = ai_orchestrator.get_stats()

    return templates.TemplateResponse(request, "admin/dashboard.html", {
        "admin": admin,
        "students": students,
        "total_students": total_students,
        "avg_final": round(avg_final, 2),
        "ai_stats": ai_stats,
    })


@router.get("/export-csv")
async def export_csv(request: Request, db: AsyncSession = Depends(get_db)):
    """Descarga el dataset CSV para IBM SPSS."""
    from app.config import settings
    admin = await get_admin_user(request, db)
    provided_pwd = request.query_params.get("pwd")
    
    if not admin and provided_pwd != settings.ADMIN_PASSWORD:
        return RedirectResponse("/", status_code=302)

    # Recalcular notas de todos los estudiantes
    students_result = await db.execute(select(User).where(User.role == "student"))
    for student in students_result.scalars().all():
        await calculate_grades(student.id, db)

    csv_content = await export_spss_csv(db)

    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=datos_tesis_buhotech_spss.csv"}
    )


@router.post("/recalculate-grades")
async def recalculate_all_grades(request: Request, db: AsyncSession = Depends(get_db)):
    """Recalcula las notas vigesimales de todos los estudiantes."""
    admin = await get_admin_user(request, db)
    if not admin:
        return RedirectResponse("/", status_code=302)

    students_result = await db.execute(select(User).where(User.role == "student"))
    count = 0
    for student in students_result.scalars().all():
        await calculate_grades(student.id, db)
        count += 1

    return RedirectResponse(f"/admin/?recalculated={count}", status_code=302)
