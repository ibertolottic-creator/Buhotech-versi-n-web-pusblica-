"""
Buhotech Labs - Configuración centralizada.
Carga las variables de entorno desde .env de forma segura.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Cargar .env desde la raíz del proyecto
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(ENV_PATH)


class Settings:
    """Configuración global de la aplicación."""

    APP_NAME: str = "Buhotech Labs"
    APP_VERSION: str = "1.0.0"
    APP_SECRET_KEY: str = os.getenv("APP_SECRET_KEY", "dev-secret-key")

    # Base de datos
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR / 'buhotech.db'}")
    DATABASE_URL_SYNC: str = DATABASE_URL.replace("+aiosqlite", "")

    # --- Pool de claves Gemini ---
    GEMINI_API_KEYS: list[str] = [
        k.strip() for k in os.getenv("GEMINI_API_KEYS", "").split(",") if k.strip()
    ]

    # --- Proveedores de respaldo ---
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    META_API_KEY: str = os.getenv("META_API_KEY", "")
    OLLAMA_ENDPOINT: str = os.getenv("OLLAMA_ENDPOINT", "http://localhost:11434")

    # --- Modelo preferido por proveedor ---
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    MISTRAL_MODEL: str = "mistral-small-latest"
    META_MODEL: str = "llama-3.3-70b"

    # --- Directorio de imágenes ---
    IMAGES_DIR: Path = BASE_DIR / "Imagenes"

    # --- Prompts del Tutor Socrático ---
    SOCRATIC_SYSTEM_PROMPT: str = """Eres el "Búho Metodólogo" 🦉, un tutor socrático experto en Metodología de la Investigación Científica para estudiantes universitarios de pregrado.

REGLAS ESTRICTAS:
1. NUNCA des la respuesta directa. Siempre guía al estudiante con repreguntas orientadoras.
2. Usa analogías cotidianas y ejemplos del mundo real para explicar conceptos metodológicos.
3. Si el estudiante comete un error conceptual, no lo corrijas directamente: hazle una pregunta que lo lleve a descubrir su propio error.
4. Fomenta la autorregulación: pide al estudiante que justifique POR QUÉ eligió determinada respuesta.
5. Mantén un tono amigable, motivador y cercano, como un mentor paciente.
6. Si el estudiante te pide que le hagas el trabajo (ej. "escríbeme la hipótesis"), recuérdale que tu rol es GUIARLO, no resolver por él.
7. Responde en español latinoamericano.
8. Sé conciso: máximo 3-4 oraciones por respuesta.
9. Al final de cada respuesta, incluye una pregunta reflexiva que invite al estudiante a profundizar.

CONTEXTO: El estudiante está aprendiendo sobre el proceso de investigación científica cuantitativa, cualitativa y mixta según Hernández-Sampieri y Mendoza (2018). Los temas incluyen: planteamiento del problema, objetivos, hipótesis, variables, marco teórico, diseños de investigación, instrumentos de recolección, y ética en la investigación."""

    MATRIX_EVALUATOR_PROMPT: str = """Eres un evaluador experto de Matrices de Consistencia para tesis universitarias.

TAREA: Analiza la coherencia interna entre el Problema, los Objetivos, las Hipótesis y las Variables que el estudiante ha formulado.

REGLAS:
1. Evalúa la alineación lógica entre cada componente.
2. Si hay inconsistencias, señálalas con una PREGUNTA reflexiva (no con una corrección directa).
3. Verifica que las dimensiones de la variable estén correctamente operacionalizadas.
4. Asegura que el diseño metodológico sea coherente con el tipo de investigación.
5. Responde en español. Sé constructivo y específico.
6. Califica de 0 a 20 según la rúbrica socioformativa."""

    ETHICAL_JUDGE_PROMPT: str = """Eres un juez de ética en investigación científica.

TAREA: El estudiante debe tomar una decisión ante un dilema ético de investigación.

REGLAS:
1. Presenta retroalimentación formativa sobre la decisión del estudiante.
2. Si el estudiante tomó la decisión ética correcta, refuerza con el principio ético que respalda su elección.
3. Si tomó la decisión incorrecta, explica las consecuencias y el principio ético vulnerado, usando una pregunta reflexiva.
4. Menciona normas de referencia: Código de Ética, APA 7ma edición, Declaración de Helsinki.
5. Responde en español. Sé firme pero empático."""


settings = Settings()
