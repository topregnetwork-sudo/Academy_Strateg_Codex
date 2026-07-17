# AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST

Дата: 2026-07-13

## [ПОДТВЕРЖДЕНО]

Принято решение не переписывать и не отключать текущий рабочий webhook:

- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`
- production path старого workflow: `btm-owner-test`

Для нового формата от сайта бизнес-теста подготовлен отдельный adapter workflow:

- `AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST`

Новый workflow принимает формат:

- `business_test.registered`
- `business_test.completed`

Отдельный файл `webhooks-consumer-guide.md` в проектной папке и attachments не найден. Реализация выполнена по спецификации из задания Codex.

## [НОВЫЙ WORKFLOW]

Локальный import-ready файл:

```text
03_N8N_WORKFLOWS/AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST_IMPORT_READY.json
```

Параметры:

- webhook path: `platform-business-test-v2`
- метод: `POST`
- response mode: `responseNode`
- raw body option: включена в JSON как `rawBody: true`
- nodes: 15
- connections: 12
- active в JSON: `false`

Live workflow через n8n API не создан, потому что в локальном окружении не найдены:

- `N8N_BASE_URL`
- `N8N_API_KEY`

Подготовлен deploy-скрипт:

```text
tools/n8n_platform_webhook/deploy_platform_business_test_adapter.py
```

Он создаёт или обновляет workflow через n8n API, но не активирует его автоматически.

## [SECURITY]

Проверка подписи заложена через HMAC-SHA256.

Signed string:

```text
X-Webhook-Timestamp + "." + raw_body
```

Ожидаемая подпись:

```text
sha256=<hex>
```

Secret должен храниться только в n8n protected/project variable:

```text
PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET
```

В workflow JSON, markdown-отчёты, Google Sheets и локальные скрипты secret не сохранён.

Если подпись неверная или raw body недоступен:

- webhook должен вернуть `401`;
- строка пишется только в raw-log;
- регистрация/результат не пишутся.

## [RAW LOG]

Создан новый лист в таблице `1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg`:

```text
Платформа_Webhook_Raw
```

Sheet ID:

```text
1202426437
```

Заголовки:

```tsv
raw_id	received_at	event	schema_version	event_id	occurred_at	x_webhook_timestamp	x_webhook_schema_version	signature_status	dedupe_status	raw_params_json	raw_payload_json	normalized_payload_json	adapter_status	adapter_error	created_registration_id	created_result_id	created_owner_id	created_bot_link	created_at	комментарий
```

Технический отчёт создания:

```text
reports/google_sheets_audit/20260713_185542_AS-PLATFORM-WEBHOOK_raw_sheet_setup.json
```

Read-only аудит после создания:

```text
reports/google_sheets_audit/20260713_190258_1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg_readonly_audit.json
```

## [NORMALIZATION]

Новый формат платформы нормализуется в старую внутреннюю модель.

Общие поля:

| Platform format | Internal field |
|---|---|
| `event` | `business_test_registration` / `business_test_result` |
| `X-Webhook-Event-Id` | `event_id` |
| `X-Webhook-Schema-Version` | `schema_version` |
| `occurred_at` | `occurred_at` |
| `payload.raw_params.btm_id` | `btm_id` |
| `payload.raw_params.st` | `st` |
| `payload.raw_params.type` | `type` |
| `payload.raw_params.utm_source` | `utm_source` |
| `payload.raw_params.utm_medium` | `utm_medium` |
| `payload.raw_params.utm_campaign` | `utm_campaign` |
| `payload.raw_params.utm_content` | `utm_content` |
| `payload.raw_params.city` | `city` fallback |

Raw payload полностью сохраняется в `Платформа_Webhook_Raw.raw_payload_json`.

Нормализованный payload полностью сохраняется в `Платформа_Webhook_Raw.normalized_payload_json`.

## [REGISTERED]

Для события:

```text
business_test.registered
```

Пишется строка в:

```text
БизнесТест_Регистрации
```

Sheet ID:

```text
609027703
```

Основной mapping:

| Platform field | Sheet column |
|---|---|
| `payload.lead.registration_id` | `registration_id` |
| `payload.lead.registered_at` | `дата_регистрации` |
| `X-Webhook-Event-Id` | `event_id` |
| `payload.raw_params.btm_id` | `btm_id` |
| `payload.raw_params.st` | `st` |
| `payload.raw_params.type` | `type` |
| `payload.lead.page_url` | `page_url` |
| `payload.raw_params` | `raw_params` |
| `payload.lead.first_name` | `имя_собственника` |
| `payload.lead.last_name` | `фамилия_собственника` |
| `payload.lead.full_name` | `ФИО_собственника` |
| `payload.lead.phone` | `телефон` |
| `payload.lead.email` | `email` |
| `payload.lead.city` | `город` |
| `payload.lead.organization` | `организация` |
| `payload.lead.consent.personal_data` | `согласие` |

Если `btm_id` отсутствует, адаптер не роняет webhook: пишет warning `missing_btm_id` в raw-log и всё равно сохраняет строку. Это безопаснее для MVP, потому что событие не теряется, а ошибка атрибуции видна в журнале.

## [COMPLETED]

Для события:

```text
business_test.completed
```

Пишется строка в:

```text
БизнесТест_Результаты
```

Sheet ID:

```text
508729
```

Mapping результата:

| Platform field | Sheet column |
|---|---|
| `payload.result.result_id` | `result_id` |
| `payload.result.completed_at` | `дата_завершения` |
| `payload.result.result_url` | `result_url` |
| `payload.result.scores` | `scores_json` |
| `payload.result.syndromes` | `syndromes_json` |

Scores раскладываются по существующим колонкам, если `feature_name` совпадает:

- `Лидерство`
- `Успешность_планирования`
- `Умение_организовывать`
- `Правильность_оценки`
- `Контроль_финансов`
- `Контроль_деятельности`
- `Подбор_персонала`
- `Маркетинг`
- `Продажи`

`answers_json` не добавлялся в `БизнесТест_Результаты`, потому что такой колонки сейчас нет. Ответы сохраняются внутри raw-log в `normalized_payload_json`; отдельное добавление `answers_json` требует отдельного решения по структуре листа.

## [DEDUPE]

Dedupe выполняется по:

```text
event_id
```

Механика:

1. workflow читает `Платформа_Webhook_Raw`;
2. ищет уже обработанные строки с тем же `event_id`;
3. если событие уже было принято, ставит `dedupe_status = duplicate_ignored`;
4. возвращает `200`;
5. не пишет дубль в `БизнесТест_Регистрации` или `БизнесТест_Результаты`.

MVP-риск: dedupe читает весь raw-log из Google Sheets. Для небольшой нагрузки нормально; при росте лучше вынести dedupe в БД или отдельный быстрый key-value слой.

## [TESTS]

Подготовлен тестовый скрипт:

```text
tools/google_sheets_readonly_audit/test_platform_business_test_webhook.py
```

Он умеет отправлять 8 тестов:

| Тест | Ожидание | Факт |
|---|---|---|
| `business_test.registered` с валидной подписью | `200`, raw-log + registration | не запускался, нет live endpoint |
| `business_test.completed` с валидной подписью | `200`, raw-log + result | не запускался, нет live endpoint |
| повтор того же `event_id` | `200`, `duplicate_ignored`, без дубля | не запускался |
| неверная подпись | `401`, только raw-log | не запускался |
| unknown event | `200`, `ignored_unknown_event` | не запускался |
| completed раньше registered | `200`, result сохраняется | не запускался |
| raw_params без `btm_id` | `200`, warning `missing_btm_id` | не запускался |
| scores с неизвестной шкалой | `200`, scores_json полный, известные шкалы разложены | не запускался |

Причина: workflow ещё не опубликован в n8n, потому что нет `N8N_API_KEY` / `N8N_BASE_URL` в окружении.

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- старый `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook URL `btm-owner-test`;
- Telegram credentials;
- уже выданные ссылки;
- `Доска_Прогресса`;
- `Доска_Прогресса_Клики_Переходы`;
- структура `БизнесТест_Регистрации`;
- структура `БизнесТест_Результаты`;
- структура `БизнесТест_Переходы`.

Создан только новый лист `Платформа_Webhook_Raw`.

## [РИСКИ]

Live workflow не опубликован и не активирован. Пока это import-ready слой, а не production endpoint.

Для HMAC критично, чтобы n8n Webhook node реально отдавал raw body в поле, доступное Code node. В JSON включено `rawBody: true`, но это нужно подтвердить live-тестом.

В Code node используется Node `crypto`. Если n8n Cloud в конкретном окружении запретит `require('crypto')`, тест неверной/валидной подписи покажет `crypto_unavailable`.

Secret должен быть именно в n8n project variable `$vars.PLATFORM_BUSINESS_TEST_WEBHOOK_SECRET`. Через `$env` в n8n Cloud уже была подтверждённая ошибка доступа.

`answers_json` пока не пишется отдельной колонкой в `БизнесТест_Результаты`, чтобы не менять структуру старого листа без отдельного решения.

## [ЧТО ПЕРЕДАТЬ ПРОГРАММИСТАМ]

После live-импорта и активации endpoint будет:

```text
https://batmanstrateg.app.n8n.cloud/webhook/platform-business-test-v2
```

Пока endpoint не подтверждён live-тестом, программистам его нельзя считать production-ready.

Они должны отправлять:

```text
POST
Content-Type: application/json
X-Webhook-Event-Id: <unique event id>
X-Webhook-Timestamp: <ISO-8601 timestamp>
X-Webhook-Schema-Version: <schema version>
X-Webhook-Signature: sha256=<hmac hex>
```

Подписывать нужно:

```text
X-Webhook-Timestamp + "." + raw_body
```

`X-Webhook-Timestamp` берётся дословно из заголовка. Ожидаемый формат timestamp: ISO-8601, например `2026-07-10T09:15:32.0000000+00:00`, не unix timestamp.

События:

```text
business_test.registered
business_test.completed
```

Секрет не передавать в URL, payload, Google Sheets, markdown или чат. Секрет задаётся только в n8n protected/project variable.

## [СЛЕДУЮЩИЙ ШАГ]

Дать Codex временно в окружение `N8N_BASE_URL` и `N8N_API_KEY`, после чего выполнить deploy-скрипт, назначить Google Sheets credential в импортированном workflow при необходимости, активировать workflow и прогнать 8 HMAC-тестов.
