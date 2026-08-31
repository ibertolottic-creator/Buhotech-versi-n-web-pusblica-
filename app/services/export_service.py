"""
Buhotech Labs - Exportador CSV para IBM SPSS.
Genera un dataset listo para el contraste de hipótesis con prueba t de Student.
"""
import csv
import io
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User, CompetencyGrade, SocraticSession, Question, UserResponse


async def export_spss_csv(db: AsyncSession) -> str:
    """
    Genera un CSV con todas las variables necesarias para SPSS.
    """
    # Obtener todos los estudiantes con sus calificaciones
    result = await db.execute(
        select(User, CompetencyGrade)
        .outerjoin(CompetencyGrade, User.id == CompetencyGrade.user_id)
        .where(User.role == "student")
        .order_by(User.username)
    )
    rows = result.all()

    # Obtener todas las preguntas para columnas dinámicas
    q_result = await db.execute(select(Question.id, Question.text).order_by(Question.id))
    all_questions = q_result.all()
    all_question_ids = [q_id for q_id, _ in all_questions]
    
    # Fases de los talleres (tareas procedimentales)
    workshop_tasks = {
        "planteamiento": "Taller 1: Planteamiento del Problema",
        "objetivos": "Taller 2: Objetivos e Hipótesis",
        "variables": "Taller 3: Variables y Operacionalización",
        "metodologia": "Taller 4: Diseño Metodológico"
    }

    output = io.StringIO()
    writer = csv.writer(output)

    # Encabezados para SPSS (Fila 1: Nombres cortos de variables)
    base_headers = [
        "id_estudiante", "username", "grupo",
        "Promedio_Cognitivo_0_20", "nota_saber_n1", "nota_saber_n2", "nota_saber_n3",
        "Promedio_Procedimental_0_20", "nota_saber_hacer_n1", "nota_saber_hacer_n2", "nota_saber_hacer_n3",
        "nota_saber_ser", "nota_saber_ser_n1", "nota_saber_ser_n2", "nota_saber_ser_n3",
        "Fallas_Actitudinales_Negativo", "Calificacion_Final_0_20",
        "total_preguntas", "total_correctas", "porcentaje_aciertos",
        "interacciones_ia", "tiempo_promedio_ms", "respuestas_al_azar",
        "intentos_copiar_pegar", "xp", "modulo_alcanzado", "intentos_fallidos_totales",
    ]
    
    headers_row1 = base_headers + [f"Pregunta_{i+1}" for i in range(len(all_questions))] + [f"Taller_{i+1}" for i in range(len(workshop_tasks))] + [f"Respuesta_Taller_{i+1}" for i in range(len(workshop_tasks))]
    
    # Fila 2: Descripciones completas (Textos de las preguntas y nombres de talleres)
    empty_base = [""] * len(base_headers)
    headers_row2 = empty_base + [q_text for _, q_text in all_questions] + list(workshop_tasks.values()) + list(workshop_tasks.values())
    
    writer.writerow(headers_row1)
    writer.writerow(headers_row2)

    for user, grade in rows:
        # Contar interacciones socráticas
        socratic_result = await db.execute(
            select(SocraticSession.total_interactions)
            .where(SocraticSession.user_id == user.id)
        )
        socratic_interactions = sum(s or 0 for (s,) in socratic_result.all())

        # Obtener respuestas del estudiante a preguntas individuales
        ur_result = await db.execute(
            select(UserResponse.question_id, UserResponse.is_correct)
            .where(UserResponse.user_id == user.id)
        )
        user_responses_dict = {q_id: (1 if is_correct else 0) for q_id, is_correct in ur_result.all()}

        # Obtener notas y textos de talleres
        from app.models import WorkshopSubmission
        ws_result = await db.execute(
            select(WorkshopSubmission.workshop_type, WorkshopSubmission.grade, WorkshopSubmission.submission_data)
            .where(WorkshopSubmission.user_id == user.id)
        )
        
        user_workshops_dict = {}
        user_workshops_text_dict = {}
        for w_type, w_grade, w_data in ws_result.all():
            # Fase 2 contiene un dict con {planteamiento, objetivos, variables, metodologia}
            if w_type == "Fase 2" and isinstance(w_data, dict):
                for k, v in w_data.items():
                    user_workshops_dict[k] = float(w_grade or 0)
                    text_val = str(v)
                    if len(text_val) > 600:
                        text_val = text_val[:597] + "..."
                    user_workshops_text_dict[k] = text_val
            else:
                user_workshops_dict[w_type] = float(w_grade or 0)
                text_val = ""
                if isinstance(w_data, dict):
                    text_val = str(w_data.get("texto", w_data.get("text", w_data)))
                elif isinstance(w_data, str):
                    text_val = w_data
                
                if len(text_val) > 600:
                    text_val = text_val[:597] + "..."
                
                user_workshops_text_dict[w_type] = text_val

        g = grade or CompetencyGrade()
        total_q = g.total_questions_answered or 0
        total_c = g.total_correct or 0
        pct = round((total_c / total_q * 100), 2) if total_q > 0 else 0.0
        
        penalty_val = getattr(g, "actitudinal_penalty", 0.0) or 0.0
        # Convertir penalidad a negativo solo si es mayor que 0
        sancion_negativa = -penalty_val if penalty_val > 0 else 0.0

        base_row = [
            user.id,
            user.username,
            "experimental",
            g.saber_grade,
            g.saber_n1, g.saber_n2, g.saber_n3,
            g.saber_hacer_grade,
            g.saber_hacer_n1, g.saber_hacer_n2, g.saber_hacer_n3,
            g.saber_ser_grade,
            g.saber_ser_n1, g.saber_ser_n2, g.saber_ser_n3,
            sancion_negativa,
            g.final_grade_20,
            total_q, total_c, pct,
            socratic_interactions,
            g.avg_response_time_ms,
            g.fast_random_count,
            user.pasted_text_count,
            user.xp,
            user.unlocked_module,
            g.total_failed_attempts,
        ]
        
        question_row = [user_responses_dict.get(q_id, "") for q_id in all_question_ids]
        workshop_row = [user_workshops_dict.get(w_type, "") for w_type in workshop_tasks]
        workshop_text_row = [user_workshops_text_dict.get(w_type, "") for w_type in workshop_tasks]
        
        writer.writerow(base_row + question_row + workshop_row + workshop_text_row)

    return output.getvalue()
