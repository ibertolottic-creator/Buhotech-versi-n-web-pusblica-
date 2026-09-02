/**
 * Code.gs
 * Punto de entrada de la Web App en Google Apps Script.
 * Contiene el enrutamiento principal y las funciones RPC expuestas.
 */

/**
 * Función principal que atiende las peticiones GET (visitas al navegador)
 */
function doGet(e) {
  e = e || { parameter: {} };
  const page = (e.parameter && e.parameter.page) ? e.parameter.page : 'login';
  
  try {
    const template = HtmlService.createTemplateFromFile(page);
    template.url = ScriptApp.getService().getUrl();
    
    // Parámetros dinámicos según la página
    if (page === 'lesson') {
      const phase = parseInt(e.parameter.phase || '1');
      template.phase_number = phase;
      template.questions = JSON.stringify(getQuestionsForPhase(phase));
    }
    
    return template.evaluate()
      .setTitle('Buhotech Labs')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Permite embedding
      
  } catch (error1) {
    // Si falla, intentamos buscar el archivo asumiendo que tiene extensión visible .html
    try {
      const template = HtmlService.createTemplateFromFile(page + '.html');
      template.url = ScriptApp.getService().getUrl();
      if (page === 'lesson') {
        const phase = parseInt(e.parameter.phase || '1');
        template.phase_number = phase;
        template.questions = JSON.stringify(getQuestionsForPhase(phase));
      }
      return template.evaluate()
        .setTitle('Buhotech Labs')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    } catch (error2) {
      // Si ambos fallan, mostramos el error técnico en pantalla
      return HtmlService.createHtmlOutput("<h2>Error al cargar página: " + page + "</h2><p>" + error1.toString() + "</p>");
    }
  }
}

/**
 * Función de utilidad a prueba de balas para incluir CSS o JS
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e1) {
    try {
      return HtmlService.createHtmlOutputFromFile(filename + '.html').getContent();
    } catch (e2) {
      try {
        return HtmlService.createHtmlOutputFromFile('style').getContent();
      } catch (e3) {
        return "<script>console.error('No se pudo cargar el archivo: " + filename + "');</script><style>/* Fallback */</style>";
      }
    }
  }
}

/**
 * Funciones RPC llamadas desde el cliente usando `google.script.run`
 * =================================================================
 */

function rpcLogin(username) {
  try {
    const user = createUser(username);
    return { success: true, user: user };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function rpcGetUserData(userId) {
  try {
    const user = findRecordBy("users", "id", userId);
    return { success: true, user: user };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function rpcGetGrades(userId) {
  try {
    const user = findRecordBy("users", "id", userId);
    const grades = calculateAndSaveGrades(userId);
    const workshops = getUserWorkshopSubmissions(userId);
    
    // Obtener respuestas abiertas de user_responses
    const allResponses = findRecordsBy("user_responses", "user_id", userId);
    const textResponses = allResponses.filter(r => {
      return r.selected_answer && String(r.selected_answer).length > 10;
    });

    return { 
      success: true, 
      user: user,
      grades: grades || {},
      workshops: workshops || [],
      text_responses: textResponses || []
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcSaveApiKey(provider, apiKey) {
  try {
    const props = PropertiesService.getScriptProperties();
    const cleanKey = String(apiKey || '').trim();
    if (provider === 'gemini') {
      props.setProperty("GEMINI_API_KEY", cleanKey);
    } else if (provider === 'groq') {
      props.setProperty("GROQ_API_KEY", cleanKey);
    } else {
      props.setProperty("GEMINI_API_KEY", cleanKey);
    }
    return { success: true, message: "Clave guardada con éxito." };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcGetApiKeyStatus() {
  try {
    const keys = getKeys();
    const count = (keys.geminiPool && keys.geminiPool.length) || (keys.gemini ? 1 : 0);
    return {
      success: true,
      hasGemini: count > 0,
      geminiCount: count,
      hasGroq: !!(keys.groq && keys.groq.length > 5),
      geminiMasked: keys.gemini ? (keys.gemini.substring(0, 8) + "..." + keys.gemini.substring(keys.gemini.length - 4) + ` (${count} clave${count > 1 ? 's' : ''} activa${count > 1 ? 's' : ''})`) : null,
      groqMasked: keys.groq ? (keys.groq.substring(0, 6) + "..." + keys.groq.substring(keys.groq.length - 4)) : null
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Procesa la respuesta de una pregunta interactiva con telemetría anti-fraude y XP
 */
function rpcRespondQuiz(data) {
  try {
    const user = findRecordBy("users", "id", data.userId);
    if (!user) return { success: false, error: "Usuario no encontrado" };

    const questions = getQuestionsForPhase(data.phase || 1);
    const question = questions.find(q => q.id === data.questionId);
    
    let isCorrect = false;
    let feedbackText = "";
    
    if (question) {
      if (question.question_type === "HONESTY") {
        if (data.selectedAnswer === "A") {
          isCorrect = parseInt(user.pasted_text_count || 0) > 0;
          feedbackText = isCorrect ? "Gracias por tu honestidad. Asumir el error es el primer paso ético." : "No registramos que pegaras texto, pero valoramos tu intención.";
        } else {
          isCorrect = parseInt(user.pasted_text_count || 0) === 0;
          feedbackText = isCorrect ? "¡Excelente! Mantuviste la integridad académica." : "Falso. La telemetría registró texto pegado. La integridad es fundamental.";
        }
      } else if (question.question_type === "SCENARIO" || question.question_type === "DILEMMA") {
        if (Array.isArray(question.options)) {
          const opt = question.options.find(o => o.id === data.selectedAnswer);
          if (opt && opt.is_ethical !== undefined) {
            isCorrect = opt.is_ethical;
            feedbackText = opt.feedback || (isCorrect ? question.verification_text : question.rescue_text);
          } else {
            isCorrect = (data.selectedAnswer === question.correct_answer);
            feedbackText = isCorrect ? question.verification_text : question.rescue_text;
          }
        } else {
          isCorrect = (data.selectedAnswer === question.correct_answer);
          feedbackText = isCorrect ? question.verification_text : question.rescue_text;
        }
      } else if (question.question_type === "MATCH") {
        try {
          let selections = data.selectedAnswer;
          if (typeof selections === 'string') {
            selections = JSON.parse(selections);
          }
          isCorrect = true;
          const options = Array.isArray(question.options) ? question.options : [];
          for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const chosen = String(selections[opt.id] || '').trim();
            const expected = String(opt.right || '').trim();
            if (chosen !== expected) {
              isCorrect = false;
              break;
            }
          }
        } catch(err) {
          isCorrect = false;
        }
        feedbackText = isCorrect ? (question.verification_text || "¡Excelente! Has comprendido la alineación lógica.") : (question.rescue_text || "El problema es pregunta, el objetivo es verbo, la hipótesis es afirmación.");
      } else if (question.question_type === "SORT") {
        const expected = Array.isArray(question.correct_answer) ? question.correct_answer.join(',') : String(question.correct_answer);
        isCorrect = (String(data.selectedAnswer).trim() === expected.trim());
        feedbackText = isCorrect ? (question.verification_text || "¡Secuencia correcta!") : (question.rescue_text || "Revisa el orden secuencial.");
      } else {
        isCorrect = (String(data.selectedAnswer).trim().toUpperCase() === String(question.correct_answer).trim().toUpperCase());
        feedbackText = isCorrect ? (question.verification_text || "¡Correcto!") : (question.rescue_text || "Revisa los conceptos clave.");
      }
    } else {
      isCorrect = true;
      feedbackText = "¡Respuesta registrada!";
    }

    // Telemetría de comportamiento
    let behaviorFlag = "NORMAL";
    const minTime = question ? (question.min_reading_time_ms || 3000) : 3000;
    const expTime = question ? (question.expected_time_ms || 10000) : 10000;
    
    if (data.responseTimeMs < minTime) {
      behaviorFlag = "FAST_RANDOM";
    } else if (data.responseTimeMs > expTime) {
      behaviorFlag = "SEARCHING_THINKING";
    }
    if (data.hasPasted) {
      behaviorFlag = "PASTED";
      user.pasted_text_count = parseInt(user.pasted_text_count || 0) + 1;
    }

    // Puntos y vidas
    let xpGained = 0;
    let heartsLost = 0;

    if (isCorrect && behaviorFlag !== "FAST_RANDOM") {
      xpGained = (data.failedAttempts === 0) ? 10 : 5;
      user.xp = parseInt(user.xp || 0) + xpGained;
    } else if (!isCorrect || behaviorFlag === "FAST_RANDOM") {
      if (data.failedAttempts === 0) {
        heartsLost = 1;
        user.hearts = Math.max(0, parseInt(user.hearts || 10) - heartsLost);
      }
    }

    // Guardar respuesta en hoja 'user_responses'
    saveUserResponse({
      user_id: user.id,
      question_id: data.questionId,
      selected_answer: data.selectedAnswer,
      is_correct: isCorrect,
      response_time_ms: data.responseTimeMs,
      failed_attempts: data.failedAttempts || 0,
      behavior_flag: behaviorFlag,
      dimension: data.dimension || "saber",
      level: data.level || 1,
      feedback_type: isCorrect ? "VERIFICATION" : "RESCUE"
    });

    // Actualizar usuario en hoja 'users'
    updateRecord("users", "id", user.id, {
      xp: user.xp,
      hearts: user.hearts,
      pasted_text_count: user.pasted_text_count || 0
    });

    // Recalcular y actualizar la fila única del estudiante en 'competency_grades'
    calculateAndSaveGrades(user.id);

    return {
      success: true,
      is_correct: isCorrect,
      behavior: behaviorFlag,
      feedback_text: feedbackText,
      xp_gained: xpGained,
      hearts_lost: heartsLost,
      user: { xp: user.xp, hearts: user.hearts }
    };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * Marca el módulo como completado y desbloquea el siguiente
 */
function rpcCompleteModule(userId, phaseNumber) {
  try {
    const user = findRecordBy("users", "id", userId);
    if (user) {
      const nextModule = Math.max(parseInt(user.unlocked_module || 1), parseInt(phaseNumber) + 1);
      updateRecord("users", "id", user.id, {
        unlocked_module: nextModule
      });
    }
    // Recalcular y guardar la fila única consolidada del estudiante en 'competency_grades'
    const grades = calculateAndSaveGrades(userId);
    return { success: true, grades: grades };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcSocraticChat(userId, topic, userMessage) {
  try {
    const aiResponse = aiOrchestrateChat(topic, userMessage);
    saveSocraticMessage(userId, aiResponse.provider, aiResponse.model, userMessage, aiResponse.text, topic);
    return { success: true, ai_response: aiResponse.text };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

function rpcGetAdminStats() {
  try {
    const users = getRecords("users");
    const grades = getRecords("competency_grades");
    return { success: true, data: { usersCount: users.length } };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcSubmitWorkshop(userId, workshopType, submissionData) {
  try {
    if (!userId) {
      return { success: false, error: "ID de usuario requerido" };
    }
    const user = findRecordBy("users", "id", userId);
    if (!user) {
      return { success: false, error: "Usuario no registrado con ID: " + userId };
    }

    // 1. Guardar en 'workshop_submissions' con nota inicial (18.0 por entrega completa)
    saveWorkshopSubmission(userId, workshopType, submissionData, "Entregado con andamiaje socrático", 18.0, "Búho Socrático");

    // 2. Desbloquear Fase 3 (Laboratorio Ético)
    const nextModule = Math.max(parseInt(user.unlocked_module || 1), 3);
    updateRecord("users", "id", user.id, {
      unlocked_module: nextModule
    });

    // 3. Recalcular y actualizar la fila del estudiante en 'competency_grades' y 'Evaluacion_Consolidada'
    try {
      calculateAndSaveGrades(userId);
    } catch(errGrading) {
      Logger.log("Advertencia calculando notas en workshop: " + errGrading.toString());
    }

    return { success: true };
  } catch(e) {
    Logger.log("Error crítico en rpcSubmitWorkshop: " + e.toString());
    return { success: false, error: e.toString() };
  }
}

function rpcRecordInfographicView(userId) {
  try {
    const user = findRecordBy("users", "id", userId);
    if (user) {
      updateRecord("users", "id", user.id, {
        infographic_views: parseInt(user.infographic_views || 0) + 1
      });
    }
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcRecordPaste(userId) {
  try {
    const user = findRecordBy("users", "id", userId);
    if (user) {
      updateRecord("users", "id", user.id, {
        pasted_text_count: parseInt(user.pasted_text_count || 0) + 1
      });
      calculateAndSaveGrades(userId);
    }
    return { success: true };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}

function rpcSyncConsolidatedSheet() {
  try {
    const result = syncAllUsersConsolidatedSheet();
    return { success: true, count: result.updatedCount };
  } catch(e) {
    return { success: false, error: e.toString() };
  }
}
