# 📚 Documentación Técnica y Metodológica de Buhotech Labs
## Versión Desplegable en Google Apps Script (GAS) para Publicación Web Gratuita

---

### 1. Resumen Ejecutivo
El presente documento describe la arquitectura, lógica de evaluación psicométrica y motor de inteligencia artificial de **Buhotech Labs** adaptado para operar en infraestructura 100% gratuita y sin servidores mediante **Google Workspace (Google Sheets + Google Apps Script)**.

Esta versión permite la recolección de datos empíricos para la investigación formativa y tesis universitaria sin incurrir en costos de hosting, servidores Docker o bases de datos SQL dedicadas, soportando la concurrencia de hasta 70 participantes simultáneos mediante bloqueos optimizados de fila de cabecera (`LockService`).

---

### 2. Dimensiones de Competencia Investigativa y Modelo Matemático

El sistema evalúa tres dimensiones fundamentales de la competencia científica en escala vigesimal peruana (**0 a 20**):

#### A. Dimensión Cognitiva (Saber)
- Basada en preguntas conceptuales ordenadas por niveles taxonómicos de Bloom / Marzano:
  - **Nivel 1 (Conocimiento):** Ponderación del 25%.
  - **Nivel 2 (Comprensión):** Ponderación del 35%.
  - **Nivel 3 (Aplicación):** Ponderación del 40%.
$$\text{Nota Saber} = (\text{Nivel}_1 \times 0.25) + (\text{Nivel}_2 \times 0.35) + (\text{Nivel}_3 \times 0.40)$$

#### B. Dimensión Procedimental (Saber Hacer)
- Integrada por ejercicios de consistencia lógica (`MATCH`, `FILL_BLANK`, `SORT`) y el **Taller Metodológico de Redacción** (`workshop.html`).
- Evalúa la coherencia entre Problema, Objetivos, Hipótesis, Variables y Métodos:
$$\text{Nota Saber Hacer} = (\text{Promedio Cuestionarios} \times 0.60) + (\text{Taller de Redacción} \times 0.40)$$

#### C. Dimensión Actitudinal (Saber Ser) y Puntos en Contra
- Evalúa dilemas éticos (`SCENARIO` y `HONESTY`) combinados con **telemetría pasiva**:
  - **Decisiones no éticas en dilemas:** 3.0 puntos en contra cada una.
  - **Intentos de copiar y pegar (plagio de texto):** 2.0 puntos en contra cada uno.
  - **Respuestas impulsivas al azar (< 2 segundos):** 1.0 punto en contra (con 1 intento de gracia).
  - **Bonificación formativa:** +0.5 puntos a favor por cada consulta a las infografías científicas (máximo 4.0 puntos recuperables).
  - **Tope de sanción:** Máximo 10.0 puntos de deducción directa.

#### D. Nota Final Vigesimal Oficial de Tesis
$$\text{Nota Final} = \max\left(0, (\text{Nota Saber} \times 0.50 + \text{Nota Saber Hacer} \times 0.50) - \text{Sanción Actitudinal}\right)$$

---

### 3. Matriz Consolidada de 1 Fila por Alumno (Para SPSS / Excel / R)

En la pestaña **`competency_grades`** de Google Sheets, el sistema mantiene **exactamente un registro por cada participante**, actualizándolo automáticamente con cada avance sin duplicar filas:

```tsv
id	user_id	username	saber_grade	saber_hacer_grade	saber_ser_grade	final_grade_20	actitudinal_penalty	fast_random_count	pasted_count	total_failed_attempts	avg_response_time_ms	total_questions_answered	total_correct	total_socratic_interactions	calculated_at
```

Esta estructura está diseñada específicamente para importación directa en **IBM SPSS Statistics**, permitiendo calcular:
- Coeficientes de confiabilidad (Alfa de Cronbach).
- Correlaciones bivariadas (Pearson o Spearman) entre tiempo de reflexión y rendimiento.
- Comparaciones pre-test / post-test (T-Student o Prueba de Rangos de Wilcoxon).

---

### 4. Sistema RAG Cerrado (Inteligencia Artificial Metodológica)

El archivo **`AI_Orchestrator.gs`** implementa un modelo de **RAG Cerrado (Retrieval-Augmented Generation)** con 4 restricciones fundamentales:
1. **Confinamiento Temático:** Únicamente analiza temas de Metodología de la Investigación (Planteamiento del problema en embudo, Objetivos e Hipótesis, Variables y Operacionalización, y Diseños metodológicos). Cualquier otra consulta es amablemente reorientada al marco de la tesis.
2. **Máxima Brevedad:** Respuestas limitadas a un máximo de 2 a 3 oraciones directas para evitar sobrecarga cognitiva.
3. **Andamiaje Socrático:** No redacta la tesis por el alumno ni brinda respuestas terminadas; formula preguntas guía que orientan el juicio crítico del investigador.
4. **Motor Local Autónomo de Respaldo:** Si la API externa (Gemini/Groq) no está configurada o se queda sin cuota, el sistema activa automáticamente su **motor RAG local por reglas semánticas**, garantizando que el estudiante siempre reciba orientación socrática sin interrupciones ni pantallas de error.

---

### 5. Distribución de Activos e Infografías Científicas

Las infografías se sirven en alta definición directamente desde el CDN de GitHub (`main/Imagenes/`) para evitar el consumo de ancho de banda o límites de cuota de Google Drive:
- **Planteamiento del Problema:** `Buhotech - Metodo del Embudo.png`
- **Objetivos e Hipótesis:** `pregunta_objetivos_hipotesis_infografia.jpg`
- **Variables y Operacionalización:** `Operacionalización_de_la_Variable.png`
- **Diseño Metodológico:** `Diseños Metodològicos.png`

---

### 6. Estructura de Archivos del Módulo `src_gas/`

```
src_gas/
├── Code.gs                    # Backend principal y funciones RPC
├── Database.gs                # Operaciones CRUD sobre Google Sheets y cálculo de notas
├── AI_Orchestrator.gs         # RAG Cerrado socrático con motor local de respaldo
├── styles.html                # Sistema de diseño Duolingo/Glassmorphism en Vanilla CSS
├── login.html                 # Pantalla de registro e inicio de sesión
├── dashboard.html             # Hub de módulos y visualización de progreso
├── lesson.html                # Entrenamiento cognitivo interactivo (Fase 1)
├── workshop.html              # Taller metodológico de redacción asistida por IA (Fase 2)
├── grades.html                # Boleta oficial de calificaciones y telemetría de tesis
├── README_GAS.md              # Manual de despliegue paso a paso
├── questions_seed.json        # Banco original de preguntas en formato JSON
└── questions_for_sheet.tsv    # Banco de preguntas listo para pegar en Google Sheets
```
