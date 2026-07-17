# Стабильные данные проекта — Академия Стратег

## [ПОДТВЕРЖДЕНО] HR-Zoom-MVP

Рабочая таблица:

AS-HR-ZOOM-MVP_Form1_Calendar_Zoom

Рабочий лист:

Кандидаты_HR

Подтверждённый Zoom-блок:

AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN  
AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT  
AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN  

Старый отдельный workflow:

AS-HR-ZOOM-MVP__01_START_TO_ZOOM

сейчас выключен, потому что логика /start перенесена в:

AS-BOT__00_MAIN_ROUTER

## [ПОДТВЕРЖДЕНО] Главный Telegram-роутер

Рабочий workflow:

AS-BOT__00_MAIN_ROUTER

Он обрабатывает команды:

/start  
вступить в группу  
Бэтмен  
Команда  
Моя статистика  

## [ПОДТВЕРЖДЕНО] /start

/start находит кандидата, отправляет Zoom-сообщение и кнопку «Подключиться к Zoom».

## [ПОДТВЕРЖДЕНО] Zoom-click

AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT фиксирует клик по Zoom и редиректит в Zoom.

Важно: клик по Zoom не является фактом прихода.

## [ПОДТВЕРЖДЕНО] Догонялка

AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN опубликован, ручной запуск прошёл успешно.

## [ПОДТВЕРЖДЕНО] Бэтман

Команда «Бэтмен» активирует Бэтмана и выдаёт business_test_main.

Проверено:

HR-0098 → btm_001001  
HR-0099 → btm_001002  

## [ПОДТВЕРЖДЕНО] Команда

Команда «Команда» выдаёт HR-ссылку для приглашения людей.

## [ПОДТВЕРЖДЕНО] Моя статистика

Команда «Моя статистика» показывает статистику переходов по business_test_main.

## [ЗАПРЕТ]

Не переписывать рабочие workflow без отдельного решения.

Не трогать credentials.

Не менять названия листов и колонок.

Не считать Zoom-клик фактом прихода.

Не использовать /start для активации Бэтмана.

Не выдавать business_test_main автоматически после Zoom.

Не переносить текущую систему в сайт как первый шаг.

Не давать Бэтманам доступ к общей базе.

## [ПОДТВЕРЖДЕНО] API / Secret / Token handling

Перед задачами с n8n, webhook, API, Google Sheets, Telegram, OAuth, HMAC или credentials сначала определяется тип доступа:

- n8n API key — только для управления n8n, программистам сайта не передавать.
- HMAC secret — только для подписи webhook-запросов, передавать программистам отдельно безопасным каналом.
- Google Sheets credential — только для n8n, наружу не передавать.
- Telegram token — только для бота/n8n, наружу не передавать.
- OAuth/service account — внутренний доступ, наружу не передавать.

Все реальные секреты хранятся только вне проекта:

C:\Users\admin\.secrets\

В проектных JSON, отчётах и backup-файлах допустимы только redacted-значения:

[REDACTED_INLINE_SECRET]  
[REDACTED_API_KEY]  
[REDACTED_TOKEN]

Перед deploy/fix обязательно проверить:

- Codex видит n8n API;
- Codex видит live workflow;
- Codex видит executions;
- создан backup live workflow;
- понятно, какой ключ нужен;
- понятно, где он хранится;
- понятно, кому его можно передавать;
- понятно, что нельзя писать в чат/отчёты/JSON.

Если нужно передать secret человеку:

- скопировать в Windows clipboard;
- вывести только `SECRET COPIED TO CLIPBOARD` и `length: <n>`;
- не показывать значение.

Если задача может быть сделана через API — делать через API.

Если API недоступен — сначала остановиться и подтвердить причину, а не патчить вслепую.

## [ПОДТВЕРЖДЕНО] Роль тренера Академии Стратег

Должность: тренер Академии Стратег.

ЦКП тренера: бизнесмены, руководители и сотрудники коммерческих предприятий, изучившие и способные применять оплаченные курсы на практике. Они получили победы от применения, желают продолжить обучение и были переданы менеджеру по работе с клиентом.

Тренер готовит бизнесменов-чемпионов.

Тренер ведёт клиента по этапам обучения, помогает освоить теорию и практику, контролирует выполнение заданий, помогает внедрять знания в компанию собственника, составляет расписание занятий и ведёт отчётность.

## [ПОДТВЕРЖДЕНО] AS-OWNER-RAZBOR-SALES-MVP — структура

Дата подтверждения: 2026-07-14.

Новая отдельная Google Sheets таблица:

```text
AS-OWNER-RAZBOR-SALES-MVP
```

Spreadsheet ID:

```text
1qQPFHowLjJ7cPuOD4gzwW6sCmAJBANR3J_fn3zksyGQ
```

URL:

```text
https://docs.google.com/spreadsheets/d/1qQPFHowLjJ7cPuOD4gzwW6sCmAJBANR3J_fn3zksyGQ/edit
```

Созданы и проверены 14 листов:

```text
Владельцы
Квалификация
Эксперты
Слоты_Разборов
Записи_Разборов
Продажи
Вознаграждения
Статистика_Бэтманов
Сообщения_OWNER
Настройки_Квалификации
AI_Предразбор
Графики_Теста
Справочник_BTM_Роли
Логи
```

Цена обзорного курса:

```text
60000
```

У собственника используется `owner_id`; отдельный `btm_id` собственнику не присваивается. Источник хранится в `btm_id_referrer`, эксперт — в `btm_id_expert`.

Диапазоны BTM:

```text
btm_000001-btm_000100 — каналы найма / служебные источники
btm_000101-btm_000200 — основной резерв экспертов
btm_000201-btm_001000 — внутренние роли
btm_001001+ — обычные Бэтманы HR-воронки
```

## [ЗАПРЕТ] AS-OWNER-RAZBOR-SALES-MVP

Структура таблицы создана. С 2026-07-15 подключены отдельный OWNER-workflow, Telegram Trigger, операторская группа и слой входа/выдачи тестовой ссылки. AI, бронирование, оплата и выдача доступа к платформе ещё не подключены.

Существующая таблица `AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS` остаётся отдельным подтверждённым слоем и не изменялась.

## [СЛЕДУЮЩИЙ ШАГ] AS-OWNER-RAZBOR-SALES-MVP

Отдельный этап:

```text
AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
```

## [РЕШЕНИЕ] Операторский слой OWNER BOT

Дата решения: 2026-07-14.

В этап `AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK` обязательно включается операторский слой. Он должен:

- хранить историю входящих, исходящих и ручных операторских сообщений;
- зеркалировать важные сообщения в отдельную служебную Telegram-группу;
- позволять авторизованному оператору писать человеку через бота по `owner_id`, `btm_id` или `expert_id`;
- проверять служебную группу и whitelist операторов;
- логировать успешные отправки и ошибки.

В таблице `AS-OWNER-RAZBOR-SALES-MVP` должны быть созданы листы:

```text
Диалоги_OWNER_BOT
Операторские_Сообщения
Операторы
```

Операторские команды:

```text
/send_owner owner_id текст
/send_btm btm_id текст
/send_expert expert_id текст
```

## [ЗАПРЕТ] Операторский слой OWNER BOT

- команды работают только из подтверждённой служебной группы;
- отправитель должен быть активен в листе `Операторы` и иметь право на выбранный тип получателя;
- нельзя принимать произвольный `chat_id` из текста команды;
- нельзя отправлять массовые сообщения;
- нельзя показывать в группе телефоны собственников без необходимости;
- Бэтманы не получают доступ к операторской группе;
- эксперты не видят чужие разборы.

## [НЕ ПРОВЕРЕНО] Операторская Telegram-группа OWNER

Группа `Разборы рабочая с ботом` создана, бот добавлен. Команды `/owner_operator_test` и `/owner_operator_test@Akademya_Strateg_bot` отправлены в группе.

Read-only проверка 2026-07-15 подтвердила, что новых executions в `AS-BOT__00_MAIN_ROUTER` нет: последними остаются executions `353` и `354` от 2026-07-14 17:59 МСК.

После назначения `@Akademya_Strateg_bot` администратором группы команда была повторена. Нового execution в Batman-роутере ожидаемо не появилось, потому что это другой бот и другая воронка. Numeric `group_chat_id` и Telegram ID оператора пока не подтверждены: для этого нужен отдельный OWNER-workflow с Telegram Trigger `@Akademya_Strateg_bot`.

## [ПОДТВЕРЖДЕНО] Раздельная Telegram-архитектура

Дата проверки: 2026-07-15.

Команда `/owner_operator_test`, отправленная в личном чате `@Akademya_Strateg_bot`, также не создала execution.

Из результатов старых успешных executions `353` и `354` безопасно извлечена публичная идентичность бота, используемого live workflow `AS-BOT__00_MAIN_ROUTER`:

```text
username: @batman_strateg_bot
telegram_bot_id: 8745817259
first_name: HR Академия Стратег
```

Credential `Telegram account 2` в текущем live-роутере подключён к `@batman_strateg_bot`.

Пользователь подтвердил архитектуру:

```text
@batman_strateg_bot
→ воронка Бэтманов
→ свои workflow
→ свои Telegram-чаты

@Akademya_Strateg_bot
→ воронка собственников
→ отдельный OWNER-workflow
→ отдельная операторская Telegram-группа
```

Отдельный Telegram Trigger для `@Akademya_Strateg_bot` разрешён и необходим. Запрет касается только дублирующих Trigger одного и того же бота.

Read-only аудит credentials подтвердил отдельный Telegram credential:

```text
name: Telegram OWNER_RAZBOR_BOT
id: CzrNjapszGIBX9nZ
type: telegramApi
```

Token не читался и не выводился. Пользователь выполнил штатную проверку n8n: соединение `Telegram OWNER_RAZBOR_BOT` проверено успешно, token на скриншоте скрыт. Точный username credential будет окончательно подтверждён по execution отдельного OWNER Trigger.

## [ПОДТВЕРЖДЕНО] Операторские листы OWNER BOT

Дата создания: 2026-07-15.

В `AS-OWNER-RAZBOR-SALES-MVP` добавлены и проверены три листа:

```text
Диалоги_OWNER_BOT
Операторские_Сообщения
Операторы
```

Количество листов увеличилось с 14 до 17. Заголовки новых листов точно соответствуют подтверждённому ТЗ; ID и заголовки прежних 14 листов не изменились.

Backup до изменения и снимок после:

```text
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_OPERATOR_SHEETS/20260715_040810/
```

## [ЗАПРЕТ] Раздельная Telegram-архитектура

- не менять `AS-BOT__00_MAIN_ROUTER` и `Telegram account 2`;
- не подключать OWNER-логику к `@batman_strateg_bot`;
- не смешивать чаты Бэтманов и собственников;
- не использовать один Telegram credential для двух разных ботов;
- не создавать два активных Trigger для одного и того же bot token.

## [ПОДТВЕРЖДЕНО] OWNER-workflow bootstrap

Дата создания: 2026-07-15.

Создан и активирован отдельный workflow:

```text
AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
workflow ID: xLcyZ78h78bhncPa
```

Bootstrap содержит три узла:

```text
OWNER — Telegram Trigger
→ OWNER — parse operator test
→ OWNER — send operator test reply
```

Используется credential `Telegram OWNER_RAZBOR_BOT`. В workflow один Telegram Trigger. `AS-BOT__00_MAIN_ROUTER` проверен до и после создания по SHA256 и не изменился. Количество workflow увеличилось с 8 до 9. Права n8n API на создание и активацию подтверждены фактическим действием.

Inventory до создания, redacted preview и redacted export:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_WORKFLOW_CREATE/20260715_094558/
```

## [ПОДТВЕРЖДЕНО] OWNER-группа и первый оператор

Execution `357` завершился успешно и подтвердил:

```text
bot: @Akademya_Strateg_bot
telegram_bot_id: 8926610922
group_title: Разборы рабочая с ботом
group_chat_id: -5471702764
operator_username: @HRAcademyStrateg
operator_telegram_id: 6100981026
```

В лист `Операторы` записан `operator_000001` со статусом `active` и правами `can_send_owner`, `can_send_btm`, `can_send_expert`. До записи и после неё сохранены снимки:

```text
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_OPERATOR_REGISTER/20260715_095633/
```

## [ПОДТВЕРЖДЕНО] OWNER entry layer

Workflow `xLcyZ78h78bhncPa` расширен с 3 до 22 узлов и остаётся активным. Реализованы:

- `/start owner_from_btm_XXXXXX`;
- проверка `btm_id_referrer` по `Справочник_Источники`;
- поиск собственника по `telegram_chat_id`;
- создание последовательного `owner_id` только для нового собственника;
- сохранение исходного `btm_id_referrer` при повторном входе;
- выдача ссылки `business_test_main` с `owner_id`;
- запись входящих/исходящих сообщений в `Диалоги_OWNER_BOT`;
- зеркало приватных сообщений в подтверждённую OWNER-группу;
- запись событий в `Логи`.

В workflow один OWNER Telegram Trigger. `AS-BOT__00_MAIN_ROUTER` проверен до/после и не изменился. Backup bootstrap и redacted export entry layer:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_ENTRY_LAYER/20260715_100503/
```

## [ПОДТВЕРЖДЕНО] OWNER entry tests D/B/C

Live-тесты выполнены 2026-07-15 через `@Akademya_Strateg_bot`.

```text
D — execution 370: btm_999999 отклонён, owner не создан
B — execution 371: создан owner_000001, btm_id_referrer=btm_001001
C — execution 375: повторно использован owner_000001, дубль не создан
```

Подтверждено по n8n executions и read-only сверке Google Sheets:

- D записал `owner_deeplink_invalid_referrer`, ответ точно совпал с `Сообщения_OWNER.invalid_referrer`;
- B создал единственную строку владельца и выдал ссылку `business_test_main` с `owner_id` и `btm_id`;
- C не запускал узел добавления владельца, сохранил исходный `btm_id_referrer` и записал `repeated_owner_start`;
- inbound/outbound записаны в `Диалоги_OWNER_BOT` с Telegram `message_id`;
- ошибок message catalog и fallback-событий в тестах не было.

## [ПОДТВЕРЖДЕНО] Отдельный OWNER RAZBOR CHAT

Дата создания и публикации: 2026-07-15.

Создан отдельный вызываемый workflow чата собственников и операторов разборов:

```text
AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_RAZBOR_CHAT
workflow_id: mBaJjoCgCyEFwjSy
active: true
```

Архитектура:

```text
@Akademya_Strateg_bot
→ единственный Telegram Trigger в OWNER-роутере xLcyZ78h78bhncPa
→ Execute Sub-workflow
→ OWNER RAZBOR CHAT mBaJjoCgCyEFwjSy
→ отдельная группа «Разборы рабочая с ботом»
```

В `OWNER RAZBOR CHAT` нет Telegram Trigger. В нём один `Execute Sub-workflow Trigger`, пять Telegram action-узлов с credential `Telegram OWNER_RAZBOR_BOT`, чтение листов `Владельцы` и `Операторы`, а также журналирование в `Диалоги_OWNER_BOT`, `Операторские_Сообщения` и `Логи`.

Реализовано:

- личное сообщение собственника передаётся в OWNER-группу;
- зарегистрированный собственник определяется по `telegram_chat_id`;
- бот подтверждает собственнику передачу сообщения оператору;
- авторизованный оператор может ответить командой `/send_owner owner_id текст`;
- проверяются OWNER-группа, активность оператора и `can_send_owner`;
- произвольный `chat_id` из команды не принимается;
- успешные отправки и ошибки журналируются.

OWNER-роутер `xLcyZ78h78bhncPa` содержит 24 узла, остаётся active, имеет ровно один Telegram Trigger и один вызов OWNER RAZBOR CHAT. Чтения `Справочник_Источники`, `Владельцы` и `Сообщения_OWNER` переведены в безопасный режим `executeOnce + alwaysOutputData`, чтобы пустой лист не обрывал сценарий и 3000 строк источников не запускали повторные чтения.

`AS-BOT__00_MAIN_ROUTER` и credential `Telegram account 2` проверены до/после и не изменились.

Backup, redacted preview и redacted live exports:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_RAZBOR_CHAT/20260715_113657/
```

## [ПОДТВЕРЖДЕНО] OWNER RAZBOR CHAT — личное сообщение собственника

Live-тест выполнен 2026-07-15. Подтверждены executions:

```text
parent OWNER execution: 368, success
OWNER RAZBOR CHAT execution: 369, success
route: owner_chat
bot: @Akademya_Strateg_bot
group: Разборы рабочая с ботом
```

Фактически подтверждено:

- обычное личное сообщение принято OWNER-роутером;
- вызван отдельный `AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_RAZBOR_CHAT`;
- копия отправлена именно в OWNER-группу;
- личный ответ отправлен именно через OWNER-бота;
- входящее сообщение, событие и ответ бота записаны в `Диалоги_OWNER_BOT` и `Логи`;
- `telegram_message_id` исходящего ответа сохраняется из `result.message_id`;
- незарегистрированный пользователь корректно получает просьбу открыть персональную BTM-ссылку.

Дополнительные live-исправления:

- для Telegram-текстов включён HTML-режим с экранированием динамического текста; ошибка `can't parse entities` устранена;
- временный лимит записи Google Sheets не блокирует Telegram-ветки;
- повтор append-записей отключён как неидемпотентный, чтобы журнал не создавал дубли.

В ходе промежуточного теста с retry появились по две тестовые строки одного события. Они сохранены как диагностические данные и не удалялись без отдельного разрешения. Финальная активная версия не повторяет append-записи.

Backup и redacted active exports точечных исправлений:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_114816/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_115818/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_120517/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_122408/
```

## [ПОДТВЕРЖДЕНО] OWNER RAZBOR CHAT — ответ оператора

Live-тест `/send_owner owner_000001 Тестовое сообщение оператора` выполнен 2026-07-15.

```text
parent OWNER execution: 372, success
OWNER RAZBOR CHAT execution: 373, success
operator_id: operator_000001
owner_id: owner_000001
```

Подтверждено:

- команда принята только из OWNER-группы от активного оператора с `can_send_owner`;
- текст доставлен собственнику через `@Akademya_Strateg_bot`;
- подтверждение оператору сформировано по `Сообщения_OWNER.operator_send_success`;
- записи созданы в `Операторские_Сообщения`, `Диалоги_OWNER_BOT` и `Логи`;
- Telegram `message_id` сохранён;
- fallback-событий message catalog не было.

## [ПОДТВЕРЖДЕНО] OWNER message catalog patch

Этап `AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH` завершён 2026-07-15.

Workflow:

```text
xLcyZ78h78bhncPa — OWNER parent, active, 25 узлов, 1 Telegram Trigger
mBaJjoCgCyEFwjSy — OWNER RAZBOR CHAT, active, 24 узла, 0 Telegram Trigger
```

В оба workflow подключено чтение `Сообщения_OWNER`. Изменяемые ответы бота выбираются по `message_key`; поддержаны переменные `[test_url]`, `[owner_id]`, `[btm_id_referrer]`, `[telegram_username]`, `[error]`. При отсутствии ключа или переменной используется короткий fallback и создаётся событие ошибки в `Логи`.

В каталоге 37 строк. Все обязательные ключи присутствуют без дублей и пустых `message_text`. Новые тексты добавлены со статусом `черновик` согласно ТЗ. Текущий runtime игнорирует только статус `inactive`.

Backup до изменения:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH/20260715_130427/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH/20260715_130427/
```

`AS-BOT__00_MAIN_ROUTER`, Batman, HR-Zoom, platform webhook, AI, квалификация, слоты и оплата не изменялись. Количество видимых workflow осталось 10.

## [СЛЕДУЮЩИЙ ШАГ] OWNER result match and qualification

Отдельным этапом подготовить архитектуру и ТЗ:

```text
AS-OWNER-RAZBOR-SALES-MVP__03_RESULT_MATCH_AND_QUALIFICATION
```

До отдельного решения не внедрять AI, слоты, оплату и доступ к платформе.

## [РЕШЕНИЕ] OWNER FAST RESPONSE — временный SLA MVP

Дата решения: 2026-07-15.

Подтверждённое время личного ответа OWNER chat после выноса логов и зеркал в async workflow:

```text
4,849 секунды
```

Владелец проекта принял это значение как временный SLA MVP. Этап FAST RESPONSE закрыт для перехода к слотам.

На этапе:

```text
AS-OWNER-RAZBOR-SALES-MVP__04_OWNER_SLOT_SELECTION
```

не внедрять Data Tables и не продолжать оптимизацию SLA.

## [НЕ ПРОВЕРЕНО] OWNER SLOT SELECTION — аудит 2026-07-15

Read-only аудит подтвердил:

- листы `Эксперты`, `Слоты_Разборов`, `Записи_Разборов` имеют требуемые заголовки, но не содержат строк;
- в `Сообщения_OWNER` отсутствуют 8 ключей этапа выбора слотов;
- обычный Google Sheets update не предоставляет atomic compare-and-swap по условию `статус_слота = free`;
- до внедрения бронирования требуется отдельное решение по минимальному lock-механизму без перехода на новую базу.

## [РЕШЕНИЕ] OWNER SLOT SELECTION — лист блокировок

Дата решения и создания: 2026-07-15.

Для минимальной защиты бронирования в Google Sheets владелец проекта утвердил и Codex создал лист:

```text
Блокировки_Слотов
```

Колонки:

```text
lock_id | created_at | expires_at | slot_id | owner_id | booking_id | status | execution_id | comment
```

Backup до создания:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION/20260715_201614/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_SLOT_SELECTION/20260715_201614/
```

Проверено после создания: семь исходных листов, OWNER parent, OWNER chat, async logging, Batman и platform workflow не изменились. Data Tables не внедрялись.

## [РЕШЕНИЕ] OWNER — источник сообщений и fallback

Дата решения: 2026-07-15.

- Все основные редактируемые клиентские тексты OWNER-бота хранятся только в `Сообщения_OWNER`.
- В n8n нельзя использовать зашитые тексты как нормальный контент воронки.
- Универсальный аварийный ответ `Сообщение временно недоступно.` не использовать.
- Если лист временно не прочитан, допустим короткий смысловой fallback для текущего шага, который не останавливает прохождение воронки.
- На этапе выбора слотов добавлены 8 обязательных message keys и отдельный `slot_selection_button`; статус строк — `черновик`.

Backup каталога до добавления:

```text
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_SLOT_SELECTION_MESSAGES/20260715_202549/
```

## [ПОДТВЕРЖДЕНО] OWNER SLOT SELECTION — deployed architecture

Дата: 2026-07-15.

- OWNER parent `xLcyZ78h78bhncPa` и OWNER chat `mBaJjoCgCyEFwjSy` дополнены выбором слотов.
- Существующий Telegram Trigger теперь принимает `message` и `callback_query`; количество Trigger осталось 1.
- После пятого вопроса показывается переход к слотам без предварительного чтения расписания.
- Расписание читается после нажатия кнопки, чтобы не увеличивать критический путь квалификации.
- Добавлен append-only lock через `Блокировки_Слотов` и post-write verification бронирования.
- Batman, HR-Zoom, platform webhook, async logging, AI, оплата и платформа не изменены.
- Data Tables не используются.

Backup непосредственно перед deploy:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION/20260715_203502/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_SLOT_SELECTION/20260715_203502/
```

Live-тесты A/B/C/D пока не завершены.

## [ПОДТВЕРЖДЕНО] OWNER SLOT SELECTION — тест D

Дата: 2026-07-15.

Тест отсутствия свободных слотов завершён успешно:

```text
parent 418 — success
OWNER chat 419 — success
async logging 420 — success
```

Клиент получил сообщение `slots_not_available`; `owner_no_slots_available` записан в `Логи`; два зеркала доставлены только в OWNER-группу; посторонних получателей и ошибок нет.

Время OWNER chat: `5,511 секунды`. Это выше временного ориентира `4,849 секунды`, но Data Tables и отдельная оптимизация этапа слотов решением владельца не включаются.
