"""
Buhotech Labs - Script de Poblamiento de Base de Datos para Intervención Cuasiexperimental (40 Minutos).
Unidad 3: Delimitación del Problema y Metodología.
"""
import json
import sys
import os

# Add parent dir to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.config import settings
from app.database import Base
from app.models import User, Question, generate_uuid

engine = create_engine(settings.DATABASE_URL_SYNC)
Base.metadata.create_all(engine)

# ============================================================================
# DIMENSIÓN COGNITIVA (SABER) - Fase 1: Entrenamiento Conceptual
# ============================================================================
SABER_QUESTIONS = [
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Qué significa investigar científicamente?",
        "options": [
            {"id": "A", "text": "Buscar nuevos conocimientos o soluciones a un problema de forma sistemática."},
            {"id": "B", "text": "Copiar información de un libro para presentarla en clase."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - Conocimiento Científico.png",
        "min_reading_time_ms": 2000, "expected_time_ms": 7000,
        "verification_text": "¡Correcto! Investigar es un proceso sistemático para descubrir algo nuevo o resolver dudas.",
        "rescue_text": "Recuerda que la investigación no es solo copiar, sino crear nuevo conocimiento."
    },
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Para qué sirve hacer una tesis?",
        "options": [
            {"id": "A", "text": "Para demostrar que puedes investigar y resolver un problema real de tu carrera."},
            {"id": "B", "text": "Únicamente para cumplir un trámite y archivar el documento en la biblioteca."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - Conocimiento Científico.png",
        "min_reading_time_ms": 2000, "expected_time_ms": 7000,
        "verification_text": "¡Exacto! Una tesis demuestra tu capacidad para aplicar la ciencia a problemas reales.",
        "rescue_text": "Una tesis es tu aporte profesional a la sociedad, no solo un trámite."
    },
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Qué propósito principal tiene la 'Justificación' en una investigación?",
        "options": [
            {"id": "A", "text": "Explicar por qué es importante hacer el estudio y a quiénes va a beneficiar."},
            {"id": "B", "text": "Copiar las conclusiones de otros autores para que el trabajo se vea más largo."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech  - JUSTIFICACIÓN.png",
        "min_reading_time_ms": 2000, "expected_time_ms": 7000,
        "verification_text": "¡Excelente! La justificación convence al lector de que el trabajo vale la pena.",
        "rescue_text": "Recuerda: justificar es dar razones válidas de por qué tu trabajo es útil o necesario."
    },
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Qué es un problema de investigación?",
        "options": [
            {"id": "A", "text": "Una dificultad o duda teórica o práctica que necesita ser resuelta mediante el método científico."},
            {"id": "B", "text": "Una tarea o resumen que el profesor deja para la casa."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
        "min_reading_time_ms": 2000, "expected_time_ms": 7000,
        "verification_text": "¡Correcto! Un problema de investigación es el punto de partida que requiere investigación estructurada.",
        "rescue_text": "Recuerda que la investigación científica busca resolver vacíos de conocimiento."
    },
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Cuál es el primer paso clave al iniciar cualquier tesis o investigación científica?",
        "options": [
            {"id": "A", "text": "Plantear y delimitar el problema de investigación."},
            {"id": "B", "text": "Escribir las conclusiones finales."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
        "min_reading_time_ms": 2000, "expected_time_ms": 6000,
        "verification_text": "¡Exacto! No puedes investigar sin tener claro qué problema vas a resolver.",
        "rescue_text": "Si no sabes a dónde vas, ¿cómo podrías llegar? El problema es siempre lo primero."
    },
    {
        "dimension": "saber", "level": 1, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "El método del embudo para plantear un problema consiste en redactar desde lo general a lo particular. ¿Cuáles son los tres niveles lógicos?",
        "options": [
            {"id": "A", "text": "Macro, Meso, Micro."},
            {"id": "B", "text": "Introducción, Desarrollo, Conclusión."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - Metodo del Embudo.png",
        "min_reading_time_ms": 2500, "expected_time_ms": 8000,
        "verification_text": "Exacto: Macro (Mundial), Meso (Nacional), Micro (Local/Institucional).",
        "rescue_text": "Piensa en el tamaño: desde lo más grande (Macro) hasta lo más pequeño (Micro)."
    },
    {
        "dimension": "saber", "level": 2, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "¿Cuál de los siguientes es el mejor ejemplo de un **objetivo general** correctamente formulado y medible?",
        "options": [
            {"id": "A", "text": "Conocer un poco sobre cómo afecta el internet a los niños de hoy."},
            {"id": "B", "text": "Determinar la relación entre el uso de redes sociales y el rendimiento académico en estudiantes de secundaria del Colegio San Marcos (2024)."},
            {"id": "C", "text": "Implementar una campaña para que los jóvenes usen menos el celular."}
        ],
        "correct_answer": "B",
        "image_filename": "Buhotech - OBJETIVOS.png",
        "min_reading_time_ms": 4000, "expected_time_ms": 15000,
        "verification_text": "Correcto. El verbo 'Determinar' es medible y las variables están delimitadas.",
        "rescue_text": "Busca un verbo medible (Determinar, Analizar) y una delimitación clara."
    },
    {
        "dimension": "saber", "level": 2, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MATCH",
        "text": "Empareja cada elemento para mantener la coherencia (Matriz de Consistencia):",
        "options": [
            {"id": "1", "left": "Problema", "right": "¿Existe relación entre X e Y?"},
            {"id": "2", "left": "Objetivo", "right": "Determinar la relación entre X e Y."},
            {"id": "3", "left": "Hipótesis", "right": "Existe una relación significativa entre X e Y."}
        ],
        "correct_answer": "MATCH",
        "image_filename": "Buhotech - Hipótesis.png",
        "min_reading_time_ms": 4000, "expected_time_ms": 20000,
        "verification_text": "¡Perfecto! Has comprendido la alineación lógica.",
        "rescue_text": "El problema es pregunta, el objetivo es verbo, la hipótesis es afirmación."
    },
    {
        "dimension": "saber", "level": 2, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "FILL_BLANK",
        "text": "La operacionalización es el proceso de pasar de un concepto abstracto (Variable) a uno medible a través de ______ (componentes temáticos) y ______ (formas de medir).",
        "options": [
            {"id": "A", "text": "dimensiones / indicadores"},
            {"id": "B", "text": "preguntas / objetivos"}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - VACIADO DE DATOS.png",
        "min_reading_time_ms": 3000, "expected_time_ms": 10000,
        "verification_text": "Correcto. Variables -> Dimensiones -> Indicadores.",
        "rescue_text": "Recuerda la jerarquía: Variable -> Dimensión -> Indicador."
    },
    {
        "dimension": "saber", "level": 3, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "Dada la variable 'Rendimiento Académico', ¿cuál es la clasificación correcta?",
        "options": [
            {"id": "A", "text": "Dimensión: Notas de matemáticas | Indicador: Promedio vigesimal 0-20"},
            {"id": "B", "text": "Dimensión: Promedio vigesimal 0-20 | Indicador: Notas de matemáticas"}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech -  ANÁLISIS ESTADÍSTICO.png",
        "min_reading_time_ms": 4000, "expected_time_ms": 15000,
        "verification_text": "Correcto. El indicador siempre es la métrica exacta.",
        "rescue_text": "El indicador es cómo lo mides exactamente (números, rangos)."
    },
    {
        "dimension": "saber", "level": 2, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "Si tu investigación busca ver el efecto de aplicar un nuevo software sin un grupo de control, ¿qué tipo de diseño cuantitativo es?",
        "options": [
            {"id": "A", "text": "Pre-experimental"},
            {"id": "B", "text": "Cuasi-experimental"},
            {"id": "C", "text": "Experimental Puro"}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - INVESTIGACIÓN CUASIEXPERIMENTAL.png",
        "min_reading_time_ms": 3000, "expected_time_ms": 15000,
        "verification_text": "Correcto. Sin grupo de control es pre-experimental.",
        "rescue_text": "Revisa el esquema: si no hay grupo de control, es el nivel más básico (pre-experimental)."
    },
    {
        "dimension": "saber", "level": 2, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "Si solo vas a observar y recolectar datos en un único momento del tiempo sin manipular nada, tu diseño es...",
        "options": [
            {"id": "A", "text": "No experimental, Transversal"},
            {"id": "B", "text": "No experimental, Longitudinal"},
            {"id": "C", "text": "Experimental Puro"}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - INVESTIGACIÓN TRANSVERSAL.png",
        "min_reading_time_ms": 3000, "expected_time_ms": 15000,
        "verification_text": "Correcto. Transversal significa 'en un solo momento'.",
        "rescue_text": "Si es en un único momento, atraviesa el tiempo una sola vez (Transversal)."
    },
    {
        "dimension": "saber", "level": 3, "phase": "Fase 1: Entrenamiento Conceptual", "phase_number": 1,
        "question_type": "MAIN",
        "text": "De los diseños cualitativos, ¿cuál se enfoca en comprender las experiencias vividas (Fenomenológico) y cuál busca resolver un problema de la comunidad con su participación (Investigación-Acción)?",
        "options": [
            {"id": "A", "text": "Fenomenológico (Experiencias) / Investigación-Acción (Resolver problema)."},
            {"id": "B", "text": "Fenomenológico (Resolver problema) / Investigación-Acción (Experiencias)."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech - Fenomenología.png",
        "min_reading_time_ms": 3500, "expected_time_ms": 15000,
        "verification_text": "Exacto. Fenomenológico estudia el fenómeno desde la experiencia.",
        "rescue_text": "Fenómeno = Experiencia. Acción = Resolver un problema actuando."
    }
]

# ============================================================================
# DIMENSIÓN PROCEDIMENTAL (SABER HACER) - Fase 2: Taller de Redacción
# ============================================================================
SABER_HACER_QUESTIONS = [
    {
        "dimension": "saber_hacer", "level": 2, "phase": "Fase 2: Aplicación Procedimental", "phase_number": 2,
        "question_type": "MATRIX",
        "text": "Matriz de Consistencia Interactiva. Selecciona en los recuadros las opciones correctas para mantener la coherencia horizontal.",
        "options": [],
        "correct_answer": "MATRIX",
        "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
        "min_reading_time_ms": 1000, "expected_time_ms": 5000,
        "verification_text": "¡Has completado la Matriz!",
        "rescue_text": "Debes completar la matriz manteniendo la coherencia horizontal."
    },
    {
        "dimension": "saber_hacer", "level": 3, "phase": "Fase 2: Aplicación Procedimental", "phase_number": 2,
        "question_type": "WORKSHOP",
        "text": "Taller Socrático: Usa las pestañas para redactar tu planteamiento, objetivos, variables y metodología guiado por el Búho.",
        "options": [],
        "correct_answer": "WORKSHOP",
        "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
        "min_reading_time_ms": 1000, "expected_time_ms": 5000,
        "verification_text": "¡Has completado el taller!",
        "rescue_text": "Debes completar el taller con la ayuda del Búho."
    }
]

# ============================================================================
# DIMENSIÓN ACTITUDINAL (SABER SER) - Fase 3: Laboratorio Ético
# ============================================================================
SABER_SER_QUESTIONS = [
    {
        "dimension": "saber_ser", "level": 3, "phase": "Fase 3: Laboratorio Ético", "phase_number": 3,
        "question_type": "DILEMMA",
        "text": "Escenario: Un grupo de estudiantes descubre cómo hacer que la IA les escriba la tesis completa sin que ellos tengan que leer, analizar, ni entender los problemas. Logran graduarse usando esta técnica. ¿Qué pasaría si todos los profesionales del país aprobaran sus carreras copiando a la IA?",
        "options": [
            {"id": "A", "text": "Colapso del juicio crítico y de la capacidad resolutiva: se tendrían profesionales incapaces de abordar y solucionar problemas reales de manera autónoma y ética."},
            {"id": "B", "text": "Aceleraría enormemente el desarrollo del país, pues la IA resolvería todo en segundos sin requerir esfuerzo mental humano."},
            {"id": "C", "text": "No habría repercusiones negativas, ya que en el mundo laboral solo importa entregar productos y no el entendimiento."},
            {"id": "D", "text": "Únicamente afectaría a las universidades, mientras que las empresas e industrias operarían con total normalidad."}
        ],
        "correct_answer": "A",
        "image_filename": "Buhotech -   Plagio vs. APA.png",
        "min_reading_time_ms": 4000, "expected_time_ms": 30000,
        "verification_text": "¡Exacto! La investigación formativa no es un trámite, sino la base para desarrollar rigor, criterio y ética. La IA debe ser un asistente para potenciar el análisis, nunca un sustituto de la comprensión y el razonamiento humano.",
        "rescue_text": "Reflexiona sobre las consecuencias de delegar todo el pensamiento a una máquina: sin comprensión no hay verdadera competencia profesional."
    }
]

def seed():
    with Session(engine) as session:
        # Avoid foreign key constraint errors by only seeding if empty
        existing_questions = session.query(Question).count()
        all_questions = SABER_QUESTIONS + SABER_HACER_QUESTIONS + SABER_SER_QUESTIONS
        
        if existing_questions == 0:
            for q_data in all_questions:
                q = Question(
                    id=generate_uuid(),
                    dimension=q_data["dimension"],
                    level=q_data["level"],
                    phase=q_data["phase"],
                    phase_number=q_data["phase_number"],
                    question_type=q_data["question_type"],
                    text=q_data["text"],
                    options=q_data["options"],
                    correct_answer=q_data["correct_answer"],
                    image_filename=q_data.get("image_filename"),
                    min_reading_time_ms=q_data["min_reading_time_ms"],
                    expected_time_ms=q_data["expected_time_ms"],
                    verification_text=q_data["verification_text"],
                    rescue_text=q_data["rescue_text"],
                )
                session.add(q)
            print(f"[OK] {len(all_questions)} preguntas insertadas exitosamente (Unidad 3: Metodologia):")
            print(f"   - Saber: {len(SABER_QUESTIONS)}")
            print(f"   - Saber Hacer: {len(SABER_HACER_QUESTIONS)}")
            print(f"   - Saber Ser: {len(SABER_SER_QUESTIONS)}")
        else:
            print(f"[INFO] La base de datos ya contiene {existing_questions} preguntas. Omitiendo poblamiento de preguntas.")

        admin_exists = session.query(User).filter_by(role="admin").first()
        if not admin_exists:
            admin = User(id=generate_uuid(), username="admin", role="admin")
            session.add(admin)

        session.commit()

if __name__ == "__main__":
    seed()
