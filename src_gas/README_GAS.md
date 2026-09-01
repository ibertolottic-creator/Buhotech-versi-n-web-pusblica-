# 🚀 Guía Definitiva de Despliegue en Google Apps Script (GAS)
## Buhotech Labs - Versión Web Gratuita para Investigación Formativa y Tesis

Esta arquitectura permite desplegar el aplicativo completo de investigación formativa de forma **100% gratuita y sin servidores externos** (sin pagar AWS, Render, Docker o PostgreSQL). Todo opera sobre **Google Workspace**, utilizando **Google Sheets** como base de datos en tiempo real y **Google Apps Script (GAS)** como backend y motor de renderizado HTML.

---

## 📑 Índice de Archivos del Proyecto (`src_gas/`)

| Archivo | Tipo en GAS | Función Principal |
| :--- | :---: | :--- |
| **`Code.gs`** | Script | Enrutador principal `doGet(e)`, autenticación, endpoints RPC de respuestas, telemetría y desbloqueo de fases. |
| **`Database.gs`** | Script | Controlador CRUD sobre Google Sheets con `LockService` ultrarrápido (80ms), cálculo de notas vigesimales y banco de preguntas de reserva. |
| **`AI_Orchestrator.gs`** | Script | **RAG Cerrado** de Metodología de la Investigación con respuestas breves (máx 2-3 oraciones), socráticas y motor autónomo de respaldo sin caídas. |
| **`styles.html`** | HTML | Hoja de estilos CSS global (tema oscuro Duolingo, glassmorphism, responsive, microanimaciones y efectos visuales). |
| **`login.html`** | HTML | Pantalla de bienvenida, registro y login de participantes. |
| **`dashboard.html`** | HTML | Hub principal del estudiante con vidas, XP, racha, ruta formativa (Fases 1, 2 y 3) y acceso a boleta oficial. |
| **`lesson.html`** | HTML | Módulo interactivo de la Fase 1 (Saber) con infografías interactivas, barra de progreso, efectos de audio y preguntas tipo Duolingo. |
| **`workshop.html`** | HTML | Taller de redacción de la Fase 2 (Saber Hacer) en pantalla dividida con botón **"Pedir revisión a Buhotech"** y chat socrático asistido por IA. |
| **`grades.html`** | HTML | Boleta de calificaciones oficial con desglose por dimensiones y deducción de puntos en contra. |

---

## Paso 1: Configurar la Base de Datos (Google Sheets)

1. Abre [Google Sheets](https://sheets.new) para crear una nueva hoja de cálculo.
2. Nómbrala como **`Buhotech Labs DB`**.
3. Crea las siguientes **7 pestañas** asegurándote de pegar en la **Fila 1 (celda A1)** los encabezados exactos:

### 1. Pestaña `users`
```tsv
id	username	role	xp	hearts	streak_days	unlocked_module	last_played	created_at	pasted_text_count	infographic_views
```

### 2. Pestaña `questions`
```tsv
id	dimension	level	phase	phase_number	question_type	text	options	correct_answer	image_filename	min_reading_time_ms	expected_time_ms	verification_text	rescue_text	weight
```
*(Nota: Si dejas esta hoja vacía, el sistema cargará automáticamente el banco de preguntas semilla integrado en `Database.gs`).*

### 3. Pestaña `user_responses`
```tsv
id	user_id	question_id	selected_answer	is_correct	response_time_ms	failed_attempts	behavior_flag	dimension	level	feedback_type	timestamp
```

### 4. Pestaña `socratic_sessions`
```tsv
id	user_id	messages	ai_provider	ai_model	total_latency_ms	total_interactions	topic	created_at	updated_at
```

### 5. Pestaña `workshop_submissions`
```tsv
id	user_id	workshop_type	submission_data	ai_feedback	grade	ai_provider	latency_ms	timestamp
```

### 6. Pestaña `dilemma_responses`
```tsv
id	user_id	question_id	choice	justification	ai_feedback	is_ethical	timestamp
```

### 7. Pestaña `competency_grades` (Matriz Consolidada de Tesis - 1 Fila por Alumno)
```tsv
id	user_id	username	saber_grade	saber_hacer_grade	saber_ser_grade	final_grade_20	actitudinal_penalty	fast_random_count	pasted_count	total_failed_attempts	avg_response_time_ms	total_questions_answered	total_correct	total_socratic_interactions	calculated_at
```

---

## Paso 2: Crear el Proyecto en Google Apps Script

1. Estando dentro de tu hoja `Buhotech Labs DB`, ve al menú superior: **Extensiones > Apps Script**.
2. Nombra el proyecto como **`Buhotech Server`**.
3. Crea cada uno de los archivos listados en el índice:
   - Los **`.gs`** con la opción **+ > Secuencia de comandos**.
   - Los **`.html`** con la opción **+ > HTML**.
4. Pega el código correspondiente desde la carpeta `src_gas/`.

---

## Paso 3: Configurar Propiedades de Script (Seguridad)

1. En el editor de Apps Script, ve al menú lateral izquierdo: ⚙️ **Configuración del proyecto**.
2. En la sección **Propiedades del script**, haz clic en **Añadir propiedad del script** para definir:
   - `SPREADSHEET_ID`: El ID de tu hoja de cálculo (cadena de caracteres entre `/d/` y `/edit` en la URL de tu Google Sheet).
   - `GEMINI_API_KEY`: Tu clave gratuita de Google AI Studio (opcional, si no se incluye, el sistema usará el motor RAG local cerrado sin caídas).
   - `GROQ_API_KEY`: Tu clave de Groq Cloud (opcional).

---

## Paso 4: Implementación Web

1. Arriba a la derecha, haz clic en **Implementar > Nueva implementación**.
2. Selecciona el tipo **Aplicación web** (ícono del engranaje ⚙️).
3. Configuración obligatoria:
   - **Descripción**: Versión Oficial Tesis
   - **Ejecutar como**: `Yo (tu_cuenta@gmail.com)`
   - **Quién tiene acceso**: `Cualquier persona`
4. Haz clic en **Implementar**, concede los permisos de lectura de Google Sheets y copia la **URL de la aplicación web**.

---

## 🔬 Telemetría y Análisis Estadístico para la Tesis (SPSS / Excel)

El sistema genera una matriz limpia y lista para contrastación de hipótesis en la pestaña **`competency_grades`**:
- **Escala Vigesimal Oficial (0 a 20):** `final_grade_20 = max(0, (saber * 0.50 + saber_hacer * 0.50) - actitudinal_penalty)`
- **Sanción Actitudinal (Puntos en Contra):** Deduce hasta un máximo de 10 puntos por decisiones no éticas, intentos de copia/pega y respuestas al azar impulsivas (< 2s). Bonifica con hasta +4 puntos si el estudiante consulta las infografías de repaso.
- **Rigor Psicométrico:** Cada participante cuenta con **exactamente una fila** consolidada, ideal para pruebas de correlación (Pearson / Spearman) y comparación de medias (T-Student o Wilcoxon).
