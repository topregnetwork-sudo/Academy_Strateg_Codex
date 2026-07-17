# AS-PLATFORM-WEBHOOK__03_VERIFY_RAW_LOG_AND_CLOSE_ADAPTER_TEST_REPORT

Дата: 2026-07-13

Режим: read-only проверка Google Sheets по batch `20260713_205011`.

## [ПОДТВЕРЖДЕНО]

Codex проверил Google Sheets через read-only Google Sheets API.

Проверены листы:

- `Платформа_Webhook_Raw`
- `БизнесТест_Регистрации`
- `БизнесТест_Результаты`
- дополнительно просмотрен старый `Логи_Webhook_БизнесТест`

Локальный JSON проверки:

```text
reports/google_sheets_audit/20260713_210042_AS-PLATFORM-WEBHOOK_03_verify_rows_20260713_205011.json
```

Факт по таблице:

- `Платформа_Webhook_Raw` содержит 0 строк данных;
- `БизнесТест_Регистрации` содержит только 2 старые тестовые строки от `20260708`;
- `БизнесТест_Результаты` содержит только 1 старую тестовую строку от `20260708`;
- batch `20260713_205011` в проверенных листах не найден.

Workflow active, endpoint live и Workflow ID `jrkImhhb7vmF6qFH` не подтверждены через Codex API-проверку, потому что `N8N_BASE_URL` и `N8N_API_KEY` в текущей среде Codex недоступны.

## [RAW LOG CHECK]

Ожидаемые event_id batch `20260713_205011` в `Платформа_Webhook_Raw` не найдены.

| case | event_id | event | signature_status | dedupe_status | adapter_status | adapter_error | pass/fail |
|---|---|---|---|---|---|---|---|
| valid_registered | `TEST_platform_registered_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| valid_completed | `TEST_platform_completed_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| duplicate | `TEST_platform_registered_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| invalid_signature | `TEST_platform_invalid_sig_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| unknown_event | `TEST_platform_unknown_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| completed_before_registered | `TEST_platform_completed_first_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| missing_btm_id | `TEST_platform_no_btm_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |
| unknown_score | `TEST_platform_unknown_score_20260713_205011` | не найден | не найден | не найден | не найден | не найден | FAIL |

Вывод: raw-log для нового adapter test не подтверждён.

## [REGISTRATION CHECK]

В `БизнесТест_Регистрации` batch `20260713_205011` не найден.

Найдены только старые строки:

| row | event_id | registration_id | btm_id |
|---|---|---|---|
| 2 | `TEST_codex_registration_20260708_145157` | `reg_1783511520354` | `btm_001001` |
| 3 | `TEST_codex_registration_20260708_145522` | `reg_1783511725394` | `btm_001001` |

Ожидания по новому batch:

| event_id | ожидание | факт | pass/fail |
|---|---|---|---|
| `TEST_platform_registered_20260713_205011` | должна быть 1 строка | 0 строк | FAIL |
| `TEST_platform_invalid_sig_20260713_205011` | не должно быть строки | 0 строк | PASS по отсутствию, но HMAC не подтверждён |
| `TEST_platform_unknown_20260713_205011` | не должно быть строки | 0 строк | PASS по отсутствию, но unknown flow не подтверждён |
| `TEST_platform_no_btm_20260713_205011` | должна быть строка с warning | 0 строк | FAIL |
| duplicate `TEST_platform_registered_20260713_205011` | не должен создать дубль | невозможно подтвердить, потому что нет первой строки | FAIL |

## [RESULT CHECK]

В `БизнесТест_Результаты` batch `20260713_205011` не найден.

Найдена только старая строка:

| row | event_id | result_id | btm_id |
|---|---|---|---|
| 2 | `TEST_codex_result_20260708_145522` | `res_1783511729271` | `btm_001001` |

Ожидания по новому batch:

| event_id | ожидание | факт | pass/fail |
|---|---|---|---|
| `TEST_platform_completed_20260713_205011` | должна быть 1 строка | 0 строк | FAIL |
| `TEST_platform_completed_first_20260713_205011` | должна быть 1 строка | 0 строк | FAIL |
| `TEST_platform_unknown_score_20260713_205011` | должна быть 1 строка | 0 строк | FAIL |
| `TEST_platform_invalid_sig_20260713_205011` | не должно быть строки | 0 строк | PASS по отсутствию, но HMAC не подтверждён |
| `TEST_platform_unknown_20260713_205011` | не должно быть строки | 0 строк | PASS по отсутствию, но unknown flow не подтверждён |

## [INVALID SIGNATURE]

HTTP status для invalid_signature из предыдущего тестового batch не подтверждён через n8n execution.

По Google Sheets:

- raw-log строки `TEST_platform_invalid_sig_20260713_205011` нет;
- registration строки `TEST_platform_invalid_sig_20260713_205011` нет;
- result строки `TEST_platform_invalid_sig_20260713_205011` нет.

Итог: небезопасность не доказана, но защита также не подтверждена, потому что отсутствует raw-log с `signature_status = invalid` и `adapter_status = invalid_signature`.

Статус: НЕ ПОДТВЕРЖДЕНО.

## [DUPLICATE]

Duplicate по `TEST_platform_registered_20260713_205011` не подтверждён.

Причина: нет ни первой successful registration строки, ни raw-log строки с `dedupe_status = duplicate_ignored`.

Статус: FAIL / НЕ ПОДТВЕРЖДЕНО.

## [UNKNOWN EVENT]

Unknown event по `TEST_platform_unknown_20260713_205011` не подтверждён.

По регистрации и результатам строк нет, но raw-log также отсутствует. Поэтому невозможно подтвердить, что adapter корректно распознал событие как `ignored_unknown_event`.

Статус: НЕ ПОДТВЕРЖДЕНО.

## [MISSING BTM_ID]

`TEST_platform_no_btm_20260713_205011` не найден.

Ожидалось:

- событие не потеряно;
- создана registration строка;
- warning `missing_btm_id` виден в raw-log / error field.

Факт:

- raw-log: 0 строк;
- registration: 0 строк;
- warning не найден.

Статус: FAIL / НЕ ПОДТВЕРЖДЕНО.

## [SCORES]

`TEST_platform_unknown_score_20260713_205011` не найден в `БизнесТест_Результаты`.

Нельзя подтвердить:

- что `scores_json` сохранён;
- что unknown score `TEST_unknown_scale` остался внутри `scores_json`;
- что известные scores попали в колонки;
- что `result.scores[].result` обработан live workflow.

Статус: FAIL / НЕ ПОДТВЕРЖДЕНО.

## [SECRET]

По контексту задания secret временно inline в Code node, потому что n8n Variables недоступны на текущем тарифе.

Значение secret в отчёт не записывалось.

Риск:

- inline secret в Code node допустим только как временное тестовое решение;
- перед production secret нужно перенести в `Variables`, `External Secrets` или тариф/контур, где защищённое хранение доступно;
- при экспорте workflow нельзя сохранять реальное значение secret в репозиторий.

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- старый `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- старый webhook path `btm-owner-test`;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`;
- Telegram credentials;
- Google Sheets credentials;
- выданные ссылки;
- `Доска_Прогресса`;
- `Доска_Прогресса_Клики_Переходы`;
- структура старых листов.

Создан только локальный read-only verifier:

```text
tools/google_sheets_readonly_audit/verify_platform_webhook_adapter_batch.py
```

## [ИТОГОВОЕ РЕШЕНИЕ]

Нельзя передавать endpoint программистам как готовый.

Причина:

batch `20260713_205011` не найден в `Платформа_Webhook_Raw`, `БизнесТест_Регистрации`, `БизнесТест_Результаты`.

Минимальный критерий готовности не выполнен:

- valid_registered не подтвердился;
- valid_completed не подтвердился;
- duplicate не подтвердился;
- invalid_signature не подтвердился в raw-log;
- missing_btm_id не подтвердился;
- scores не подтвердились.

## [ЧТО ПЕРЕДАТЬ ПРОГРАММИСТАМ]

Пока не передавать endpoint.

Текст для программистов не готов к отправке, потому что внутренний тест adapter-а не подтверждён таблицами.

## [СЛЕДУЮЩИЙ ШАГ]

Проверить в n8n execution workflow `AS-PLATFORM-WEBHOOK__01_RECEIVE_NORMALIZE_BUSINESS_TEST` ID `jrkImhhb7vmF6qFH`, почему test batch `20260713_205011` не создал строки в `Платформа_Webhook_Raw`.

Первое место проверки: узел `APPEND — Платформа_Webhook_Raw` и его Google Sheets credential / sheet selection.

