# AS-PLATFORM-WEBHOOK__02_DEPLOY_AND_TEST_BUSINESS_TEST_ADAPTER_REPORT

Дата: 2026-07-13

## [ТЕКУЩИЙ ЗАПУСК]

Повторная попытка deploy выполнена 2026-07-13 после команды пользователя.

Codex проверил наличие переменных окружения без вывода значений:

```text
N8N_BASE_URL=MISSING
N8N_API_KEY=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_URL=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET=MISSING
```

Также проверены пользовательские и машинные переменные Windows без вывода значений:

```text
N8N_BASE_URL=MISSING
N8N_API_KEY=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_URL=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET=MISSING
```

Вывод: переменные могли быть заданы во внешнем окне PowerShell, но они не доступны процессу Codex, из которого запускаются скрипты.

Повторная проверка после сообщения пользователя о сохранении user variables:

```text
N8N_BASE_URL=MISSING
N8N_API_KEY=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_URL=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET=MISSING
```

Дополнительно проверена ветка `HKCU:\Environment`; переменные там также не найдены.

Deploy, активация workflow и 8 HMAC-тестов не выполнялись, потому что API-доступ к n8n всё ещё недоступен текущему процессу Codex.

Дополнительная проверка после команды пользователя "проверяй снова":

```text
N8N_BASE_URL=MISSING
N8N_API_KEY=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_URL=MISSING
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET=MISSING
```

В `HKCU:\Environment` также не найдено ни одного имени переменной, содержащего `N8N`, `PLATFORM` или `WEBHOOK`.

## [ПОДТВЕРЖДЕНО]

Перед deploy исправлены 3 критичных места в новом adapter workflow `AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST`.

Исправлено:

1. `X-Webhook-Timestamp` зафиксирован как ISO-8601 timestamp, не unix timestamp.
2. `scoreValue()` теперь берёт числовой результат шкалы из `item.result` перед fallback на `item.score`, `item.value`, `item.points`.
3. `rawBodyFromWebhook()` теперь сначала читает raw body из `item.binary.data.data`, затем использует fallback на JSON-поля `rawBody`, `raw_body`, `rawBodyText`, `raw`, `bodyRaw`.

Создан fixed workflow JSON:

```text
03_N8N_WORKFLOWS/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_IMPORT_READY_FIXED.json
```

Deploy-скрипт переключён на fixed workflow JSON:

```text
tools/n8n_platform_webhook/deploy_platform_business_test_adapter.py
```

Тестовый отправитель HMAC также исправлен: теперь он подписывает ISO-8601 timestamp.

```text
tools/google_sheets_readonly_audit/test_platform_business_test_webhook.py
```

## [DEPLOY]

Deploy не выполнен.

Причина: в текущей локальной сессии не заданы обязательные переменные:

```text
N8N_BASE_URL
N8N_API_KEY
```

Контрольный запуск deploy-скрипта остановился безопасно до сетевых действий:

```text
Missing N8N_BASE_URL or N8N_API_KEY
```

Workflow ID: не создан / не обновлён в live n8n на этом шаге.

Active status: не менялся.

Webhook path в fixed JSON:

```text
platform-business-test-v2
```

## [SECRET]

Secret не задан через Codex и не записан в проект.

Ожидаемая переменная в n8n:

```text
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET
```

Значение secret нельзя писать в markdown, JSON, Google Sheets, чат или репозиторий.

Если protected/project variable нельзя создать через n8n API, её нужно создать вручную:

```text
Settings / Variables / Add variable
Name: PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET
Value: секрет
Save
```

## [ENDPOINT]

Ожидаемый endpoint после deploy и активации:

```text
https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2
```

Endpoint пока нельзя передавать программистам как готовый, потому что live deploy и 8 HMAC-тестов ещё не пройдены.

## [TESTS]

8 HMAC-тестов не запускались, потому что workflow ещё не задеплоен и endpoint не активирован.

| Тест | Ожидание | Факт | Pass/Fail | Execution/Log |
|---|---|---|---|---|
| `business_test.registered` valid | 200 + raw-log + registration | не запускался | blocked | нет live endpoint |
| `business_test.completed` valid | 200 + raw-log + result | не запускался | blocked | нет live endpoint |
| duplicate `event_id` | 200 + `duplicate_ignored` без дубля | не запускался | blocked | нет live endpoint |
| invalid signature | 401 + raw-log, без нормализованной записи | не запускался | blocked | нет live endpoint |
| unknown event | 200 + `ignored_unknown_event` | не запускался | blocked | нет live endpoint |
| completed before registered | событие не теряется | не запускался | blocked | нет live endpoint |
| raw_params без `btm_id` | warning `missing_btm_id`, событие не теряется | не запускался | blocked | нет live endpoint |
| scores с неизвестной шкалой | `scores_json` полный, известные шкалы разложены | не запускался | blocked | нет live endpoint |

## [GOOGLE SHEETS]

На этом шаге новые строки в Google Sheets не добавлялись.

Ранее подготовленный лист raw-log остаётся целевым для live-тестов:

```text
Платформа_Webhook_Raw
```

Целевые листы для нормализованных событий:

```text
БизнесТест_Регистрации
БизнесТест_Результаты
```

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- старый `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Telegram credentials;
- Google Sheets credentials;
- live таблицы, листы, колонки, формулы и доступы;
- доски прогресса;
- n8n active workflows.

## [РИСКИ]

Главный риск сейчас не в структуре workflow, а в неподтверждённом live-поведении n8n Webhook node с `rawBody: true`.

Нужно подтвердить live-тестом, что raw body реально приходит либо в `binary.data.data`, либо в fallback-полях.

До live-теста нельзя считать HMAC-приём готовым.

Также нельзя активировать endpoint для программистов, пока не проверено:

- Google Sheets credential в импортированном workflow;
- доступ workflow к `PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET`;
- отсутствие дублей при повторном `event_id`;
- корректная раскладка `result.scores[].result` по колонкам.

## [ЧТО ПЕРЕДАТЬ ПРОГРАММИСТАМ]

Пока не передавать.

После успешных 8 тестов передать:

```text
Endpoint:
https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2

Method:
POST

Headers:
Content-Type: application/json
X-Webhook-Event-Id: <unique event id>
X-Webhook-Timestamp: <ISO-8601 timestamp>
X-Webhook-Schema-Version: <schema version>
X-Webhook-Signature: sha256=<hmac hex>

Signature payload:
X-Webhook-Timestamp + "." + raw_body

Events:
business_test.registered
business_test.completed
```

`X-Webhook-Timestamp` должен быть ISO-8601 и должен использоваться в подписи дословно, без преобразования в unix timestamp.

## [СЛЕДУЮЩИЙ ШАГ]

В одной PowerShell-сессии задать только локальные переменные `N8N_BASE_URL` и `N8N_API_KEY`, не сохраняя API key в проект, затем повторно запустить deploy fixed workflow.
