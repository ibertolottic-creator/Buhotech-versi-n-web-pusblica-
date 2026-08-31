"""
Buhotech Labs - Modelos ORM.
Tablas diseñadas para evaluar las 3 dimensiones de la Variable Dependiente
(Rendimiento Académico) y registrar la telemetría de la Variable Independiente
(Aprendizaje Adaptativo Asistido por IA).
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, 
    ForeignKey, JSON, Enum as SQLEnum
)
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


def utcnow():
    return datetime.now(timezone.utc)


# =============================================================================
# USUARIOS
# =============================================================================
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(String(20), default="student")  # student | admin
    xp = Column(Integer, default=0)
    hearts = Column(Integer, default=10)
    streak_days = Column(Integer, default=0)
    unlocked_module = Column(Integer, default=1)
    last_played = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow)
    
    # Telemetría actitudinal adicional
    pasted_text_count = Column(Integer, default=0)
    infographic_views = Column(Integer, default=0)

    # Relaciones
    responses = relationship("UserResponse", back_populates="user", lazy="selectin")
    grades = relationship("CompetencyGrade", back_populates="user", lazy="selectin")
    socratic_sessions = relationship("SocraticSession", back_populates="user", lazy="selectin")


# =============================================================================
# BANCO DE PREGUNTAS (3 Dimensiones × 3 Niveles)
# =============================================================================
class Question(Base):
    """
    Cada pregunta pertenece a una dimensión de competencia y un nivel taxonómico:
    
    SABER (Cognitiva):
      - N1: Recordar (conocimiento fáctico)
      - N2: Comprender (apropiación semántica)
      - N3: Analizar y Evaluar (juicio crítico)
    
    SABER HACER (Procedimental):
      - N1: Aplicar / Ejecutar (procedimiento estandarizado)
      - N2: Diagnosticar / Resolver (transferencia a casos)
      - N3: Crear / Diseñar (producción e innovación)
    
    SABER SER (Actitudinal):
      - N1: Receptar y Responder (cumplimiento y norma)
      - N2: Valorar y Colaborar (interpersonal)
      - N3: Autorregular y Decidir (ética y autonomía)
    """
    __tablename__ = "questions"

    id = Column(String, primary_key=True, default=generate_uuid)
    
    # Clasificación por competencia
    dimension = Column(String(20), nullable=False, index=True)  # saber | saber_hacer | saber_ser
    level = Column(Integer, nullable=False)  # 1, 2 o 3
    
    # Clasificación por fase del juego
    phase = Column(String(100), nullable=False)
    phase_number = Column(Integer, nullable=False, default=1)
    question_type = Column(String(20), default="MAIN")  # MAIN | RAPID | WORKSHOP | DILEMMA
    
    # Contenido
    text = Column(Text, nullable=False)
    options = Column(JSON, nullable=False)  # [{"id": "A", "text": "..."}, ...]
    correct_answer = Column(String(5), nullable=False)
    image_filename = Column(String(200), nullable=True)
    
    # Métricas de comportamiento
    min_reading_time_ms = Column(Integer, default=3000)
    expected_time_ms = Column(Integer, default=10000)
    
    # Andamiaje adaptativo (Verificación / Rescate)
    verification_text = Column(Text, nullable=True)  # Si acierta: misión bonus
    rescue_text = Column(Text, nullable=True)         # Si falla: ejemplo intuitivo
    
    # Ponderación para calificación vigesimal
    weight = Column(Float, default=1.0)  # Peso de la pregunta en la nota final


# =============================================================================
# RESPUESTAS DEL ESTUDIANTE
# =============================================================================
class UserResponse(Base):
    """Registra cada interacción del alumno con una pregunta."""
    __tablename__ = "user_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    # Resultado
    selected_answer = Column(String(5), nullable=False)
    is_correct = Column(Boolean, nullable=False)
    response_time_ms = Column(Integer, nullable=False)
    failed_attempts = Column(Integer, default=0)
    behavior_flag = Column(String(30), default="NORMAL")  # NORMAL | FAST_RANDOM | SEARCHING_THINKING
    
    # Clasificación heredada de la pregunta
    dimension = Column(String(20), nullable=False)  # saber | saber_hacer | saber_ser
    level = Column(Integer, nullable=False)
    
    # Tipo de feedback entregado
    feedback_type = Column(String(20), nullable=True)  # VERIFICATION | RESCUE
    
    timestamp = Column(DateTime, default=utcnow)

    # Relaciones
    user = relationship("User", back_populates="responses")
    question = relationship("Question")


# =============================================================================
# SESIONES SOCRÁTICAS CON LA IA
# =============================================================================
class SocraticSession(Base):
    """Registra cada conversación del alumno con el Búho Metodólogo."""
    __tablename__ = "socratic_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Historial de mensajes
    messages = Column(JSON, default=list)  # [{"role": "user"|"assistant", "content": "..."}]
    
    # Telemetría del proveedor de IA utilizado
    ai_provider = Column(String(30), nullable=True)   # gemini | groq | mistral | meta | ollama
    ai_model = Column(String(50), nullable=True)
    total_latency_ms = Column(Integer, default=0)
    total_interactions = Column(Integer, default=0)
    
    # Contexto temático
    topic = Column(String(100), nullable=True)  # ej: "planteamiento del problema"
    
    created_at = Column(DateTime, default=utcnow)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow)

    user = relationship("User", back_populates="socratic_sessions")


# =============================================================================
# ENTREGAS DE TALLERES PROCEDIMENTALES (SABER HACER)
# =============================================================================
class WorkshopSubmission(Base):
    """Entregas del Taller de Matrices y ejercicios procedimentales."""
    __tablename__ = "workshop_submissions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    workshop_type = Column(String(50), nullable=False)  # matrix_builder | methodology_detective | case_diagnosis
    submission_data = Column(JSON, nullable=False)       # Datos de la entrega del alumno
    ai_feedback = Column(Text, nullable=True)            # Retroalimentación de la IA
    grade = Column(Float, nullable=True)                 # Nota 0-20
    
    ai_provider = Column(String(30), nullable=True)
    latency_ms = Column(Integer, default=0)
    
    timestamp = Column(DateTime, default=utcnow)

    user = relationship("User")


# =============================================================================
# DILEMAS ÉTICOS (SABER SER)
# =============================================================================
class DilemmaResponse(Base):
    """Decisiones del alumno ante dilemas de ética en investigación."""
    __tablename__ = "dilemma_responses"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    
    choice = Column(String(5), nullable=False)          # La opción elegida
    justification = Column(Text, nullable=True)         # Justificación escrita del alumno
    ai_feedback = Column(Text, nullable=True)           # Retroalimentación ética de la IA
    is_ethical = Column(Boolean, nullable=True)          # ¿Fue la decisión ética correcta?
    
    timestamp = Column(DateTime, default=utcnow)

    user = relationship("User")
    question = relationship("Question")


# =============================================================================
# CALIFICACIONES POR DIMENSIÓN DE COMPETENCIA (0-20)
# =============================================================================
class CompetencyGrade(Base):
    """
    Notas vigesimales calculadas para cada dimensión de la VD:
    - Dimensión Cognitiva (Saber)
    - Dimensión Procedimental (Saber Hacer)
    - Dimensión Actitudinal (Saber Ser)
    - Promedio General
    """
    __tablename__ = "competency_grades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    
    # Notas por dimensión (escala vigesimal 0-20)
    saber_grade = Column(Float, default=0.0)
    saber_hacer_grade = Column(Float, default=0.0)
    saber_ser_grade = Column(Float, default=0.0)
    
    # Promedio ponderado final y sanción actitudinal
    final_grade_20 = Column(Float, default=0.0)
    actitudinal_penalty = Column(Float, default=0.0)  # Sanción directa acumulada (tope máx: 10 pts)
    
    # Detalle por niveles (para análisis fino en SPSS)
    saber_n1 = Column(Float, default=0.0)   # Recordar
    saber_n2 = Column(Float, default=0.0)   # Comprender
    saber_n3 = Column(Float, default=0.0)   # Analizar/Evaluar
    
    saber_hacer_n1 = Column(Float, default=0.0)  # Aplicar
    saber_hacer_n2 = Column(Float, default=0.0)  # Diagnosticar
    saber_hacer_n3 = Column(Float, default=0.0)  # Crear/Diseñar
    
    saber_ser_n1 = Column(Float, default=0.0)    # Receptar
    saber_ser_n2 = Column(Float, default=0.0)    # Colaborar
    saber_ser_n3 = Column(Float, default=0.0)    # Autorregular
    
    # Métricas adicionales para la tesis
    total_questions_answered = Column(Integer, default=0)
    total_correct = Column(Integer, default=0)
    total_socratic_interactions = Column(Integer, default=0)
    avg_response_time_ms = Column(Float, default=0.0)
    fast_random_count = Column(Integer, default=0)   # Veces que adivinó al azar
    total_failed_attempts = Column(Integer, default=0) # Persistencia
    
    calculated_at = Column(DateTime, default=utcnow)

    user = relationship("User", back_populates="grades")
