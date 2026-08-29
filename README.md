# 🦉 Buhotech Labs

**Plataforma de Aprendizaje Adaptativo asistido por Inteligencia Artificial** para la enseñanza de Metodología de la Investigación Científica en estudiantes de pregrado.

> Tesis de grado — Universidad de San Martín de Porres (USMP), Lima 2026.

---

## 📋 Descripción

Buhotech Labs es una aplicación web gamificada (estilo Duolingo) que evalúa **tres dimensiones de competencia investigativa**:

| Dimensión | Tipo | Módulos | Qué evalúa |
|---|---|---|---|
| **Saber** | Cognitiva | 1–5 | Conocimientos de metodología (Hernández-Sampieri) |
| **Saber Hacer** | Procedimental | 6–8 | Formulación de problemas, matrices, diseños |
| **Saber Ser** | Actitudinal | 9–10 | Ética en investigación, integridad académica |

### Características principales

- 🎮 **Gamificación**: Sistema de vidas (❤️), XP (⭐), rachas (🔥) y desbloqueo progresivo de módulos
- 🦉 **Tutor Socrático IA**: Chat con el "Búho Metodólogo" que guía sin dar respuestas directas
- 🤖 **Orquestador Multi-IA**: 6 claves Gemini en round-robin + fallback a Groq, Mistral y Meta/Together AI
- 📊 **Calificación Vigesimal**: Notas 0-20 por dimensión y nivel taxonómico, listas para SPSS
- 📥 **Exportación CSV**: Dataset estructurado para prueba t de Student
- 🔬 **Telemetría Conductual**: Detección de respuestas al azar (FAST_RANDOM) vs pensamiento genuino

---

## 🏗️ Estructura del Proyecto

```
Buhotech labs tesis/
├── app/                         # 🐍 Aplicación principal (FastAPI)
│   ├── __init__.py
│   ├── main.py                  # Punto de entrada del servidor
│   ├── config.py                # Configuración y prompts de IA
│   ├── database.py              # SQLAlchemy async engine
│   ├── models.py                # 6 modelos ORM (Users, Questions, etc.)
│   ├── routers/                 # Endpoints HTTP
│   │   ├── auth.py              # Login / Logout (cookie-based)
│   │   ├── lessons.py           # Lecciones gamificadas + API de respuestas
│   │   ├── socratic.py          # Chat socrático con IA
│   │   └── admin.py             # Panel del investigador + exportación
│   ├── services/                # Lógica de negocio
│   │   ├── ai_orchestrator.py   # Orquestador multi-proveedor de IA
│   │   ├── grading_service.py   # Cálculo de notas vigesimales
│   │   └── export_service.py    # Generador de CSV para SPSS
│   ├── static/                  # Archivos estáticos
│   │   ├── css/styles.css       # Design system (glassmorphism + Duolingo)
│   │   └── js/sounds.js         # Sonidos sintetizados (Web Audio API)
│   └── templates/               # Plantillas Jinja2
│       ├── base.html            # Layout base
│       ├── login.html           # Página de inicio de sesión
│       ├── dashboard.html       # Ruta de módulos gamificados
│       ├── lesson.html          # Vista de lección interactiva
│       ├── socratic_chat.html   # Chat con el Búho Metodólogo
│       ├── grades.html          # Calificaciones del estudiante
│       └── admin/
│           └── dashboard.html   # Panel del investigador/docente
├── seed_data/
│   └── seed.py                  # Script de poblamiento de preguntas
├── Imagenes/                    # Banco de imágenes educativas (48 PNGs)
├── docs/                        # Documentación y archivos de la tesis
│   ├── tesis/                   # Documentos de operacionalización
│   └── apis/                    # Documentación de APIs
├── _legacy/                     # ⚠️ Código legacy (React+Express, no activo)
│   ├── client/                  # Frontend React+Vite anterior
│   └── server/                  # Backend Express.js anterior
├── .env                         # Variables de entorno (NO subir a Git)
├── .gitignore
├── Dockerfile                   # Contenedor Docker
├── requirements.txt             # Dependencias Python
└── README.md                    # Este archivo
```

---

## 🚀 Instalación y Ejecución

### Requisitos previos

- **Python 3.11+** (probado con Python 3.14)
- Claves de API de [Google AI Studio](https://aistudio.google.com/apikey) (Gemini)

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/buhotech-labs.git
cd buhotech-labs
```

### 2. Crear entorno virtual e instalar dependencias

```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Copia `.env.example` a `.env` y configura tus claves de API:

```env
# Pool de claves Gemini (mínimo 1, máximo 6)
GEMINI_API_KEYS=AIzaSy...,AIzaSy...,AIzaSy...

# Opcionales (respaldo)
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
META_API_KEY=...

# Configuración de la app
APP_SECRET_KEY=tu-clave-secreta-aqui
DATABASE_URL=sqlite+aiosqlite:///./buhotech.db
```

### 4. Poblar la base de datos con preguntas

```bash
python -m seed_data.seed
```

### 5. Iniciar el servidor

```bash
# Desarrollo (con hot reload)
uvicorn app.main:app --reload --port 8080

# Producción
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

La aplicación estará disponible en: **http://localhost:8080**

### 6. Acceso

- **Estudiante**: Ingresa cualquier nombre de usuario en la pantalla de login
- **Administrador**: Ingresa con usuario `admin` (creado por el script de seed)

---

## 🐳 Docker

```bash
docker build -t buhotech-labs .
docker run -p 8080:8080 --env-file .env buhotech-labs
```

---

## 🤖 Arquitectura de IA

El orquestador utiliza una **cascada de proveedores** con tolerancia a fallos:

```
┌─────────────────────────────────────────────────┐
│           Petición del Estudiante               │
└──────────────────┬──────────────────────────────┘
                   ▼
┌──────────────────────────────────────────────────┐
│  Pool Gemini (Round-Robin entre 6 claves)       │
│  gemini-2.0-flash  ←  Motor principal           │
│  3 reintentos con backoff exponencial           │
└─────────┬────────────────────────────────────────┘
          │ Si falla
          ▼
┌──────────────────────────────────────────────────┐
│  Groq Cloud  →  llama-3.3-70b-versatile        │
│  Meta/Together AI  →  llama-3.3-70b            │
│  Mistral AI  →  mistral-small-latest           │
└─────────┬────────────────────────────────────────┘
          │ Si todos fallan
          ▼
┌──────────────────────────────────────────────────┐
│  Respuesta de emergencia local                  │
│  "El Búho está descansando... 🦉💤"             │
└──────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Datos

### Tablas principales

| Tabla | Propósito |
|---|---|
| `users` | Estudiantes y administradores |
| `questions` | Banco de preguntas (dimensión × nivel × fase) |
| `user_responses` | Respuestas con telemetría conductual |
| `socratic_sessions` | Historial de chat con la IA |
| `workshop_submissions` | Entregas de talleres procedimentales |
| `dilemma_responses` | Decisiones ante dilemas éticos |
| `competency_grades` | Notas vigesimales por dimensión y nivel |

### Calificación vigesimal (0-20)

```
Nota Final = Saber × 0.35 + Saber Hacer × 0.40 + Saber Ser × 0.25

Donde cada dimensión pondera sus niveles:
  N1 (Básico)    × 0.25
  N2 (Intermedio) × 0.35
  N3 (Avanzado)   × 0.40
```

---

## 📁 Exportación para SPSS

El panel de administración (`/admin/`) permite descargar un CSV con las siguientes variables para IBM SPSS:

- `nota_saber`, `nota_saber_n1`, `nota_saber_n2`, `nota_saber_n3`
- `nota_saber_hacer`, `nota_saber_hacer_n1`, `nota_saber_hacer_n2`, `nota_saber_hacer_n3`
- `nota_saber_ser`, `nota_saber_ser_n1`, `nota_saber_ser_n2`, `nota_saber_ser_n3`
- `nota_final` (promedio ponderado 0-20)
- `interacciones_ia`, `tiempo_promedio_ms`, `respuestas_al_azar`
- `xp`, `modulo_alcanzado`

---

## 🛠️ Stack Tecnológico

| Componente | Tecnología |
|---|---|
| Backend | Python 3.14, FastAPI, Uvicorn |
| Base de datos | SQLite + SQLAlchemy (async) |
| Plantillas | Jinja2 |
| IA | Gemini 2.0 Flash, Groq, Mistral, Meta/Together |
| Frontend | HTML5 + CSS3 (glassmorphism) + JavaScript vanilla |
| Sonido | Web Audio API (sintetizado) |
| Contenedor | Docker |

---

## 📄 Licencia

Proyecto académico — USMP 2026. Todos los derechos reservados.

---

## 👥 Autores

- **Investigador principal**: [Tu nombre]
- **Asesor de tesis**: [Nombre del asesor]
- **Universidad**: Universidad de San Martín de Porres, Lima, Perú
