# Buhotech Labs - Plataforma de Investigación Formativa

Buhotech Labs es una plataforma educativa diseñada para medir el impacto de la Inteligencia Artificial (andamiaje socrático vs. automatización) en la investigación formativa universitaria, usando un diseño cuasiexperimental de 40 minutos. Evalúa tres dimensiones clave: **Saber (Cognitiva)**, **Saber Hacer (Procedimental)** y **Saber Ser (Actitudinal)**.

## Características Principales

1. **Evaluación Cognitiva (Saber)**
   - Fase 1: Entrenamiento conceptual con preguntas de opción múltiple, emparejamiento (Matriz de Consistencia) y rellenado de espacios.
   - Retroalimentación en tiempo real si el estudiante se equivoca.

2. **Evaluación Procedimental (Saber Hacer)**
   - Fase 2: Taller de redacción interactivo guiado por el Búho Metodólogo (Orquestador de IA múltiple: OpenAI, Groq, OpenRouter).
   - El estudiante redacta un ejemplo del planteamiento de un problema, objetivos e hipótesis, operacionalización de variables y diseño metodológico.
   - El asistente no da respuestas, usa preguntas socráticas para invitar a la reflexión.
   - Las respuestas de los estudiantes son guardadas para que el docente (o la IA) evalúen.

3. **Evaluación Actitudinal (Saber Ser)**
   - Fase 3: Laboratorio Ético con dilemas morales.
   - Telemetría oculta: el sistema detecta intentos de trampa (copiar y pegar de la IA) y respuestas compulsivas (adivinar antes del tiempo mínimo de lectura).
   - Penalidad Actitudinal: Resta puntos directos del promedio (hasta -10 pts) por plagio o respuestas impulsivas.
   - Bonificación Actitudinal: Si el estudiante revisa proactivamente las infografías del taller metodológico, recupera +0.5 puntos por vez (máximo +4 pts).

4. **Boleta de Notas Oficial**
   - El estudiante puede descargar su reporte final en formato PDF ("Ver / Imprimir Boleta Oficial").
   - La boleta incluye los resultados del desempeño cognitivo, procedimental y el reporte actitudinal, detallando las sanciones por intento de plagio (si las hubo).
   - También imprime los textos completos del taller procedimental en una tabla para que el docente pueda validarlos.

5. **Panel del Investigador (Descarga SPSS)**
   - Al iniciar sesión con el usuario `admin`, serás redirigido al panel de control (Dashboard de Administrador).
   - Desde ahí puedes visualizar en tiempo real el progreso de los estudiantes.
   - Permite **Descargar CSV para SPSS**, generando un Dataset listo para importar a software estadístico, con doble encabezado (nombre de variable y etiqueta larga de la pregunta). Las variables del taller están recortadas a un máximo de 100 palabras.

## Requisitos
- Python 3.10+
- Claves de API para al menos un proveedor de IA (OpenAI, Groq, o cualquier modelo vía OpenRouter).

## Instalación y Ejecución Local

1. Instalar dependencias:
```bash
python -m venv .venv
source .venv/bin/activate  # En Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

2. Configurar variables de entorno copiando el archivo de ejemplo:
```bash
cp .env.example .env
```
Edita `.env` con tus API keys de IA.

3. Ejecutar el servidor (reinicia y puebla la base de datos):
```bash
./start.sh
```
O manualmente:
```bash
python seed_data/seed.py
python -m uvicorn app.main:app --host 127.0.0.1 --port 8080
```

## Despliegue en Google Cloud Run

Para instrucciones detalladas sobre cómo subir esta aplicación a Google Cloud Run, habilitando persistencia de datos (Cloud Storage FUSE) para evitar que la base de datos se borre al reiniciar el servidor, lee el archivo **[DEPLOY.md](./DEPLOY.md)** incluido en el proyecto.
