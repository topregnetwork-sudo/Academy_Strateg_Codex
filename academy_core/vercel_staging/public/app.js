const state = { tasks: [], selected: null, detail: null };
const $ = (selector) => document.querySelector(selector);
const escape = (value = "") =>
  String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
const formatDate = (value) =>
  new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
const label = (value) =>
  ({
    DRAFT: "Черновик",
    QUEUED_FOR_ANALYSIS: "На разборе Codex",
    ANALYSING: "Codex анализирует",
    PROPOSAL_READY: "Решение готово",
    NEEDS_OWNER_INPUT: "Нужны уточнения",
    APPROVED_FOR_EXECUTION: "Одобрено к выполнению",
    EXECUTING: "Выполняется",
    RESULT_READY_FOR_OWNER_REVIEW: "Результат на проверке",
    OWNER_ACCEPTED: "Принято владельцем",
    BLOCKED: "Отложено",
    ROLLED_BACK: "Откат",
    ARCHIVED: "Архив",
    IDEA_CREATED: "Создано",
    OWNER_CLARIFIED: "Уточнение владельца",
    CODEX_ANALYSIS: "Поставлено в очередь анализа",
  })[value] || value;
async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return response.status === 204 ? null : response.json();
}
async function loadFunnelContracts() {
  const root = $("#funnel-grid");
  if (!root) return;
  try {
    const data = await api("/api/funnels/contracts");
    root.innerHTML = data.contracts.map((funnel) => `
      <article class="funnel-card">
        <p class="eyebrow">${escape(funnel.status)}</p>
        <h3>${escape(funnel.title)}</h3>
        <p><b>Этапы:</b> ${funnel.stages.map(escape).join(" → ")}</p>
        <p><b>ID:</b> ${funnel.identities.map(escape).join(", ")}</p>
        <p><b>Внешние сервисы:</b> ${funnel.external.map(escape).join(", ")}</p>
        <ul>${funnel.preserved.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>
      </article>`).join("");
  } catch (error) {
    root.innerHTML = `<div class="empty">Контракты пока недоступны: ${escape(error.message)}</div>`;
  }
}
function show(message, type = "error") {
  const node = $("#notice");
  node.hidden = !message;
  node.className = `notice ${type}`;
  node.textContent = message || "";
}
function closeAllDialogs() {
  document.querySelectorAll("dialog[open]").forEach((dialog) => dialog.close());
}
function renderList() {
  const root = $("#task-list");
  root.replaceChildren();
  const projects = new Map();
  for (const task of state.tasks) {
    if (!projects.has(task.project_name)) projects.set(task.project_name, []);
    projects.get(task.project_name).push(task);
  }
  $("#task-summary").textContent =
    `${projects.size} направлений · ${state.tasks.length} активных задач`;
  for (const [projectName, tasks] of projects) {
    const heading = document.createElement("h3");
    heading.className = "project-heading";
    heading.textContent = `${tasks[0].project_kind === "funnel" ? "ВОРОНКА" : "ПЛАТФОРМА"} · ${projectName}`;
    root.append(heading);
    for (const task of tasks) {
      const node =
        $("#task-template").content.firstElementChild.cloneNode(true);
      node.classList.toggle("active", task.id === state.selected);
      node.querySelector(".task-priority").textContent = task.priority;
      node.querySelector("strong").textContent = task.title;
      node.querySelector(".task-project").textContent = "Открыть карточку";
      node.querySelector(".task-state").textContent =
        `${label(task.state)} · версий: ${task.revision_count}`;
      node.onclick = () => openTask(task.id);
      root.append(node);
    }
  }
}
function proposalHtml(proposal) {
  const buttons =
    proposal.state === "PROPOSED" || proposal.state === "REVISED"
      ? `<div class="actions"><button data-decision="approve" data-proposal="${proposal.id}">Одобрить решение</button><button data-decision="rework" data-proposal="${proposal.id}">Нужна доработка</button><button data-decision="rollback" data-proposal="${proposal.id}">Не выполнять</button></div>`
      : "";
  return `<article class="proposal"><h3>Решение · ${escape(proposal.state)}</h3><h4>Что будет сделано</h4><div>${escape(proposal.scope)}</div><h4>Основание</h4><div>${escape(proposal.facts)}</div><h4>Риски и границы</h4><div>${escape(proposal.risks)}</div><h4>Как проверить</h4><div>${escape(proposal.verification_plan)}</div><h4>Откат</h4><div>${escape(proposal.rollback_plan)}</div>${buttons}</article>`;
}
function eventLabel(event) {
  return ({
    PENDING: "ожидает отправки",
    PUBLISHING: "публикуется в облачную очередь",
    PUBLISHED: "принято облачной очередью",
    DELIVERED: "доставлено обработчику",
    RETRYING: "повторная доставка",
    FAILED: "доставка не удалась — можно повторить",
  })[event.delivery_state] || event.delivery_state;
}
function brief(task, revisions) {
  return `ЗАДАЧА ИЗ ШТАБА СТРАТЕГ\nПроект: ${task.project_name}\nУровень: ${task.project_kind === "platform" ? "Платформа" : "Воронка"}\nЗадача: ${task.title}\nПриоритет: ${task.priority}\nСтатус: ${label(task.state)}\nСледующий шаг: ${task.next_step || "не задан"}\n\nИстория и комментарии:\n${revisions.map((r) => r.body).join("\n\n---\n\n")}\n\nНужно от Codex: подготовить решение, риски, проверку и границы. Ничего live не менять без отдельного подтверждения.`;
}
function renderDetail(data) {
  state.detail = data;
  const { task, revisions, proposals, approvals, outbox_events = [], execution_requests = [] } = data;
  const latestEvent = outbox_events[0];
  const waiting =
    task.state === "QUEUED_FOR_ANALYSIS" || task.state === "ANALYSING";
  const activeProposal = proposals.find((p) => !p.superseded_at && (p.state === 'PROPOSED' || p.state === 'REVISED'));
  const solutionStatus = activeProposal
    ? "Решение сохранено в этой карточке."
    : waiting
      ? `Событие: ${latestEvent ? eventLabel(latestEvent) : "ожидает создания"}. Модель и внешние действия не подключены.`
      : "Решения пока нет. Отправьте задачу на разбор Codex.";
  $("#task-detail").innerHTML =
    `<header><p class="eyebrow">${escape(task.project_kind === "platform" ? "ПЛАТФОРМА" : "ВОРОНКА")} · ${escape(task.project_name)}</p><h2>${escape(task.title)}</h2><span class="state ${escape(task.state)}">${escape(label(task.state))}</span></header><div class="detail-grid"><article class="block"><h3>Следующий шаг</h3><p>${escape(task.next_step || "Не задан")}</p></article><article class="block"><h3>Статус решения</h3><p>${solutionStatus}</p></article></div><div class="actions"><button id="add-revision">Добавить уточнение</button><button id="move-task">Перенести</button><button id="copy-brief">Скопировать brief</button><button id="queue-analysis">${latestEvent?.delivery_state === "FAILED" ? "Повторить доставку" : waiting ? "Событие сохранено" : "Отправить на разбор"}</button>${task.state === "RESULT_READY_FOR_OWNER_REVIEW" && activeProposal ? `<button data-decision="accept_result" data-proposal="${activeProposal.id}">Принять результат</button>` : ""}</div>${execution_requests.map((r) => `<section class="timeline"><h3>Запрос исполнения</h3><article class="revision"><strong>${escape(r.state)}</strong><div>Требуется отдельное подтверждение конкретного действия. Ничего не запущено автоматически.</div></article></section>`).join("")}${latestEvent ? `<section class="timeline"><h3>Событие доставки</h3><article class="revision"><strong>${escape(eventLabel(latestEvent))}</strong><div>Операция: ${escape(latestEvent.operation)} · попытки: ${escape(latestEvent.delivery_attempts)} · метаданные: ${escape(latestEvent.classification)}${latestEvent.last_failure ? ` · причина: ${escape(latestEvent.last_failure)}` : ""}</div></article></section>` : ""}${proposals.map(proposalHtml).join("")}<section class="timeline"><h3>История задачи</h3>${revisions.map((r) => `<article class="revision"><strong>${escape(label(r.event_type))} · ${escape(r.author_role)} · ${formatDate(r.created_at)}</strong><div>${escape(r.body)}</div></article>`).join("") || '<p class="small">История пока пуста.</p>'}</section>`;
  $("#add-revision").onclick = () => {
    $("#revision-form").reset();
    $("#revision-form").elements.next_step.value = task.next_step || "";
    $("#revision-dialog").showModal();
  };
  $("#move-task").onclick = () => {
    $("#move-form").reset();
    $("#move-form").elements.project_name.value = task.project_name;
    $("#move-form").elements.project_kind.value = task.project_kind;
    $("#move-dialog").showModal();
  };
  $("#copy-brief").onclick = async () => {
    try {
      await navigator.clipboard.writeText(brief(task, revisions));
      show("Brief скопирован. Его можно вставить в чат Codex.", "ok");
    } catch {
      show("Не удалось скопировать brief: разрешите доступ к буферу обмена.");
    }
  };
  $("#queue-analysis").onclick = () =>
    submitTask(
      task.id,
      { action: "queue_analysis" },
      waiting
        ? "Событие уже находится в серверной очереди."
        : "Событие записано и передано в облачную очередь. Оно не зависит от этого компьютера.",
    );
  document
    .querySelectorAll("[data-decision]")
    .forEach(
      (button) =>
        (button.onclick = () =>
          submitTask(
            task.id,
            {
              action: "decision",
              decision: button.dataset.decision,
              proposal_id: button.dataset.proposal,
              note: "",
            },
            "Решение владельца сохранено в истории.",
          )),
    );
}
async function openTask(id) {
  try {
    state.selected = id;
    renderList();
    renderDetail(
      await api(`/api/project-control/task?id=${encodeURIComponent(id)}`),
    );
  } catch (error) {
    show(`Не удалось открыть задачу: ${error.message}`);
  }
}
async function refreshTasks() {
  const result = await api("/api/project-control/tasks");
  state.tasks = result.tasks;
  await loadFunnelContracts();
  if (!state.selected && state.tasks.length)
    state.selected =
      state.tasks.find((task) => task.project_name === "Academy Core / Штаб")
        ?.id || state.tasks[0].id;
  renderList();
  if (state.selected) await openTask(state.selected);
}
async function submitTask(id, body, success) {
  try {
    const result = await api(
      `/api/project-control/task?id=${encodeURIComponent(id)}`,
      { method: "POST", body: JSON.stringify(body) },
    );
    state.selected = result.task.id;
    closeAllDialogs();
    await refreshTasks();
    show(success, "ok");
  } catch (error) {
    show(`Не удалось сохранить: ${error.message}`);
  }
}
async function setup() {
  try {
    const auth = await api("/api/auth/status");
    $("#account").textContent = auth.signed_in
      ? "Владелец: защищённый доступ"
      : "Доступ закрыт";
    if (!auth.configured) {
      $("#not-configured").hidden = false;
      return;
    }
    if (!auth.signed_in) {
      $("#signed-out").hidden = false;
      if (auth.password_configured) {
        $("#password-form").hidden = false;
        $("#password-form").onsubmit = async (event) => {
          event.preventDefault();
          try {
            await api("/api/auth/password", {
              method: "POST",
              body: JSON.stringify(
                Object.fromEntries(new FormData(event.currentTarget)),
              ),
            });
            location.reload();
          } catch (error) {
            show(
              error.message === "invalid_access_code"
                ? "Код доступа не подошёл."
                : `Вход не выполнен: ${error.message}`,
            );
          }
        };
      }
      if (auth.vercel_configured) {
        $("#sign-in").hidden = false;
        $("#sign-in").onclick = () => location.assign("/api/auth/authorize");
      }
      return;
    }
    $("#workspace").hidden = false;
    document
      .querySelectorAll(".close-dialog")
      .forEach((button) => (button.onclick = closeAllDialogs));
    await refreshTasks();
    $("#new-task").onclick = () => {
      $("#task-form").reset();
      $("#task-dialog").showModal();
    };
    $("#task-form").onsubmit = async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(event.currentTarget));
      try {
        const result = await api("/api/project-control/tasks", {
          method: "POST",
          body: JSON.stringify(data),
        });
        state.selected = result.task.id;
        closeAllDialogs();
        await refreshTasks();
        show(
          "Задача сохранена в серверной очереди. Она не зависит от этого компьютера.",
          "ok",
        );
      } catch (error) {
        show(`Не удалось создать задачу: ${error.message}`);
      }
    };
    $("#revision-form").onsubmit = (event) => {
      event.preventDefault();
      submitTask(
        state.selected,
        {
          action: "revise",
          ...Object.fromEntries(new FormData(event.currentTarget)),
        },
        "Уточнение сохранено в серверной очереди. Предыдущая версия осталась в истории.",
      );
    };
    $("#move-form").onsubmit = (event) => {
      event.preventDefault();
      submitTask(
        state.selected,
        {
          action: "move",
          ...Object.fromEntries(new FormData(event.currentTarget)),
        },
        "Карточка перенесена. Это изменение записано в историю.",
      );
    };
  } catch (error) {
    show(`Панель недоступна: ${error.message}`);
  }
}
setup();
