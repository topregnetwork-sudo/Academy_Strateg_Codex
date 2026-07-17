# AS-PLATFORM-WEBHOOK__06_FIX_ROUTING_AFTER_RAW_APPEND_AND_FULL_RETEST_REPORT

Дата: 2026-07-13

Этап: `AS-PLATFORM-WEBHOOK__06_FIX_ROUTING_AFTER_RAW_APPEND_AND_FULL_RETEST`

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

Routing issue найден и исправлен.

Проблема была такой:

```text
CODE — HMAC dedupe normalize выдавал route = registered/completed,
но после APPEND — Платформа_Webhook_Raw выходной JSON становился output Google Sheets node,
где поля route нет.
```

Из-за этого `IF — registered` и `IF — completed` проверяли пустое `$json.route` и уходили в false.

После routing-fix:

```text
route после raw append восстановлен;
registered идёт в APPEND — БизнесТест_Регистрации;
completed идёт в APPEND — БизнесТест_Результаты;
full 8 tests пройдены.
```

## [BACKUP]

Backup live workflow до routing-fix сохранён:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_PLATFORM_ROUTING_FIX/20260713_224436/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_LIVE_BACKUP.json
```

Проектная backup-копия безопасна:

```text
inline secret заменён на [REDACTED_INLINE_SECRET]
```

## [ROUTING FIX]

Добавлен один технический node:

```text
CODE — restore normalized payload after raw append
```

Логика restore node:

```javascript
const source = $('CODE — HMAC dedupe normalize').first().json;
return [{ json: source }];
```

Изменены connections:

До:

```text
APPEND — Платформа_Webhook_Raw
→ IF — invalid signature
```

После:

```text
APPEND — Платформа_Webhook_Raw
→ CODE — restore normalized payload after raw append
→ IF — invalid signature
```

Не менялись:

```text
HMAC code
dedupe logic
normalize logic
Google Sheets mappings
Google Sheets credentials
webhook path
inline secret
```

Локальный fixed JSON:

```text
03_N8N_WORKFLOWS/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_ROUTING_FIXED.json
```

В проектной JSON-копии inline secret заменён на `[REDACTED_INLINE_SECRET]`.

## [DEPLOY]

Deploy выполнен через n8n API в тот же live workflow.

Проверка после deploy:

```text
workflow_id: jrkInmhb7vmF6qFH
active: true
nodes_count: 16
path: platform-business-test-v2
responseMode: responseNode
restore node: present
```

Schema fix сохранился:

```text
APPEND — Платформа_Webhook_Raw: schema 21 / value 21
APPEND — БизнесТест_Регистрации: schema 27 / value 27
APPEND — БизнесТест_Результаты: schema 37 / value 37
```

Проверка route в execution:

```text
execution_id: 333
restore_route: registered
restore_event_id: TEST_platform_registered_20260713_224806
restore_adapter_status: registered_accepted
```

## [SINGLE REGISTERED TEST]

JSON:

```text
reports/platform_webhook_tests/20260713_224553_platform_webhook_single_retest.json
```

Результат:

| HTTP | execution | raw-log | registration | result | pass/fail |
|---:|---|---:|---:|---:|---|
| 200 | success, `RESPOND — ok` | 1 | 1 | 0 | pass |

Детали:

```text
event_id: TEST_platform_single_registered_20260713_224509
signature_status: valid
adapter_status: registered_accepted
```

## [SINGLE COMPLETED TEST]

JSON:

```text
reports/platform_webhook_tests/20260713_224715_platform_webhook_single_completed_retest.json
```

Результат:

| HTTP | execution | raw-log | registration | result | scores | pass/fail |
|---:|---|---:|---:|---:|---|---|
| 200 | success, `RESPOND — ok` | 1 | 0 | 1 | ok | pass |

Детали:

```text
event_id: TEST_platform_single_completed_20260713_224636
signature_status: valid
adapter_status: completed_accepted
scores_json: present
known scores: present
```

Известные scores разложены по колонкам:

```text
Лидерство = 1
Успешность_планирования = 2
Умение_организовывать = 3
Правильность_оценки = 4
Контроль_финансов = 5
Контроль_деятельности = 6
Подбор_персонала = 7
Маркетинг = 8
Продажи = 9
```

## [FULL 8 TESTS]

JSON:

```text
reports/platform_webhook_tests/20260713_225128_platform_webhook_full_retest.json
```

Stamp:

```text
20260713_224806
```

Общий результат:

```text
pass: true
raw rows: 8
registration rows: 2
result rows: 3
```

| test | HTTP status | execution status | raw-log | registration | result | pass-fail |
|---|---:|---|---:|---:|---:|---|
| valid_registered | 200 | success, `RESPOND — ok` | 2* | 1 | 0 | pass |
| valid_completed | 200 | success, `RESPOND — ok` | 1 | 0 | 1 | pass |
| duplicate_registered | 200 | success, `RESPOND — ignored` | included in valid_registered raw | no duplicate | 0 | pass |
| invalid_signature | 401 | success, `RESPOND — error` | 1 | 0 | 0 | pass |
| unknown_event | 200 | success, `RESPOND — ignored` | 1 | 0 | 0 | pass |
| completed_before_registered | 200 | success, `RESPOND — ok` | 1 | 0 | 1 | pass |
| missing_btm_id | 200 | success, `RESPOND — ok` | 1 | 1 | 0 | pass |
| unknown_score | 200 | success, `RESPOND — ok` | 1 | 0 | 1 | pass |

`*` Для valid_registered raw-log содержит 2 строки: первая `registered_accepted`, вторая `duplicate_ignored`.

## [INVALID SIGNATURE]

Invalid signature проверена отдельно внутри full batch:

```text
event_id: TEST_platform_invalid_sig_20260713_224806
HTTP status: 401
signature_status: invalid
adapter_status: invalid_signature
adapter_error: signature mismatch
registration rows: 0
result rows: 0
```

Результат:

```text
[БЕЗОПАСНО]
Неверная подпись не создаёт бизнес-записи.
```

HTTP status уже корректный `401`, поэтому блок `[НЕИДЕАЛЬНО] HTTP 200 вместо 401` не применяется.

## [GOOGLE SHEETS]

По full batch появились:

```text
Платформа_Webhook_Raw: 8 строк
БизнесТест_Регистрации: 2 строки
БизнесТест_Результаты: 3 строки
```

Ключевые строки:

```text
valid_registered:
- raw: registered_accepted + duplicate_ignored
- registration: TEST_platform_reg_20260713_224806

valid_completed:
- result: TEST_platform_result_20260713_224806
- scores_json заполнен
- 9 score columns заполнены

missing_btm_id:
- raw adapter_error = missing_btm_id
- registration создана с warning

unknown_score:
- result создан
- TEST_unknown_scale сохранён в scores_json
- известные scores разложены по колонкам
```

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- webhook path;
- credentials;
- inline secret;
- HMAC code;
- dedupe logic;
- normalize logic;
- Google Sheets columns;
- Google Sheets sheet names;
- старый workflow `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Telegram credentials;
- выданные ссылки;
- доски прогресса.

## [РИСКИ]

- Secret временно inline в live Code node.
- n8n Variables недоступны на текущем тарифе: API возвращал `403 feat:variables`.
- Нужно вынести secret в нормальный secret/variables-контур при переходе на тариф или self-host, где Variables доступны.
- Тестовые строки записаны в live Google Sheets и должны учитываться как тестовые по `TEST_platform_*`.

## [ИТОГОВОЕ РЕШЕНИЕ]

Endpoint можно отдавать программистам для интеграции сайта.

Статус:

```text
READY FOR SITE INTEGRATION
```

Условия:

```text
передавать программистам endpoint, headers и HMAC rule;
не передавать secret в URL;
secret передавать только безопасным каналом владельцу/ответственному разработчику;
сайт должен подписывать raw body строго до отправки.
```

## [ЧТО ПЕРЕДАТЬ ПРОГРАММИСТАМ]

Endpoint:

```text
POST https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2
```

Headers:

```text
Content-Type: application/json
X-Webhook-Event-Id: <unique_event_id>
X-Webhook-Timestamp: <ISO-8601 UTC timestamp>
X-Webhook-Schema-Version: 2026-07-13
X-Webhook-Signature: sha256=<hmac_sha256_hex>
```

HMAC rule:

```text
signature_payload = X-Webhook-Timestamp + "." + raw_request_body
signature = HMAC_SHA256(secret, signature_payload)
X-Webhook-Signature = "sha256=" + signature_hex
```

Важно:

```text
raw_request_body должен быть тем же байтовым JSON, который реально отправляется в POST body;
timestamp должен быть ISO-8601;
event_id должен быть уникальным для каждого события;
секрет нельзя передавать в URL, query params, body или Google Sheets.
```

Поддержанные events:

```text
business_test.registered
business_test.completed
```

Безопасное поведение:

```text
invalid signature -> HTTP 401, raw-log yes, registration/result no
unknown event -> HTTP 200 ignored, raw-log yes, registration/result no
duplicate event_id -> ignored, дубль registration/result не создаётся
```

## [СЛЕДУЮЩИЙ ШАГ]

Передать программистам endpoint + headers + HMAC rule и попросить отправить один тестовый `business_test.registered` с реального сайта в тестовом режиме.
