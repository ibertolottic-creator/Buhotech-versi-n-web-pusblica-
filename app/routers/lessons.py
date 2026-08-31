"""
Buhotech Labs - Rutas de Lecciones Gamificadas (Dimensión Cognitiva: SABER).
Conserva la mecánica estilo Duolingo: vidas, XP, barras, verificación/rescate.
"""
import time
from fastapi import APIRouter, Request, Depends
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models import User, Question, UserResponse
from app.services.grading_service import calculate_grades

router = APIRouter(prefix="/lessons")
templates = Jinja2Templates(directory="app/templates")


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> User | None:
    """Obtiene el usuario actual desde la cookie."""
    user_id = request.cookies.get("user_id")
    if not user_id:
        return None
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard(request: Request, db: AsyncSession = Depends(get_db)):
    """Panel principal del estudiante con la ruta de módulos estilo Duolingo."""
    user = await get_current_user(request, db)
    if not user:
        return RedirectResponse("/", status_code=302)

    # Definir los módulos (fases)
    modules = [
        {"id": 1, "title": "Entrenamiento Conceptual", "subtitle": "Definiciones y lógica del problema", "icon": "📚", "dimension": "saber", "badge": "Dimensión Cognitiva (Saber)", "badge_class": "badge-saber"},
        {"id": 2, "title": "Taller de Redacción", "subtitle": "Redacta guiado por el Búho", "icon": "🔧", "dimension": "saber_hacer", "badge": "Dimensión Procedimental (Saber Hacer)", "badge_class": "badge-hacer"},
        {"id": 3, "title": "Laboratorio Ético", "subtitle": "Toma de decisiones en la investigación", "icon": "⚖️", "dimension": "saber_ser", "badge": "Dimensión Actitudinal (Saber Ser)", "badge_class": "badge-ser"},
    ]

    # Contar progreso por módulo
    for mod in modules:
        phase_name = f"Fase {mod['id']}"
        total_result = await db.execute(
            select(func.count(Question.id)).where(Question.phase_number == mod["id"])
        )
        answered_result = await db.execute(
            select(func.count(UserResponse.id)).where(
                UserResponse.user_id == user.id,
                UserResponse.question.has(Question.phase_number == mod["id"])
            )
        )
        mod["total_questions"] = total_result.scalar() or 0
        mod["answered"] = answered_result.scalar() or 0
        mod["progress"] = int((mod["answered"] / mod["total_questions"] * 100)) if mod["total_questions"] > 0 else 0

    return templates.TemplateResponse(request=request, name="dashboard.html", context={
        "request": request,
        "user": user,
        "modules": modules,
    })


@router.get("/play/{phase_number}", response_class=HTMLResponse)
async def play_lesson(request: Request, phase_number: int, db: AsyncSession = Depends(get_db)):
    """Muestra la lección gamificada de una fase específica."""
    user = await get_current_user(request, db)
    if not user:
        return RedirectResponse("/", status_code=302)

    if phase_number > user.unlocked_module:
        return RedirectResponse("/dashboard", status_code=302)

    # Obtener preguntas de esta fase
    result = await db.execute(
        select(Question)
        .where(Question.phase_number == phase_number)
        .order_by(Question.id)
    )
    questions = result.scalars().all()

    # Serializar opciones para JavaScript
    questions_data = []
    for q in questions:
        q_data = {
            "id": q.id,
            "text": q.text,
            "options": q.options if isinstance(q.options, list) else [],
            "correct_answer": q.correct_answer,
            "image_filename": q.image_filename,
            "min_reading_time_ms": q.min_reading_time_ms,
            "expected_time_ms": q.expected_time_ms,
            "verification_text": q.verification_text,
            "rescue_text": q.rescue_text,
            "phase": q.phase,
            "dimension": q.dimension,
            "level": q.level,
            "question_type": q.question_type,
        }
        
        # Corrección para preguntas tipo SCENARIO/DILEMMA donde el correct_answer es "SCENARIO" y las opciones tienen "is_ethical"
        if q.question_type in ["SCENARIO", "DILEMMA"] and isinstance(q.options, list):
            for opt in q.options:
                if isinstance(opt, dict) and opt.get("is_ethical") is True:
                    q_data["correct_answer"] = opt.get("id")
                    break
                    
        questions_data.append(q_data)

    return templates.TemplateResponse(request=request, name="lesson.html", context={
        "request": request,
        "user": user,
        "phase_number": phase_number,
        "questions": questions_data,
    })


@router.get("/workshop/{phase_number}", response_class=HTMLResponse)
async def play_workshop(request: Request, phase_number: int, db: AsyncSession = Depends(get_db)):
    """Muestra la interfaz de taller (pantalla dividida) para una fase."""
    user = await get_current_user(request, db)
    if not user:
        return RedirectResponse("/", status_code=302)

    if phase_number > user.unlocked_module:
        return RedirectResponse("/dashboard", status_code=302)

    return templates.TemplateResponse(request=request, name="workshop.html", context={
        "request": request,
        "user": user,
        "phase_number": phase_number,
    })


@router.get("/matrix/{phase_number}", response_class=HTMLResponse)
async def get_matrix(request: Request, phase_number: int, db: AsyncSession = Depends(get_db)):
    """Renderiza la actividad de la Matriz de Consistencia Interactiva."""
    user = await get_current_user(request, db)
    if not user:
        return RedirectResponse(url="/auth/login")

    return templates.TemplateResponse(request=request, name="matrix.html", context={
        "request": request,
        "user": user,
        "phase_number": phase_number,
    })


@router.post("/api/respond")
async def submit_response(request: Request, db: AsyncSession = Depends(get_db)):
    """Procesa la respuesta del alumno a una pregunta de opción múltiple (API JSON)."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    question_id = data.get("question_id")
    selected_answer = data.get("selected_answer")
    response_time_ms = data.get("response_time_ms", 0)
    failed_attempts = data.get("failed_attempts", 0)

    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    if not question:
        return JSONResponse({"error": "Pregunta no encontrada"}, status_code=404)

    feedback_text = ""
    if question.question_type == "HONESTY":
        if selected_answer == "A": # Sí, pegué
            if user.pasted_text_count > 0:
                is_correct = True
                feedback_text = "Gracias por tu honestidad. El sistema registró tus acciones. Asumir el error es el primer paso ético."
            else:
                is_correct = False
                feedback_text = "Curiosamente, el sistema no registró que pegaras texto. Pero valoramos tu intención de ser honesto."
        elif selected_answer == "B": # No pegué
            if user.pasted_text_count > 0:
                is_correct = False
                feedback_text = "Falso. El sistema de telemetría registró que pegaste texto. La integridad es fundamental en la ciencia."
            else:
                is_correct = True
                feedback_text = "¡Excelente! Mantuviste la integridad académica durante todo el taller."
    elif question.question_type in ["SCENARIO", "DILEMMA"] and isinstance(question.options, list):
        # Para dilemas/escenarios éticos, la corrección y el feedback están en la misma opción
        selected_opt = next((opt for opt in question.options if isinstance(opt, dict) and opt.get("id") == selected_answer), None)
        if selected_opt and "is_ethical" in selected_opt:
            is_correct = selected_opt["is_ethical"]
            feedback_text = selected_opt.get("feedback", question.verification_text if is_correct else question.rescue_text)
        else:
            is_correct = selected_answer == question.correct_answer
            feedback_text = question.verification_text if is_correct else question.rescue_text
    else:
        is_correct = selected_answer == question.correct_answer
        feedback_text = question.verification_text if is_correct else question.rescue_text

    # Detectar comportamiento
    behavior_flag = "NORMAL"
    if response_time_ms < question.min_reading_time_ms:
        # Check if the user already has a FAST_RANDOM flag for this question
        previous_fast = await db.execute(
            select(UserResponse).where(
                UserResponse.user_id == user.id,
                UserResponse.question_id == question.id,
                UserResponse.behavior_flag == "FAST_RANDOM"
            )
        )
        has_previous_fast = previous_fast.first() is not None
        
        if not has_previous_fast:
            behavior_flag = "FAST_RANDOM"
        else:
            # Ya fue penalizado antes, se considera lectura normal
            behavior_flag = "NORMAL"
    elif response_time_ms > question.expected_time_ms:
        behavior_flag = "SEARCHING_THINKING"

    # Penalizar solo el primer intento fallido
    hearts_lost = 0
    xp_gained = 0
    if is_correct and behavior_flag != "FAST_RANDOM":
        if failed_attempts == 0:
            xp_gained = 10
            user.xp += xp_gained
        else:
            xp_gained = 5
            user.xp += xp_gained
    elif not is_correct or behavior_flag == "FAST_RANDOM":
        if failed_attempts == 0:
            hearts_lost = 1
            user.hearts = max(0, user.hearts - hearts_lost)

    user_response = UserResponse(
        user_id=user.id,
        question_id=question.id,
        selected_answer=selected_answer,
        is_correct=is_correct,
        response_time_ms=response_time_ms,
        behavior_flag=behavior_flag,
        dimension=question.dimension,
        level=question.level,
        feedback_type="VERIFICATION" if is_correct else "RESCUE",
    )
    db.add(user_response)
    await db.commit()
    await db.refresh(user)

    return JSONResponse({
        "is_correct": is_correct,
        "behavior": behavior_flag,
        "feedback_text": feedback_text,
        "xp_gained": xp_gained,
        "hearts_lost": hearts_lost,
        "user": {"xp": user.xp, "hearts": user.hearts}
    })

@router.post("/api/record_paste")
async def record_paste(request: Request, db: AsyncSession = Depends(get_db)):
    """Registra que el usuario intentó pegar texto (evaluación actitudinal)."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)
    
    user.pasted_text_count += 1
    await db.commit()
    return JSONResponse({"status": "recorded"})

from app.services.ai_orchestrator import ai_orchestrator

@router.post("/api/respond_text")
async def submit_response_text(request: Request, db: AsyncSession = Depends(get_db)):
    """Procesa y evalúa por IA una respuesta de texto."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    question_id = data.get("question_id")
    selected_answer = data.get("selected_answer", "")
    response_time_ms = data.get("response_time_ms", 0)
    has_pasted = data.get("has_pasted", False)
    failed_attempts = data.get("failed_attempts", 0)

    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    # Penalizar copiar/pegar
    if has_pasted:
        user.hearts = max(0, user.hearts - 1)
        await db.commit()
        return JSONResponse({
            "is_correct": False,
            "behavior": "PASTED",
            "feedback_text": "Las preguntas con texto pegado valen 0 puntos. Debes redactar tu propia respuesta para desarrollar tu análisis.",
            "xp_gained": 0,
            "hearts_lost": 1,
            "user": {"xp": user.xp, "hearts": user.hearts}
        })

    # Evaluador de IA
    prompt = f"""
    Evalúa la respuesta de un estudiante de tesis a la siguiente actividad:
    '{question.text}'
    Respuesta del estudiante: '{selected_answer}'
    Criterios base:
    Verification_text: {question.verification_text}
    Rescue_text: {question.rescue_text}
    Responde estrictamente en formato JSON con dos claves: 'is_correct' (boolean) y 'feedback' (string corto de retroalimentación).
    Si la respuesta tiene un sentido correcto pero está un poco incompleta, dalo por correcto pero da un buen feedback.
    """
    
    ai_res = await ai_orchestrator.chat(system_prompt="Eres un evaluador de tesis. Responde solo en JSON válido.", user_message=prompt)
    
    try:
        import json
        text_json = ai_res.text.replace('```json', '').replace('```', '').strip()
        parsed = json.loads(text_json)
        is_correct = parsed.get("is_correct", False)
        feedback_text = parsed.get("feedback", "No se pudo generar un buen feedback.")
    except:
        # Fallback simple
        is_correct = len(selected_answer) > 20
        feedback_text = "Tu respuesta ha sido registrada, pero el búho de revisión está ocupado ahora."

    behavior_flag = "NORMAL"
    if response_time_ms < 5000:
        behavior_flag = "FAST_RANDOM"

    hearts_lost = 0
    xp_gained = 0
    if is_correct and behavior_flag != "FAST_RANDOM":
        xp_gained = 20 if failed_attempts == 0 else 10 # Más XP por texto
        user.xp += xp_gained
    elif not is_correct or behavior_flag == "FAST_RANDOM":
        if failed_attempts == 0:
            hearts_lost = 1
            user.hearts = max(0, user.hearts - hearts_lost)

    user_response = UserResponse(
        user_id=user.id,
        question_id=question.id,
        selected_answer=selected_answer[:500], # Trucar
        is_correct=is_correct,
        response_time_ms=response_time_ms,
        behavior_flag=behavior_flag,
        dimension=question.dimension,
        level=question.level,
        feedback_type="VERIFICATION",
    )
    db.add(user_response)
    await db.commit()
    await db.refresh(user)

    return JSONResponse({
        "is_correct": is_correct,
        "behavior": behavior_flag,
        "feedback_text": feedback_text,
        "xp_gained": xp_gained,
        "hearts_lost": hearts_lost,
        "user": {"xp": user.xp, "hearts": user.hearts}
    })

@router.post("/api/respond_interactive")
async def submit_response_interactive(request: Request, db: AsyncSession = Depends(get_db)):
    """Procesa preguntas de SORT y MATCH."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    question_id = data.get("question_id")
    selected_answer = data.get("selected_answer")
    response_time_ms = data.get("response_time_ms", 0)
    failed_attempts = data.get("failed_attempts", 0)

    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()

    is_correct = False
    if question.question_type == 'SORT':
        is_correct = selected_answer == question.correct_answer
    elif question.question_type == 'MATCH':
        # validate match, correct_answer has the pairs in db, but in seed it just says 'MATCH'
        # actually let's validate against question.options
        try:
            import json
            selections = json.loads(selected_answer)
            is_correct = True
            for opt in question.options:
                if selections.get(opt['id']) != opt['right']:
                    is_correct = False
                    break
        except:
            pass

    hearts_lost = 0
    xp_gained = 0
    if is_correct:
        xp_gained = 15 if failed_attempts == 0 else 5
        user.xp += xp_gained
    elif failed_attempts == 0:
        hearts_lost = 1
        user.hearts = max(0, user.hearts - hearts_lost)

    user_response = UserResponse(
        user_id=user.id,
        question_id=question.id,
        selected_answer=str(selected_answer),
        is_correct=is_correct,
        response_time_ms=response_time_ms,
        behavior_flag="NORMAL",
        dimension=question.dimension,
        level=question.level,
        feedback_type="VERIFICATION",
    )
    db.add(user_response)
    await db.commit()
    await db.refresh(user)

    return JSONResponse({
        "is_correct": is_correct,
        "behavior": "NORMAL",
        "feedback_text": question.verification_text if is_correct else question.rescue_text,
        "xp_gained": xp_gained,
        "hearts_lost": hearts_lost,
        "user": {"xp": user.xp, "hearts": user.hearts}
    })

@router.post("/api/hint")
async def get_hint(request: Request, db: AsyncSession = Depends(get_db)):
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)
    
    data = await request.json()
    question_id = data.get("question_id")
    result = await db.execute(select(Question).where(Question.id == question_id))
    question = result.scalar_one_or_none()
    
    user.xp = max(0, user.xp - 5)
    await db.commit()

    prompt = f"Genera una pista sutil de 1 oración para ayudar al estudiante a responder: '{question.text}'. No le des la respuesta directa."
    ai_res = await ai_orchestrator.chat("Eres un búho sabio.", prompt)
    
    return JSONResponse({"hint": ai_res.text})

@router.post("/api/record-infographic-view")
async def record_infographic_view(request: Request, db: AsyncSession = Depends(get_db)):
    """Incrementa el contador de vistas de infografía."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)
    
    user.infographic_views = (user.infographic_views or 0) + 1
    await db.commit()
    return JSONResponse({"status": "success", "views": user.infographic_views})

@router.post("/api/workshop-submit")
async def workshop_submit(request: Request, db: AsyncSession = Depends(get_db)):
    """Guarda las respuestas del taller en la base de datos."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)
        
    data = await request.json()
    workshop_type = data.get("workshop_type", "Fase 2")
    submission_data = data.get("submission_data", {})
    
    from app.models import WorkshopSubmission
    
    # Eliminar entrega previa del mismo taller si existe
    await db.execute(
        WorkshopSubmission.__table__.delete().where(
            WorkshopSubmission.user_id == user.id,
            WorkshopSubmission.workshop_type == workshop_type
        )
    )
    
    submission = WorkshopSubmission(
        user_id=user.id,
        workshop_type=workshop_type,
        submission_data=submission_data,
        grade=None  # Pendiente de IA o Docente
    )
    db.add(submission)
    await db.commit()
    return JSONResponse({"status": "success"})

@router.post("/api/complete-module")
async def complete_module(request: Request, db: AsyncSession = Depends(get_db)):
    """Desbloquea el siguiente módulo al completar el actual."""
    user = await get_current_user(request, db)
    if not user:
        return JSONResponse({"error": "No autenticado"}, status_code=401)

    data = await request.json()
    module_number = data.get("module_number", 0)

    if module_number >= user.unlocked_module:
        user.unlocked_module = module_number + 1
        await db.commit()
        await db.refresh(user)

    grades = await calculate_grades(user.id, db)

    # Include pasted_count for Fase 3 attitudinal reveal
    grades["pasted_count"] = user.pasted_text_count or 0

    return JSONResponse({
        "unlocked_module": user.unlocked_module,
        "xp": user.xp,
        "grades": grades,
    })
