# AS-N8N-API-ACCESS__01_SETUP_FOR_CODEX_AND_DIAGNOSIS_REPORT

Дата: 2026-07-13

Этап: `AS-N8N-API-ACCESS__01_SETUP_FOR_CODEX_AND_DIAGNOSIS`

## [ПОДТВЕРЖДЕНО]

Codex получил рабочий read-only/diagnostic доступ к n8n API через локальный secret-файл вне проекта:

```text
C:\Users\admin\.secrets\n8n_academy_strateg_api.env
```

API key не выведен в чат, отчёты, workflow JSON, Google Sheets или проектные файлы.

Проверка API:

```text
api_status: 200
workflows_visible: 8
secret_saved: true
```

Созданы и проверены локальные инструменты:

```text
tools/n8n_api_access/__init__.py
tools/n8n_api_access/setup_n8n_api_access.py
tools/n8n_api_access/n8n_api_client.py
tools/n8n_api_access/diagnose_platform_webhook_execution.py
```

Скрипты прошли Python compile-check.

В `.gitignore` добавлены защитные правила:

```text
n8n_academy_strateg_api.env
reports/n8n_api_diagnostics/*.json
```

## [N8N WORKFLOW CHECK]

Workflow найден через live n8n API:

```text
name: AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST
live workflow_id: jrkInmhb7vmF6qFH
active: true
nodes_count: 15
```

Важно:

```text
workflow_id из задания: jrkImhhb7vmF6qFH
live workflow_id из n8n API: jrkInmhb7vmF6qFH
```

ID из задания отличается от live ID на один символ. Диагностика была скорректирована и executions проверялись по фактическому live ID.

Webhook:

```text
path: platform-business-test-v2
method: POST
responseMode: responseNode
rawBody: true
```

## [NODE CHECK]

| node | найден | credential | ключевые настройки | pass/fail |
|---|---:|---:|---|---|
| `WEBHOOK — platform business test v2` | да | не нужен | `POST`, `platform-business-test-v2`, `responseNode`, `rawBody=true` | pass |
| `READ — Платформа_Webhook_Raw` | да | да | spreadsheet `1elth...Aw08`, sheetId `1202426437` | pass |
| `CODE — HMAC dedupe normalize` | да | не нужен | code node найден | pass |
| `APPEND — Платформа_Webhook_Raw` | да | да | spreadsheet `1elth...Aw08`, sheet `Платформа_Webhook_Raw`, append | fail на execution |
| `APPEND — БизнесТест_Регистрации` | да | да | sheet `БизнесТест_Регистрации` | не дошло |
| `APPEND — БизнесТест_Результаты` | да | да | sheet `БизнесТест_Результаты` | не дошло |
| `RESPOND — ok/error/ignored` | да | не нужен | response nodes найдены | не дошло |

## [CONNECTION CHECK]

Путь подтверждён через live workflow API:

```text
WEBHOOK → READ Raw → CODE → APPEND RAW → IF → RESPOND
```

`APPEND — Платформа_Webhook_Raw` стоит до response nodes.

## [EXECUTION CHECK]

Executions найдены:

```text
executions_found: 10
latest_execution_id: 329
status: error
mode: webhook
startedAt: 2026-07-13T17:50:41.295Z
stoppedAt: 2026-07-13T17:50:42.416Z
lastNodeExecuted: APPEND — Платформа_Webhook_Raw
```

Прошедшие nodes в latest execution:

```text
WEBHOOK — platform business test v2
READ — Платформа_Webhook_Raw
CODE — HMAC dedupe normalize
APPEND — Платформа_Webhook_Raw
```

Execution останавливается на первом Google Sheets append в raw-log.

Диагностический JSON:

```text
reports/n8n_api_diagnostics/20260713_220857_platform_webhook_execution_diagnosis.json
```

## [ПРИЧИНА]

Точная причина отсутствия строк в Google Sheets подтверждена:

```text
APPEND — Платформа_Webhook_Raw:
`columns.schema` is required when `columns.mappingMode` is `defineBelow`
```

То есть webhook доходит до workflow, HMAC/CODE node выполняется, но запись в `Платформа_Webhook_Raw` падает из-за пустой schema mapping в Google Sheets node.

Локальный fixed JSON содержит ту же проблему:

```text
columns.mappingMode = defineBelow
columns.schema = []
```

## [МИНИМАЛЬНЫЙ ФИКС]

Не внедрён.

Безопасный минимальный фикс:

1. В import-ready JSON и затем в live workflow заполнить `columns.schema` для `APPEND — Платформа_Webhook_Raw` по фактическим заголовкам листа.
2. Проверить остальные Google Sheets append nodes с `mappingMode=defineBelow`, чтобы у них тоже не был пустой `columns.schema`.
3. Не менять webhook path, credentials, названия листов, названия колонок и бизнес-логику.
4. После фикса прогнать 1 valid HMAC test и read-only проверить появление строки в `Платформа_Webhook_Raw`.

Альтернатива только после ручной сверки:

```text
переключить Google Sheets node на auto-map input data,
если имена полей полностью совпадают с заголовками колонок.
```

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- live n8n workflow;
- старый `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Google Sheets;
- Telegram credentials;
- выданные ссылки;
- доски прогресса.

## [СЛЕДУЮЩИЙ ШАГ]

Подготовить локальный фикс import-ready JSON: добавить `columns.schema` во все Google Sheets append nodes с `mappingMode=defineBelow`, затем развернуть обновлённый workflow и прогнать один контрольный HMAC-test.
