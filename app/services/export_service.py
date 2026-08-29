"""
Buhotech Labs - Exportador CSV para IBM SPSS.
Genera un dataset listo para el contraste de hipótesis con prueba t de Student.
"""
import csv
import io
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, CompetencyGrade, SocraticSession


async def export_spss_csv(db: AsyncSession) -> str:
    """
    Genera un CSV con todas las variables necesarias para SPSS.
    
    Columnas del dataset:
    - id_estudiante: Identificador único
    - username: Nombre de usuario
    - grupo: "experimental" (todos en Buhotech Labs)
    - nota_saber (0-20): Dimensión Cognitiva
    - nota_saber_n1, nota_saber_n2, nota_saber_n3: Por nivel taxonómico
    - nota_saber_hacer (0-20): Dimensión Procedimental
    - nota_saber_hacer_n1, nota_saber_hacer_n2, nota_saber_hacer_n3
    - nota_saber_ser (0-20): Dimensión Actitudinal
    - nota_saber_ser_n1, nota_saber_ser_n2, nota_saber_ser_n3
    - nota_final (0-20): Promedio ponderado
    - total_preguntas: Preguntas respondidas
    - total_correctas: Respuestas correctas
    - porcentaje_aciertos: (correctas/total)*100
    - interacciones_ia: Número de interacciones con el tutor socrático
    - tiempo_promedio_ms: Tiempo promedio de respuesta
    - respuestas_al_azar: Veces que respondió demasiado rápido (FAST_RANDOM)
    - xp: Puntos de experiencia
    - modulo_alcanzado: Último módulo desbloqueado
    - intentos_fallidos_totales: Métrica de persistencia
    """
    # Obtener todos los estudiantes con sus calificaciones
    result = await db.execute(
        select(User, CompetencyGrade)
        .outerjoin(CompetencyGrade, User.id == CompetencyGrade.user_id)
        .where(User.role == "student")
        .order_by(User.username)
    )
    rows = result.all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados para SPSS
    headers = [
        "id_estudiante", "username", "grupo",
        "nota_saber", "nota_saber_n1", "nota_saber_n2", "nota_saber_n3",
        "nota_saber_hacer", "nota_saber_hacer_n1", "nota_saber_hacer_n2", "nota_saber_hacer_n3",
        "nota_saber_ser", "nota_saber_ser_n1", "nota_saber_ser_n2", "nota_saber_ser_n3",
        "nota_final",
        "total_preguntas", "total_correctas", "porcentaje_aciertos",
        "interacciones_ia", "tiempo_promedio_ms", "respuestas_al_azar",
        "xp", "modulo_alcanzado", "intentos_fallidos_totales",
    ]
    writer.writerow(headers)

    for user, grade in rows:
        # Contar interacciones socráticas
        socratic_result = await db.execute(
            select(SocraticSession.total_interactions)
            .where(SocraticSession.user_id == user.id)
        )
        socratic_interactions = sum(s or 0 for (s,) in socratic_result.all())

        g = grade or CompetencyGrade()
        total_q = g.total_questions_answered or 0
        total_c = g.total_correct or 0
        pct = round((total_c / total_q * 100), 2) if total_q > 0 else 0.0

        writer.writerow([
            user.id,
            user.username,
            "experimental",
            g.saber_grade,
            g.saber_n1, g.saber_n2, g.saber_n3,
            g.saber_hacer_grade,
            g.saber_hacer_n1, g.saber_hacer_n2, g.saber_hacer_n3,
            g.saber_ser_grade,
            g.saber_ser_n1, g.saber_ser_n2, g.saber_ser_n3,
            g.final_grade_20,
            total_q, total_c, pct,
            socratic_interactions,
            g.avg_response_time_ms,
            g.fast_random_count,
            user.xp,
            user.unlocked_module,
            g.total_failed_attempts,
        ])

    return output.getvalue()
