/**
 * AI_Orchestrator.gs
 * Sistema RAG Cerrado exclusivo para Metodología de la Investigación de Tesis.
 * Responde de manera concisa (máximo 2-3 oraciones), socrática y 100% confinada al tema.
 * Incluye motor de RAG Local Autónomo que garantiza funcionamiento sin errores.
 */

function getKeys() {
  const props = PropertiesService.getScriptProperties();
  return {
    gemini: props.getProperty("GEMINI_API_KEY"),
    groq: props.getProperty("GROQ_API_KEY")
  };
}

// BASE DE CONOCIMIENTO (RAG CERRADO DE METODOLOGÍA)
const RAG_KNOWLEDGE_BASE = {
  planteamiento: {
    name: "Planteamiento del Problema",
    rules: "Método del embudo estricto: Macro (contexto mundial o internacional), Meso (contexto nacional/país) y Micro (contexto local/institución/empresa). Debe formular claramente síntomas, causas y pronóstico con delimitación espacial y temporal.",
    checklist: ["macro", "meso", "micro", "mundial", "perú", "empresa", "institución", "problema", "síntoma", "causa", "efecto", "delimitación"]
  },
  objetivos: {
    name: "Objetivos e Hipótesis",
    rules: "El Objetivo General debe iniciar obligatoriamente con un verbo en infinitivo medible (Determinar, Establecer, Analizar, Evaluar, Demostrar). Debe contener ambas variables delimitadas. La Hipótesis debe ser una respuesta afirmativa y coherente que responda directamente al objetivo general.",
    verbs: ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar"],
    checklist: ["objetivo", "hipótesis", "relación", "significativa", "variable"]
  },
  variables: {
    name: "Variables y Operacionalización",
    rules: "Operacionalización científica de variables. Variable 1 (Independiente/predictora) y Variable 2 (Dependiente/criterio). Cada variable debe desglosarse en dimensiones teóricas claras y cada dimensión en indicadores observables y medibles cuantitativa o cualitativamente.",
    checklist: ["variable", "dimensión", "indicador", "escala", "medición", "operacional"]
  },
  metodologia: {
    name: "Diseño Metodológico",
    rules: "Enfoque (Cuantitativo, Cualitativo o Mixto). Alcance o Nivel (Exploratorio, Descriptivo, Correlacional o Explicativo). Diseño (No experimental transversal, No experimental longitudinal, o Experimental puro/cuasiexperimental). Debe justificarse según los objetivos de la tesis.",
    checklist: ["cuantitativo", "cualitativo", "correlacional", "descriptivo", "explicativo", "experimental", "no experimental", "transversal", "longitudinal", "diseño", "enfoque"]
  }
};

/**
 * Orquesta la revisión socrática con RAG cerrado.
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

  // Intentar con Gemini si existe la clave
  if (keys.gemini) {
    try {
      const response = callGemini(keys.gemini, systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        return { text: response.trim(), provider: "gemini", model: "gemini-1.5-flash" };
      }
    } catch (e) {
      Logger.log("Error Gemini: " + e.toString());
    }
  }

  // Intentar con Groq si existe la clave
  if (keys.groq) {
    try {
      const response = callGroq(keys.groq, systemPrompt, userMessage);
      if (response && response.trim().length > 0) {
        return { text: response.trim(), provider: "groq", model: "llama-3.3-70b-versatile" };
      }
    } catch (e) {
      Logger.log("Error Groq: " + e.toString());
    }
  }

  // 2. FALLBACK INTELIGENTE: Motor RAG Cerrado Local Autónomo de Buhotech
  const localReply = evaluateWithLocalRAG(topicKey, userMessage, ragInfo);
  return { 
    text: localReply,
    provider: "buhotech-local-rag", 
    model: "closed-rag-v1"
  };
}

/**
 * Motor RAG Cerrado Local de Buhotech.
 * Evalúa semánticamente el texto según las reglas metodológicas oficiales
 * y genera retroalimentación socrática inmediata, breve y reflexiva.
 */
function evaluateWithLocalRAG(topicKey, userMessage, ragInfo) {
  const text = (userMessage || "").toLowerCase();
  
  if (text.length < 20) {
    return "🦉 Tu redacción es muy breve para analizarla. Redacta tu propuesta con más detalle para evaluar su rigor metodológico.";
  }

  if (topicKey === "planteamiento") {
    const hasMacro = text.includes("macro") || text.includes("mundial") || text.includes("global") || text.includes("internacional");
    const hasMeso = text.includes("meso") || text.includes("perú") || text.includes("nacional") || text.includes("país");
    const hasMicro = text.includes("micro") || text.includes("empresa") || text.includes("institución") || text.includes("colegio") || text.includes("hospital") || text.includes("local");

    if (!hasMacro && !hasMeso && !hasMicro) {
      return "🦉 Buen inicio. Para aplicar el método del embudo, ¿has considerado estructurarlo desde lo general (mundial/nacional) hacia lo específico (tu empresa o institución)?";
    }
    if (!hasMicro) {
      return "🦉 Muy buen contexto general. ¿Cuál es la entidad, empresa o población exacta (nivel micro) donde se observa este problema directamente?";
    }
    return "🦉 ¡Buen avance en el embudo! ¿Has precisado con claridad cuáles son las causas directas y las consecuencias de no solucionar este problema?";
  }

  if (topicKey === "objetivos") {
    const verbs = ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar"];
    const hasVerb = verbs.some(v => text.includes(v));
    const hasHip = text.includes("hipótesis") || text.includes("relación") || text.includes("significativa") || text.includes("influye");

    if (!hasVerb) {
      return "🦉 Recuerda que todo objetivo debe iniciar con un verbo en infinitivo medible (ej: Determinar, Analizar, Evaluar). ¿Qué verbo sintetiza mejor tu meta?";
    }
    if (!hasHip) {
      return "🦉 Tu objetivo tiene buena dirección. ¿Cómo formularías la hipótesis para responder de forma afirmativa y directa a este objetivo?";
    }
    return "🦉 Muy buena alineación entre objetivo e hipótesis. ¿Ambos enunciados mencionan exactamente las dos mismas variables de estudio?";
  }

  if (topicKey === "variables") {
    const hasDim = text.includes("dimens") || text.includes("componente") || text.includes("aspecto");
    const hasInd = text.includes("indicador") || text.includes("escala") || text.includes("ítem") || text.includes("medir");

    if (!hasDim) {
      return "🦉 Has propuesto tus variables. ¿Cuáles son las dimensiones teóricas en las que descompondrás cada una de ellas para estudiarlas?";
    }
    if (!hasInd) {
      return "🦉 Buenas dimensiones. Ahora, ¿qué indicadores observables o preguntas exactas te permitirán medir numéricamente cada dimensión?";
    }
    return "🦉 Gran rigor en la operacionalización. ¿Tus indicadores corresponden a una escala clara (como Likert o datos cuantitativos directos)?";
  }

  if (topicKey === "metodologia") {
    const hasEnfoque = text.includes("cuantitativ") || text.includes("cualitativ") || text.includes("mixto");
    const hasDiseno = text.includes("experimental") || text.includes("transversal") || text.includes("longitudinal") || text.includes("descriptiv") || text.includes("correlacional");

    if (!hasEnfoque) {
      return "🦉 Para fundamentar tu metodología: ¿tu enfoque será cuantitativo (datos numéricos y estadística) o cualitativo (comprensión fenomenológica)?";
    }
    if (!hasDiseno) {
      return "🦉 Bien definido el enfoque. ¿Tu diseño será no experimental transversal (medición en un solo corte de tiempo) o experimental con intervención?";
    }
    return "🦉 Excelente sustento metodológico. ¿Los instrumentos de recolección previstos son coherentes con este diseño y con tus objetivos?";
  }

  return "🦉 Tu redacción metodológica va por buen camino. ¿De qué manera esta propuesta responde directamente a la pregunta principal de tu tesis?";
}

function callGemini(apiKey, systemPrompt, userMessage) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
  
  const payload = {
    "contents": [{"role": "user", "parts": [{"text": userMessage}]}],
    "systemInstruction": {"parts": [{"text": systemPrompt}]},
    "generationConfig": {
      "temperature": 0.5,
      "maxOutputTokens": 200
    }
  };
  
  const options = {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
      return data.candidates[0].content.parts[0].text;
    }
  }
  throw new Error("HTTP " + response.getResponseCode() + ": " + response.getContentText());
}

function callGroq(apiKey, systemPrompt, userMessage) {
  const url = "https://api.groq.com/openai/v1/chat/completions";
  
  const payload = {
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "system", "content": systemPrompt},
      {"role": "user", "content": userMessage}
    ],
    "temperature": 0.5,
    "max_tokens": 200
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
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    if (data.choices && data.choices.length > 0 && data.choices[0].message) {
      return data.choices[0].message.content;
    }
  }
  throw new Error("HTTP " + response.getResponseCode() + ": " + response.getContentText());
}
