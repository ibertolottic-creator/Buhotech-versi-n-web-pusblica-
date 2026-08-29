#!/bin/bash
set -e

# Aseguramos que la base de datos exista y esté poblada
echo "Poblando la base de datos..."
python -m seed_data.seed

# Iniciamos la aplicación
echo "Iniciando uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8080
