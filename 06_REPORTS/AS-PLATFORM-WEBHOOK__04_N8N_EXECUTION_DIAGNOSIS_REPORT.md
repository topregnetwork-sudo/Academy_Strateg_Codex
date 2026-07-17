# AS-PLATFORM-WEBHOOK__04_N8N_EXECUTION_DIAGNOSIS_REPORT

Дата: 2026-07-13

Этап: `AS-PLATFORM-WEBHOOK__04_N8N_EXECUTION_DIAGNOSIS`

Workflow: `AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST`

Endpoint:

```text
https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2
```

## [ПОДТВЕРЖДЕНО]

Executions создавались.

Live workflow найден через n8n API:

```text
name: AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST
live workflow_id: jrkInmhb7vmF6qFH
active: true
```

Важно:

```text
workflow_id из задания: jrkImhhb7vmF6qFH
live workflow_id из n8n API: jrkInmhb7vmF6qFH
```

ID из задания отличается от фактического live ID на один символ. Диагностика была повторена по live ID из n8n API.

Webhook node:

```text
path: platform-business-test-v2
method: POST
responseMode: responseNode
rawBody: true
```

## [EXECUTION PATH]

Последний проверенный execution:

```text
execution_id: 329
status: error
mode: webhook
startedAt: 2026-07-13T17:50:41.295Z
stoppedAt: 2026-07-13T17:50:42.416Z
lastNodeExecuted: APPEND — Платформа_Webhook_Raw
```

Фактически прошедший путь:

```text
WEBHOOK — platform business test v2
→ READ — Платформа_Webhook_Raw
→ CODE — HMAC dedupe normalize
→ APPEND — Платформа_Webhook_Raw
```

До nodes `APPEND — БизнесТест_Регистрации`, `APPEND — БизнесТест_Результаты` и `RESPOND — ok/error/ignored` execution не дошёл.

## [ОШИБКА]

Execution останавливается в node:

```text
APPEND — Платформа_Webhook_Raw
```

Текст ошибки n8n:

```text
`columns.schema` is required when `columns.mappingMode` is `defineBelow`
```

## [ПРИЧИНА]

Строки не появляются в Google Sheets, потому что первый Google Sheets append node настроен в режиме ручного mapping:

```text
columns.mappingMode = defineBelow
```

но schema колонок пустая:

```text
columns.schema = []
```

Из-за этого n8n не может выполнить append и падает до записи в `Платформа_Webhook_Raw`.

Итог:

```text
HTTP-запрос дошёл до workflow.
Workflow начал выполняться.
Raw-log append не записал строку.
Причина не в HMAC и не в endpoint, а в schema/mapping Google Sheets node.
```

## [МИНИМАЛЬНЫЙ ФИКС]

Фикс пока не внедрялся.

Минимальный безопасный фикс:

1. В `APPEND — Платформа_Webhook_Raw` заполнить `columns.schema` по заголовкам листа `Платформа_Webhook_Raw`.
2. Проверить все Google Sheets append nodes, где:

```text
columns.mappingMode = defineBelow
columns.schema = []
```

3. Для каждого такого node заполнить schema либо аккуратно переключить mapping на auto-map только если имена входных полей совпадают с заголовками листа.
4. Не менять:
   - webhook URL;
   - credentials;
   - названия листов;
   - названия колонок;
   - бизнес-логику HMAC/dedupe/normalize.
5. После фикса прогнать один valid HMAC test.
6. Read-only проверить, что появилась строка в `Платформа_Webhook_Raw`.

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- live n8n workflow;
- старый `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Telegram credentials;
- Google Sheets;
- выданные ссылки;
- доски прогресса.

## [СЛЕДУЮЩИЙ ШАГ]

Подготовить локальный fixed JSON с заполненным `columns.schema` для Google Sheets append nodes и только после этого развернуть минимальный фикс в live workflow.
