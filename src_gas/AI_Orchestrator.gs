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
    name: "Planteamiento del Problema (Método del Embudo)",
    rules: "Debe aplicar el método del embudo con 3 niveles: 1) Macro (contexto mundial o internacional con organismos o tendencias globales), 2) Meso (contexto nacional o del país con datos sectoriales), y 3) Micro (contexto local, empresa o institución concreta delimitando síntomas observables, causas directas y consecuencias o pronóstico).",
    checklist: ["macro", "meso", "micro", "mundial", "perú", "empresa", "institución", "problema", "síntoma", "causa", "efecto", "pronóstico", "delimitación"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Método del Embudo):\nEl planteamiento se redacta desde lo general hasta lo específico en 3 niveles:\n1. Macro (Internacional): ¿Cómo se manifiesta el problema en el mundo o Latinoamérica? Cita organismos de referencia (ej: OMS, OIT, UNESCO).\n2. Meso (Nacional): Aterriza la realidad en el Perú (o tu país) con estadísticas oficiales (INEI, ministerios o gremios sectoriales).\n3. Micro (Local/Institucional): Describe la situación en la empresa o institución donde harás tu tesis: síntomas observables (lo que pasa), causas directas (por qué pasa) y pronóstico (qué ocurrirá si no se interviene).",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\n«A nivel mundial, la OIT (2023) reporta que el 60% de trabajadores experimentan sobrecarga laboral que merma la productividad (Macro). En el Perú, datos del INEI señalan que 4 de cada 10 organizaciones presentan alta rotación atribuida a climas laborales deficientes (Meso). Específicamente en la empresa Inversiones ABC S.A.C., sede Lima 2024, los colaboradores manifiestan desmotivación, demoras de 48 horas en entrega de pedidos y conflictos internos, lo que genera pérdidas económicas y deserción del talento si no se implementa un plan de mejora organizacional (Micro).»"
  },
  objetivos: {
    name: "Pregunta, Objetivo e Hipótesis",
    rules: "Estructura tripartita articulada con las mismas dos variables (V1 y V2) delimitadas en tiempo y espacio: 1) Pregunta General (formulación interrogativa: ¿Cómo...? ¿De qué manera...?). 2) Objetivo General (inicia obligatoriamente con verbo en infinitivo medible: Determinar, Establecer, Demostrar, Evaluar, etc.). 3) Hipótesis General (respuesta afirmativa y comprobable que no lleva verbo en infinitivo).",
    verbs: ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar"],
    checklist: ["pregunta", "cómo", "de qué manera", "objetivo", "determinar", "establecer", "hipótesis", "existe", "relación", "variable"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Pregunta, Objetivo e Hipótesis):\n• 1. Pregunta General: Formulación interrogativa (ej: ¿Cómo se relaciona...? ¿De qué manera incide...?). Debe articular tus dos variables (V1 y V2), la población, el lugar y el año.\n• 2. Objetivo General: Inicia siempre con un verbo en infinitivo medible (Determinar, Establecer, Demostrar). Guarda la misma formulación de la pregunta pero en forma de propósito de acción.\n• 3. Hipótesis General: Es la respuesta tentativa y afirmativa a la pregunta y objetivo. No lleva verbo en infinitivo; afirma la existencia de relación o efecto entre ambas variables.",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\n• Pregunta General: ¿Cómo se relaciona el clima organizacional con el desempeño laboral en los colaboradores de la empresa Inversiones ABC S.A.C., Lima, 2024?\n• Objetivo General: Determinar la relación entre el clima organizacional y el desempeño laboral en los colaboradores de la empresa Inversiones ABC S.A.C., Lima, 2024.\n• Hipótesis General: Existe una relación directa y significativa entre el clima organizacional y el desempeño laboral en los colaboradores de la empresa Inversiones ABC S.A.C., Lima, 2024."
  },
  variables: {
    name: "Variables y Operacionalización",
    rules: "Operacionalización científica de variables. Variable 1 (Independiente/predictora) y Variable 2 (Dependiente/criterio). Cada variable debe desglosarse en al menos dos dimensiones teóricas y cada dimensión en indicadores medibles u observables.",
    checklist: ["variable", "dimensión", "indicador", "escala", "medición", "operacional"],
    help1_explicacion: "🦉 1ª Ayuda - Explicación (Operacionalización de Variables):\nOperacionalizar es convertir conceptos teóricos abstractos en elementos empíricamente observables:\n1. Identificación: Define con exactitud la Variable 1 (Independiente / Causa) y la Variable 2 (Dependiente / Efecto).\n2. Dimensiones: Son los subtemas o componentes teóricos que integran cada variable (mínimo 2 por variable).\n3. Indicadores: Son las métricas, preguntas o parámetros observables con los que recopilarás datos (ej: escala Likert de 5 niveles).",
    help2_ejemplo: "🦉 2ª Ayuda - Ejemplo Modelado de Tesis:\nVariable 1: Clima Organizacional\n• Dimensión 1: Liderazgo directivo (Indicadores: Comunicación horizontal, apoyo del jefe, retroalimentación).\n• Dimensión 2: Condiciones de trabajo (Indicadores: Ergonomía, herramientas laborales, seguridad física).\n\nVariable 2: Desempeño Laboral\n• Dimensión 1: Eficiencia operativa (Indicadores: Precisión de tareas, cumplimiento de plazos, calidad del entregable).\n• Dimensión 2: Compromiso institucional (Indicadores: Puntualidad, proactividad, trabajo cooperativo)."
  },
  metodologia: {
    name: "Diseño Metodológico",
    rules: "Las 3 decisiones científicas del método: 1) Enfoque (Cuantitativo, Cualitativo o Mixto), 2) Alcance o Nivel (Descriptivo, Correlacional o Explicativo), y 3) Diseño (No experimental transversal, longitudinal, o Experimental con pretest), delimitando población y muestra.",
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

  // 1. Prompt de Sistema RAG Cerrado (Confinamiento estricto y estructura pedagógica)
  const systemPrompt = 
    "Eres BúhoTech IA, tutor metodológico socrático de Buhotech Labs para Tesis Universitarias.\n" +
    "Tu misión es revisar la redacción del estudiante EVALUANDO ESTRICTAMENTE LO SOLICITADO EN ESTA ACTIVIDAD:\n" +
    "ACTIVIDAD ACTUAL: " + ragInfo.name + "\n" +
    "CONSIGNA Y REQUISITOS METODOLÓGICOS:\n" + ragInfo.rules + "\n\n" +
    "ESTRUCTURA DE RESPUESTA OBLIGATORIA (Sé directo, claro y constructivo en máximo 4-5 líneas):\n" +
    "📊 Nivel de avance: [Calcula un porcentaje de 0% a 100% según los componentes requeridos que el alumno incluyó]\n" +
    "✅ Logrado: [Nombra en una frase corta lo que el estudiante ya incluyó correctamente según la consigna]\n" +
    "⚠️ Te falta para mejorar: [Indica con precisión el componente específico que omitió o debe pulir según lo solicitado]\n" +
    "🦉 Andamiaje socrático: [Formula UNA sola pregunta reflexiva que active sus saberes previos para que el alumno complete lo que falta sin redactarle la respuesta hecha]\n\n" +
    "REGLA: No des nunca el párrafo redactado. Guíalo para que él mismo lo formule.";

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

  // 5. Evaluación socrática según el eje temático y rúbrica solicitada
  if (topicKey === "planteamiento") {
    const hasMacro = text.includes("macro") || text.includes("mundial") || text.includes("global") || text.includes("internacional") || text.includes("mundo") || text.includes("oit") || text.includes("oms") || text.includes("países");
    const hasMeso = text.includes("meso") || text.includes("perú") || text.includes("nacional") || text.includes("país") || text.includes("inei") || text.includes("latinoamérica") || text.includes("sector");
    const hasMicro = text.includes("micro") || text.includes("empresa") || text.includes("institución") || text.includes("colegio") || text.includes("hospital") || text.includes("local") || text.includes("organización") || text.includes("sede");
    const hasCauses = text.includes("causa") || text.includes("síntoma") || text.includes("efecto") || text.includes("consecuencia") || text.includes("debido a") || text.includes("genera") || text.includes("pronóstico");

    let count = (hasMacro ? 1 : 0) + (hasMeso ? 1 : 0) + (hasMicro ? 1 : 0) + (hasCauses ? 1 : 0);
    let pct = Math.min(100, Math.max(25, count * 25));

    let logrado = [];
    if (hasMacro) logrado.push("Contexto internacional (Macro)");
    if (hasMeso) logrado.push("Realidad nacional (Meso)");
    if (hasMicro) logrado.push("Delimitación institucional (Micro)");
    if (hasCauses) logrado.push("Síntomas y causas directas");

    let falta = [];
    if (!hasMicro) falta.push("Delimitar la empresa o institución concreta (Nivel Micro)");
    if (!hasMacro) falta.push("Contextualizar la tendencia internacional (Nivel Macro)");
    if (!hasMeso) falta.push("Respaldar con datos de la realidad nacional (Nivel Meso)");
    if (!hasCauses) falta.push("Detallar los síntomas observables y el pronóstico");

    let pregunta = "";
    if (!hasMicro) {
      pregunta = `Al estudiar ${sampleTerm}, ¿cuál es la institución, empresa o sede exacta donde se evidencian las consecuencias del problema?`;
    } else if (!hasCauses) {
      pregunta = `Has ubicado bien el entorno de ${sampleTerm}. ¿Cuáles son las causas directas identificadas y qué ocurrirá si no se interviene?`;
    } else if (!hasMacro || !hasMeso) {
      pregunta = `Para sustentar el problema: ¿qué organismos de referencia (OMS, OIT) o estadísticas de tu país respaldan esta situación?`;
    } else {
      pct = 95;
      pregunta = `¡Tu embudo articula muy bien los 3 niveles! ¿Tu pregunta general de investigación sintetiza fielmente este problema delimitado?`;
    }

    return `📊 Nivel de avance: ${pct}%\n` +
           `✅ Logrado: ${logrado.length > 0 ? logrado.join(", ") : "Identificación inicial de variables"}\n` +
           `⚠️ Te falta para mejorar: ${falta.length > 0 ? falta.join("; ") : "Pulir redacción científica"}\n` +
           `🦉 Andamiaje socrático: ${pregunta}`;
  }

  if (topicKey === "objetivos") {
    const hasPregunta = text.includes("?") || text.includes("¿") || text.includes("pregunta") || text.includes("cómo") || text.includes("de qué manera") || text.includes("en qué medida");
    const verbs = ["determinar", "establecer", "analizar", "evaluar", "demostrar", "identificar", "describir", "relacionar", "comparar", "explicar"];
    const hasVerb = verbs.some(v => text.includes(v));
    const hasHip = text.includes("hipótesis") || text.includes("relación") || text.includes("significativa") || text.includes("influye") || text.includes("incide") || text.includes("existe");
    const hasPoblacion = text.includes("en ") || text.includes("de ") || text.includes("202") || text.includes("trabajadores") || text.includes("estudiantes") || text.includes("empresa") || text.includes("colaboradores");

    let count = (hasPregunta ? 1 : 0) + (hasVerb ? 1 : 0) + (hasHip ? 1 : 0) + (hasPoblacion ? 1 : 0);
    let pct = Math.min(100, Math.max(25, count * 25));

    let logrado = [];
    if (hasPregunta) logrado.push("Pregunta General de investigación");
    if (hasVerb) logrado.push("Objetivo General con verbo en infinitivo");
    if (hasHip) logrado.push("Hipótesis General afirmativa");
    if (hasPoblacion) logrado.push("Delimitación espacial y temporal");

    let falta = [];
    if (!hasPregunta) falta.push("Incluir la Pregunta General interrogativa (¿Cómo...? ¿De qué manera...?)");
    if (!hasVerb) falta.push("Iniciar el Objetivo General con verbo en infinitivo medible (Determinar, Establecer)");
    if (!hasHip) falta.push("Formular la Hipótesis General respondiendo afirmativamente al objetivo");
    if (!hasPoblacion) falta.push("Delimitar la población de estudio, lugar y periodo anual");

    let pregunta = "";
    if (!hasPregunta) {
      pregunta = `Para tener la triada completa: ¿cómo formularías la Pregunta General que da origen a este objetivo e hipótesis?`;
    } else if (!hasVerb) {
      pregunta = `Al estudiar ${sampleTerm}, ¿qué verbo en infinitivo medible refleja con mayor precisión el propósito de tu tesis?`;
    } else if (!hasHip) {
      pregunta = `Tienes la pregunta y el objetivo. ¿Cómo redactarías la Hipótesis como una respuesta tentativa y afirmativa?`;
    } else {
      pct = 95;
      pregunta = `¡Excelente alineación entre Pregunta, Objetivo e Hipótesis para ${sampleTerm}! ¿Ambos enunciados guardan exactamente las dos mismas variables?`;
    }

    return `📊 Nivel de avance: ${pct}%\n` +
           `✅ Logrado: ${logrado.length > 0 ? logrado.join(", ") : "Enunciados preliminares"}\n` +
           `⚠️ Te falta para mejorar: ${falta.length > 0 ? falta.join("; ") : "Consolidar concordancia de variables"}\n` +
           `🦉 Andamiaje socrático: ${pregunta}`;
  }

  if (topicKey === "variables") {
    const hasV1V2 = text.includes("variable") || text.includes("independiente") || text.includes("dependiente") || text.includes("v1") || text.includes("v2");
    const hasDim = text.includes("dimens") || text.includes("componente") || text.includes("factor") || text.includes("aspecto");
    const hasInd = text.includes("indicador") || text.includes("escala") || text.includes("ítem") || text.includes("medir") || text.includes("preguntas") || text.includes("cuestionario");

    let count = (hasV1V2 ? 1 : 0) + (hasDim ? 1 : 0) + (hasInd ? 1 : 0);
    let pct = count === 3 ? 90 : (count === 2 ? 65 : 35);

    let logrado = [];
    if (hasV1V2) logrado.push("Identificación de Variables V1 y V2");
    if (hasDim) logrado.push("Dimensiones teóricas");
    if (hasInd) logrado.push("Indicadores empíricos de medición");

    let falta = [];
    if (!hasV1V2) falta.push("Diferenciar con claridad la Variable Independiente (V1) y Dependiente (V2)");
    if (!hasDim) falta.push("Proponer al menos 2 dimensiones teóricas por cada variable");
    if (!hasInd) falta.push("Formular los indicadores observables o preguntas medibles");

    let pregunta = "";
    if (!hasDim) {
      pregunta = `Has definido tus variables sobre ${sampleTerm}. ¿En qué dimensiones teóricas descompondrás cada una de ellas?`;
    } else if (!hasInd) {
      pregunta = `Buenas dimensiones. ¿Qué indicadores empíricos o métricas te permitirán recopilar datos en el instrumento?`;
    } else {
      pct = 95;
      pregunta = `¡Operacionalización bien estructurada en ${sampleTerm}! ¿Qué escala de medición (ej. Likert de 5 niveles) emplearás para evaluar los indicadores?`;
    }

    return `📊 Nivel de avance: ${pct}%\n` +
           `✅ Logrado: ${logrado.length > 0 ? logrado.join(", ") : "Variables iniciales"}\n` +
           `⚠️ Te falta para mejorar: ${falta.length > 0 ? falta.join("; ") : "Definir escalas de medición"}\n` +
           `🦉 Andamiaje socrático: ${pregunta}`;
  }

  if (topicKey === "metodologia") {
    const hasEnfoque = text.includes("cuantitativ") || text.includes("cualitativ") || text.includes("mixto");
    const hasAlcance = text.includes("descriptiv") || text.includes("correlacional") || text.includes("explicativ") || text.includes("exploratori");
    const hasDiseno = text.includes("experimental") || text.includes("transversal") || text.includes("longitudinal") || text.includes("no experimental");
    const hasMuestra = text.includes("muestra") || text.includes("población") || text.includes("censal") || text.includes("muestreo") || text.includes("cuestionario");

    let count = (hasEnfoque ? 1 : 0) + (hasAlcance ? 1 : 0) + (hasDiseno ? 1 : 0) + (hasMuestra ? 1 : 0);
    let pct = Math.min(100, Math.max(25, count * 25));

    let logrado = [];
    if (hasEnfoque) logrado.push("Enfoque metodológico definido");
    if (hasAlcance) logrado.push("Alcance de investigación sustentado");
    if (hasDiseno) logrado.push("Diseño temporal metodológico");
    if (hasMuestra) logrado.push("Población o muestra delimitada");

    let falta = [];
    if (!hasEnfoque) falta.push("Declarar y sustentar el Enfoque (Cuantitativo o Cualitativo)");
    if (!hasAlcance) falta.push("Definir el Alcance o Nivel (Descriptivo, Correlacional o Explicativo)");
    if (!hasDiseno) falta.push("Especificar el Diseño (No experimental transversal o Experimental)");
    if (!hasMuestra) falta.push("Mencionar la población de estudio y la muestra");

    let pregunta = "";
    if (!hasEnfoque) {
      pregunta = `Para fundamentar la metodología de ${sampleTerm}: ¿tu enfoque será cuantitativo (medición estadística) o cualitativo?`;
    } else if (!hasDiseno) {
      pregunta = `Enfoque clarificado. ¿Tu diseño será no experimental transversal (en un solo momento temporal) o experimental?`;
    } else if (!hasMuestra) {
      pregunta = `Buen diseño metodológico. ¿En qué población o muestra de sujetos aplicarás tus instrumentos de recolección?`;
    } else {
      pct = 95;
      pregunta = `¡Excelente rigor metodológico para ${sampleTerm}! ¿El tamaño de tu muestra te permitirá aplicar pruebas estadísticas como Pearson o Spearman con confiabilidad?`;
    }

    return `📊 Nivel de avance: ${pct}%\n` +
           `✅ Logrado: ${logrado.length > 0 ? logrado.join(", ") : "Bases metodológicas"}\n` +
           `⚠️ Te falta para mejorar: ${falta.length > 0 ? falta.join("; ") : "Detallar técnicas e instrumentos"}\n` +
           `🦉 Andamiaje socrático: ${pregunta}`;
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
