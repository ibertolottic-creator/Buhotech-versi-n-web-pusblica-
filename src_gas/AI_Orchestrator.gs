/**
 * AI_Orchestrator.gs
 * Sistema RAG Cerrado exclusivo para Metodología de la Investigación de Tesis.
 * Responde de manera concisa (máximo 2-3 oraciones), socrática y 100% confinada al tema.
 * Incluye motor de RAG Local Autónomo que garantiza funcionamiento sin errores.
 */

function getKeysByPrefix(prefix) {
  try {
    const props = PropertiesService.getScriptProperties().getProperties();
    const keys = [];

    // 1. Clave exacta por defecto (ej: GEMINI_API_KEY, GROQ_API_KEY, MISTRAL_API_KEY, META_API_KEY)
    const exactName = prefix.toUpperCase() + "_API_KEY";
    if (props[exactName]) {
      const k = props[exactName].trim();
      if (k) keys.push(k);
    }

    // 2. Detectar claves con números o sufijos (ej: GEMINI_API_KEY_1, GEMINI_API_KEY_coorduva, etc.)
    for (const keyName in props) {
      if (keyName.toUpperCase().includes(prefix.toUpperCase()) && keyName !== exactName) {
        const val = (props[keyName] || "").trim();
        if (val && val.length > 5 && !keys.includes(val)) {
          keys.push(val);
        }
      }
    }

    return keys;
  } catch(e) {
    Logger.log("Error leyendo propiedades para " + prefix + ": " + e.toString());
    return [];
  }
}

function getKeys() {
  const geminiPool = getKeysByPrefix("GEMINI");
  const groqPool = getKeysByPrefix("GROQ");
  const mistralPool = getKeysByPrefix("MISTRAL");
  const metaPool = getKeysByPrefix("META");

  return {
    gemini: geminiPool[0] || null,
    geminiPool: geminiPool,
    groq: groqPool[0] || null,
    groqPool: groqPool,
    mistral: mistralPool[0] || null,
    mistralPool: mistralPool,
    meta: metaPool[0] || null,
    metaPool: metaPool
  };
}

// BASE DE CONOCIMIENTO (RAG CERRADO DE METODOLOGÍA CON ANDAMIAJE PEDAGÓGICO)
const RAG_KNOWLEDGE_BASE = {
  planteamiento: {
    name: "Planteamiento del Problema",
    rules: "Método del embudo estricto: Macro (contexto mundial o internacional), Meso (contexto nacional/país) y Micro (contexto local/institución/empresa). Debe formular claramente síntomas, causas y pronóstico con delimitación espacial y temporal.",
    checklist: ["macro", "meso", "micro", "mundial", "perú", "empresa", "institución", "problema", "síntoma", "causa", "efecto", "delimitación"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Método del Embudo):\nEl planteamiento se redacta desde lo general hasta lo específico en 3 niveles:\n1. Macro (Internacional): ¿Cómo se manifiesta el problema en el mundo o Latinoamérica? Cita organismos de referencia (ej: OMS, OIT, UNESCO).\n2. Meso (Nacional): Aterriza la realidad en el Perú (o tu país) con estadísticas oficiales (INEI, ministerios o gremios sectoriales).\n3. Micro (Local/Institucional): Describe la situación en la empresa o institución donde harás tu tesis: síntomas observables (lo que pasa), causas directas (por qué pasa) y pronóstico (qué ocurrirá si no se interviene).",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\n«A nivel mundial, la OIT (2023) reporta que el 60% de trabajadores experimentan sobrecarga laboral que merma la productividad (Macro). En el Perú, datos del INEI señalan que 4 de cada 10 organizaciones presentan alta rotación atribuida a climas laborales deficientes (Meso). Específicamente en la empresa Inversiones ABC S.A.C., sede Lima 2024, los colaboradores manifiestan desmotivación, demoras de 48 horas en entrega de pedidos y conflictos internos, lo que genera pérdidas económicas y deserción del talento si no se implementa un plan de mejora organizacional (Micro).»"
  },
  objetivos: {
    name: "Objetivos e Hipótesis",
    rules: "El Objetivo General debe iniciar obligatoriamente con un verbo en infinitivo medible (Determinar, Establecer, Analizar, Evaluar, Demostrar). Debe contener ambas variables delimitadas. La Hipótesis debe ser una respuesta afirmativa y coherente que responda directamente al objetivo general.",
    verbs: ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar"],
    checklist: ["objetivo", "hipótesis", "relación", "significativa", "variable"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Objetivos e Hipótesis):\n1. Objetivo General: Inicia siempre con un verbo en infinitivo medible (Determinar, Establecer, Demostrar, Evaluar). Debe articular tu Variable Independiente (V1) y tu Variable Dependiente (V2), la población de estudio, el lugar y el año.\n2. Hipótesis General: Es la respuesta tentativa y afirmativa al objetivo general. No lleva verbo en infinitivo; afirma la existencia de relación directa, inversa o de incidencia entre ambas variables.",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\n• Objetivo General: Determinar la relación entre el clima organizacional y el desempeño laboral en los colaboradores de la empresa Inversiones ABC S.A.C., Lima, 2024.\n• Hipótesis General: Existe una relación directa y significativa entre el clima organizacional y el desempeño laboral en los colaboradores de la empresa Inversiones ABC S.A.C., Lima, 2024."
  },
  variables: {
    name: "Variables y Operacionalización",
    rules: "Operacionalización científica de variables. Variable 1 (Independiente/predictora) y Variable 2 (Dependiente/criterio). Cada variable debe desglosarse en dimensiones teóricas claras y cada dimensión en indicadores observables y medibles cuantitativa o cualitativamente.",
    checklist: ["variable", "dimensión", "indicador", "escala", "medición", "operacional"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Operacionalización de Variables):\nOperacionalizar es convertir conceptos teóricos abstractos en elementos empíricamente observables:\n1. Identificación: Define con exactitud la Variable 1 (Independiente / Causa) y la Variable 2 (Dependiente / Efecto).\n2. Dimensiones: Son los subtemas o componentes teóricos que integran cada variable (mínimo 2 por variable).\n3. Indicadores: Son las métricas, preguntas o parámetros observables con los que recopilarás datos (ej: escala Likert de 5 niveles).",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\nVariable 1: Clima Organizacional\n• Dimensión 1: Liderazgo directivo (Indicadores: Comunicación horizontal, apoyo del jefe, retroalimentación).\n• Dimensión 2: Condiciones de trabajo (Indicadores: Ergonomía, herramientas laborales, seguridad física).\n\nVariable 2: Desempeño Laboral\n• Dimensión 1: Eficiencia operativa (Indicadores: Precisión de tareas, cumplimiento de plazos, calidad del entregable).\n• Dimensión 2: Compromiso institucional (Indicadores: Puntualidad, proactividad, trabajo cooperativo)."
  },
  metodologia: {
    name: "Diseño Metodológico",
    rules: "Enfoque (Cuantitativo, Cualitativo o Mixto). Alcance o Nivel (Exploratorio, Descriptivo, Correlacional o Explicativo). Diseño (No experimental transversal, No experimental longitudinal, o Experimental puro/cuasiexperimental). Debe justificarse según los objetivos de la tesis.",
    checklist: ["cuantitativo", "cualitativo", "correlacional", "descriptivo", "explicativo", "experimental", "no experimental", "transversal", "longitudinal", "diseño", "enfoque"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Marco Metodológico):\nDebes fundamentar las 3 decisiones científicas de tu método:\n1. Enfoque: Cuantitativo (si recolectarás datos numéricos y probarás hipótesis con estadística) o Cualitativo (análisis de vivencias o significados).\n2. Alcance o Nivel: Descriptivo (caracteriza variables), Correlacional (mide asociación entre variables) o Explicativo (causa y efecto).\n3. Diseño: No experimental de corte transversal (si aplicas tus encuestas en un solo momento temporal sin alterar la realidad) o Experimental (con pretest y grupo de control).",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\n«La investigación presenta un enfoque cuantitativo, dado que se recolectarán datos numéricos mediante cuestionarios para someter a prueba la hipótesis con el coeficiente Rho de Spearman. El alcance es correlacional porque analiza el grado de relación entre ambas variables. El diseño es no experimental, de corte transversal, debido a que las variables no serán manipuladas y los datos se medirán en un solo momento temporal en una muestra censal de 45 colaboradores de la empresa Inversiones ABC S.A.C.»"
  }
};

/**
 * Orquesta la revisión socrática con RAG cerrado y cascada multiproveedor.
 */
function aiOrchestrateChat(topic, userMessage) {
  const keys = getKeys();
  const topicKey = String(topic || "planteamiento").toLowerCase();
  const ragInfo = RAG_KNOWLEDGE_BASE[topicKey] || RAG_KNOWLEDGE_BASE["planteamiento"];

  // 1. Prompt de Sistema RAG Cerrado (Confinamiento estricto y brevedad)
  const systemPrompt = 
    "Eres Buhotech Labs, un tutor socrático con RAG CERRADO de Metodología de la Investigación Científica para Tesis.\n" +
    "REGLAS ESTRICTAS DE CONFINAMIENTO:\n" +
    "1. CONFINAMIENTO TEMÁTICO: Solo respondes sobre Metodología de la Investigación (Planteamiento, Objetivos, Hipótesis, Variables y Diseños metodológicos). Si el usuario escribe sobre otro tema, responde: '🦉 En Buhotech solo revisamos la metodología de tu tesis. Por favor redacta tu propuesta académica.'\n" +
    "2. MÁXIMA BREVEDAD: Responde en MÁXIMO 2 o 3 oraciones. Sé sumamente directo, conciso y reflexivo.\n" +
    "3. ANDAMIAJE SOCRÁTICO: NUNCA des la respuesta hecha ni redactes el texto por el alumno. Haz 1 o 2 preguntas reflexivas para que él mismo detecte qué falta ajustar.\n" +
    "4. BASE DE CONOCIMIENTO PARA ESTE TEMA (" + ragInfo.name + "):\n" + ragInfo.rules;

  // 1. Cascada: Pool de Claves Gemini (Rotación inteligente con memoria de clave activa)
  const geminiPool = keys.geminiPool || [];
  let geminiStart = 0;
  try {
    const cachedIdx = CacheService.getScriptCache().get("GEMINI_ACTIVE_KEY_IDX");
    if (cachedIdx) geminiStart = parseInt(cachedIdx) % geminiPool.length;
  } catch(e) {}

  for (let offset = 0; offset < geminiPool.length; offset++) {
    const i = (geminiStart + offset) % geminiPool.length;
    try {
      const response = callGemini(geminiPool[i], systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        Logger.log("✅ Éxito con clave Gemini #" + (i + 1));
        try { CacheService.getScriptCache().put("GEMINI_ACTIVE_KEY_IDX", String(i), 1800); } catch(e) {}
        return { text: response.trim(), provider: "gemini", model: "flash-pool" };
      }
    } catch (e) {
      Logger.log("⚠️ Error con clave Gemini #" + (i + 1) + ": " + e.toString());
    }
  }

  // 2. Cascada: Pool de Claves Groq
  const groqPool = keys.groqPool || [];
  for (let i = 0; i < groqPool.length; i++) {
    try {
      const response = callGroq(groqPool[i], systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        Logger.log("✅ Éxito con clave Groq #" + (i + 1));
        return { text: response.trim(), provider: "groq", model: "llama-3.3-70b" };
      }
    } catch (e) {
      Logger.log("⚠️ Error con clave Groq #" + (i + 1) + ": " + e.toString());
    }
  }

  // 3. Cascada: Pool de Claves Mistral
  const mistralPool = keys.mistralPool || [];
  for (let i = 0; i < mistralPool.length; i++) {
    try {
      const response = callMistral(mistralPool[i], systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        Logger.log("✅ Éxito con clave Mistral #" + (i + 1));
        return { text: response.trim(), provider: "mistral", model: "mistral-small" };
      }
    } catch (e) {
      Logger.log("⚠️ Error con clave Mistral #" + (i + 1) + ": " + e.toString());
    }
  }

  // 4. Cascada: Pool de Claves Meta
  const metaPool = keys.metaPool || [];
  for (let i = 0; i < metaPool.length; i++) {
    try {
      const response = callMeta(metaPool[i], systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        Logger.log("✅ Éxito con clave Meta #" + (i + 1));
        return { text: response.trim(), provider: "meta", model: "llama-3.3" };
      }
    } catch (e) {
      Logger.log("⚠️ Error con clave Meta #" + (i + 1) + ": " + e.toString());
    }
  }

  // 5. FALLBACK INTELIGENTE: Motor RAG Cerrado Local Autónomo de Buhotech
  const localReply = evaluateWithLocalRAG(topicKey, userMessage, ragInfo);
  return { 
    text: localReply, 
    provider: "buhotech-local-rag", 
    model: "closed-rag-v2" 
  };
}

/**
 * Motor RAG Cerrado Local Autónomo de Buhotech.
 * Reconoce preguntas del estudiante y evalúa semánticamente borradores de tesis
 * citando los propios términos del estudiante para guiarlo de forma socrática.
 */
function evaluateWithLocalRAG(topicKey, userMessage, ragInfo) {
  const raw = (userMessage || "").trim();
  const text = raw.toLowerCase();
  
  // 1. Detectar saludos habituales
  if (text.match(/^(hola|buenos d[ií]as|buenas tardes|buenas noches|saludos|hey|b[uú]ho|que tal)/)) {
    return "🦉 ¡Hola! Soy el Búho Metodólogo de Buhotech Labs. Estoy aquí para acompañar la redacción y rigor metodológico de tu tesis. ¿Qué parte de tu propuesta en " + ragInfo.name + " deseas estructurar o afinar hoy?";
  }

  // 1.5 Detectar solicitudes de 1ª Ayuda (Explicación) o 2ª Ayuda (Ejemplo Modelado)
  if (text.includes("ejemplo") || text.includes("2ª ayuda") || text.includes("2da ayuda") || text.includes("segunda ayuda") || text.includes("modelo") || text.includes("caso")) {
    if (ragInfo.help2_ejemplo) return ragInfo.help2_ejemplo;
  }
  if (text.includes("explicaci") || text.includes("1ª ayuda") || text.includes("1ra ayuda") || text.includes("primera ayuda") || text.includes("cómo hacer") || text.includes("como hacer") || text.includes("pautas")) {
    if (ragInfo.help1_explicacion) return ragInfo.help1_explicacion;
  }

  // 2. Detectar si el estudiante está haciendo una CONSULTA o pregunta pedagógica general
  const isQuestion = text.includes("?") || 
                     text.includes("cómo") || text.includes("como") || 
                     text.includes("qué es") || text.includes("que es") || 
                     text.includes("cuál") || text.includes("cual") || 
                     text.includes("ejemplo") || text.includes("explica") || 
                     text.includes("ayuda") || text.includes("orienta") || 
                     text.includes("diferencia");

  if (isQuestion) {
    if (topicKey === "planteamiento") {
      return "🦉 Para el Planteamiento usamos el Método del Embudo: 1) Macro (tendencia mundial o regional), 2) Meso (realidad nacional/sectorial en el país), y 3) Micro (problema directo en tu empresa o institución con síntomas y causas). ¿Cuál de estos tres niveles te gustaría comenzar a redactar?";
    }
    if (topicKey === "objetivos") {
      return "🦉 Todo Objetivo General debe iniciar con un verbo medible en infinitivo (ej: Determinar, Establecer, Demostrar) que vincule tus dos variables con la población. La Hipótesis responde directamente afirmando dicha relación. ¿Cuáles son tus dos variables de estudio?";
    }
    if (topicKey === "variables") {
      return "🦉 En la Operacionalización divides tu Variable Independiente y Dependiente en Dimensiones teóricas, y cada dimensión en Indicadores numéricos u observables. ¿Qué dimensiones has identificado preliminarmente?";
    }
    if (topicKey === "metodologia") {
      return "🦉 En Metodología defines: Enfoque (cuantitativo o cualitativo), Alcance (descriptivo, correlacional o explicativo) y Diseño (no experimental transversal o experimental). ¿Tu investigación medirá datos estadísticos en un solo momento temporal?";
    }
  }

  // 3. Detectar si el texto es excesivamente corto
  if (text.length < 15) {
    return "🦉 Tu propuesta es muy concisa para evaluarla a fondo. Escribe una redacción más completa de tu propuesta para analizar su rigor metodológico.";
  }

  // 4. Extraer términos significativos del estudiante para citarlos socráticamente
  const words = raw.split(/\s+/).filter(w => w.length > 5 && !["investigacion", "metodologia", "estudio", "trabajo", "problema"].includes(w.toLowerCase()));
  const sampleTerm = words.length > 0 ? `"${words[0]}"` : "los conceptos que mencionas";

  // 5. Evaluación socrática según el eje temático
  if (topicKey === "planteamiento") {
    const hasMacro = text.includes("macro") || text.includes("mundial") || text.includes("global") || text.includes("internacional") || text.includes("mundo") || text.includes("países");
    const hasMeso = text.includes("meso") || text.includes("perú") || text.includes("nacional") || text.includes("país") || text.includes("latinoamérica") || text.includes("sector");
    const hasMicro = text.includes("micro") || text.includes("empresa") || text.includes("institución") || text.includes("colegio") || text.includes("hospital") || text.includes("local") || text.includes("organización") || text.includes("sede");
    const hasCauses = text.includes("causa") || text.includes("síntoma") || text.includes("efecto") || text.includes("consecuencia") || text.includes("debido a") || text.includes("genera");

    if (!hasMicro) {
      return `🦉 Buen avance contextualizando ${sampleTerm}. Sin embargo, para cerrar el embudo: ¿cuál es la empresa, institución o población exacta (nivel micro) donde se evidencia el problema de forma tangible?`;
    }
    if (!hasMacro && !hasMeso) {
      return `🦉 Has delimitado bien el entorno micro de ${sampleTerm}. Para darle peso científico: ¿cómo se manifiesta este problema a nivel internacional (Macro) o en las estadísticas del país (Meso)?`;
    }
    if (!hasCauses) {
      return `🦉 Se aprecia la estructura del embudo en tu texto. Para completarlo con rigor: ¿cuáles son las causas directas que originan esta situación y qué consecuencias ocurrirán si no se resuelve?`;
    }
    return `🦉 ¡Excelente formulación del embudo con ${sampleTerm}! Tu redacción articula el contexto y la delimitación. ¿La formulación de tu pregunta general de investigación sintetiza fielmente este problema?`;
  }

  if (topicKey === "objetivos") {
    const verbs = ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar", "explicar"];
    const hasVerb = verbs.some(v => text.includes(v));
    const hasHip = text.includes("hipótesis") || text.includes("relación") || text.includes("significativa") || text.includes("influye") || text.includes("incide") || text.includes("existe");
    const hasPoblacion = text.includes("en ") || text.includes("de ") || text.includes("202") || text.includes("trabajadores") || text.includes("estudiantes") || text.includes("empresa");

    if (!hasVerb) {
      return `🦉 Recuerda que el Objetivo General debe iniciar con un verbo medible en infinitivo (ej: Determinar, Analizar, Evaluar). Al estudiar ${sampleTerm}, ¿qué verbo refleja exactamente el alcance de tu tesis?`;
    }
    if (!hasHip) {
      return `🦉 Tu objetivo tiene una dirección adecuada con ${sampleTerm}. Ahora: ¿cómo formularías la hipótesis para responder de forma afirmativa y verificable a este objetivo?`;
    }
    if (!hasPoblacion) {
      return `🦉 Buen planteamiento del objetivo e hipótesis. Para que sea completamente delimitado: ¿has especificado la población de estudio y el periodo temporal exacto donde se medirá?`;
    }
    return `🦉 Gran alineación metodológica entre tu objetivo e hipótesis para ${sampleTerm}. ¿Ambos enunciados guardan la misma relación de variables sin introducir elementos adicionales?`;
  }

  if (topicKey === "variables") {
    const hasDim = text.includes("dimens") || text.includes("componente") || text.includes("factor") || text.includes("aspecto");
    const hasInd = text.includes("indicador") || text.includes("escala") || text.includes("ítem") || text.includes("medir") || text.includes("preguntas") || text.includes("cuestionario");

    if (!hasDim) {
      return `🦉 Has propuesto las variables para ${sampleTerm}. ¿En qué dimensiones teóricas descompondrás cada una de ellas para hacerlas observables?`;
    }
    if (!hasInd) {
      return `🦉 Buenas dimensiones. Ahora: ¿qué indicadores específicos o métricas te permitirán recopilar datos cuantificables de cada dimensión?`;
    }
    return `🦉 Sólido desglose de variables e indicadores en ${sampleTerm}. ¿Tienes definida la escala de medición (por ejemplo, Likert de 5 niveles o datos cuantitativos continuos)?`;
  }

  if (topicKey === "metodologia") {
    const hasEnfoque = text.includes("cuantitativ") || text.includes("cualitativ") || text.includes("mixto");
    const hasDiseno = text.includes("experimental") || text.includes("transversal") || text.includes("longitudinal") || text.includes("descriptiv") || text.includes("correlacional");
    const hasMuestra = text.includes("muestra") || text.includes("población") || text.includes("encuesta") || text.includes("cuestionario") || text.includes("entrevista");

    if (!hasEnfoque) {
      return `🦉 Para fundamentar la metodología de ${sampleTerm}: ¿tu enfoque será cuantitativo (medición estadística de hipótesis) o cualitativo (fenomenológico / narrativo)?`;
    }
    if (!hasDiseno) {
      return `🦉 Enfoque clarificado. ¿Tu diseño será no experimental transversal (recolección en un solo momento temporal) o experimental con grupo de control?`;
    }
    if (!hasMuestra) {
      return `🦉 Diseño bien sustentado. ¿Qué técnicas e instrumentos específicos (cuestionario, guía de observación) utilizarás para recoger los datos de tu muestra?`;
    }
    return `🦉 Metodología rigurosa y coherentemente estructurada para ${sampleTerm}. ¿El tamaño de tu muestra te permitirá aplicar pruebas estadísticas como Pearson o Spearman con validez?`;
  }

  return `🦉 Tu propuesta sobre ${sampleTerm} demuestra buen enfoque científico. ¿De qué manera esta redacción responde directamente a la pregunta principal de tu tesis?`;
}

/**
 * Llamada a la API de Google Gemini con cascada automática 2.0 Flash -> 1.5 Flash.
 */
function callGemini(apiKey, systemPrompt, userMessage) {
  if (!apiKey || apiKey.trim().length < 5) return null;
  const cleanKey = apiKey.trim();
  const models = ["gemini-2.0-flash", "gemini-1.5-flash"];
  
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + cleanKey;
    
    const payload = {
      "contents": [
        {
          "role": "user", 
          "parts": [{"text": userMessage}]
        }
      ],
      "systemInstruction": {
        "parts": [{"text": systemPrompt}]
      },
      "generationConfig": {
        "temperature": 0.4,
        "maxOutputTokens": 250
      }
    };
    
    const options = {
      "method": "post",
      "contentType": "application/json",
      "headers": {
        "x-goog-api-key": cleanKey
      },
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
          return data.candidates[0].content.parts[0].text;
        }
      } else {
        Logger.log("Gemini model " + model + " devolvió HTTP " + response.getResponseCode() + ": " + response.getContentText().substring(0, 150));
      }
    } catch(err) {
      Logger.log("Excepción llamando a Gemini " + model + ": " + err.toString());
    }
  }
  
  throw new Error("No se pudo obtener respuesta de los modelos Gemini disponibles.");
}

/**
 * Llamada a la API de Groq Cloud (Llama 3.3 / Llama 3) con cascada.
 */
function callGroq(apiKey, systemPrompt, userMessage) {
  const models = ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
  const url = "https://api.groq.com/openai/v1/chat/completions";

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const payload = {
      "model": model,
      "messages": [
        {"role": "system", "content": systemPrompt},
        {"role": "user", "content": userMessage}
      ],
      "temperature": 0.4,
      "max_tokens": 250
    };
    
    const options = {
      "method": "post",
      "headers": {
        "Authorization": "Bearer " + apiKey
      },
      "contentType": "application/json",
      "payload": JSON.stringify(payload),
      "muteHttpExceptions": true
    };
    
    try {
      const response = UrlFetchApp.fetch(url, options);
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        if (data.choices && data.choices.length > 0 && data.choices[0].message) {
          return data.choices[0].message.content;
        }
      } else {
        Logger.log("Groq model " + model + " devolvió HTTP " + response.getResponseCode());
      }
    } catch(err) {
      Logger.log("Excepción llamando a Groq " + model + ": " + err.toString());
    }
  }
  
  throw new Error("No se pudo obtener respuesta de los modelos Groq disponibles.");
}

/**
 * Llamada a la API de Mistral AI.
 */
function callMistral(apiKey, systemPrompt, userMessage) {
  if (!apiKey || apiKey.trim().length < 5) return null;
  const cleanKey = apiKey.trim();
  const url = "https://api.mistral.ai/v1/chat/completions";
  const payload = {
    "model": "mistral-small-latest",
    "messages": [
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": userMessage}
    ],
    "temperature": 0.4,
    "max_tokens": 250
  };
  const options = {
    "method": "post",
    "headers": { "Authorization": "Bearer " + cleanKey },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      }
    } else {
      Logger.log("Mistral devolvió HTTP " + response.getResponseCode());
    }
  } catch(e) {
    Logger.log("Error Mistral: " + e.toString());
  }
  throw new Error("Mistral no disponible");
}

/**
 * Llamada a la API de Meta / Together AI.
 */
function callMeta(apiKey, systemPrompt, userMessage) {
  if (!apiKey || apiKey.trim().length < 5) return null;
  const cleanKey = apiKey.trim();
  const url = "https://api.together.xyz/v1/chat/completions";
  const payload = {
    "model": "meta-llama/Llama-3.3-70B-Instruct-Turbo",
    "messages": [
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": userMessage}
    ],
    "temperature": 0.4,
    "max_tokens": 250
  };
  const options = {
    "method": "post",
    "headers": { "Authorization": "Bearer " + cleanKey },
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    const response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        return data.choices[0].message.content;
      }
    } else {
      Logger.log("Meta devolvió HTTP " + response.getResponseCode());
    }
  } catch(e) {
    Logger.log("Error Meta: " + e.toString());
  }
  throw new Error("Meta no disponible");
}
