# AS-PLATFORM-WEBHOOK__05_FIX_GOOGLE_SHEETS_SCHEMA_AND_RETEST_REPORT

Дата: 2026-07-13

Этап: `AS-PLATFORM-WEBHOOK__05_FIX_GOOGLE_SHEETS_SCHEMA_AND_RETEST`

Workflow: `AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST`

Live workflow ID:

```text
jrkInmhb7vmF6qFH
```

Endpoint:

```text
https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2
```

## [ПОДТВЕРЖДЕНО]

Подтверждённая ошибка schema исправлена:

```text
`columns.schema` is required when `columns.mappingMode` is `defineBelow`
```

До фикса три Google Sheets append nodes имели:

```text
columns.mappingMode = defineBelow
columns.schema = []
```

После фикса workflow задеплоен в тот же live workflow, активирован и проверен через n8n API.

## [BACKUP]

Backup live workflow до фикса сохранён:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_PLATFORM_SCHEMA_FIX/20260713_222448/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_LIVE_BACKUP.json
```

Важно по безопасности:

```text
live workflow содержит временный inline secret в Code node;
в проектной backup/fixed JSON-копии значение secret заменено на [REDACTED_INLINE_SECRET].
```

Реальный secret не сохранён в проектные файлы.

## [SCHEMA FIX]

Исправлены 3 node:

| node | schema до | schema после |
|---|---:|---:|
| `APPEND — Платформа_Webhook_Raw` | 0 | 21 |
| `APPEND — БизнесТест_Регистрации` | 0 | 27 |
| `APPEND — БизнесТест_Результаты` | 0 | 37 |

Локальный fixed JSON:

```text
03_N8N_WORKFLOWS/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_SCHEMA_FIXED.json
```

В проектной копии inline secret редактирован как `[REDACTED_INLINE_SECRET]`.

## [DEPLOY]

Deploy выполнен через n8n API в тот же workflow:

```text
workflow_id: jrkInmhb7vmF6qFH
active: true
nodes_count: 15
webhook path: platform-business-test-v2
responseMode: responseNode
```

Проверка после deploy:

```text
APPEND — Платформа_Webhook_Raw: schema_len 21 / value_keys 21
APPEND — БизнесТест_Регистрации: schema_len 27 / value_keys 27
APPEND — БизнесТест_Результаты: schema_len 37 / value_keys 37
```

## [SINGLE TEST]

Запущен только один контрольный тест, как требовало задание:

```text
case: single_valid_registered
stamp: 20260713_223131
event_id: TEST_platform_single_registered_20260713_223131
HTTP status: 200
execution_id: 330
execution status: success
lastNodeExecuted: RESPOND — ignored
```

Результат Google Sheets read-only:

```text
Платформа_Webhook_Raw: 1 строка
БизнесТест_Регистрации: 0 строк
БизнесТест_Результаты: 0 строк
signature_status: valid
adapter_status: registered_accepted
```

Single test не прошёл полностью, потому что registration row не создана.

Техническая причина single-test fail:

```text
CODE node output:
route = registered
adapter_status = registered_accepted

После APPEND — Платформа_Webhook_Raw:
route отсутствует в output JSON
adapter_status остаётся

IF — registered проверяет:
$json.route == registered

Так как route потерян после Google Sheets append, IF — registered уходит в false,
workflow доходит до RESPOND — ignored, а APPEND — БизнесТест_Регистрации не выполняется.
```

## [FULL 8 TESTS]

Полный batch из 8 HMAC-тестов не запускался.

Причина:

```text
по заданию при провале single registered test нужно остановиться и написать причину.
```

| test | HTTP status | execution status | raw-log | registration | result | pass/fail |
|---|---:|---|---:|---:|---:|---|
| single_valid_registered | 200 | success | 1 | 0 | 0 | fail |
| full 8 tests | not run | not run | not checked | not checked | not checked | stopped |

## [INVALID SIGNATURE]

Отдельная проверка invalid_signature не запускалась, потому что single valid registered test не прошёл.

Безопасность invalid_signature на этом этапе не подтверждена.

## [GOOGLE SHEETS]

По single test появились строки:

```text
Платформа_Webhook_Raw:
- event_id: TEST_platform_single_registered_20260713_223131
- signature_status: valid
- adapter_status: registered_accepted

БизнесТест_Регистрации:
- строка не создана

БизнесТест_Результаты:
- строка не создана, что нормально для registered, но registration тоже должна была появиться
```

JSON single-test отчёта:

```text
reports/platform_webhook_tests/20260713_223228_platform_webhook_single_retest.json
```

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Telegram credentials;
- Google Sheets credentials;
- выданные ссылки;
- `Доска_Прогресса`;
- `Доска_Прогресса_Клики_Переходы`;
- структура Google Sheets;
- названия листов;
- названия колонок.

## [РИСКИ]

- `APPEND — Платформа_Webhook_Raw` теперь не падает, но после append теряется техническое поле `route`, которого нет в raw sheet schema.
- Текущие IF nodes читают `$json.route` после Google Sheets append, поэтому routing после raw-log работает неверно.
- Secret временно inline в live Code node.
- n8n Variables API недоступен на текущем тарифе: API возвращает `403 feat:variables`.
- Проектные JSON-копии redacted и не содержат реальный inline secret.

## [ИТОГОВОЕ РЕШЕНИЕ]

Endpoint пока нельзя отдавать программистам как готовый.

Что уже исправлено:

```text
schema error исправлена;
raw-log начал записываться;
workflow active;
HTTP 200 есть;
valid signature проходит.
```

Что ещё не исправлено:

```text
registered route не доходит до APPEND — БизнесТест_Регистрации,
потому что route теряется после APPEND — Платформа_Webhook_Raw.
```

## [ЧТО ПЕРЕДАТЬ ПРОГРАММИСТАМ]

Пока не передавать production endpoint.

Текст endpoint + headers + HMAC rule готовить только после отдельного фикса routing и успешного full 8 tests.

## [СЛЕДУЮЩИЙ ШАГ]

Подготовить отдельный минимальный routing-fix: IF nodes после `APPEND — Платформа_Webhook_Raw` должны читать `route/http_status` из output `CODE — HMAC dedupe normalize`, а не из output Google Sheets append.
