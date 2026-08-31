# Especificaciones Técnicas y Requerimientos de Despliegue (Buhotech Labs)

Este documento detalla la arquitectura, el stack tecnológico y las consideraciones de infraestructura necesarias para desplegar la aplicación "Buhotech Labs" en Amazon Web Services (AWS).

---

## 1. Stack Tecnológico (¿En qué está hecho?)

La aplicación es un monolito moderno diseñado para ser ligero y rápido:

*   **Backend (Lógica y Servidor):** Python 3.10+ utilizando el framework **FastAPI**. El servidor web es **Uvicorn** (ASGI).
*   **Frontend (Interfaz de Usuario):** HTML5 puro, Vanilla CSS y JavaScript sin frameworks pesados. Las vistas se renderizan desde el servidor utilizando motores de plantillas **Jinja2**.
*   **Base de Datos:** **SQLite** (`buhotech.db`). La conexión a la base de datos es asíncrona mediante `aiosqlite` y `SQLAlchemy`.
*   **Integración IA:** El sistema actúa como un "Orquestador de IA" que realiza peticiones HTTP (salientes) a APIs externas (OpenAI, Groq, OpenRouter).

---

## 2. Consideraciones Críticas para AWS (Importante)

El punto más importante para el despliegue es el manejo de la base de datos. Al usar **SQLite**, toda la información (usuarios, notas, telemetría) se guarda en un archivo físico (`buhotech.db`) en el directorio raíz de la aplicación.

### ⚠️ Persistencia de Datos
Si el aplicativo se despliega en contenedores efímeros (como ECS Fargate o AWS App Runner sin volúmenes persistentes), **la base de datos se borrará cada vez que el contenedor se reinicie**. 

Para evitar esto, el archivo `buhotech.db` **debe residir en almacenamiento persistente**.

### ⚙️ Variables de Entorno (.env)
La aplicación requiere que se le inyecten las siguientes variables de entorno para funcionar y poder corregir los talleres con IA:
*   `OPENROUTER_API_KEY`
*   `OPENAI_API_KEY`
*   `GROQ_API_KEY`
*   `DATABASE_URL_SYNC=sqlite:///./buhotech.db`
*   `DATABASE_URL_ASYNC=sqlite+aiosqlite:///./buhotech.db`

---

## 3. Opciones de Arquitectura Sugeridas en AWS

Para soportar de manera óptima **120 usuarios concurrentes** (operaciones mayormente de lectura y llamadas asíncronas a APIs) garantizando la persistencia de SQLite, se recomiendan los siguientes enfoques:

### Opción A: AWS EC2 + Docker (Recomendado por simplicidad)
Es la opción más directa y económica.
1.  **Instancia:** Una máquina `t3.micro` o `t3.small` (Ubuntu Server).
2.  **Ejecución:** Clonar el repositorio y levantar el servicio usando el `Dockerfile` incluido en el proyecto.
3.  **Persistencia (El truco):** Al ejecutar el contenedor Docker, se debe mapear el volumen del disco EBS de la instancia EC2 al contenedor para salvaguardar el archivo SQLite. 
    *   Ejemplo: `docker run -d -p 80:8080 -v /home/ubuntu/buhotech_data:/app --env-file .env buhotech-labs`
4.  **Red:** Abrir los puertos 80/443 en el Security Group de la instancia EC2.

### Opción B: AWS Lightsail
Similar a la Opción A pero administrado en el panel simplificado de Lightsail. Se puede usar un contenedor de Lightsail o una máquina virtual estándar con Docker. Mismas consideraciones de mapeo de volumen para SQLite.

### Opción C: AWS Elastic Beanstalk
Se puede subir el código fuente directamente (sin Docker). Beanstalk configurará el entorno Python. 
*   **Cuidado:** Se debe configurar el entorno de Beanstalk para que use una sola instancia (Single Instance mode) en lugar de un clúster auto-escalable. Si escala a múltiples instancias, cada instancia tendrá su propia base de datos SQLite aislada (inconsistencia de datos). Si se requiere auto-scaling real, habría que migrar de SQLite a AWS RDS (PostgreSQL/MySQL), lo cual implicaría refactorizar código. Dado que el experimento dura solo 40 minutos, una sola instancia es suficiente.

---

## 4. Recursos del Repositorio
El repositorio ya cuenta con:
*   `requirements.txt`: Lista completa de dependencias de Python.
*   `Dockerfile`: Configuración lista para crear la imagen del contenedor (expone el puerto 8080).
*   `start.sh`: Script de arranque (opcional).
