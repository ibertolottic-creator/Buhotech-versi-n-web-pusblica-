"""
Buhotech Labs - Servicio de Calificación Vigesimal (0-20).
Calcula las notas por cada dimensión de competencia y nivel taxonómico.
"""
from sqlalchemy import select, func, Integer, case
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import UserResponse, CompetencyGrade, WorkshopSubmission, DilemmaResponse


async def calculate_grades(user_id: str, db: AsyncSession) -> dict:
    """
    Calcula la nota vigesimal (0-20) para cada dimensión de competencia:
    - SABER (Cognitiva): basada en respuestas correctas a preguntas conceptuales.
    - SABER HACER (Procedimental): basada en talleres y ejercicios prácticos.
    - SABER SER (Actitudinal): basada en dilemas éticos y comportamiento.
    
    Retorna un diccionario con todas las notas y métricas.
    """
    grades = {
        "saber_grade": 0.0, "saber_hacer_grade": 0.0, "saber_ser_grade": 0.0,
        "final_grade_20": 0.0,
        "saber_n1": 0.0, "saber_n2": 0.0, "saber_n3": 0.0,
        "saber_hacer_n1": 0.0, "saber_hacer_n2": 0.0, "saber_hacer_n3": 0.0,
        "saber_ser_n1": 0.0, "saber_ser_n2": 0.0, "saber_ser_n3": 0.0,
        "total_questions_answered": 0, "total_correct": 0,
        "total_socratic_interactions": 0, "avg_response_time_ms": 0.0,
        "fast_random_count": 0, "total_failed_attempts": 0,
    }

    # --- Dimensión SABER (Cognitiva) ---
    for level in [1, 2, 3]:
        result = await db.execute(
            select(
                func.count(UserResponse.id).label("total"),
                func.sum(func.cast(UserResponse.is_correct, Integer)).label("correct"),
            ).where(
                UserResponse.user_id == user_id,
                UserResponse.dimension == "saber",
                UserResponse.level == level,
            )
        )
        row = result.one()
        total = row.total or 0
        correct = row.correct or 0
        score = (correct / total * 20) if total > 0 else 0.0
        grades[f"saber_n{level}"] = round(score, 2)

    grades["saber_grade"] = round(
        (grades["saber_n1"] * 0.25 + grades["saber_n2"] * 0.35 + grades["saber_n3"] * 0.40), 2
    )

    # --- Dimensión SABER HACER (Procedimental) ---
    for level in [1, 2, 3]:
        result = await db.execute(
            select(
                func.count(UserResponse.id).label("total"),
                func.sum(func.cast(UserResponse.is_correct, Integer)).label("correct"),
            ).where(
                UserResponse.user_id == user_id,
                UserResponse.dimension == "saber_hacer",
                UserResponse.level == level,
            )
        )
        row = result.one()
        total = row.total or 0
        correct = row.correct or 0
        score = (correct / total * 20) if total > 0 else 0.0
        grades[f"saber_hacer_n{level}"] = round(score, 2)

    # Incorporar nota de talleres
    ws_result = await db.execute(
        select(func.avg(WorkshopSubmission.grade)).where(
            WorkshopSubmission.user_id == user_id,
            WorkshopSubmission.grade.isnot(None)
        )
    )
    ws_avg = ws_result.scalar() or 0.0

    quiz_avg = (grades["saber_hacer_n1"] * 0.25 + grades["saber_hacer_n2"] * 0.35 + grades["saber_hacer_n3"] * 0.40)
    grades["saber_hacer_grade"] = round(quiz_avg * 0.6 + ws_avg * 0.4, 2) if ws_avg > 0 else round(quiz_avg, 2)

    # --- Dimensión SABER SER (Actitudinal) ---
    for level in [1, 2, 3]:
        result = await db.execute(
            select(
                func.count(UserResponse.id).label("total"),
                func.sum(func.cast(UserResponse.is_correct, Integer)).label("correct"),
            ).where(
                UserResponse.user_id == user_id,
                UserResponse.dimension == "saber_ser",
                UserResponse.level == level,
            )
        )
        row = result.one()
        total = row.total or 0
        correct = row.correct or 0
        score = (correct / total * 20) if total > 0 else 0.0
        grades[f"saber_ser_n{level}"] = round(score, 2)

    # Incorporar nota de dilemas éticos
    dr_result = await db.execute(
        select(
            func.count(DilemmaResponse.id).label("total"),
            func.sum(func.cast(DilemmaResponse.is_ethical, Integer)).label("ethical"),
        ).where(DilemmaResponse.user_id == user_id)
    )
    dr_row = dr_result.one()
    dilemma_score = (dr_row.ethical / dr_row.total * 20) if (dr_row.total or 0) > 0 else 0.0

    quiz_avg_ser = (grades["saber_ser_n1"] * 0.25 + grades["saber_ser_n2"] * 0.35 + grades["saber_ser_n3"] * 0.40)
    grades["saber_ser_grade"] = round(quiz_avg_ser * 0.5 + dilemma_score * 0.5, 2) if dilemma_score > 0 else round(quiz_avg_ser, 2)

    # --- Promedio Final Ponderado (0-20) ---
    grades["final_grade_20"] = round(
        grades["saber_grade"] * 0.35 +
        grades["saber_hacer_grade"] * 0.40 +
        grades["saber_ser_grade"] * 0.25,
        2
    )

    # --- Métricas adicionales ---
    metrics = await db.execute(
        select(
            func.count(UserResponse.id),
            func.sum(func.cast(UserResponse.is_correct, Integer)),
            func.avg(UserResponse.response_time_ms),
            func.sum(case((UserResponse.behavior_flag == "FAST_RANDOM", 1), else_=0)),
            func.sum(UserResponse.failed_attempts),
        ).where(UserResponse.user_id == user_id)
    )
    m = metrics.one()
    grades["total_questions_answered"] = m[0] or 0
    grades["total_correct"] = m[1] or 0
    grades["avg_response_time_ms"] = round(m[2] or 0, 1)
    grades["fast_random_count"] = m[3] or 0
    grades["total_failed_attempts"] = m[4] or 0

    # Guardar en la tabla de calificaciones
    existing = await db.execute(
        select(CompetencyGrade).where(CompetencyGrade.user_id == user_id)
    )
    grade_record = existing.scalar_one_or_none()

    if grade_record:
        for k, v in grades.items():
            setattr(grade_record, k, v)
    else:
        grade_record = CompetencyGrade(user_id=user_id, **grades)
        db.add(grade_record)

    await db.commit()
    return grades
