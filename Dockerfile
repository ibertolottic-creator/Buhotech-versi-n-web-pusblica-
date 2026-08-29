FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código fuente
COPY app/ app/
COPY seed_data/ seed_data/
COPY Imagenes/ Imagenes/

# Copiar script de inicio
COPY start.sh .
RUN chmod +x start.sh

# Exponer puerto
EXPOSE 8080

# Comando de inicio
CMD ["./start.sh"]
