(() => {
  "use strict";

  const TEST_VERSION = "mastertech-intelligence-a-80-owner-source-v5";
  const STORAGE_KEY_PREFIX = "academy-strateg:iq80:attempt:v5";
  const DEFAULT_DURATION_SECONDS = 30 * 60;
  const QUESTIONS = Array.isArray(window.IQ_TEST_QUESTIONS) ? window.IQ_TEST_QUESTIONS : [];
  const params = new URLSearchParams(window.location.search);
  const isLocal = ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
  const qaEnabled = isLocal && params.get("qa") === "1";
  const assignmentContext = resolveAssignmentContext();
  const STORAGE_KEY = `${STORAGE_KEY_PREFIX}:${assignmentContext.storageKey}`;
  const durationSeconds = qaEnabled && Number(params.get("seconds")) > 0
    ? Math.max(5, Number(params.get("seconds")))
    : DEFAULT_DURATION_SECONDS;

  const elements = {
    introView: document.getElementById("introView"),
    testView: document.getElementById("testView"),
    reviewView: document.getElementById("reviewView"),
    doneView: document.getElementById("doneView"),
    startForm: document.getElementById("startForm"),
    candidateNameCard: document.getElementById("candidateNameCard"),
    candidateDisplayName: document.getElementById("candidateDisplayName"),
    candidateAvatar: document.getElementById("candidateAvatar"),
    readyCheck: document.getElementById("readyCheck"),
    startError: document.getElementById("startError"),
    resumeButton: document.getElementById("resumeButton"),
    topbarStatus: document.getElementById("topbarStatus"),
    timer: document.getElementById("timer"),
    mobileTimer: document.getElementById("mobileTimer"),
    questionMap: document.getElementById("questionMap"),
    answeredCount: document.getElementById("answeredCount"),
    mobileAnsweredCount: document.getElementById("mobileAnsweredCount"),
    progressBar: document.getElementById("progressBar"),
    questionNumber: document.getElementById("questionNumber"),
    questionCard: document.querySelector(".question-card"),
    saveStatus: document.getElementById("saveStatus"),
    questionPrompt: document.getElementById("questionPrompt"),
    questionDiagram: document.getElementById("questionDiagram"),
    answerOptions: document.getElementById("answerOptions"),
    prevButton: document.getElementById("prevButton"),
    nextButton: document.getElementById("nextButton"),
    skipButton: document.getElementById("skipButton"),
    reviewButton: document.getElementById("reviewButton"),
    openMapButton: document.getElementById("openMapButton"),
    closeMapButton: document.getElementById("closeMapButton"),
    mapPanel: document.getElementById("mapPanel"),
    mapBackdrop: document.getElementById("mapBackdrop"),
    reviewSummary: document.getElementById("reviewSummary"),
    unansweredBlock: document.getElementById("unansweredBlock"),
    unansweredList: document.getElementById("unansweredList"),
    reviewAnswered: document.getElementById("reviewAnswered"),
    reviewMissing: document.getElementById("reviewMissing"),
    reviewTime: document.getElementById("reviewTime"),
    backToTestButton: document.getElementById("backToTestButton"),
    finishButton: document.getElementById("finishButton"),
    finishWarning: document.getElementById("finishWarning"),
    confirmDialog: document.getElementById("confirmDialog"),
    confirmDialogText: document.getElementById("confirmDialogText"),
    doneSummary: document.getElementById("doneSummary"),
    qaPanel: document.getElementById("qaPanel"),
    qaFillButton: document.getElementById("qaFillButton")
  };

  let attempt = null;
  let timerId = null;
  let activeQuestionStartedAt = null;
  let currentView = "intro";

  function isoNow() {
    return new Date().toISOString();
  }

  function compactString(value, maxLength = 160) {
    return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  }

  function hashString(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function resolveAssignmentContext() {
    const injected = window.ASSESSMENT_ASSIGNMENT && typeof window.ASSESSMENT_ASSIGNMENT === "object"
      ? window.ASSESSMENT_ASSIGNMENT
      : {};
    const rawToken = compactString(params.get("token") || params.get("assignment_token"), 512);
    const assignmentId = compactString(
      injected.assignmentId || params.get("assignment_id") || (rawToken ? `token-${hashString(rawToken)}` : "")
    );
    const candidateId = compactString(injected.candidateId || params.get("candidate_id"));
    const displayName = compactString(injected.displayName || injected.candidateName || "", 120);
    const journeyId = compactString(injected.journeyId || params.get("journey_id"));
    const routeId = compactString(injected.routeId || params.get("route_id") || "trainer");
    const localDemo = isLocal && !assignmentId;
    const resolvedAssignmentId = assignmentId || (localDemo ? "local-demo-iq80" : "");

    return {
      assignmentId: resolvedAssignmentId,
      candidateId: candidateId || (localDemo ? "demo-candidate" : null),
      displayName: displayName || (localDemo ? "Тестовый кандидат" : "Кандидат"),
      journeyId: journeyId || null,
      routeId,
      source: injected.assignmentId ? "server_context" : rawToken ? "personal_link" : localDemo ? "local_demo" : "missing",
      tokenFingerprint: rawToken ? hashString(rawToken) : null,
      resolved: Boolean(resolvedAssignmentId),
      demo: localDemo,
      storageKey: resolvedAssignmentId ? hashString(resolvedAssignmentId) : "unassigned"
    };
  }

  function createAttempt(assignment) {
    const started = Date.now();
    return {
      schemaVersion: 1,
      testId: "mastertech-intelligence-a",
      testVersion: TEST_VERSION,
      title: "Тест на интеллект, вариант А",
      questionCount: QUESTIONS.length,
      durationLimitSeconds: durationSeconds,
      attemptId: `iq80-${started}-${Math.random().toString(36).slice(2, 8)}`,
      assignment,
      status: "in_progress",
      completionReason: null,
      startedAt: new Date(started).toISOString(),
      deadlineAt: new Date(started + durationSeconds * 1000).toISOString(),
      completedAt: null,
      currentIndex: 0,
      answers: {},
      visited: {},
      questionTimeMs: {},
      activityLog: [{ type: "test_started", at: new Date(started).toISOString(), assignmentId: assignment.assignmentId }],
      hiddenTimeMs: 0,
      hiddenSince: null,
      lastSavedAt: null
    };
  }

  function loadStoredAttempt() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.testVersion !== TEST_VERSION || parsed.questionCount !== QUESTIONS.length) return null;
      if (parsed.assignment?.assignmentId !== assignmentContext.assignmentId) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function saveAttempt() {
    if (!attempt) return;
    attempt.lastSavedAt = isoNow();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attempt));
    elements.saveStatus.textContent = "Сохранено";
  }

  function clearAttempt() {
    localStorage.removeItem(STORAGE_KEY);
    attempt = null;
  }

  function validateQuestionBank() {
    if (QUESTIONS.length !== 80) return `Загружено ${QUESTIONS.length} из 80 вопросов.`;
    const ids = QUESTIONS.map((question) => question.id);
    const invalidId = ids.find((id, index) => id !== index + 1);
    if (invalidId !== undefined) return "Нарушена последовательность нумерации вопросов.";
    const invalidQuestion = QUESTIONS.find((question) => !question.prompt || !Array.isArray(question.options) || question.options.length < 2);
    if (invalidQuestion) return `Вопрос ${invalidQuestion.id} загружен не полностью.`;
    const assetIds = new Set();
    for (const question of QUESTIONS) {
      const optionKeys = question.options.map((option) => option.key);
      if (new Set(optionKeys).size !== optionKeys.length) return `В вопросе ${question.id} повторяются варианты ответа.`;
      if (question.diagram && (!question.diagramSrc || !question.diagramAssetId)) return `В вопросе ${question.id} не подключено условие задания.`;
      if (question.diagramAssetId) {
        if (assetIds.has(question.diagramAssetId)) {
          const sharedDiagram = question.id === 79 || question.id === 80;
          if (!sharedDiagram) return `В вопросе ${question.id} повторяется идентификатор изображения.`;
        }
        assetIds.add(question.diagramAssetId);
      }
      for (const option of question.options) {
        if (!String(option.label || "").trim() && !option.imageSrc) return `В вопросе ${question.id} отсутствует вариант ${option.key.toUpperCase()}.`;
        if (option.imageSrc && !option.assetId) return `В вопросе ${question.id} не задан идентификатор варианта ${option.key.toUpperCase()}.`;
        if (option.assetId) {
          if (assetIds.has(option.assetId)) return `В вопросе ${question.id} повторяется идентификатор варианта.`;
          assetIds.add(option.assetId);
        }
      }
    }
    return "";
  }

  function showView(name) {
    currentView = name;
    elements.introView.hidden = name !== "intro";
    elements.testView.hidden = name !== "test";
    elements.reviewView.hidden = name !== "review";
    elements.doneView.hidden = name !== "done";
    elements.topbarStatus.hidden = !["test", "review"].includes(name);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function formatTime(totalSeconds) {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const minutes = Math.floor(safe / 60);
    const seconds = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function remainingSeconds() {
    if (!attempt) return durationSeconds;
    if (attempt.status === "completed") {
      if (attempt.completionReason === "time_expired") return 0;
      const completed = new Date(attempt.completedAt).getTime();
      return Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - completed) / 1000));
    }
    return Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now()) / 1000));
  }

  function updateTimer() {
    const remaining = remainingSeconds();
    const label = formatTime(remaining);
    elements.timer.textContent = label;
    elements.mobileTimer.textContent = label;
    elements.timer.classList.toggle("is-low", remaining <= 300);
    if (remaining <= 0 && attempt?.status === "in_progress") {
      completeAttempt("time_expired");
    }
  }

  function startTimer() {
    stopTimer();
    updateTimer();
    timerId = window.setInterval(updateTimer, 500);
  }

  function stopTimer() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }

  function answerCount() {
    return attempt ? Object.keys(attempt.answers).length : 0;
  }

  function missingQuestionIds() {
    if (!attempt) return QUESTIONS.map((question) => question.id);
    return QUESTIONS.filter((question) => !attempt.answers[String(question.id)]).map((question) => question.id);
  }

  function flushQuestionTime() {
    if (!attempt || attempt.status !== "in_progress" || activeQuestionStartedAt === null) return;
    const question = QUESTIONS[attempt.currentIndex];
    if (!question) return;
    const elapsed = Math.max(0, Date.now() - activeQuestionStartedAt);
    attempt.questionTimeMs[String(question.id)] = (attempt.questionTimeMs[String(question.id)] || 0) + elapsed;
    activeQuestionStartedAt = Date.now();
  }

  function logActivity(type, details = {}) {
    if (!attempt) return;
    attempt.activityLog.push({ type, at: isoNow(), ...details });
  }

  function renderQuestionMap() {
    if (!attempt) return;
    elements.questionMap.replaceChildren();
    QUESTIONS.forEach((question, index) => {
      const key = String(question.id);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "map-button";
      button.textContent = String(question.id);
      button.setAttribute("aria-label", `Перейти к вопросу ${question.id}`);
      if (attempt.visited[key]) button.classList.add("visited");
      if (attempt.answers[key]) button.classList.add("answered");
      if (attempt.currentIndex === index && currentView === "test") {
        button.classList.add("current");
        button.setAttribute("aria-current", "step");
      }
      button.addEventListener("click", () => {
        goToQuestion(index);
        closeMap();
      });
      elements.questionMap.append(button);
    });
    const answered = answerCount();
    elements.answeredCount.textContent = String(answered);
    elements.mobileAnsweredCount.textContent = `${answered}/80`;
  }

  function renderOptions(question) {
    elements.answerOptions.replaceChildren(elements.answerOptions.querySelector("legend") || document.createElement("legend"));
    const legend = elements.answerOptions.querySelector("legend");
    legend.className = "sr-only";
    legend.textContent = "Выберите один ответ";
    const hasVisualOptions = question.options.some((option) => Boolean(option.imageSrc));
    elements.answerOptions.classList.toggle("visual-answer-options", hasVisualOptions);
    const selected = attempt.answers[String(question.id)];

    question.options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "answer-label";
      if (selected === option.key) label.classList.add("selected");

      const input = document.createElement("input");
      input.type = "radio";
      input.name = `question-${question.id}`;
      input.value = option.key;
      input.checked = selected === option.key;

      const key = document.createElement("span");
      key.className = "answer-key";
      key.textContent = option.key;

      const text = document.createElement("span");
      text.className = "answer-text";
      text.textContent = option.label;
      const keyOnly = question.diagram && !String(option.label || "").trim();
      const figure = option.imageSrc ? document.createElement("img") : null;
      if (figure) {
        figure.className = "answer-figure";
        figure.src = option.imageSrc;
        figure.alt = option.imageAlt || `Вариант ${option.key.toUpperCase()}`;
        figure.decoding = "async";
      }

      input.addEventListener("change", () => setAnswer(question.id, option.key));
      if (figure) {
        label.classList.add("visual-option");
        label.append(input, key, figure);
      } else if (keyOnly) {
        label.classList.add("key-only");
        label.append(input, key);
      } else {
        label.append(input, key, text);
      }
      elements.answerOptions.append(label);
    });
  }

  function renderDiagram(question) {
    elements.questionDiagram.replaceChildren();
    elements.questionCard.classList.toggle("has-diagram", Boolean(question.diagram && question.diagramSrc));
    if (!question.diagram || !question.diagramSrc) {
      elements.questionDiagram.hidden = true;
      return;
    }
    const image = document.createElement("img");
    image.src = question.diagramSrc;
    image.alt = question.diagramAlt || `Схема к вопросу ${question.id}`;
    image.decoding = "async";
    elements.questionDiagram.append(image);
    elements.questionDiagram.hidden = false;
  }

  function renderQuestion() {
    if (!attempt) return;
    const question = QUESTIONS[attempt.currentIndex];
    if (!question) return;
    attempt.visited[String(question.id)] = true;
    activeQuestionStartedAt = Date.now();
    elements.questionNumber.textContent = `Вопрос ${question.id} из ${QUESTIONS.length}`;
    elements.questionPrompt.textContent = question.prompt;
    elements.progressBar.style.width = `${((question.id) / QUESTIONS.length) * 100}%`;
    elements.prevButton.disabled = attempt.currentIndex === 0;
    elements.nextButton.textContent = attempt.currentIndex === QUESTIONS.length - 1 ? "Проверить ответы →" : "Далее →";
    renderDiagram(question);
    renderOptions(question);
    renderQuestionMap();
    saveAttempt();
    document.title = `Вопрос ${question.id} из 80 — Тест на интеллект`;
  }

  function setAnswer(questionId, optionKey) {
    if (!attempt || attempt.status !== "in_progress") return;
    attempt.answers[String(questionId)] = optionKey;
    logActivity("answer_changed", { questionId, optionKey });
    elements.saveStatus.textContent = "Сохраняем…";
    saveAttempt();
    renderOptions(QUESTIONS[attempt.currentIndex]);
    renderQuestionMap();
  }

  function goToQuestion(index) {
    if (!attempt || attempt.status !== "in_progress") return;
    flushQuestionTime();
    attempt.currentIndex = Math.min(Math.max(0, index), QUESTIONS.length - 1);
    showView("test");
    renderQuestion();
  }

  function openMap() {
    window.setTimeout(() => {
      elements.mapPanel.classList.add("open");
      elements.mapBackdrop.hidden = false;
      elements.closeMapButton.focus({ preventScroll: true });
    }, 0);
  }

  function closeMap() {
    elements.mapPanel.classList.remove("open");
    elements.mapBackdrop.hidden = true;
  }

  function renderReview() {
    if (!attempt) return;
    flushQuestionTime();
    const answered = answerCount();
    const missing = missingQuestionIds();
    elements.reviewAnswered.textContent = String(answered);
    elements.reviewMissing.textContent = String(missing.length);
    elements.reviewTime.textContent = formatTime(remainingSeconds());
    elements.reviewSummary.textContent = missing.length
      ? `Вы ответили на ${answered} из 80 вопросов. Можно вернуться к пропущенным заданиям или завершить тест сейчас.`
      : "Все 80 вопросов заполнены. Проверьте решение и завершите тест.";
    elements.unansweredBlock.hidden = missing.length === 0;
    elements.unansweredList.replaceChildren();
    missing.forEach((id) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = String(id);
      button.setAttribute("aria-label", `Вернуться к вопросу ${id}`);
      button.addEventListener("click", () => goToQuestion(id - 1));
      elements.unansweredList.append(button);
    });
    elements.finishWarning.textContent = "";
    renderQuestionMap();
    showView("review");
    saveAttempt();
    document.title = "Проверка ответов — Тест на интеллект";
  }

  function requestFinish() {
    if (!attempt || attempt.status !== "in_progress") return;
    const missing = missingQuestionIds();
    elements.confirmDialogText.textContent = missing.length
      ? `Без ответа осталось ${missing.length}. После завершения изменить ответы будет нельзя.`
      : "Все вопросы заполнены. После завершения изменить ответы будет нельзя.";
    if (typeof elements.confirmDialog.showModal === "function") {
      elements.confirmDialog.showModal();
    } else if (window.confirm(elements.confirmDialogText.textContent)) {
      completeAttempt("submitted");
    }
  }

  function elapsedSeconds() {
    if (!attempt) return 0;
    const start = new Date(attempt.startedAt).getTime();
    const end = attempt.completedAt ? new Date(attempt.completedAt).getTime() : Date.now();
    return Math.max(0, Math.round((end - start) / 1000));
  }

  function completeAttempt(reason) {
    if (!attempt || attempt.status !== "in_progress") return;
    flushQuestionTime();
    if (attempt.hiddenSince) {
      attempt.hiddenTimeMs += Math.max(0, Date.now() - new Date(attempt.hiddenSince).getTime());
      attempt.hiddenSince = null;
    }
    attempt.status = "completed";
    attempt.completionReason = reason;
    attempt.completedAt = isoNow();
    logActivity("test_completed", { reason, answered: answerCount(), missing: missingQuestionIds().length });
    stopTimer();
    saveAttempt();
    submitProtocol();
    renderDone();
  }

  async function submitProtocol() {
    if (!attempt || attempt.status !== "completed") return;
    const protocol = protocolObject();
    attempt.delivery = { status: "prepared", preparedAt: isoNow() };
    saveAttempt();
    window.dispatchEvent(new CustomEvent("academy:assessment-completed", { detail: protocol }));

    const configuredEndpoint = compactString(window.ASSESSMENT_SUBMIT_ENDPOINT || "", 500);
    if (!configuredEndpoint) {
      attempt.delivery = { status: "local_staging", preparedAt: attempt.delivery.preparedAt };
      saveAttempt();
      return;
    }

    try {
      const endpoint = new URL(configuredEndpoint, window.location.href);
      if (endpoint.origin !== window.location.origin) throw new Error("cross_origin_endpoint_rejected");
      const response = await fetch(endpoint.href, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        keepalive: true,
        body: JSON.stringify(protocol)
      });
      if (!response.ok) throw new Error(`submit_http_${response.status}`);
      attempt.delivery = { status: "accepted", preparedAt: attempt.delivery.preparedAt, acceptedAt: isoNow() };
    } catch (error) {
      attempt.delivery = {
        status: "attention",
        preparedAt: attempt.delivery.preparedAt,
        errorCode: compactString(error instanceof Error ? error.message : "submit_failed", 120)
      };
    }
    saveAttempt();
  }

  function renderDone() {
    if (!attempt) return;
    elements.doneSummary.textContent = "Ваши ответы сохранены. Мы сообщим о следующем этапе отдельно.";
    showView("done");
    elements.topbarStatus.hidden = true;
    elements.qaPanel.hidden = true;
    document.title = "Тест завершён — Академия Стратег";
  }

  function protocolObject() {
    const rows = QUESTIONS.map((question) => {
      const key = attempt.answers[String(question.id)] || "";
      const option = question.options.find((item) => item.key === key);
      return {
        questionId: question.id,
        prompt: question.prompt,
        answerKey: key,
        answerText: option?.label || "",
        questionAssetId: question.diagramAssetId || null,
        answerAssetId: option?.assetId || null,
        visited: Boolean(attempt.visited[String(question.id)]),
        timeMs: Math.round(attempt.questionTimeMs[String(question.id)] || 0)
      };
    });
    return {
      schemaVersion: attempt.schemaVersion,
      test: {
        id: attempt.testId,
        version: attempt.testVersion,
        title: attempt.title,
        questionCount: attempt.questionCount,
        durationLimitSeconds: attempt.durationLimitSeconds,
        scoringMode: "manual",
        scoringKeyIncluded: false
      },
      attempt: {
        id: attempt.attemptId,
        assignment: attempt.assignment,
        status: attempt.status,
        completionReason: attempt.completionReason,
        startedAt: attempt.startedAt,
        completedAt: attempt.completedAt,
        elapsedSeconds: elapsedSeconds(),
        answeredCount: answerCount(),
        missingQuestionIds: missingQuestionIds(),
        hiddenTimeMs: attempt.hiddenTimeMs,
        activityLog: attempt.activityLog,
        delivery: attempt.delivery || null
      },
      responses: rows
    };
  }

  function startNewAttempt(event) {
    event.preventDefault();
    elements.startError.textContent = "";
    const bankError = validateQuestionBank();
    if (bankError) {
      elements.startError.textContent = bankError;
      return;
    }
    if (!assignmentContext.resolved) {
      elements.startError.textContent = "Персональная ссылка не распознана. Запросите новое назначение у координатора.";
      return;
    }
    if (!elements.startForm.reportValidity()) return;
    attempt = createAttempt(assignmentContext);
    saveAttempt();
    showView("test");
    renderQuestion();
    startTimer();
    if (qaEnabled) elements.qaPanel.hidden = false;
  }

  function resumeAttempt() {
    attempt = loadStoredAttempt();
    if (!attempt) return;
    if (attempt.status === "completed") {
      renderDone();
      return;
    }
    if (remainingSeconds() <= 0) {
      completeAttempt("time_expired");
      return;
    }
    logActivity("test_resumed");
    showView("test");
    renderQuestion();
    startTimer();
    if (qaEnabled) elements.qaPanel.hidden = false;
  }

  function initialize() {
    const bankError = validateQuestionBank();
    elements.readyCheck.checked = false;
    elements.readyCheck.defaultChecked = false;
    if (bankError) {
      elements.startError.textContent = bankError;
      elements.startForm.querySelector('button[type="submit"]').disabled = true;
    }
    elements.candidateDisplayName.textContent = assignmentContext.displayName;
    elements.candidateAvatar.textContent = assignmentContext.displayName.trim().charAt(0).toUpperCase() || "К";
    if (!assignmentContext.resolved) {
      elements.candidateNameCard.classList.add("is-error");
      elements.candidateDisplayName.textContent = "Персональная ссылка недействительна";
      elements.candidateAvatar.textContent = "!";
      elements.startForm.querySelector('button[type="submit"]').disabled = true;
      elements.startError.textContent = "Без персонального назначения тест начать нельзя.";
    }
    if (qaEnabled && params.get("reset") === "1") clearAttempt();
    const stored = loadStoredAttempt();
    if (stored) {
      attempt = stored;
      if (stored.status === "completed") {
        renderDone();
      } else {
        elements.resumeButton.hidden = false;
      }
    }
    if (qaEnabled) {
      window.__IQ_TEST_QA__ = {
        getAttempt: () => attempt ? JSON.parse(JSON.stringify(attempt)) : null,
        getProtocol: () => attempt ? protocolObject() : null,
        assignment: { ...assignmentContext }
      };
    }
  }

  elements.startForm.addEventListener("submit", startNewAttempt);
  elements.resumeButton.addEventListener("click", resumeAttempt);

  elements.prevButton.addEventListener("click", () => goToQuestion(attempt.currentIndex - 1));
  elements.nextButton.addEventListener("click", () => {
    if (attempt.currentIndex >= QUESTIONS.length - 1) renderReview();
    else goToQuestion(attempt.currentIndex + 1);
  });
  elements.skipButton.addEventListener("click", () => {
    if (attempt.currentIndex >= QUESTIONS.length - 1) renderReview();
    else goToQuestion(attempt.currentIndex + 1);
  });
  elements.reviewButton.addEventListener("click", renderReview);
  elements.backToTestButton.addEventListener("click", () => goToQuestion(attempt.currentIndex));
  elements.finishButton.addEventListener("click", requestFinish);
  elements.confirmDialog.addEventListener("close", () => {
    if (elements.confirmDialog.returnValue === "confirm") completeAttempt("submitted");
  });
  elements.openMapButton.addEventListener("click", openMap);
  elements.closeMapButton.addEventListener("click", closeMap);
  elements.mapBackdrop.addEventListener("click", closeMap);
  elements.qaFillButton.addEventListener("click", () => {
    if (!qaEnabled || !attempt || attempt.status !== "in_progress") return;
    QUESTIONS.forEach((question, index) => {
      attempt.answers[String(question.id)] = question.options[index % question.options.length].key;
      attempt.visited[String(question.id)] = true;
      attempt.questionTimeMs[String(question.id)] = 500;
    });
    logActivity("qa_fill_all");
    saveAttempt();
    renderReview();
  });

  document.addEventListener("keydown", (event) => {
    if (currentView !== "test" || !attempt || attempt.status !== "in_progress") return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      if (attempt.currentIndex > 0) goToQuestion(attempt.currentIndex - 1);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      if (attempt.currentIndex < QUESTIONS.length - 1) goToQuestion(attempt.currentIndex + 1);
      else renderReview();
      return;
    }
    const keyMap = { a: "а", f: "а", б: "б", ",": "б", в: "в", d: "в", г: "г", u: "г", д: "д", l: "д" };
    const answerKey = keyMap[event.key.toLowerCase()] || (/[абвгд]/.test(event.key.toLowerCase()) ? event.key.toLowerCase() : null);
    if (!answerKey) return;
    const question = QUESTIONS[attempt.currentIndex];
    if (question.options.some((option) => option.key === answerKey)) {
      event.preventDefault();
      setAnswer(question.id, answerKey);
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (!attempt || attempt.status !== "in_progress") return;
    if (document.hidden) {
      flushQuestionTime();
      attempt.hiddenSince = isoNow();
      logActivity("page_hidden", { questionId: QUESTIONS[attempt.currentIndex]?.id });
      saveAttempt();
    } else {
      if (attempt.hiddenSince) {
        attempt.hiddenTimeMs += Math.max(0, Date.now() - new Date(attempt.hiddenSince).getTime());
        attempt.hiddenSince = null;
      }
      activeQuestionStartedAt = Date.now();
      logActivity("page_visible", { questionId: QUESTIONS[attempt.currentIndex]?.id });
      saveAttempt();
    }
  });

  window.addEventListener("beforeunload", () => {
    flushQuestionTime();
    saveAttempt();
  });

  window.addEventListener("pageshow", () => {
    if (!attempt && currentView === "intro") {
      elements.readyCheck.checked = false;
    }
  });

  initialize();
})();
