# Despliegue en Google Cloud Run para Buhotech Labs

Dado que Buhotech Labs utiliza una base de datos local SQLite (`buhotech.db`), y que **Google Cloud Run** es un entorno que borra su disco cada vez que se reinicia, usaremos **Cloud Storage FUSE**. Esto nos permitirá guardar la base de datos en un "disco" persistente dentro de Google Cloud, para que nunca pierdas las notas de los alumnos, incluso si el servidor se apaga.

## Pasos para Desplegar

### 1. Iniciar sesión con tu cuenta de Google (Correo del Trabajo)
Abre la terminal en tu proyecto y ejecuta este comando para iniciar sesión en Google Cloud:
```bash
gcloud auth login
```
*Se abrirá tu navegador. Inicia sesión con el correo del trabajo y dale los permisos necesarios.*

Luego, asegúrate de estar en el proyecto correcto de Google Cloud (reemplaza `TU_ID_DE_PROYECTO` por el ID real de tu proyecto):
```bash
gcloud config set project TU_ID_DE_PROYECTO
```

### 2. Habilitar las APIs necesarias
Ejecuta el siguiente comando para asegurarte de que tienes los servicios de Cloud Run y Cloud Storage activos:
```bash
gcloud services enable run.googleapis.com storage.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### 3. Crear el Bucket de Google Cloud Storage (Para guardar los datos)
Crearemos un "bucket" (como una carpeta en la nube) donde vivirá la base de datos de manera persistente.
Reemplaza `mi-buhotech-bucket` por un nombre único (como `buhotech-db-bucket-tuapellido`):
```bash
gcloud storage buckets create gs://mi-buhotech-bucket --location=us-central1
```

### 4. Configurar las Variables de Entorno y las APIs de IA
Buhotech Labs necesita conectarse a la IA. Debes tener a la mano tus API Keys. Crearemos un archivo en Google Cloud Secret Manager o pasaremos las variables de entorno directo. La forma más sencilla para Cloud Run es pasarlas en el comando de despliegue.

### 5. Desplegar la Aplicación en Cloud Run
El siguiente comando hará tres cosas:
1. Construirá tu aplicación (usando tu `Dockerfile`).
2. Montará el "bucket" que creaste en la carpeta `/app/data` usando FUSE.
3. Inyectará tus API Keys para que la IA funcione.

*Asegúrate de reemplazar `mi-buhotech-bucket` por el nombre que elegiste, y pega tus verdaderas API keys donde dice `TU_CLAVE`.*

```bash
gcloud run deploy buhotech-labs \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --execution-environment gen2 \
  --add-volume=name=db-vol,type=cloud-storage,bucket=mi-buhotech-bucket \
  --add-volume-mount=volume=db-vol,mount-path=/app \
  --set-env-vars="OPENROUTER_API_KEY=TU_CLAVE_DE_OPENROUTER,OPENAI_API_KEY=TU_CLAVE_DE_OPENAI,GROQ_API_KEY=TU_CLAVE_DE_GROQ,DATABASE_URL_SYNC=sqlite:////app/buhotech.db,DATABASE_URL_ASYNC=sqlite+aiosqlite:////app/buhotech.db"
```

> **Nota sobre la ruta de la base de datos:** Al pasar `--set-env-vars="DATABASE_URL_SYNC=sqlite:////app/buhotech.db"`, le estamos diciendo al código que guarde el archivo `buhotech.db` directamente en la carpeta `/app` montada en el bucket FUSE, para que los datos sobrevivan a los reinicios del servidor.

### 6. ¡Listo!
Al finalizar, la terminal te devolverá una URL pública (ejemplo: `https://buhotech-labs-xyz123.a.run.app`). Entrégales este enlace a tus alumnos para que ingresen.

### 7. Ver o Descargar la Base de Datos
Para descargar el Excel (CSV) para SPSS, solo necesitas entrar al enlace de tu aplicación, iniciar sesión con el usuario **`admin`**, y te redireccionará automáticamente al Panel del Investigador, donde verás el gran botón de **"Descargar CSV para SPSS"**.
