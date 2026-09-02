/**
 * Database.gs
 * Maneja todas las interacciones con Google Sheets usando LockService 
 * para evitar colisiones de escritura.
 */

// Si no se define, se usará la hoja activa (Script vinculado a un Google Sheet)
// En caso de ser independiente, deberemos cambiar esto a SpreadsheetApp.openById("ID_DEL_SHEET")
const SPREADSHEET_ID = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");

const SHEET_SCHEMAS = {
  Evaluacion_Consolidada: [
    "id_usuario",
    "estudiante",
    "fecha_evaluacion",
    "nota_saber_conocer_20",
    "preguntas_cognitivas_respondidas",
    "respuestas_cognitivas_correctas",
    "porcentaje_aciertos_cognitivo",
    "nota_saber_hacer_20",
    "taller_1_planteamiento_problema",
    "taller_2_objetivos_hipotesis",
    "taller_3_variables_operacionalizacion",
    "taller_4_diseno_metodologico",
    "nota_saber_ser_20",
    "veces_marcado_rapido_azar",
    "descuento_marcado_rapido_pts",
    "intentos_copiar_pegar",
    "descuento_copiar_pegar_pts",
    "descuento_total_saber_ser",
    "nota_final_tesis_20",
    "estado"
  ],
  users: ["id", "username", "role", "xp", "hearts", "streak_days", "unlocked_module", "last_played", "created_at", "pasted_text_count", "infographic_views"],
  user_responses: ["id", "user_id", "question_id", "selected_answer", "is_correct", "response_time_ms", "failed_attempts", "behavior_flag", "dimension", "level", "feedback_type", "timestamp"],
  questions: ["id", "dimension", "level", "phase", "phase_number", "question_type", "text", "options", "correct_answer", "image_filename", "min_reading_time_ms", "expected_time_ms", "verification_text", "rescue_text", "weight"]
};

function getSpreadsheet() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Obtiene o crea de forma automática una pestaña con sus encabezados oficiales si no existiera.
 */
function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  const normTarget = String(sheetName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
  const sheets = ss.getSheets();
  let sheet = null;
  for (let i = 0; i < sheets.length; i++) {
    const s = sheets[i];
    const sNorm = String(s.getName()).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s_-]+/g, "");
    if (sNorm === normTarget) {
      sheet = s;
      break;
    }
  }

  const defaultHeaders = SHEET_SCHEMAS[sheetName] || ["id", "user_id", "timestamp"];
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    try { sheet.setFrozenRows(1); } catch(e) {}
  } else {
    // Si la hoja ya existía pero está completamente vacía (0 filas o 0 columnas)
    if (sheet.getLastRow() === 0 || sheet.getLastColumn() === 0) {
      sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
      try { sheet.setFrozenRows(1); } catch(e) {}
    }
  }
  return sheet;
}

const _REQUEST_CACHE = {};

/**
 * Obtiene todos los registros de una hoja como una lista de objetos.
 * Utiliza caché en memoria para peticiones concurrentes de la misma ejecución.
 */
function getRecords(sheetName) {
  if (_REQUEST_CACHE[sheetName]) {
    return _REQUEST_CACHE[sheetName];
  }

  const sheet = getOrCreateSheet(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (!data || data.length <= 1) return [];
  
  // Limpiar y recortar espacios en los encabezados
  const rawHeaders = data[0];
  if (!rawHeaders || !rawHeaders.length) return [];
  const headers = rawHeaders.map(h => String(h || '').trim());
  
  const records = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const record = {};
    for (let j = 0; j < headers.length; j++) {
      const colName = headers[j];
      if (colName) {
        record[colName] = row[j];
      }
    }
    // Guardar el número de fila real (base 1)
    record._rowNumber = i + 1;
    records.push(record);
  }
  
  _REQUEST_CACHE[sheetName] = records;
  return records;
}

/**
 * Inserta un nuevo registro de forma segura usando LockService.
 */
function insertRecord(sheetName, recordObj) {
  delete _REQUEST_CACHE[sheetName];
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    Logger.log("insertRecord: No se obtuvo lock para " + sheetName);
    return false;
  }
  
  try {
    const sheet = getOrCreateSheet(sheetName);
    if (!sheet) return false;
    
    const lastCol = sheet.getLastColumn() || 1;
    const headersRange = sheet.getRange(1, 1, 1, lastCol).getValues();
    if (!headersRange || !headersRange[0]) return false;
    const headers = headersRange[0].map(h => String(h || '').trim());
    
    const newRow = [];
    for (let i = 0; i < headers.length; i++) {
      const colName = headers[i];
      let value = recordObj[colName];
      if (value === undefined) {
        const lowerCol = colName.toLowerCase();
        for (const k in recordObj) {
          if (k.toLowerCase().trim() === lowerCol) {
            value = recordObj[k];
            break;
          }
        }
      }
      if (value === undefined || value === null) value = "";
      if (typeof value === 'object') {
        value = JSON.stringify(value);
      }
      newRow.push(value);
    }
    
    sheet.appendRow(newRow);
    delete _REQUEST_CACHE[sheetName];
    return true;
  } catch(err) {
    Logger.log("Error en insertRecord(" + sheetName + "): " + err.toString());
    return false;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Actualiza un registro existente buscando por ID u otra llave.
 * Optimizado para escribir en 1 sola llamada batch sin congelar el script.
 */
function updateRecord(sheetName, keyColumn, keyValue, updatesObj) {
  delete _REQUEST_CACHE[sheetName];
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    Logger.log("updateRecord: No se obtuvo lock para " + sheetName);
    return false;
  }
  
  try {
    const sheet = getOrCreateSheet(sheetName);
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    if (!data || data.length <= 1) return false;
    const headers = data[0].map(h => String(h || '').trim());
    
    const targetKey = String(keyColumn).toLowerCase().trim();
    let keyIndex = headers.indexOf(keyColumn);
    if (keyIndex === -1) {
      keyIndex = headers.findIndex(h => h.toLowerCase() === targetKey);
    }
    if (keyIndex === -1) {
      Logger.log("Columna de llave " + keyColumn + " no encontrada en " + sheetName);
      return false;
    }
    
    const targetVal = String(keyValue || '').trim();
    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][keyIndex] || '').trim() === targetVal) {
        rowIndex = i;
        break;
      }
    }
    
    if (rowIndex === -1) return false; // No se encontró
    
    // Actualización ultra-rápida en memoria y 1 solo setValues batch:
    const rowValues = data[rowIndex].slice();
    for (const key in updatesObj) {
      const lowerKey = key.toLowerCase().trim();
      let colIndex = headers.indexOf(key);
      if (colIndex === -1) {
        colIndex = headers.findIndex(h => h.toLowerCase() === lowerKey);
      }
      if (colIndex !== -1) {
        let value = updatesObj[key];
        if (typeof value === 'object') value = JSON.stringify(value);
        rowValues[colIndex] = value;
      }
    }
    
    sheet.getRange(rowIndex + 1, 1, 1, rowValues.length).setValues([rowValues]);
    delete _REQUEST_CACHE[sheetName];
    return true;
  } catch(err) {
    Logger.log("Error en updateRecord(" + sheetName + "): " + err.toString());
    return false;
  } finally {
    lock.releaseLock();
  }
}

/**
 * Encuentra un registro por columna de forma flexible
 */
function findRecordBy(sheetName, keyColumn, keyValue) {
  const records = getRecords(sheetName);
  const targetKey = String(keyColumn).toLowerCase().trim();
  const targetVal = String(keyValue || '').trim();
  return records.find(r => {
    if (String(r[keyColumn] || '').trim() === targetVal) return true;
    for (const k in r) {
      if (k.toLowerCase().trim() === targetKey && String(r[k] || '').trim() === targetVal) {
        return true;
      }
    }
    return false;
  }) || null;
}

function findRecordsBy(sheetName, keyColumn, keyValue) {
  const records = getRecords(sheetName);
  const targetKey = String(keyColumn).toLowerCase().trim();
  const targetVal = String(keyValue || '').trim();
  return records.filter(r => {
    if (String(r[keyColumn] || '').trim() === targetVal) return true;
    for (const k in r) {
      if (k.toLowerCase().trim() === targetKey && String(r[k] || '').trim() === targetVal) {
        return true;
      }
    }
    return false;
  });
}

/**
 * Obtiene las entregas de taller del estudiante leyendo directamente de Evaluacion_Consolidada.
 */
function getUserWorkshopSubmissions(userId) {
  try {
    const master = findRecordBy("Evaluacion_Consolidada", "id_usuario", userId);
    if (!master) return [];

    const p = String(master.taller_1_planteamiento_problema || '').trim();
    const o = String(master.taller_2_objetivos_hipotesis || '').trim();
    const v = String(master.taller_3_variables_operacionalizacion || '').trim();
    const m = String(master.taller_4_diseno_metodologico || '').trim();

    const isPending = (t) => !t || t.includes("Pendiente");
    if (isPending(p) && isPending(o) && isPending(v) && isPending(m)) {
      return [];
    }

    return [{
      id: master.id_usuario,
      workshop_type: "Fase 2 - Redaccion",
      submission_data: {
        planteamiento: isPending(p) ? "" : p,
        objetivos: isPending(o) ? "" : o,
        variables: isPending(v) ? "" : v,
        metodologia: isPending(m) ? "" : m
      },
      ai_feedback: "Validado en Evaluación Consolidada",
      grade: master.nota_saber_hacer_20 || 18.0,
      ai_provider: "Búho Socrático",
      timestamp: master.fecha_evaluacion
    }];
  } catch(e) {
    Logger.log("Error en getUserWorkshopSubmissions: " + e.toString());
    return [];
  }
}

// -------------------------------------------------------------
// Funciones Específicas del Dominio (Buhotech)
// -------------------------------------------------------------

function getUserByUsername(username) {
  return findRecordBy("users", "username", username);
}

function getUserById(userId) {
  return findRecordBy("users", "id", userId);
}

function createUser(username) {
  const existing = getUserByUsername(username);
  if (existing) return existing;
  
  const userId = Utilities.getUuid();
  const newUser = {
    id: userId,
    username: username,
    role: "student",
    xp: 0,
    hearts: 20,
    streak_days: 0,
    unlocked_module: 1,
    last_played: new Date().toISOString(),
    created_at: new Date().toISOString(),
    pasted_text_count: 0,
    infographic_views: 0
  };
  
  insertRecord("users", newUser);
  return newUser;
}

function saveUserResponse(responseObj) {
  responseObj.timestamp = new Date().toISOString();
  if (!responseObj.id) responseObj.id = Utilities.getUuid();
  insertRecord("user_responses", responseObj);
}

function saveSocraticMessage(userId, aiProvider, aiModel, userMsg, aiMsg, topic) {
  // Operación liviana en memoria: evita saturar Google Sheets con cada mensaje del chat
  Logger.log(`[Socratic Chat] User: ${userId}, Topic: ${topic}, Provider: ${aiProvider}`);
}

function saveWorkshopSubmission(userId, workshopType, submissionData, aiFeedback, grade, aiProvider) {
  // Registro directo en Evaluacion_Consolidada
  Logger.log(`[Workshop Submissions] User: ${userId}, Type: ${workshopType}`);
}



/**
 * Obtiene las preguntas para una fase específica.
 * Lee desde la hoja 'questions' si existe y tiene datos; si no, usa el banco base.
 */
function getQuestionsForPhase(phaseNumber) {
  phaseNumber = parseInt(phaseNumber || 1);
  try {
    const sheetQuestions = getRecords('questions');
    if (sheetQuestions && sheetQuestions.length > 0) {
      const filtered = sheetQuestions.filter(q => parseInt(q.phase_number) === phaseNumber);
      if (filtered.length > 0) {
        return filtered.map(q => {
          let opts = q.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch(e) { opts = []; }
          }
          return {
            id: q.id,
            text: q.text,
            options: opts,
            correct_answer: q.correct_answer,
            image_filename: q.image_filename,
            min_reading_time_ms: parseInt(q.min_reading_time_ms || 3000),
            expected_time_ms: parseInt(q.expected_time_ms || 10000),
            verification_text: q.verification_text,
            rescue_text: q.rescue_text,
            phase: q.phase,
            dimension: q.dimension,
            level: parseInt(q.level || 1),
            question_type: q.question_type
          };
        });
      }
    }
  } catch(e) {
    console.warn('Error leyendo hoja questions:', e);
  }
  
  // Banco de respaldo garantizado
  const SEED_QUESTIONS = [
  {
    "id": "4fe225e3-9596-450b-94f1-0b16e9c2fd17",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Qué significa investigar científicamente?",
    "options": [
      {
        "id": "A",
        "text": "Buscar nuevos conocimientos o soluciones a un problema de forma sistemática."
      },
      {
        "id": "B",
        "text": "Copiar información de un libro para presentarla en clase."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - Conocimiento Científico.png",
    "min_reading_time_ms": 2000,
    "expected_time_ms": 7000,
    "verification_text": "¡Correcto! Investigar es un proceso sistemático para descubrir algo nuevo o resolver dudas.",
    "rescue_text": "Recuerda que la investigación no es solo copiar, sino crear nuevo conocimiento.",
    "weight": 1.0
  },
  {
    "id": "51758155-52f2-4218-8087-dfbae0340919",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Para qué sirve hacer una tesis?",
    "options": [
      {
        "id": "A",
        "text": "Para demostrar que puedes investigar y resolver un problema real de tu carrera."
      },
      {
        "id": "B",
        "text": "Únicamente para cumplir un trámite y archivar el documento en la biblioteca."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - Conocimiento Científico.png",
    "min_reading_time_ms": 2000,
    "expected_time_ms": 7000,
    "verification_text": "¡Exacto! Una tesis demuestra tu capacidad para aplicar la ciencia a problemas reales.",
    "rescue_text": "Una tesis es tu aporte profesional a la sociedad, no solo un trámite.",
    "weight": 1.0
  },
  {
    "id": "00332bd0-7dc8-4517-b09a-fde55f33b9f3",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Qué propósito principal tiene la 'Justificación' en una investigación?",
    "options": [
      {
        "id": "A",
        "text": "Explicar por qué es importante hacer el estudio y a quiénes va a beneficiar."
      },
      {
        "id": "B",
        "text": "Copiar las conclusiones de otros autores para que el trabajo se vea más largo."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech  - JUSTIFICACIÓN.png",
    "min_reading_time_ms": 2000,
    "expected_time_ms": 7000,
    "verification_text": "¡Excelente! La justificación convence al lector de que el trabajo vale la pena.",
    "rescue_text": "Recuerda: justificar es dar razones válidas de por qué tu trabajo es útil o necesario.",
    "weight": 1.0
  },
  {
    "id": "8f491660-b987-4d2e-99d6-3bc96ad11ef7",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Qué es un problema de investigación?",
    "options": [
      {
        "id": "A",
        "text": "Una dificultad o duda teórica o práctica que necesita ser resuelta mediante el método científico."
      },
      {
        "id": "B",
        "text": "Una tarea o resumen que el profesor deja para la casa."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
    "min_reading_time_ms": 2000,
    "expected_time_ms": 7000,
    "verification_text": "¡Correcto! Un problema de investigación es el punto de partida que requiere investigación estructurada.",
    "rescue_text": "Recuerda que la investigación científica busca resolver vacíos de conocimiento.",
    "weight": 1.0
  },
  {
    "id": "20947e5d-a270-4787-b002-069998eac0ab",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Cuál es el primer paso clave al iniciar cualquier tesis o investigación científica?",
    "options": [
      {
        "id": "A",
        "text": "Plantear y delimitar el problema de investigación."
      },
      {
        "id": "B",
        "text": "Escribir las conclusiones finales."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
    "min_reading_time_ms": 2000,
    "expected_time_ms": 6000,
    "verification_text": "¡Exacto! No puedes investigar sin tener claro qué problema vas a resolver.",
    "rescue_text": "Si no sabes a dónde vas, ¿cómo podrías llegar? El problema es siempre lo primero.",
    "weight": 1.0
  },
  {
    "id": "06971534-5021-462d-bf36-ce087b2b52aa",
    "dimension": "saber",
    "level": 1,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "El método del embudo para plantear un problema consiste en redactar desde lo general a lo particular. ¿Cuáles son los tres niveles lógicos?",
    "options": [
      {
        "id": "A",
        "text": "Macro, Meso, Micro."
      },
      {
        "id": "B",
        "text": "Introducción, Desarrollo, Conclusión."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - Metodo del Embudo.png",
    "min_reading_time_ms": 2500,
    "expected_time_ms": 8000,
    "verification_text": "Exacto: Macro (Mundial), Meso (Nacional), Micro (Local/Institucional).",
    "rescue_text": "Piensa en el tamaño: desde lo más grande (Macro) hasta lo más pequeño (Micro).",
    "weight": 1.0
  },
  {
    "id": "8b70d5c3-3420-4abd-89f7-f3e4c9917cf4",
    "dimension": "saber",
    "level": 2,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "¿Cuál de los siguientes es el mejor ejemplo de un **objetivo general** correctamente formulado y medible?",
    "options": [
      {
        "id": "A",
        "text": "Conocer un poco sobre cómo afecta el internet a los niños de hoy."
      },
      {
        "id": "B",
        "text": "Determinar la relación entre el uso de redes sociales y el rendimiento académico en estudiantes de secundaria del Colegio San Marcos (2024)."
      },
      {
        "id": "C",
        "text": "Implementar una campaña para que los jóvenes usen menos el celular."
      }
    ],
    "correct_answer": "B",
    "image_filename": "Buhotech - OBJETIVOS.png",
    "min_reading_time_ms": 4000,
    "expected_time_ms": 15000,
    "verification_text": "Correcto. El verbo 'Determinar' es medible y las variables están delimitadas.",
    "rescue_text": "Busca un verbo medible (Determinar, Analizar) y una delimitación clara.",
    "weight": 1.0
  },
  {
    "id": "04607624-f4ca-498c-a47b-ace59371f7ca",
    "dimension": "saber",
    "level": 2,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MATCH",
    "text": "Empareja cada elemento para mantener la coherencia (Matriz de Consistencia):",
    "options": [
      {
        "id": "1",
        "left": "Problema",
        "right": "¿Existe relación entre X e Y?"
      },
      {
        "id": "2",
        "left": "Objetivo",
        "right": "Determinar la relación entre X e Y."
      },
      {
        "id": "3",
        "left": "Hipótesis",
        "right": "Existe una relación significativa entre X e Y."
      }
    ],
    "correct_answer": "MATCH",
    "image_filename": "Buhotech - Hipótesis.png",
    "min_reading_time_ms": 4000,
    "expected_time_ms": 20000,
    "verification_text": "¡Perfecto! Has comprendido la alineación lógica.",
    "rescue_text": "El problema es pregunta, el objetivo es verbo, la hipótesis es afirmación.",
    "weight": 1.0
  },
  {
    "id": "2d56eb39-002b-4582-be43-b532dc94bc0a",
    "dimension": "saber",
    "level": 2,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "FILL_BLANK",
    "text": "La operacionalización es el proceso de pasar de un concepto abstracto (Variable) a uno medible a través de ______ (componentes temáticos) y ______ (formas de medir).",
    "options": [
      {
        "id": "A",
        "text": "dimensiones / indicadores"
      },
      {
        "id": "B",
        "text": "preguntas / objetivos"
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - VACIADO DE DATOS.png",
    "min_reading_time_ms": 3000,
    "expected_time_ms": 10000,
    "verification_text": "Correcto. Variables -> Dimensiones -> Indicadores.",
    "rescue_text": "Recuerda la jerarquía: Variable -> Dimensión -> Indicador.",
    "weight": 1.0
  },
  {
    "id": "f63d8970-e402-449f-a0f9-cd94be27f10b",
    "dimension": "saber",
    "level": 3,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "Dada la variable 'Rendimiento Académico', ¿cuál es la clasificación correcta?",
    "options": [
      {
        "id": "A",
        "text": "Dimensión: Notas de matemáticas | Indicador: Promedio vigesimal 0-20"
      },
      {
        "id": "B",
        "text": "Dimensión: Promedio vigesimal 0-20 | Indicador: Notas de matemáticas"
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech -  ANÁLISIS ESTADÍSTICO.png",
    "min_reading_time_ms": 4000,
    "expected_time_ms": 15000,
    "verification_text": "Correcto. El indicador siempre es la métrica exacta.",
    "rescue_text": "El indicador es cómo lo mides exactamente (números, rangos).",
    "weight": 1.0
  },
  {
    "id": "23400d6c-7fdc-42a9-9db4-678bf643619a",
    "dimension": "saber",
    "level": 2,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "Si tu investigación busca ver el efecto de aplicar un nuevo software sin un grupo de control, ¿qué tipo de diseño cuantitativo es?",
    "options": [
      {
        "id": "A",
        "text": "Pre-experimental"
      },
      {
        "id": "B",
        "text": "Cuasi-experimental"
      },
      {
        "id": "C",
        "text": "Experimental Puro"
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - INVESTIGACIÓN CUASIEXPERIMENTAL.png",
    "min_reading_time_ms": 3000,
    "expected_time_ms": 15000,
    "verification_text": "Correcto. Sin grupo de control es pre-experimental.",
    "rescue_text": "Revisa el esquema: si no hay grupo de control, es el nivel más básico (pre-experimental).",
    "weight": 1.0
  },
  {
    "id": "7e2ea04e-5f1a-411e-9c70-3accef061295",
    "dimension": "saber",
    "level": 2,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "Si solo vas a observar y recolectar datos en un único momento del tiempo sin manipular nada, tu diseño es...",
    "options": [
      {
        "id": "A",
        "text": "No experimental, Transversal"
      },
      {
        "id": "B",
        "text": "No experimental, Longitudinal"
      },
      {
        "id": "C",
        "text": "Experimental Puro"
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - INVESTIGACIÓN TRANSVERSAL.png",
    "min_reading_time_ms": 3000,
    "expected_time_ms": 15000,
    "verification_text": "Correcto. Transversal significa 'en un solo momento'.",
    "rescue_text": "Si es en un único momento, atraviesa el tiempo una sola vez (Transversal).",
    "weight": 1.0
  },
  {
    "id": "148d099c-077c-4975-9824-50712b87d0d5",
    "dimension": "saber",
    "level": 3,
    "phase": "Fase 1: Entrenamiento Conceptual",
    "phase_number": 1,
    "question_type": "MAIN",
    "text": "De los diseños cualitativos, ¿cuál se enfoca en comprender las experiencias vividas (Fenomenológico) y cuál busca resolver un problema de la comunidad con su participación (Investigación-Acción)?",
    "options": [
      {
        "id": "A",
        "text": "Fenomenológico (Experiencias) / Investigación-Acción (Resolver problema)."
      },
      {
        "id": "B",
        "text": "Fenomenológico (Resolver problema) / Investigación-Acción (Experiencias)."
      }
    ],
    "correct_answer": "A",
    "image_filename": "Buhotech - Fenomenología.png",
    "min_reading_time_ms": 3500,
    "expected_time_ms": 15000,
    "verification_text": "Exacto. Fenomenológico estudia el fenómeno desde la experiencia.",
    "rescue_text": "Fenómeno = Experiencia. Acción = Resolver un problema actuando.",
    "weight": 1.0
  },
  {
    "id": "ecd7195c-c39d-4321-868d-9be8e0ec3127",
    "dimension": "saber_hacer",
    "level": 2,
    "phase": "Fase 2: Aplicación Procedimental",
    "phase_number": 2,
    "question_type": "MATRIX",
    "text": "Matriz de Consistencia Interactiva. Selecciona en los recuadros las opciones correctas para mantener la coherencia horizontal.",
    "options": [],
    "correct_answer": "MATRIX",
    "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
    "min_reading_time_ms": 1000,
    "expected_time_ms": 5000,
    "verification_text": "¡Has completado la Matriz!",
    "rescue_text": "Debes completar la matriz manteniendo la coherencia horizontal.",
    "weight": 1.0
  },
  {
    "id": "cb0cb7ca-449f-44a6-9609-d2e6ecbf362c",
    "dimension": "saber_hacer",
    "level": 3,
    "phase": "Fase 2: Aplicación Procedimental",
    "phase_number": 2,
    "question_type": "WORKSHOP",
    "text": "Taller Socrático: Usa las pestañas para redactar tu planteamiento, objetivos, variables y metodología guiado por el Búho.",
    "options": [],
    "correct_answer": "WORKSHOP",
    "image_filename": "Buhotech - FORMULACIÓN DEL PROBLEMA.png",
    "min_reading_time_ms": 1000,
    "expected_time_ms": 5000,
    "verification_text": "¡Has completado el taller!",
    "rescue_text": "Debes completar el taller con la ayuda del Búho.",
    "weight": 1.0
  },
  {
    "id": "274eaf6d-15e9-4977-8544-6317a0057f7f",
    "dimension": "saber_ser",
    "level": 3,
    "phase": "Fase 3: Laboratorio Ético",
    "phase_number": 3,
    "question_type": "SCENARIO",
    "text": "Escenario: Un grupo de estudiantes descubre cómo hacer que la IA les escriba la tesis completa sin que ellos tengan que leer, analizar, ni entender los problemas. Logran graduarse usando esta técnica. ¿Qué pasaría si todos los profesionales del país aprobaran sus carreras copiando a la IA?",
    "options": [
      {
        "id": "A",
        "text": "La sociedad avanzaría más rápido porque tendríamos más graduados en menos tiempo.",
        "is_ethical": false,
        "feedback": "Tener graduados que no saben pensar críticamente es un gran riesgo para el país."
      },
      {
        "id": "B",
        "text": "Se perdería el pensamiento crítico, la capacidad de resolver problemas reales y se tomarían decisiones sin comprender la ciencia, llevando a errores graves.",
        "is_ethical": true,
        "feedback": "¡Exacto! El valor del ser humano radica en su capacidad de análisis crítico y ético, algo que no se puede delegar ciegamente a una máquina."
      },
      {
        "id": "C",
        "text": "No pasaría nada; el título es solo un trámite y la IA siempre tendrá la razón.",
        "is_ethical": false,
        "feedback": "Las IAs alucinan y cometen errores. Depender de ellas sin juicio crítico es peligroso."
      }
    ],
    "correct_answer": "SCENARIO",
    "image_filename": "Buhotech -   Plagio vs. APA.png",
    "min_reading_time_ms": 6000,
    "expected_time_ms": 30000,
    "verification_text": "El pensamiento crítico es irreemplazable.",
    "rescue_text": "Reflexiona sobre qué pasa cuando nadie entiende cómo funcionan las cosas.",
    "weight": 1.0
  }
];
  return SEED_QUESTIONS.filter(q => q.phase_number === phaseNumber);
}

/**
 * Calcula la calificación vigesimal completa (0-20) y actualiza la fila única del usuario
 * en la hoja 'Evaluacion_Consolidada'. Garantiza exactamente 1 fila por usuario con todas sus métricas.
 */
function calculateAndSaveGrades(userId, submissionData) {
  const user = findRecordBy("users", "id", userId);
  if (!user) return null;

  const userResponses = findRecordsBy("user_responses", "user_id", userId);
  
  // 1. SABER (Cognitiva) por niveles taxonómicos (N1: 25%, N2: 35%, N3: 40%)
  let n1_total = 0, n1_correct = 0;
  let n2_total = 0, n2_correct = 0;
  let n3_total = 0, n3_correct = 0;
  
  let totalTime = 0;
  let fastRandomCount = 0;
  let totalFailed = 0;
  let totalCorrect = 0;
  
  userResponses.forEach(r => {
    const isCorr = (r.is_correct === true || r.is_correct === "true" || r.is_correct === 1);
    const lvl = parseInt(r.level || 1);
    const dim = String(r.dimension || 'saber').toLowerCase();
    
    if (isCorr) totalCorrect++;
    totalTime += parseFloat(r.response_time_ms || 0);
    totalFailed += parseInt(r.failed_attempts || 0);
    if (r.behavior_flag === "FAST_RANDOM") fastRandomCount++;
    
    if (dim === "saber") {
      if (lvl === 1) { n1_total++; if (isCorr) n1_correct++; }
      else if (lvl === 2) { n2_total++; if (isCorr) n2_correct++; }
      else if (lvl >= 3) { n3_total++; if (isCorr) n3_correct++; }
    }
  });

  const saber_n1 = n1_total > 0 ? (n1_correct / n1_total * 20) : 0;
  const saber_n2 = n2_total > 0 ? (n2_correct / n2_total * 20) : 0;
  const saber_n3 = n3_total > 0 ? (n3_correct / n3_total * 20) : 0;
  const saber_grade = Math.round(((saber_n1 * 0.25) + (saber_n2 * 0.35) + (saber_n3 * 0.40)) * 100) / 100;

  // 2. SABER HACER (Procedimental)
  let sh_total = 0, sh_correct = 0;
  userResponses.filter(r => String(r.dimension).toLowerCase() === "saber_hacer").forEach(r => {
    sh_total++;
    if (r.is_correct === true || r.is_correct === "true" || r.is_correct === 1) sh_correct++;
  });
  const quiz_hacer = sh_total > 0 ? (sh_correct / sh_total * 20) : (saber_grade * 0.9);
  const ws_avg = 18.0; // Nota base de entrega de taller con andamiaje
  const saber_hacer_grade = Math.round((quiz_hacer * 0.6 + ws_avg * 0.4) * 100) / 100;

  // 3. SABER SER (Actitudinal)
  let ss_total = 0, ss_correct = 0;
  userResponses.filter(r => String(r.dimension).toLowerCase() === "saber_ser").forEach(r => {
    ss_total++;
    if (r.is_correct === true || r.is_correct === "true" || r.is_correct === 1) ss_correct++;
  });
  const saber_ser_grade = ss_total > 0 ? Math.round((ss_correct / ss_total * 20) * 100) / 100 : 20.0;

  // 4. SANCIÓN ACTITUDINAL (Puntos en contra deducidos - Tope: 10 pts)
  const pastedCount = parseInt(user.pasted_text_count || 0);
  const infographicViews = parseInt(user.infographic_views || 0);
  const unethicalCount = Math.max(0, ss_total - ss_correct);
  const excessFastRandom = Math.max(0, fastRandomCount - 1);
  
  // Fórmula tesis: 3pts por decisión no ética + 2pts por pegar texto + 1pt por adivinar al azar
  const rawPenalty = (unethicalCount * 3.0) + (pastedCount * 2.0) + (excessFastRandom * 1.0);
  const bonus = Math.min(infographicViews * 0.5, 4.0); // Bonificación por estudiar infografía
  const actitudinal_penalty = Math.round(Math.min(10.0, Math.max(0.0, rawPenalty - bonus)) * 100) / 100;

  // 5. NOTA FINAL VIGESIMAL PONDERADA (0-20)
  const baseWeighted = (saber_grade * 0.50) + (saber_hacer_grade * 0.50);
  const final_grade_20 = Math.max(0.0, Math.round((baseWeighted - actitudinal_penalty) * 100) / 100);

  const avgResponseTime = userResponses.length > 0 ? Math.round(totalTime / userResponses.length) : 0;

  // Objeto de respuesta para consumo en memoria por la interfaz
  const record = {
    id: Utilities.getUuid(),
    user_id: userId,
    username: user.username,
    saber_grade: saber_grade,
    saber_hacer_grade: saber_hacer_grade,
    saber_ser_grade: Math.max(0, Math.round((20.0 - actitudinal_penalty) * 100) / 100),
    final_grade_20: final_grade_20,
    actitudinal_penalty: actitudinal_penalty,
    descuento_marcado_rapido_pts: (fastRandomCount * 1.0),
    descuento_copiar_pegar_pts: (pastedCount * 2.0),
    total_questions_answered: userResponses.length,
    total_correct: totalCorrect,
    total_socratic_interactions: 0,
    avg_response_time_ms: avgResponseTime,
    fast_random_count: fastRandomCount,
    pasted_count: pastedCount,
    total_failed_attempts: totalFailed,
    calculated_at: new Date().toISOString()
  };

  // 6. EXTRAER O PRESERVAR LAS 4 RESPUESTAS ESCRITAS DEL ESTUDIANTE (SABER HACER)
  const existingMaster = findRecordBy("Evaluacion_Consolidada", "id_usuario", userId);
  let taller1 = existingMaster ? String(existingMaster.taller_1_planteamiento_problema || '') : "";
  let taller2 = existingMaster ? String(existingMaster.taller_2_objetivos_hipotesis || '') : "";
  let taller3 = existingMaster ? String(existingMaster.taller_3_variables_operacionalizacion || '') : "";
  let taller4 = existingMaster ? String(existingMaster.taller_4_diseno_metodologico || '') : "";

  // Si se envían nuevas redacciones del taller (por ejemplo desde rpcSubmitWorkshop)
  if (submissionData) {
    if (submissionData.planteamiento) taller1 = String(submissionData.planteamiento).trim();
    if (submissionData.objetivos) taller2 = String(submissionData.objetivos).trim();
    if (submissionData.variables) taller3 = String(submissionData.variables).trim();
    if (submissionData.metodologia) taller4 = String(submissionData.metodologia).trim();
  }

  // Si faltan, buscar en respuestas abiertas de user_responses
  userResponses.forEach(r => {
    const ans = String(r.selected_answer || '').trim();
    if (ans.length > 15) {
      const qid = String(r.question_id || '').toLowerCase();
      if ((qid.includes("planteamiento") || qid.includes("embudo")) && (!taller1 || taller1.includes("Pendiente"))) taller1 = ans;
      else if ((qid.includes("objetivo") || qid.includes("hipotesis")) && (!taller2 || taller2.includes("Pendiente"))) taller2 = ans;
      else if ((qid.includes("variable") || qid.includes("operacional")) && (!taller3 || taller3.includes("Pendiente"))) taller3 = ans;
      else if ((qid.includes("metodolog") || qid.includes("diseno")) && (!taller4 || taller4.includes("Pendiente"))) taller4 = ans;
    }
  });

  const hasT1 = taller1 && !taller1.includes("Pendiente");
  const hasT2 = taller2 && !taller2.includes("Pendiente");
  const hasT3 = taller3 && !taller3.includes("Pendiente");
  const hasT4 = taller4 && !taller4.includes("Pendiente");

  const pctAciertos = (userResponses.length > 0) ? (Math.round((totalCorrect / userResponses.length) * 1000) / 10) + "%" : "0%";
  const descuentoMarcado = fastRandomCount * 1.0;
  const descuentoCopiar = pastedCount * 2.0;
  const estadoFinal = (hasT1 && hasT2 && hasT3 && hasT4) ? "Completado" : "En Proceso";

  // 7. HOJA MAESTRA DOCENTE: 'Evaluacion_Consolidada' (LA ÚNICA HOJA REQUERIDA - 1 FILA POR ALUMNO)
  const masterRecord = {
    id_usuario: userId,
    estudiante: user.username,
    fecha_evaluacion: new Date().toLocaleString(),
    nota_saber_conocer_20: saber_grade,
    preguntas_cognitivas_respondidas: userResponses.length,
    respuestas_cognitivas_correctas: totalCorrect,
    porcentaje_aciertos_cognitivo: pctAciertos,
    nota_saber_hacer_20: saber_hacer_grade,
    taller_1_planteamiento_problema: taller1 || "⚠️ Pendiente de redacción",
    taller_2_objetivos_hipotesis: taller2 || "⚠️ Pendiente de redacción",
    taller_3_variables_operacionalizacion: taller3 || "⚠️ Pendiente de redacción",
    taller_4_diseno_metodologico: taller4 || "⚠️ Pendiente de redacción",
    nota_saber_ser_20: Math.max(0, Math.round((20.0 - actitudinal_penalty) * 100) / 100),
    veces_marcado_rapido_azar: fastRandomCount,
    descuento_marcado_rapido_pts: descuentoMarcado,
    intentos_copiar_pegar: pastedCount,
    descuento_copiar_pegar_pts: descuentoCopiar,
    descuento_total_saber_ser: actitudinal_penalty,
    nota_final_tesis_20: final_grade_20,
    estado: estadoFinal
  };

  try {
    if (existingMaster) {
      updateRecord("Evaluacion_Consolidada", "id_usuario", userId, masterRecord);
    } else {
      insertRecord("Evaluacion_Consolidada", masterRecord);
    }
  } catch(e) {
    Logger.log("Error guardando en Evaluacion_Consolidada: " + e.toString());
  }

  return record;
}

/**
 * Recorre todos los usuarios y actualiza de forma masiva la hoja 'Evaluacion_Consolidada'.
 */
function syncAllUsersConsolidatedSheet() {
  const users = getRecords("users");
  let count = 0;
  for (let i = 0; i < users.length; i++) {
    if (users[i].id) {
      calculateAndSaveGrades(users[i].id);
      count++;
    }
  }
  return { success: true, updatedCount: count };
}

/**
 * Menú contextual en Google Sheets para el docente.
 */
function onOpen() {
  try {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('🦉 Buhotech Labs')
      .addItem('📊 Actualizar Evaluación Consolidada', 'syncAllUsersConsolidatedSheet')
      .addToUi();
  } catch(e) {
    // Modo no interactivo o webapp aislada
  }
}
