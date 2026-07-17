# CODEX REPORT

[CODEX→CHATGPT]

## [ЭТАП]

`AS-CODEX-AUTONOMOUS-WORKER-001`

После настройки worker выполнен безопасный документационный этап `AS-SMART-LINK-ROUTER-TARGET-ARCHITECTURE-001`.

## [ЧТО СДЕЛАНО]

- Создан протокол автономного worker и файлы обмена `TO_CODEX.md` / `TO_CHATGPT.md`.
- Создан PowerShell worker с отдельным локальным checkout, периодическим `git pull --ff-only`, task-hash, non-interactive `codex exec`, allowlist путей, секрет-сканом, commit и push.
- Worker использует `workspace-write`, не включает bypass approvals/sandbox и не читает каталог секретов.
- Добавлен `.runtime/` в `.gitignore`; checkout, state, lock и логи не попадают в GitHub.
- PowerShell syntax check пройден.
- Повторный dry-run пройден: pull выполнен, старый task безопасно распознан как неисполняемый, Codex/commit/push не запускались.
- После публикации пройден обычный цикл `-Once`: checkout обновлён до `f43973a`, завершённая задача корректно пропущена, Codex/commit/push не запускались.
- Подготовлена целевая архитектура Smart Link Router без deploy и боевых изменений.

## [КАК РАБОТАЕТ WORKER]

```text
GitHub main
→ pull --ff-only
→ точная отдельная метка [CHATGPT→CODEX]
→ новый SHA-256 ACTIVE_TASK.md
→ codex exec --sandbox workspace-write --ephemeral
→ проверка разрешённых путей и секретов
→ commit
→ push main
```

Задача повторно не выполняется по тому же hash. Грязный checkout, неизвестный путь, секрет-риск, новый approval или ошибка останавливают push.

## [БЛОКЕР АВТОНОМНОГО КАНАЛА]

Worker готов принимать задачи из GitHub, но ChatGPT имеет только read-доступ и получает 403 при записи. Без writable inbox ChatGPT физически не может обновить `ACTIVE_TASK.md`; следовательно, полностью исключить ручную передачу новых задач пока нельзя.

Нужен минимальный доступ только к task-inbox либо другой утверждённый GitHub-канал с записью. Секреты и production-доступ для этого не нужны.

## [SMART LINK ROUTER TARGET ARCHITECTURE]

- Текущие `hr_invite` ведут прямо на Google Form и не имеют отдельного destination.
- Прямой Form URL нельзя перенаправить на новый target без одноразового изменения самого сохранённого URL.
- Целевая постоянная ссылка должна вести на стабильный Router hostname и содержать неизменный `link_id`.
- Router должен выполнять строгую проверку, создавать `click_id`, писать отдельный event-log и отдавать настоящий HTTP redirect на `SITE_BASE_URL`.
- Apps Script `HtmlService` остаётся MVP логики, но не утверждён как production runtime из-за sandbox и отсутствия надёжного автоматического top-level redirect.
- Любая миграция начинается только с synthetic test и позднее одной заранее выбранной строки после backup и отдельных разрешений.

Полный документ: `06_REPORTS/SMART_LINK_ROUTER_TARGET_ARCHITECTURE.md`.

## [ЧТО НУЖНО РЕШИТЬ]

1. Writable task-inbox для ChatGPT.
2. Нужна ли отдельная регистрация Windows Scheduled Task для постоянного фонового запуска worker.
3. `SITE_BASE_URL`.
4. Production-capable Router runtime и стабильный hostname.
5. Отдельное место и политика event-log.
6. Позднее — отдельные разрешения на test deployment и тест одной строки.

## [ЧТО НЕ ТРОГАЛИ]

- production Apps Script;
- generator diff;
- 3000 строк;
- `business_test_main`;
- `AS-BOT__00_MAIN_ROUTER`, n8n;
- Telegram;
- HR-форму и HR-Zoom;
- боевые таблицы;
- deploy/publish;
- Windows Scheduled Task.

## [РИСКИ]

- Read-only ChatGPT не может поставить новую задачу worker.
- Foreground worker работает только пока открыт процесс PowerShell.
- Любой non-interactive approval завершается блокером, а не ожиданием пользователя.
- Стабильный Router URL требует runtime с настоящим HTTP redirect и hostname, не зависящим от версии deployment.
- Массовая миграция прямых Form URL без теста одной строки может сломать воронку.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Выдать ChatGPT минимальный writable task-inbox; production Router пока не deploy и строки не менять.
