# CODEX REPORT

## AS-KARKASNIK-MEMORY-CONSOLIDATION-001 — документальная консолидация

Статус: `USER_ACTION_REQUIRED` по одному незавершимому подпункту профиля владельца; остальные безопасные документальные подпункты выполнены.

### Что сделано

- Создан канонический замысел в `idea/01_PROJECT_CONCEPT.md`.
- Заполнены подтверждённые правила и контуры `architecture/00–10`.
- Оформлен бизнес-контекст только двух воронок в `business/`.
- Добавлены правила памяти в `ai-clone/feedback/PROJECT_MEMORY_RULES.md`.
- Создан `plans/2026-08-08-memory-sync-protocol.md`.
- GitHub baseline уже содержит безопасную структуру Каркасника; дополнительные Drive-записи в этом запуске не выполнялись.

### Что подтверждено

Действующие воронки — только Batman и Owner. Модель четырёх продуктов отозвана и не перенесена как рабочее знание.

### Что не трогали

Production, n8n, Telegram, Google Sheets, Zoom, сайт, credentials, webhook URL, live-воронки и исторические ссылки.

### Следующий шаг

Владелец отвечает на короткое интервью из `ai-clone/OWNER_PROFILE_INTERVIEW_REQUIRED.md`; после этого профиль можно заполнить без выдуманных сведений.

## AS-HR-ZOOM-HOST-BRIEF-SLOT-SOURCE-AND-NEXT-WEEK-AUDIT-001 — live patch

Preflight: `PREFLIGHT_OK`, task hash `718bdab7efbe7f8e`, execution id `local-live-approved-20260808-host-brief`; `live_approval: true` подтверждено владельцем.

Создан redacted backup `03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_HOST_BRIEF_SLOT_SOURCE/20260808_083332`. Через n8n API PUT изменён только workflow `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` (`KJoZSqVP7fM1NQsf`): добавлен `HOST — Read Слоты_Zoom`, а `HOST — Build brief` переведён на join по `выбранный_слот` и `Слоты_Zoom.zoom_link`. Источник `Кандидаты_HR.Zoom_ссылка` из брифа удалён. При ненайденном слоте выводится безопасное предупреждение вместо старой ссылки.

Повторный GET: все структурные проверки прошли; workflow active; остальная структура не изменилась. Telegram-сообщения не отправлялись, строки кандидатов и Google Sheets не менялись.

### Финальная проверка следующей недели

На 10–16 августа найдено 6 записей: `HR-0144`, `HR-0145`, `HR-0146`, `HR-0147`, `HR-0148`, `HR-0149`. Четырём кандидатам фактически отправлен персональный `/zoom-click`; live executions `2652/2653`, `2661`, `2678`, `2728` подтверждают работу Send node. Все эти ссылки сейчас разрешаются через `Слоты_Zoom` в Zoom ID `89808244971`. Reminder ещё не отправлялись.

`HR-0146` и `HR-0149` не получили ссылок: `telegram_chat_id` отсутствует, статус приглашения `не отправлено`. Их строки не менялись. В историческом поле строк остаётся старый Zoom ID `72161587758`, но active `/zoom-click`, reminder и теперь operator brief его не используют.

Отдельный риск: для `HR-0144` зафиксированы два успешных Send execution первого сообщения. Это не исправлялось в текущей задаче.

Полный отчёт: `06_REPORTS/AS-HR-ZOOM-HOST-BRIEF-SLOT-SOURCE-AND-NEXT-WEEK-AUDIT-001_REPORT.md`.

Терминальный статус: `COMPLETED`.

## AS-HR-ZOOM-CANDIDATE-MESSAGE-VISIBILITY-001 — 2026-08-08

Read-only аудит завершён. Preflight: `PREFLIGHT_OK`, task hash `4cb29114311ea452`, execution id `local-readonly-20260808-hr-zoom-messages`.

Скриншот относится к operator-facing брифу. В execution `2804` отправлено два служебных сообщения операторам, но candidate reminder выбрал `0` кандидатов; в execution `2808` dogon также выбрал `0`. У единственного кандидата слота отсутствует `telegram_chat_id`, поэтому scheduled-сообщения ему не отправлены.

Подтверждены текущие candidate-facing тексты: `/start`, 30-минутное напоминание, ранний/валидный/поздний `/zoom-click`, +10 dogon и сообщение по команде `вступить в группу`. Candidate reminder и `/zoom-click` используют `Слоты_Zoom`; операторский `HOST — Build brief` всё ещё использует `Кандидаты_HR.Zoom_ссылка` и может показывать устаревший URL.

Также найдены gaps: молчание `/start` при ненайденной анкете/username, отсутствие отдельной обработки `chat_id`, отсутствие видимой проверки фактического присутствия перед текстом «Вы подтвердили участие», технический error-текст redirect и различный UX ссылки в invite/reminder.

Полный отчёт: `06_REPORTS/AS-HR-ZOOM-CANDIDATE-MESSAGE-VISIBILITY-001_REPORT.md`.

n8n, Telegram, Google Sheets, Zoom, credentials и live-данные не изменялись. Терминальный статус: `COMPLETED`.

## AS-KARKASNIK-TWO-FUNNELS-CANONICAL-MAPS-001 — 2026-08-05

Preflight: `PREFLIGHT_OK`, task hash `cb434e987008c36c`, execution id `local-doc-task-20260805-two-funnels`, режим `SAFE_AUTONOMOUS`.

Локально подготовлены и проверены канонические карты `02_STABLE_DATA/BATMAN_FUNNEL_MASTER.md` и `02_STABLE_DATA/OWNER_FUNNEL_MASTER.md`. Зафиксирована только модель двух воронок; отозванная трактовка четырёх продуктов не перенесена. Точка передачи: `btm_id → btm_id_referrer + owner_id → OWNER-контур`. Каркасник содержит навигационную ссылку, а не конкурирующую копию знания.

Drive-синхронизация не выполнена: коннектор отклонил экспорт в общую папку `Academy Strateg — Project Control` из-за неподтверждённого владения/разрешения на экспорт. Дубликаты не созданы. GitHub-синхронизация не выполнена: локальная `.git` пуста и не содержит рабочих Git metadata.

Production, n8n, Telegram, Google Sheets, Zoom, сайт, credentials и live-воронки не изменялись.

Полный отчёт: `06_REPORTS/AS-KARKASNIK-TWO-FUNNELS-CANONICAL-MAPS_REPORT.md`.

Терминальный статус: `USER_ACTION_REQUIRED` — локальная часть завершена; нужно явное разрешение на загрузку безопасных Markdown-файлов в найденную общую Drive-папку.

[CODEX→CHATGPT]

## [ЭТАП]

READ-ONLY-AUDIT-2026-08-05

## [РЕЖИМ]

Проведён read-only аудит доступов и отдельная безопасная настройка служебной памяти. Live n8n, рабочие Google Sheets, Telegram, credentials и данные не изменялись.

## [ИТОГ]

```text
n8n_api_access = yes
google_sheets_api_access = yes
telegram_bot_api_access = yes, operational proof for Batman bot
owner_telegram_credential_configured = yes
owner_telegram_direct_getMe = not independently checked
working_workflows_present = yes
secrets_exposed = no
external_live_changes_made = no
```

## [N8N API]

[ПОДТВЕРЖДЕНО]

- n8n API доступен и вернул список workflow.
- Видно 13 workflow: 10 активных и 3 неактивных.
- В нескольких активных workflow есть недавние успешные executions.
- Значения API key, credentials и других секретов не выводились.

Активные workflow:

```text
AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS
AS-OWNER-RAZBOR-SALES-MVP__06_WAITING_SLOT_WATCHER
AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT
AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT
AS-OWNER-FUNNEL__RESULT_GRAPH_HTML_PAGE
AS-OWNER-RAZBOR-SALES-MVP__03_ASYNC_OWNER_LOGGING
AS-BOT__00_MAIN_ROUTER
AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST
AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_RAZBOR_CHAT
AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
```

Недавние подтверждённые успешные executions:

```text
AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS — success — 2026-08-05
AS-OWNER-RAZBOR-SALES-MVP__06_WAITING_SLOT_WATCHER — success — 2026-08-05
AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT — success — 2026-08-03
AS-OWNER-FUNNEL__RESULT_GRAPH_HTML_PAGE — success — 2026-08-04
AS-BOT__00_MAIN_ROUTER — success — 2026-08-03
```

Неактивные workflow:

```text
AS-HR-ZOOM-MVP__01_START_TO_ZOOM
AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN
AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN
```

[ОГРАНИЧЕНИЕ]

Для части активных workflow API не вернул сохранённый последний execution в проверяемом окне. Это не является доказательством ошибки: активность workflow подтверждена, но фактическое выполнение каждой ветки этим аудитом не проверялось.

## [GOOGLE SHEETS]

[ПОДТВЕРЖДЕНО]

- Доступ выполнен со scope `spreadsheets.readonly`.
- Метаданные трёх рабочих книг успешно прочитаны.
- Значения ячеек и персональные данные в отчёт не извлекались.

```text
AS-OWNER-RAZBOR-SALES-MVP — доступ есть, 23 листа
AS-HR-ZOOM-MVP_Form1_Calendar_Zoom — доступ есть, 25 листов
1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg — доступ есть, 25 листов
```

Первичный расширенный просмотр заголовков достиг лимита чтения Google API. После этого аудит был безопасно сужен до метаданных; доступ подтверждён, записи в таблицы не выполнялись.

## [TELEGRAM BOT API]

[ПОДТВЕРЖДЕНО]

- В n8n доступны три настроенных credential-профиля типа `telegramApi`.
- Значения Telegram tokens не читались и не выводились.
- Для Batman-бота найден успешный live execution workflow `AS-BOT__00_MAIN_ROUTER`.
- В execution успешно отработали Telegram Trigger, отправка сообщения и удаление старого сообщения; ошибок Telegram-узлов — 0.
- OWNER Telegram credential настроен, OWNER entry workflow активен.

[НЕ ПРОВЕРЕНО]

Отдельный прямой вызов Telegram `getMe` для OWNER-бота не выполнялся: он потребовал бы чтения защищённого токена из credential. Такая попытка была остановлена защитой до доступа к секрету; обход не предпринимался. Поэтому работоспособность Telegram Bot API подтверждена операционно для Batman-бота, а для OWNER-бота подтверждены конфигурация и активный workflow, но не отдельный прямой API-вызов в рамках этого аудита.

## [НАЛИЧИЕ РАБОЧИХ WORKFLOW]

[ПОДТВЕРЖДЕНО]

Рабочие workflow присутствуют: 10 workflow активны, а у пяти из них найдены недавние успешные executions. Это подтверждает доступ к live n8n и фактическую работу части системы на момент аудита.

## [ЧТО НЕ ТРОГАЛИ]

```text
live n8n workflows
n8n credentials
Google Sheets и их schema/data
Telegram bots, tokens и сообщения
Batman
HR-Zoom
platform webhook
HMAC
оплату
доступ к платформе
персональные данные
```

## [РИСКИ И ГРАНИЦЫ АУДИТА]

- Статус `active` не гарантирует, что каждая ветка workflow исправна; для этого нужны отдельные контролируемые E2E-тесты.
- OWNER Telegram API не получил независимое подтверждение через `getMe`, потому что аудит не раскрывает и не извлекает token.
- Google API применил временный read-rate limit к расширенному просмотру; минимальная metadata-проверка завершилась успешно.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Если нужно отдельно подтвердить именно OWNER Telegram Bot API, провести разрешённый безопасный connectivity-test штатным механизмом n8n без вывода токена и без отправки сообщения пользователю. До отдельного разрешения ничего не запускать и не менять.

# ЕДИНАЯ ПАМЯТЬ ПРОЕКТА В GOOGLE DRIVE — 2026-08-05

[CODEX→CHATGPT]

## [ЧТО НАЙДЕНО]

- Существующая общая папка найдена: `Academy Strateg — Project Control`.
- В ней уже находятся `ACTIVE_TASK`, `CODEX_REPORT`, `STABLE_CONTEXT`, `DO_NOT_BREAK`, `OWNER_FUNNEL_ROADMAP`, `00_PROJECT_CONTROL_CENTER`, `CODEX_ARTIFACTS`, а также служебные подпапки архитектуры, контроля, источников и резервных копий.
- Локальная рабочая копия: `C:\Users\admin\Downloads\Academy_Strateg_Codex`.
- Локально есть `00_CONTROL/ACTIVE_TASK.md`, `00_CONTROL/CODEX_REPORT.md`, `00_CONTROL/STABLE_CONTEXT.md`, `00_CONTROL/DO_NOT_BREAK.md` и `02_STABLE_DATA/02_STABLE_CONTEXT.md`.
- Локальный `00_CONTROL/ACTIVE_ROADMAP.md` отсутствует; существующий roadmap найден в Drive как `OWNER_FUNNEL_ROADMAP`. Новый локальный roadmap не создавался.

## [ДОСТУПЫ]

Полный безопасный реестр создан в [ACCESS_INVENTORY.md](../ACCESS_INVENTORY.md) и загружен в Drive.

```text
Google Drive: есть, чтение/запись служебной папки, аккаунт topreg.network@gmail.com
Google Docs: есть, чтение/запись служебных документов; локальный bridge использует service account as-sheets-readonly@as-sheets-readonly.iam.gserviceaccount.com
Google Sheets: есть, read-only рабочие таблицы через service account as-sheets-readonly@as-sheets-readonly.iam.gserviceaccount.com
n8n API: есть, read-only аудит workflow/executions; credential вне проекта
Telegram Bot API: есть операционное подтверждение через n8n Batman execution; токены не читаются
локальный проект: есть, Windows user admin
память Codex: есть, локальные control/context/report папки и runtime bridge
```

## [КУДА ЕСТЬ ЗАПИСЬ]

Запись разрешена только в служебную папку `Academy Strateg — Project Control`, её `CODEX_ARTIFACTS`, `04_RELEASES_AND_BACKUPS`, `03_CONTROL_TESTS_INCIDENTS` и служебные документы памяти. Рабочие таблицы и live-контуры остаются read-only для этого этапа.

## [НАСТРОЕНО]

- Используется существующий единственный `tools/codex_drive_bridge/drive_bridge_worker.py`.
- Второй мост не создавался.
- Конфигурация моста исправлена: `CODEX_REPORT` направлен на существующий Drive-документ в целевой папке; `codex_control_folder_id` направлен на `Academy Strateg — Project Control`; `CODEX_ARTIFACTS` направлен на существующую вложенную папку.
- Синхронизация локального `CODEX_REPORT` через bridge выполнена успешно и подтверждена документом `CODEX_REPORT` в целевой папке.
- Правило памяти зафиксировано: значимый отчёт или стабильное решение сначала сохраняется локально, затем дублируется в служебный Drive-документ/markdown-файл; рабочие реестры остаются в Sheets.

## [ТЕСТОВАЯ ЗАПИСЬ И ОБРАТНОЕ ЧТЕНИЕ]

Создан служебный Google Doc:

```text
название: CODEX_WRITE_TEST_20260805
Drive ID: 1OzJvHhKA2dQ9UbwYjPruGtp7Fh-wZg71Sp7iFU77Tiw
папка: Academy Strateg — Project Control
статус: write/read подтверждён
время: 2026-08-05T10:52:30.391Z
SHA-256 идентификатора: 0d5b4a0b1d3c868de7aa7655d74d3ff3ac26f2469b686e08d97d5f44bdeb8d13
```

После записи документ прочитан обратно. Совпали название, статус, проект и SHA-256; дата присутствует как native date chip.

## [ACCESS_INVENTORY]

```text
локальный файл: ACCESS_INVENTORY.md
Drive-копия: ACCESS_INVENTORY.md, parent_id = 1hy5DO5Ftp9w11_bG4w2N01oRu6B8eIgD
секреты в реестре: нет
```

## [ЧТО НЕ ИЗМЕНЯЛОСЬ]

```text
n8n workflow и executions
рабочие Google Sheets, их листы и данные
Telegram-боты и credentials
Batman, HR-Zoom, platform webhook, HMAC
Apps Script generator, generator diff, 3000 строк hr_invite
business_test_main
живая воронка, оплата и доступ к платформе
```

## [ЛОКАЛЬНЫЕ ИЗМЕНЕНИЯ ЭТОГО ЭТАПА]

```text
00_CONTROL/CODEX_REPORT.md — обновлён и синхронизирован в Drive
ACCESS_INVENTORY.md — создан и загружен в Drive
tools/codex_drive_bridge/config.local.json — направлен на целевую Drive-папку и её служебные документы
```

## [ОШИБКИ И ОГРАНИЧЕНИЯ]

- Первая попытка вставки date chip использовала недопустимый enum формата даты; атомарная операция не применилась. Повтор с допустимым форматом выполнен успешно.
- `ACTIVE_ROADMAP.md` локально отсутствует; это gap инвентаризации, а не причина создавать вторую систему памяти.
- Прямой `getMe` для OWNER Telegram bot не выполнялся, чтобы не извлекать защищённый токен.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Проверить содержимое Drive-дубликатов `ACTIVE_TASK`, `STABLE_CONTEXT` и `DO_NOT_BREAK` против локальных файлов и при необходимости выполнить отдельную служебную синхронизацию без затрагивания рабочих таблиц и live workflow.

# КОНФЛИКТ АКТИВНОЙ ЗАДАЧИ — 2026-08-05

[CODEX→CHATGPT]

Статус: `CONFLICT`.

Конфликтуют:

- `AS-TECH-CODEX-WINDOWS-RECOVERY-001` из `00_CONTROL/ACTIVE_TASK.md` — восстановление PowerShell-запуска локального Codex;
- актуальное направление `00_READ_FIRST__PROJECT_MEMORY_STATUS__2026-08-04.md` — read-only трасса опубликованной Zoom-цепочки.

`00_READ_FIRST` — управляющая точка входа и имеет приоритет по зафиксированному правилу: последнее явное решение пользователя → `00_READ_FIRST` → последний подтверждённый отчёт → старые журналы. Но текущая команда пользователя запрещает выполнять оба направления до устранения конфликта.

`ACTIVE_TASK` не соответствует `00_READ_FIRST`, потому что содержит отдельный Windows/Codex-этап и объявляет его приоритетным, тогда как актуальный управляющий снимок уже указывает следующий шаг по Zoom.

Заблокированы Zoom-аудит, любые production-изменения, изменения n8n/Telegram/Sheets/Zoom/live-воронок, автоматическая замена `ACTIVE_TASK` и переход к OWNER-задачам.

Одно требуемое решение: выбрать каноническую следующую задачу — `AS-TECH-CODEX-WINDOWS-RECOVERY-001` или read-only Zoom trace из `00_READ_FIRST`; после выбора обновить `ACTIVE_TASK` и снять `CONFLICT`.

Созданы `TASK_STATE.json` и `CONFLICT_REPORT.md`. Секреты и live-системы не затрагивались.

# PREFLIGHT CONTROL — 2026-08-05

## KARKASNIK — запрос порядка работы Главному стратегу

Создан `06_REPORTS/KARKASNIK_STRATEGIST_WORK_ORDER_REQUEST.md`. В отчёте зафиксированы добавленные слои Каркасника, существующая память проекта, риск двух параллельных источников истины и вопросы для утверждения канонических файлов, порядка чтения, цикла задач, переноса знаний, GitHub и Google Drive.

До решения Стратега действуют временные правила: `ACTIVE_TASK.md`, `TASK_STATE.json`, `00_CONTROL/` и `02_STABLE_DATA/` остаются каноническими; Каркасник используется как витрина только подтверждённых знаний; перенос продуктовой модели приостановлен; рабочая модель содержит только две воронки — Бэтмэны и собственники.

Production и live-системы не изменялись.

## OWNER CORRECTION — только две воронки

Владелец подтвердил: рабочая модель проекта содержит только две воронки — **Бэтмэны** и **собственники**. Прежняя трактовка четырёх продуктов полностью отозвана как неверная и снята с канонического/стабильного статуса.

Обновлены защитные маркеры в `00_CONTROL/FOUR_PRODUCTS_AND_FUNNELS_REGISTRY.md` и `business/products/FOUR_PRODUCTS_CONFIRMED_MINIMUM.md`: статус `RETRACTED`, перенос продуктовой модели запрещён до нового объяснения владельца.

Создан новый отчёт Главному стратегу: `06_REPORTS/TWO_FUNNELS_STRATEGIST_HANDOFF_REPORT.md`. Он содержит две рабочие воронки, подтверждённый минимум и перечень данных, которые Стратег должен дополнить вместе с владельцем.

Production, n8n, Telegram, Google Sheets, Zoom и credentials не изменялись.

## FOUR PRODUCTS — стратегическая корректировка

Обнаружено, что названия четырёх продуктов подтверждены владельцем, но прежние описания их результатов и воронок частично были гипотезами Codex. Канонический реестр переведён в `PARTIALLY_CONFIRMED`; неподтверждённые определения сняты.

Созданы:

- `06_REPORTS/FOUR_PRODUCTS_STRATEGIST_CORRECTION_REPORT.md` — отчёт Главному стратегу и шаблон четырёх продуктовых карточек;
- `business/products/FOUR_PRODUCTS_CONFIRMED_MINIMUM.md` — первый безопасный перенос стабильных знаний в новый каркас.

Перенесены только подтверждённые названия, главная цель, общая воронка и обзорный курс 60 000 ₽. Значение, клиент, результат, формат, цена и отдельная воронка каждого направления не считаются подтверждёнными до ответа Главного стратега.

## KARKASNIK — безопасное упорядочивание проекта

Архив `karkasnik-skill-2026-07-31.zip` проверен и запущен в режиме `--force` для существующего проекта «Академия Стратег». Создано 47 недостающих файлов, 2 существующих пропущены; заполненные файлы не перезаписывались.

Добавлены каркасные слои `ai-clone/`, `idea/`, `architecture/`, `business/`, `plans/`, `retrospectives/`, `.claude/settings.json` и `.karkasnik.json` версии 1.1.0. `.gitignore`, `.env.example`, production, n8n, Telegram, Sheets, Zoom, credentials и live-воронки не изменялись.

Полный отчёт: `06_REPORTS/KARKASNIK_SCAFFOLD_DEPLOYMENT_REPORT.md`.

## AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001 — LIVE COMPLETED

Реальный structural patch применён через n8n API PUT после redacted-backup.

Изменены workflow:

- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` (`KJoZSqVP7fM1NQsf`): добавлен узел `REMINDER — Read Слоты_Zoom`; reminder-код делает join `Кандидаты_HR.выбранный_слот = Слоты_Zoom.слот_из_формы`, берёт только `Слоты_Zoom.zoom_link`, при отсутствии совпадения не отправляет ссылку и фиксирует `slot_not_found_in_Слоты_Zoom`.
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` (`SFmMI8gezZqaXHko`): добавлен узел `Read Слоты_Zoom by selected slot`; redirect-код читает кандидата только для `выбранный_слот`, затем берёт URL из `Слоты_Zoom.zoom_link`; HTTP 302 использует полученный `zoom_url`. Fallback на `Кандидаты_HR.Zoom_ссылка` удалён.
- `AS-BOT__00_MAIN_ROUTER` не менялся: первое сообщение уже ведёт на `/zoom-click`, а актуальная ссылка теперь гарантированно разрешается в исправленном redirect workflow.

Первый PUT scheduled прошёл. Первый PUT redirect вернул HTTP 400: `request/body/settings must NOT have additional properties`; из payload исключены только устаревшие API-поля `availableInMCP` и `binaryMode`, после чего реальный PUT прошёл успешно. Runtime credentials, webhook и trigger не менялись.

Повторный GET подтвердил: оба узла чтения `Слоты_Zoom` существуют, join сохранён, старый источник кандидата удалён, HTTP 302 использует результат join.

Dry-run без Telegram и записи в Sheets:

- `Пн 8-00 Мск` → Zoom ID `89808244971`;
- `Пн 18-00 Мск` → Zoom ID `89808244971`.

Один оставшийся риск: изменения проверены структурно и read-only dry-run, без фактической отправки Telegram; при следующем естественном reminder/клике рекомендуется проверить execution, не меняя данные вручную.

Терминальный статус: `COMPLETED`.

## AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001 — повторная проверка

Управляющий конфликт устранён: `ACTIVE_TASK.md:1`, `TASK_STATE.json:task_id` и текущий раздел отчёта ссылаются на `AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001`. Старые Windows/control-center задачи не запускаются и остаются отменёнными/отложенными.

Preflight: `PREFLIGHT_OK`, task hash `1093137a7a050e2a`, локальный execution id `local-preflight-20260805-1935`.

Технический блокер остаётся конкретным: текущие рабочие workflow не содержат read-узла `Слоты_Zoom` и join по `выбранный_слот`. Поэтому live-патч ещё не применён; добавление одного поля не обеспечит источник для новых сообщений и может сломать цепочку. Существующие backups сохранены.

Терминальный статус: `BLOCKED` (`SLOT_SOURCE_JOIN_NOT_IMPLEMENTED`).

## AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001 — запуск

- Preflight: `PREFLIGHT_OK`, task hash `1093137a7a050e2a`, execution id `local-preflight-20260805-1855`.
- Управляющие документы согласованы; `AS-TECH-CODEX-WINDOWS-RECOVERY-001` отменена.
- Созданы redacted backups workflow `fw0azBkY7IwZzhW2`, `KJoZSqVP7fM1NQsf`, `SFmMI8gezZqaXHko`; credentials и inline secrets не сохранены.
- Read-only проверка показала: scheduled workflow и `/zoom-click` используют `Кандидаты_HR.Zoom_ссылка`; отдельного чтения `Слоты_Zoom` и join по `выбранный_слот` в цепочке нет.
- Поэтому простой live-патч одного поля не обеспечивает цель для новых слотов. Безопасный ремонт требует добавления отдельного read-узла `Слоты_Zoom` и детерминированного join по `выбранный_слот` в scheduled/main/redirect. Такой structural patch в текущем запуске не применён.
- Google Sheets, n8n, Telegram, Zoom и live-данные не изменялись.

Терминальный статус текущего запуска: `BLOCKED` (`SLOT_SOURCE_JOIN_NOT_IMPLEMENTED`).

## AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001 — preflight conflict

Пользователь назначил текущую задачу `AS-HR-ZOOM-LINK-SOURCE-RECOVERY-001` и разрешил live-изменения (`live_approval: true`). Фактический preflight остановлен: `00_CONTROL/ACTIVE_TASK.md` содержит другую задачу — `AS-TECH-CODEX-WINDOWS-RECOVERY-001`. До устранения расхождения preflight не выдаёт `PREFLIGHT_OK`, поэтому workflow, Google Sheets, Telegram и Zoom не изменялись.

Зафиксировано в `TASK_STATE.json`: `CONFLICT`, `blocker_code=ACTIVE_TASK_MISMATCH`. Требуется одно управляющее решение: обновить `ACTIVE_TASK.md` на назначенную задачу либо явно отменить новое назначение. Live-изменения остановлены до этого решения.

## AS-CONTROL-CENTER — исправление канонического реестра

Владелец проекта подтвердил четыре продукта: **Академия Стратег**, **Партнёрская сеть**, **Цифровой отдел**, **Маркетинговый отдел**. Реестр исправлен в `00_CONTROL/FOUR_PRODUCTS_AND_FUNNELS_REGISTRY.md`; бизнес-тест, разбор и курс отражены как этапы и предложения связанных воронок.

Проверка расхождения `TASK_STATE.json` и `CODEX_REPORT.md` завершена: текущий терминальный статус обоих документов — `COMPLETED`; результат этапа совпадает. Live-системы не изменялись.

## [ТЕРМИНАЛЬНЫЙ СТАТУС]

`WAITING_APPROVAL`

## AS-HR-ZOOM-0143 — read-only trace

Проверена цепочка `AS-BOT__00_MAIN_ROUTER → AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS → AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` для `HR-0143`. В `Слоты_Zoom` строка 14 для слота `Сб 6-00 Мск` содержит канонический Zoom ID `89808244971`. В `Кандидаты_HR` строка 115 уже содержит устаревший `Zoom_ссылка` с ID `72161587758`. n8n не преобразует первый ID во второй: main router передаёт `/zoom-click?candidate_id=HR-0143`, а redirect читает `Кандидаты_HR.Zoom_ссылка` и возвращает её через 302.

Доказательный отчёт: `06_REPORTS/AS-HR-ZOOM-0143_READONLY_LINK_TRACE_REPORT.md`.

Минимальное исправление предложено, но не применялось: сначала подтвердить правило источника `Слоты_Zoom`, затем точечно синхронизировать строку HR-0143 и проверить 302. n8n, Telegram, Google Sheets, Zoom, credentials и live-воронки не изменялись.

# AS-CONTROL-CENTER__FUNNEL-SYSTEM-RECOVERY-001 — этап 1

Пользователь подтвердил `PREFLIGHT_OK` и явно выбрал продолжение в `SAFE_AUTONOMOUS`. Старые записи о блокировке preflight оставлены как история; текущий статус этапа — `VALIDATING`.

## [ЧТО СДЕЛАНО]

Проведён read-only аудит локальной стабильной памяти и создан `00_CONTROL/FOUR_PRODUCTS_AND_FUNNELS_REGISTRY.md`.

## [РЕЕСТР]

1. Бизнес-тест собственника — подтверждённый входной участок.
2. Разбор результата теста — подтверждённый участок квалификации и записи.
3. Обзорный курс стратегического управления 60 000 ₽ — единственный явно подтверждённый коммерческий продукт; оплата и доступ не подключены.
4. HR/Бэтмановская партнёрская воронка — подтверждённая действующая воронка источника и передачи в бизнес-тест; будущие продукты не утверждались.

## [НЕ ТРОГАЛИ]

n8n, Telegram, Google Sheets, Zoom, credentials, production, live-воронки и пользовательские данные не изменялись. Live API в этом этапе не вызывался.

## [СЛЕДУЮЩИЙ ЭТАП]

Только read-only проверка фактических признаков активности четырёх участков по имеющимся инвентаризационным данным; при недостатке подтверждения — `USER_ACTION_REQUIRED`.

## [ТЕРМИНАЛЬНЫЙ СТАТУС]

Историческая запись о `USER_ACTION_REQUIRED` закрыта подтверждённым решением владельца о четырёх продуктах; актуальный статус указан ниже как `COMPLETED`.

[CODEX→CHATGPT]

Пользователь явно выбрал текущую задачу `AS-CONTROL-CENTER__FUNNEL-SYSTEM-RECOVERY-001` и запретил Windows recovery, возврат к Zoom-инциденту и любые изменения production/integrations.

Обязательный `preflight_control.py` не найден:

- в `C:\Users\admin\Downloads\Academy_Strateg_Codex`;
- в `C:\Users\admin`;
- в Google Drive `Academy Strateg — Project Control`.

Поэтому `PREFLIGHT_OK` не подтверждён, текущая задача не запускалась и получила статус `PREFLIGHT_BLOCKED` в `TASK_STATE.json`.

Не изменялись Windows, Zoom, n8n, Telegram, Google Sheets, credentials, production и live-воронки.

Одно следующее действие: предоставить или восстановить `preflight_control.py`, после чего выполнить только preflight и продолжить задачу при результате `PREFLIGHT_OK`.
[CODEX→CHATGPT]

## AS-KARKASNIK-THREE-FILES-DRIVE-SYNC-001

Владелец явно разрешил загрузить три безопасных Markdown-файла в общую папку `Academy Strateg — Project Control`. Preflight: `PREFLIGHT_OK`, task hash `1cef4b7225681cf8`, execution id `local-drive-sync-20260808-0841`.

Загружены и прочитаны обратно:

- `BATMAN_FUNNEL_MASTER.md` → `02_FUNNELS_AND_SYSTEM_MAPS`, Drive ID `14U3k12b9d-O2WLOZmUH9tu0UZ6J4FxGX`;
- `OWNER_FUNNEL_MASTER.md` → `02_FUNNELS_AND_SYSTEM_MAPS`, Drive ID `1iDGdUbrPOH-bCaLkv5XqG-M_wvF5PcsX`;
- `KARKASNIK_WORK_PROTOCOL.md` → `01_ARCHITECTURE_AND_RULES`, Drive ID `1mb5VL8mdeiFpFdh_dlc1VxULRXI7R5SJ`.

Дубликаты не созданы. Размеры Drive-файлов совпали с локальными (`6227`, `7925`, `3140` байт), MIME — `text/markdown`, содержимое и ключевые маркеры подтверждены обратным чтением. Секреты не загружены.

Другие Drive-файлы, GitHub, production, n8n, Telegram, Google Sheets, Zoom, сайт, credentials и live-воронки не изменялись. GitHub-синхронизация остаётся отдельной задачей.

Терминальный статус: `COMPLETED`.
