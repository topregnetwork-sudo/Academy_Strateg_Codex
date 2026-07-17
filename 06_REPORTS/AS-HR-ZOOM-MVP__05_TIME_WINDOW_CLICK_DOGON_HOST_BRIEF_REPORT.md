# AS-HR-ZOOM-MVP__05_TIME_WINDOW_CLICK_DOGON_HOST_BRIEF

## [ПОДТВЕРЖДЕНО]

Стабильный контекст принят. Работа велась только с HR-Zoom слоем:

- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN`;
- `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT`;
- `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN`;
- таблица `AS-HR-ZOOM-MVP_Form1_Calendar_Zoom`.

Owner/razbor, business-test webhook, Бэтман-ссылки, `n8n` production workflow и живые Google Sheets данные не изменялись.

Создан read-only API-аудит:

`reports/google_sheets_audit/20260711_080925_AS-HR-ZOOM-MVP_time_window_issue_readonly_audit.json`

## [ПРИЧИНА СБОЯ]

### Перевезенцев Евгений Александрович / @Perevezentsev96

Read-only API нашёл строку:

- `candidate_id`: `HR-0110`;
- строка: `82`;
- Telegram: `@Perevezentsev96`;
- `telegram_chat_id`: `2146283446`;
- дата Zoom: `2026-07-11`;
- слот: `Сб 6-00 Мск`;
- время Zoom: `06:00`;
- `статус_уведомления`: `отправлено`;
- `статус_напоминания_30мин`: пусто;
- `reminder_30min_sent_at`: пусто;
- `zoom_click_at`: пусто;
- `zoom_click_at_msk`: пусто;
- `статус_Zoom`: `назначен`;
- `статус_dogon_10мин`: пусто;
- `dogon_10min_sent_at`: пусто.

По данным строки кандидат был пригоден для reminder/dogon: есть `telegram_chat_id`, дата, слот, время, Zoom-ссылка и отправленное приглашение.

Точная причина по executions не подтверждена локально: доступа к n8n executions через API в этом этапе нет. По локальным JSON видно две системные причины риска:

1. `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` сейчас считает любой клик фактом перехода и пишет `статус_Zoom = перешёл_к_Zoom`.
2. `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` сейчас исключает кандидата из догона по любому заполненному `zoom_click_at`, а не по валидному клику в окне.

Для конкретного Перевезенцева ранний клик в строке не зафиксирован: `zoom_click_at` пустой. Значит его конкретный пропуск вероятнее связан с запуском/версией workflow 02/04 или execution schedule, а не с ранним кликом в этой строке.

## [НОВАЯ ЛОГИКА ZOOM CLICK]

Подготовлена import-ready версия:

`03_N8N_WORKFLOWS/AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT_TIME_WINDOW_IMPORT_READY.json`

Логика:

- `raw click`: любой клик по кнопке, пишется в legacy `zoom_click_at` / `zoom_click_at_msk`;
- `early`: клик раньше чем за 10 минут до Zoom, Zoom не открывается, `zoom_click_valid_at` не пишется;
- `valid`: клик в окне `-10/+10` минут, пишется `zoom_click_valid_at`, Zoom открывается;
- `late`: клик позже `+10` минут, логируется отдельно, но не считается валидным приходом;
- `статус_Zoom = перешёл_к_Zoom_вовремя` ставится только при `valid`.

Нужные новые колонки справа в `Кандидаты_HR`:

```tsv
zoom_click_first_at	zoom_click_first_at_msk	zoom_click_last_at	zoom_click_last_at_msk	zoom_click_valid_at	zoom_click_valid_at_msk	zoom_click_status	zoom_window_start_at_msk	zoom_window_end_at_msk	zoom_click_early_count	zoom_click_late_count	ошибка_zoom_click_window
```

## [REMINDER]

Подготовлена import-ready версия:

`03_N8N_WORKFLOWS/AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN_TIME_BASED_IMPORT_READY.json`

Что исправлено:

- выборка больше не зависит от `zoom_click_at` или `статус_Zoom`;
- логика идёт по `ближайшая_дата_Zoom` + `время_Zoom`;
- `выбранный_слот` используется как fallback для времени;
- убрана зависимость от закрытого списка старых слотов;
- окно проверки: примерно 30 минут до Zoom с допуском 10 минут.

## [DOGON]

Подготовлена import-ready версия:

`03_N8N_WORKFLOWS/AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN_VALID_CLICK_IMPORT_READY.json`

Что исправлено:

- догон больше не смотрит на legacy `zoom_click_at`;
- догон смотрит на `zoom_click_valid_at`;
- ранний клик больше не отключает догонялку;
- идемпотентность сохранена через `статус_dogon_10мин = отправлено`;
- ручной статус `пришёл` не трогается.

## [ВЕДУЩИЙ]

Подготовлен новый import-ready workflow:

`03_N8N_WORKFLOWS/AS-HR-ZOOM-MVP__05_HOST_ZOOM_BRIEFING_IMPORT_READY.json`

Назначение:

- за 29 минут до Zoom собрать кандидатов ближайшего слота;
- отправить ведущему Telegram-сводку;
- не конфликтовать с reminder за 30 минут.

Текст сводки включает:

- дату;
- время;
- слот;
- Zoom-ссылку;
- общее количество кандидатов;
- города и количество по городам;
- список кандидатов: ФИО, Telegram, город, статус приглашения, статус напоминания;
- сколько без `telegram_chat_id`;
- сколько не получили приглашение.

Не хватает подтверждённого `telegram_chat_id` ведущего. В таблице уже есть лист `Получатели_Сводок`, поэтому лучше использовать его как источник получателей, а не плодить новый лист без решения.

## [ДОСКА_ПРОГРЕССА]

Сейчас в live-снимке есть листы:

- `Доска прогресса`;
- `Доска_Данные`;
- `Zoom_Для_Коллег`.

Рекомендация до изменения формул:

- зелёный “переход Zoom” показывать только по `zoom_click_valid_at`;
- ранний клик показывать отдельно по `zoom_click_status = early`;
- догонялку показывать по `статус_dogon_10мин = отправлено`;
- факт прихода не считать по клику, только по `статус_Zoom = пришёл` или подтверждению после Zoom.

Формулы доски не менялись.

## [СООБЩЕНИЯ]

Проверены ключи в `Сообщения`:

- `zoom_invite` найден;
- `zoom_reminder_30min` найден;
- `zoom_no_click_dogon` найден.

В `zoom_invite` и `zoom_reminder_30min` нет прямого hardcoded Zoom URL, но есть placeholder `[zoom_link]`. Сейчас это риск: если шаблон вставляет реальную Zoom-ссылку текстом, кандидат может обойти redirect.

TSV-предложение для смысла текстов, без изменения live-таблицы:

```tsv
message_key	что поменять
zoom_invite	убрать строку Zoom: [zoom_link] из текста; оставить дату/время и кнопку “Подключиться к Zoom” через redirect
zoom_reminder_30min	убрать строку Zoom: [zoom_link] из текста; оставить дату/время и кнопку через redirect
zoom_no_click_dogon	оставить без прямой Zoom-ссылки; текст берётся из листа Сообщения
```

## [ТЕСТ]

Тест в n8n не запускался, потому что пакет подготовлен без импорта и без live-изменений.

Безопасный тест после импорта:

1. Добавить новые колонки в `Кандидаты_HR`.
2. Импортировать `03` time-window redirect как отдельную проверочную версию или заменить текущую только после сверки.
3. Создать TEST-кандидата на будущий слот.
4. Проверить early click: Zoom не открывается, `zoom_click_status = early`, `zoom_click_valid_at` пустой.
5. Проверить valid click: Zoom открывается, `zoom_click_valid_at` заполнен.
6. Проверить dogon: кандидат с early click, но без valid click, получает догон.
7. Заполнить `telegram_chat_id` ведущего и проверить `05_HOST_ZOOM_BRIEFING`.

## [НЕ ХВАТАЕТ]

- Подтверждённого `telegram_chat_id` ведущего Zoom.
- Доступа к n8n executions через API для проверки конкретных запусков 02/04 по Перевезенцеву.
- Решения Максима на добавление 12 новых колонок в live `Кандидаты_HR`.
- Решения Максима на изменение шаблонов `zoom_invite` и `zoom_reminder_30min`.
- Ручного теста на TEST-кандидате после импорта.

## [ЗАПРЕТЫ]

Не трогали:

- live Google Sheets данные;
- n8n production workflow;
- credentials;
- webhook URL;
- business-test webhook;
- owner/razbor bot;
- `AS-RAZBOR-BOT__00_MAIN_ROUTER`;
- Бэтман-ссылки;
- `business_test_main`;
- кодовую фразу `вступить в группу`;
- факт прихода после Zoom.

Клик по Zoom по-прежнему не считается фактом прихода.

## [СЛЕДУЮЩИЙ ШАГ]

Максиму нужно подтвердить добавление 12 новых колонок в `Кандидаты_HR`; после этого импортировать и тестировать `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT_TIME_WINDOW_IMPORT_READY` на TEST-кандидате.
