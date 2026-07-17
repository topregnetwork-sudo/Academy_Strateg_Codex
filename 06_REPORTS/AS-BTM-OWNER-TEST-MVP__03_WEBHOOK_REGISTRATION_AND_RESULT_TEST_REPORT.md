# AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT — Test Report

## [ПОДТВЕРЖДЕНО]

Контекст проекта прочитан перед проверкой:

- `AGENTS.md`
- `00_START_HERE/00_PROJECT_INDEX.md`
- `01_CONTEXT/01_MAIN_GOAL.md`
- `02_STABLE_DATA/02_STABLE_CONTEXT.md`
- `07_CURRENT_TASKS/CURRENT_TASK.md`

Production webhook URL, переданный пользователем:

`https://batmanstrateg.app.n8n.cloud/webhook/btm-owner-test`

Токен был предоставлен пользователем и использован только как временная переменная процесса для тестового POST. Токен не сохранён в репозитории.

Целевые листы в таблице `1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg` существуют и имеют заголовки:

- `БизнесТест_Регистрации`
- `БизнесТест_Результаты`
- `Логи_Webhook_БизнесТест`

## [ТЕСТ]

Выполнены POST-запросы с явной TEST-маркировкой:

- `TEST_codex_registration_20260708_142638`
- `TEST_codex_result_20260708_142638`
- `TEST_codex_invalid_token_20260708_142638`
- `TEST_codex_registration_20260708_142800`
- `TEST_codex_result_20260708_142800`
- `TEST_codex_invalid_token_20260708_142800`

HTTP-ответ webhook:

- valid registration: `200`
- valid result: `200`
- invalid token: `200`

Read-only проверка Google Sheets API после тестов:

- `БизнесТест_Регистрации`: `TEST_codex` строк не найдено
- `БизнесТест_Результаты`: `TEST_codex` строк не найдено
- `Логи_Webhook_БизнесТест`: `TEST_codex` строк не найдено

Повторный тест после ручной замены `$env` на `$vars` в n8n:

- `TEST_codex_registration_20260708_143638`
- `TEST_codex_result_20260708_143638`
- `TEST_codex_invalid_token_20260708_143638`

HTTP-ответ webhook:

- valid registration: `200`
- valid result: `200`
- invalid token: `200`

Read-only проверка Google Sheets API после повторного теста:

- `БизнесТест_Регистрации`: `TEST_codex` строк не найдено
- `БизнесТест_Результаты`: `TEST_codex` строк не найдено
- `Логи_Webhook_БизнесТест`: `TEST_codex` строк не найдено

Повторный тест после обновления schema в узле `APPEND — Логи_Webhook_БизнесТест`:

- `TEST_codex_registration_20260708_144504`
- `TEST_codex_result_20260708_144504`
- `TEST_codex_invalid_token_20260708_144504`

HTTP-ответ webhook:

- valid registration: `200`
- valid result: `200`
- invalid token: `401`

Read-only проверка Google Sheets API:

- `БизнесТест_Регистрации`: `TEST_codex` строк не найдено
- `БизнесТест_Результаты`: `TEST_codex` строк не найдено
- `Логи_Webhook_БизнесТест`: найдена `1` строка `TEST_codex_invalid_token_20260708_144504`

Вывод:

- проверка токена заработала;
- error-ветка пишет в лог;
- ветки registration/result пока не подтверждены;
- режим автоматического маппинга в узле лога расширил заголовки листа дополнительными техническими колонками после `created_at`.

Повторный тест после ручной правки узла `APPEND — БизнесТест_Регистрации`:

- `TEST_codex_registration_20260708_144954`
- `TEST_codex_result_20260708_144954`
- `TEST_codex_invalid_token_20260708_144954`

HTTP-ответ webhook:

- valid registration: `200`
- valid result: `200`
- invalid token: `401`

Read-only проверка Google Sheets API:

- `БизнесТест_Регистрации`: `TEST_codex` строк не найдено
- `БизнесТест_Результаты`: `TEST_codex` строк не найдено
- `Логи_Webhook_БизнесТест`: найдены `2` строки invalid-token, включая `TEST_codex_invalid_token_20260708_144954`

Вывод:

- token-защита и error-log подтверждены повторно;
- запись registration/result всё ещё не подтверждена;
- нужна execution валидного registration/result, чтобы увидеть следующий красный узел.

Повторный тест после финальной ручной правки registration-ветки:

- `TEST_codex_registration_20260708_145157`
- `TEST_codex_result_20260708_145157`
- `TEST_codex_invalid_token_20260708_145157`

HTTP-ответ webhook:

- valid registration: `200`, body `{"ok":true,"event_id":"TEST_codex_registration_20260708_145157","btm_id":"btm_001001"}`
- valid result: `200`
- invalid token: `401`

Read-only проверка Google Sheets API:

- `БизнесТест_Регистрации`: найдена `1` строка `TEST_codex_registration_20260708_145157`
- `БизнесТест_Результаты`: `TEST_codex` строк не найдено
- `Логи_Webhook_БизнесТест`: найдены `3` invalid-token строки, включая `TEST_codex_invalid_token_20260708_145157`

Вывод:

- registration-ветка подтверждена end-to-end;
- token-защита подтверждена;
- error-log подтверждён;
- result-ветка ещё требует правки узла `APPEND — БизнесТест_Результаты`.

Финальный тест после ручной правки result-ветки:

- `TEST_codex_registration_20260708_145522`
- `TEST_codex_result_20260708_145522`
- `TEST_codex_invalid_token_20260708_145522`

HTTP-ответ webhook:

- valid registration: `200`, body `{"ok":true,"event_id":"TEST_codex_registration_20260708_145522","btm_id":"btm_001001"}`
- valid result: `200`, body `{"ok":true,"event_id":"TEST_codex_result_20260708_145522","btm_id":"btm_001001"}`
- invalid token: `401`

Read-only проверка Google Sheets API:

- `БизнесТест_Регистрации`: найдена строка `TEST_codex_registration_20260708_145522`
- `БизнесТест_Результаты`: найдена строка `TEST_codex_result_20260708_145522`
- `Логи_Webhook_БизнесТест`: найдена строка `TEST_codex_invalid_token_20260708_145522`

## [ФИНАЛЬНО ПОДТВЕРЖДЕНО]

Workflow `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT` работает end-to-end:

- принимает `business_test_registration`;
- пишет регистрацию в `БизнесТест_Регистрации`;
- принимает `business_test_result`;
- пишет результат в `БизнесТест_Результаты`;
- отклоняет неверный токен HTTP `401`;
- пишет ошибочный запрос в `Логи_Webhook_БизнесТест`.

## [ОСТАТОЧНЫЙ РИСК]

В листе `Логи_Webhook_БизнесТест` после включения automatic mapping появились дополнительные технические колонки после `created_at`. Это не блокирует работу webhook, но структуру лог-листа нужно позже привести к целевым 11 колонкам отдельным аккуратным шагом.

## [НЕ ПОДТВЕРЖДЕНО]

Не подтверждено, что опубликованный workflow реально пишет в Google Sheets.

Не подтверждено, что n8n variable `BTM_OWNER_TEST_WEBHOOK_TOKEN` доступна внутри Code node именно как `$env.BTM_OWNER_TEST_WEBHOOK_TOKEN`.

## [ПРИЧИНА НАЙДЕНА]

По screenshot execution `ID#276` от `2026-07-08 14:28:06`:

`Problem in node 'CODE — validate auth and normalize'`

Ошибка:

`Cannot assign to read only property 'name' of object 'Error: access to env vars denied'`

Причина: опубликованный workflow читает token через `$env.BTM_OWNER_TEST_WEBHOOK_TOKEN`, а n8n Cloud запрещает доступ к env vars из Code node.

Локальный import-ready JSON обновлён на безопасный вариант чтения project variable:

```js
const expectedToken = String($vars.BTM_OWNER_TEST_WEBHOOK_TOKEN || '').trim();
```

## [СЛЕДУЮЩАЯ ПРИЧИНА НАЙДЕНА]

По screenshot execution `ID#279` от `2026-07-08 14:36:45`:

`Problem in node 'APPEND — Логи_Webhook_БизнесТест'`

Ошибка:

`Sheet with ID Логи_Webhook_БизнесТест not found`

Read-only API-аудит `20260708_143857` подтвердил, что лист существует:

- `БизнесТест_Регистрации` → `sheet_id: 609027703`
- `БизнесТест_Результаты` → `sheet_id: 508729`
- `Логи_Webhook_БизнесТест` → `sheet_id: 2063374440`

Причина: Google Sheets node в n8n в режиме `list` ищет лист по `sheetName.value` как по internal `sheet_id`. В import-ready JSON были указаны названия листов вместо числовых ID.

Локальный import-ready JSON обновлён:

- `APPEND — БизнесТест_Регистрации`: `sheetName.value = 609027703`
- `APPEND — БизнесТест_Результаты`: `sheetName.value = 508729`
- `APPEND — Логи_Webhook_БизнесТест`: `sheetName.value = 2063374440`

Не подтверждено, что у всех Google Sheets append-узлов в опубликованном workflow назначены рабочие credentials после импорта.

Не подтверждено, что последняя production execution проходит до append-узлов.

## [ЛОКАЛЬНО ПРОВЕРЕНО]

Локальный import-ready JSON содержит корректные названия листов:

- `APPEND — БизнесТест_Регистрации` → `БизнесТест_Регистрации`
- `APPEND — БизнесТест_Результаты` → `БизнесТест_Результаты`
- `APPEND — Логи_Webhook_БизнесТест` → `Логи_Webhook_БизнесТест`

Локальный import-ready JSON содержит корректные ключевые колонки:

- `event_id`
- `btm_id`
- `st`
- `type`
- `utm_source`
- `utm_medium`
- `utm_campaign`
- `utm_content`
- `page_url`
- `created_at`

## [РИСКИ]

Главный риск: внешний endpoint отвечает `200`, но данные не доходят до таблицы. Для сайта это опасно, потому что программист может считать интеграцию рабочей, а заявки и результаты не будут сохраняться.

Возможные причины:

- production workflow опубликован, но append-узлы не исполняются;
- Google Sheets credentials не назначены во всех append-узлах после импорта;
- n8n variable используется не тем способом внутри Code node;
- execution падает до записи в Google Sheets;
- `Respond — error` настроен так, что даже ошибка выглядит как HTTP `200`.

## [ЗАПРЕТ]

Не менять:

- Google Sheets данные, кроме уже разрешённого TEST-прогона;
- n8n workflow JSON;
- опубликованный workflow в n8n;
- credentials;
- webhook URL;
- листы и колонки;
- рабочие workflow `AS-BOT__00_MAIN_ROUTER` и HR-Zoom.

Не сохранять реальный токен в проект.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Открыть в n8n workflow `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`, вкладку `Executions`, последнюю execution от `2026-07-08 14:28`, и проверить первый красный/ошибочный узел.

Нужно увидеть одно из трёх:

- ошибка Code node по token variable;
- ошибка Google Sheets append node / credentials;
- execution не доходит до append-узлов.
