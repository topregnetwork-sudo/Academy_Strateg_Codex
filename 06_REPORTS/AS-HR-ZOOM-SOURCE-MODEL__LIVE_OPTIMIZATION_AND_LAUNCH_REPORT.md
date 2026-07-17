# AS-HR-ZOOM-SOURCE-MODEL__LIVE_OPTIMIZATION_AND_LAUNCH_REPORT

## [ПОДТВЕРЖДЕНО]

Этап HR-Zoom source model live optimization запущен в боевом режиме.

Выполнено:

- защита с заголовков `Кандидаты_HR` была снята владельцем;
- source model добавлена в Google Sheets;
- 12 колонок click-window добавлены в `Кандидаты_HR`;
- новый объединённый workflow `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` создан через n8n API;
- новый workflow активирован;
- старые отдельные scheduled workflow `02` и `04` выключены;
- главный Telegram router не менялся;
- Zoom-click webhook обновлён на time-window версию без создания второго webhook;
- credentials, webhook URL и Telegram credentials не менялись.

## [BACKUP]

Перед изменениями создан backup live workflow:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_SCHEDULED_ZOOM_EVENTS/20260713_160342
```

Сохранены workflow:

| Workflow | ID | Active до изменений |
|---|---|---:|
| `AS-BOT__00_MAIN_ROUTER` | `fw0azBkY7IwZzhW2` | true |
| `AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN` | `zrZxAFVAGM0k0MUL` | true |
| `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` | `SFmMI8gezZqaXHko` | true |
| `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` | `XFtElyi3ec9Sz65l` | true |
| `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT` | `QQ2J0N3pXVVgSBb6` | true |

Перед обновлением Zoom-click workflow создан отдельный backup:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_ZOOM_CLICK_TIME_WINDOW/20260713_164808
```

После cutover сохранён локальный снимок финального live-состояния:

```text
03_N8N_WORKFLOWS/_LIVE_AFTER_HR_ZOOM_SOURCE_MODEL/20260713_165336
```

Внутри есть `LIVE_STATE_SUMMARY_AFTER.json` и JSON-снимки проверенных workflow.

## [NO 5 MIN SCHEDULE]

Создан и обновлён отдельный отчёт:

```text
06_REPORTS/AS-HR-ZOOM-SOURCE-MODEL__NO_5MIN_SCHEDULE_CHECK.md
```

Результат после cutover:

- schedule каждые 5 минут не найден;
- schedule каждые 1/2/3/5/10 минут в active workflow не найден;
- активный Telegram Trigger найден только в `AS-BOT__00_MAIN_ROUTER`;
- активные schedule-узлы есть только в `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`.

## [НОВЫЙ WORKFLOW]

Создан и активирован:

| Workflow | ID | Active |
|---|---|---:|
| `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | `KJoZSqVP7fM1NQsf` | true |

Локальный import-ready JSON:

```text
03_N8N_WORKFLOWS/AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS_IMPORT_READY.json
```

Состав:

- `SCHEDULE — -30 reminder + host`;
- reminder 30 min branch;
- host brief branch;
- `SCHEDULE — +10 dogon`;
- dogon 10 min branch.

В workflow 20 nodes и 20 connection entries. Локальная валидация перед созданием показала отсутствие пустых/дублирующихся node ids.

## [ОБЪЕДИНЕНО]

Боевой scheduled слой теперь объединяет:

- reminder 30min;
- host brief;
- dogon 10min.

Расписание:

| Branch | Schedule |
|---|---|
| `-30 reminder + host` | Пн/Вт/Ср 07:30, Пн/Ср 17:30, Сб 05:30 |
| `+10 dogon` | Пн/Вт/Ср 08:10, Пн/Ср 18:10, Сб 06:10 |

## [СТАРЫЕ WORKFLOW]

Выключены:

| Workflow | ID | Active после cutover |
|---|---|---:|
| `AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN` | `zrZxAFVAGM0k0MUL` | false |
| `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` | `XFtElyi3ec9Sz65l` | false |

## [ЧТО ОСТАЛОСЬ ACTIVE]

После cutover active:

- `AS-BOT__00_MAIN_ROUTER`;
- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS`.

## [ZOOM CLICK]

`AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` обновлён через n8n API на time-window версию и остался active.

| Workflow | ID | Active | Nodes | Webhook path |
|---|---|---:|---:|---|
| `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` | `SFmMI8gezZqaXHko` | true | 12 | `zoom-click` |

В `Кандидаты_HR` добавлены поля:

```tsv
zoom_click_first_at	zoom_click_first_at_msk	zoom_click_last_at	zoom_click_last_at_msk	zoom_click_valid_at	zoom_click_valid_at_msk	zoom_click_status	zoom_window_start_at_msk	zoom_window_end_at_msk	zoom_click_early_count	zoom_click_late_count	ошибка_zoom_click_window
```

Важно: Zoom-click по-прежнему не считается фактом прихода. Он нужен для учёта кликов, времени клика и прогресса.

Логика active webhook:

- `early`: клик раньше чем за 10 минут до Zoom, Zoom не открывается, `zoom_click_valid_at` не пишется;
- `valid`: клик в окне `-10/+10` минут, Zoom открывается, `zoom_click_valid_at` пишется;
- `late`: поздний клик фиксируется отдельно;
- `zoom_click_first_at/last_at` сохраняют историю первого и последнего клика;
- dogon должен смотреть на `zoom_click_valid_at`, а не на legacy `zoom_click_at`.

## [HOST BRIEF]

В HR-таблице создан/подтверждён лист:

```text
Справочник_Ведущие_Zoom
```

Колонки:

```tsv
slot_name	день	время	start_time_msk	host_name	host_telegram_username	host_telegram_chat_id	backup_chat_id	статус	комментарий
```

Host brief включён внутрь `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` и запускается вместе с веткой `-30 reminder + host`.

## [SOURCE MODEL]

Source model внедрена в общей реферальной таблице:

```text
1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg
```

Создан/подтверждён лист:

```text
Справочник_Источники
```

Колонки:

```tsv
source_id	btm_id	source_pool	source_role	source_status	priority_level	ФИО	telegram_username	telegram_chat_id	телефон	email	город	филиал	branch_id	роль_в_Академии	curator_id	business_test_main_link	hr_invite_link	links_issued_status	links_issued_at	created_at	updated_at	комментарий
```

Результат:

| Показатель | Значение |
|---|---:|
| Всего источников | 3000 |
| `btm_000001-btm_001000` / `priority_referrer` | 1000 |
| `btm_001001+` / `batman` | 2000 |
| Требуют ручной классификации | 1000 |

Правило применено:

- `btm_000001-btm_001000`: `source_pool = priority_referrer`, `source_role = unknown`, `priority_level = C`;
- `btm_001001+`: `source_pool = batman`, `source_role = batman`, `priority_level = D`.

## [ДОСКА_СВОДКА_ИСТОЧНИКОВ]

Создан/подтверждён лист:

```text
Доска_Сводка_Источников
```

Строк: 3000.

Сейчас считаются метрики:

- `business_test_clicks`;
- `hr_invite_clicks`;
- `business_test_registrations`;
- `business_test_results`;
- `conversion_to_test`.

Пока не подключены к агрегатору:

- `owner_bot_starts`;
- `qualifications_done`;
- `razbor_booked`;
- `razbor_completed`;
- `sales_count`;
- `sales_amount`;
- `conversion_to_razbor`;
- `conversion_to_sale`.

Причина: owner/razbor и sales layer ещё не подключены к единому агрегатору источников.

## [ДОСКА_ПРОГРЕССА]

Старая `Доска прогресса` не заменялась.

Создан/подтверждён новый безопасный лист:

```text
Доска_Прогресса_V2
```

Колонки:

```tsv
candidate_id	ФИО	город	telegram_username	telegram_chat_id	btm_id	source_pool	source_role	source_status	priority_level	выбранный_слот	ближайшая_дата_Zoom	время_Zoom	статус_Zoom	статус_напоминания_30мин	reminder_30min_sent_at	zoom_click_first_at_msk	zoom_click_valid_at_msk	zoom_click_status	dogon_10min_sent_at	комментарий
```

Строк: 83.

## [МОЯ СТАТИСТИКА]

`AS-BOT__00_MAIN_ROUTER` не менялся.

Команда `Моя статистика` пока оставлена в старой fallback-логике:

- ищет кандидата по `telegram_chat_id`;
- берёт `btm_id`;
- считает переходы по `БизнесТест_Переходы` для `type = business_test_main` и `статус = redirected`.

Расширенная статистика по `source_role/source_status/priority_level` ещё не внедрена в главный router, чтобы не трогать рабочий Telegram Trigger без отдельного теста.

## [ТЕСТЫ]

| Тест | Результат | Статус |
|---|---|---|
| Backup live workflow | создан | pass |
| Проверка no 5min schedule до cutover | 5 минут не найдено | pass |
| Проверка no 5min schedule после cutover | 5 минут не найдено | pass |
| Проверка Telegram Trigger | один active trigger в main router | pass |
| `Справочник_Источники` | создан/подтверждён, 3000 строк | pass |
| `Доска_Сводка_Источников` | создан/подтверждён, 3000 строк | pass |
| `Справочник_Ведущие_Zoom` | создан/подтверждён | pass |
| `Доска_Прогресса_V2` | создан/подтверждён, 83 строки | pass |
| Click-window колонки в `Кандидаты_HR` | 12 колонок добавлены | pass |
| Read-only audit HR table | создан после добавления колонок | pass |
| Создание `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | создан через n8n API | pass |
| Активация нового workflow | active true | pass |
| Выключение старых `02`/`04` | active false | pass |
| Обновление `03_ZOOM_CLICK_REDIRECT` | active, 12 nodes, `zoom_click_valid_at` найден | pass |

Google Sheets отчёты:

```text
reports/google_sheets_audit/20260713_162621_AS-HR-ZOOM-SOURCE-MODEL_live_source_model_launch.json
reports/google_sheets_audit/20260713_162740_AS-HR-ZOOM-MVP_Form1_Calendar_Zoom_readonly_audit.json
```

## [ОШИБКИ]

Был временный blocker:

```text
Google Sheets API не мог редактировать защищённую строку заголовков Кандидаты_HR.
```

После снятия защиты повторный запуск прошёл успешно, blocker закрыт.

Во время cutover первая попытка активации нового workflow через n8n API вернула ошибку `unsupported media type application/x-www-form-urlencoded`. Повторный запрос с `Content-Type: application/json` успешно активировал workflow.

Первая попытка обновить `03_ZOOM_CLICK_REDIRECT` вернула ошибку n8n API:

```text
request/body/settings must NOT have additional properties
```

Старый workflow был автоматически возвращён в active state, затем update повторён с минимальным `settings: { executionOrder: "v1" }` и прошёл успешно.

## [ЧТО НЕ ТРОГАЛИ]

Не менялись:

- `AS-BOT__00_MAIN_ROUTER`;
- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- credentials;
- webhook URL;
- Telegram credentials;
- уже выданные ссылки;
- старая `Доска прогресса`;
- n8n cached schema вручную не чистилась;
- n8n workflow не импортировались через UI.

## [РИСКИ]

1. Новый объединённый workflow активен, но первый боевой scheduled запуск ещё нужно проверить по execution log.
2. Обновлённый Zoom-click webhook нужно проверить тестовым early/valid/late кликом.
3. Host brief зависит от заполненности `Получатели_Сводок` / `telegram_chat_id` / `active`.
4. Приоритетный диапазон `btm_000001-btm_001000` пока размечен как `unknown/C` до ручной классификации.
5. `Доска_Сводка_Источников` пока не получает owner/razbor/sales события.
6. `Моя статистика` пока не показывает расширенную статистику партнёров/филиалов.

## [СЛЕДУЮЩИЙ ШАГ]

Проверить ближайший execution `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` после следующего scheduled окна и подтвердить:

- reminder ушёл кандидатам;
- host brief ушёл получателям сводки;
- dogon смотрит `zoom_click_valid_at`;
- старые `02`/`04` не запускаются;
- Zoom-click webhook пишет `early/valid/late` и `zoom_click_valid_at` только при валидном клике.
