# AS-SYSTEM-ARCHITECTURE__06_SOURCE_ROLES_AND_PRIORITY_STATUS

## [ПОДТВЕРЖДЕНО]

Работа выполнена локально по подтверждённым файлам проекта и read-only снимкам Google Sheets. Живые Google Sheets, n8n workflow, credentials, webhook URL, Telegram credentials, cached schema, листы и колонки не изменялись.

Проверены локальные источники:

- `02_STABLE_DATA/02_STABLE_CONTEXT.md`
- `06_REPORTS/N8N_EXECUTION_ECONOMY_AUDIT.md`
- `06_REPORTS/BOT_MAIN_ROUTER_EXTERNAL_LINKS_AUDIT.md`
- `06_REPORTS/BOT_MAIN_ROUTER_LINK_ISSUE_LOGIC_AUDIT.md`
- `06_REPORTS/AS-OWNER-RAZBOR-MVP__03_BUILD_ON_NEW_OWNER_SPREADSHEET_REPORT.md`
- `reports/google_sheets_audit/20260708_130803_AS-HR-ZOOM-MVP_Form1_Calendar_Zoom_readonly_audit.json`
- `reports/google_sheets_audit/20260708_143857_1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg_readonly_audit.json`
- `reports/google_sheets_audit/20260710_142556_AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS_audit.json`
- `03_N8N_WORKFLOWS/AS-BOT__00_MAIN_ROUTER_FULL_READY_DRAFT.json`
- `03_N8N_WORKFLOWS/_LIVE_BACKUP_READONLY_AUDIT/20260711_091620_AS-BOT__00_MAIN_ROUTER.json`

Текущая логика источников уже использует `btm_id` в нескольких местах:

- `Кандидаты_HR`: кандидат, Telegram, HR/Zoom, выдача ссылок, `btm_id`.
- `Ссылки_Бэтманов`: заранее заведённые ссылки по `btm_id` и типу ссылки.
- `БизнесТест_Переходы`: клики по `btm_id`, `type`, UTM и статусу.
- `БизнесТест_Регистрации`: регистрации собственников с `btm_id`, `st`, UTM.
- `БизнесТест_Результаты`: результаты теста с `btm_id`, `st`, UTM и 9 числовыми показателями.
- owner/razbor слой: `Владельцы_Бизнеса` хранит `owner_id`, `registration_id`, `result_id`, `test_session_id`, `btm_id`, `st`, UTM, `bot_link`, `scores_json`.
- `AS-BOT__00_MAIN_ROUTER`: команды `Бэтмен`, `Команда`, `Моя статистика` опираются на `telegram_chat_id` и `btm_id`.

Поля `source_role`, `source_status`, `priority_level`, `source_pool` в текущих рабочих листах и роутере не найдены как полноценная бизнес-модель. Это и есть главный архитектурный разрыв.

## [РЕШЕНИЕ]

Не создавать отдельные независимые системы для Бэтманов, стажёров, партнёров, сотрудников, филиалов и стратегических рефереров.

Ввести единую модель:

```text
Источник / Реферер
```

`btm_id` остаётся техническим идентификатором ссылки и совместимости со старой воронкой.

Бизнес-логика источника определяется не диапазоном `btm_id` в одиночку, а набором полей:

```text
source_role
source_status
priority_level
source_pool
```

Диапазоны остаются:

```text
btm_000001-btm_001000 = зарезервированный приоритетный диапазон
btm_001001+           = массовый диапазон Бэтманов / стажёров
```

Но диапазон является правилом первичной классификации, а не всей бизнес-логикой. Финальное решение по роли и приоритету хранится в справочнике источников.

## [SOURCE MODEL]

### source_role

```text
batman
trainee
partner
employee
branch
expert
curator
strategic_referrer
manual
unknown
```

### source_status

```text
candidate
active
priority
candidate_to_partner
partner
employee
branch_active
paused
archived
```

### priority_level

```text
A
B
C
D
```

Минимальная трактовка:

- `A`: филиал, стратегический реферер, ключевой партнёр, руководитель направления.
- `B`: активный партнёр, сотрудник, доверенный источник.
- `C`: прочий приоритетный источник.
- `D`: массовый Бэтман / стажёр.

### source_pool

```text
priority_referrer
batman
employee
partner
branch
manual
unknown
```

Правило по умолчанию:

- если `btm_id` в диапазоне `btm_000001-btm_001000`, то `source_pool = priority_referrer`;
- если `btm_id >= btm_001001`, то `source_pool = batman`;
- если `btm_id` отсутствует или пришёл вручную, то `source_pool = manual` или `unknown` до ручной классификации.

## [АУДИТ SOURCE LOGIC]

### Где сейчас `btm_id` используется как основная логика

| Контур | Где используется | Что подтверждено | Чего не хватает |
|---|---|---|---|
| HR-Zoom / Batman | `Кандидаты_HR.btm_id` | активация Бэтмана и привязка Telegram к кандидату | `source_role`, `source_status`, `priority_level`, `source_pool` |
| Ссылки | `Ссылки_Бэтманов.btm_id` + `Тип ссылки` | выдача `business_test_main` и `hr_invite` | роль источника, статус источника, приоритет, пул |
| Переходы | `БизнесТест_Переходы.btm_id` | статистика кликов по `business_test_main` | расширенная статистика по ролям и приоритету |
| Регистрации | `БизнесТест_Регистрации.btm_id`, `st`, UTM | owner связывается с источником теста | классификация источника на момент регистрации |
| Результаты | `БизнесТест_Результаты.btm_id`, `st`, UTM | результат теста связывается с источником | приоритет owner/seller обработки по источнику |
| Owner/Razbor | `Владельцы_Бизнеса.btm_id`, `st`, UTM | owner может быть связан с исходным источником | поля источника для сортировки и seller notification |
| Главный роутер | `Бэтмен`, `Команда`, `Моя статистика` | поиск кандидата по `telegram_chat_id`, выдача и статистика по `btm_id` | ветвление статистики по `source_role/source_status` |

### Подтверждённые заголовки

`Ссылки_Бэтманов`:

```tsv
link_id	btm_id	Тип ссылки	Назначение	URL / формула	Статус	Правило выдачи	Выдана	Дата выдачи	Нельзя менять после выдачи	Тест 10	Старый код	Комментарий
```

`БизнесТест_Переходы`:

```tsv
дата_время	btm_id	type	utm_source	utm_medium	utm_campaign	utm_content	raw_params	target_url	статус
```

`БизнесТест_Регистрации`:

```tsv
registration_id	дата_регистрации	event_id	btm_id	st	type	utm_source	utm_medium	utm_campaign	utm_content	page_url	raw_params	имя_собственника	фамилия_собственника	ФИО_собственника	телефон	email	город	организация	согласие	статус_регистрации	test_id	test_session_id	result_url	created_at	ошибка	комментарий
```

`БизнесТест_Результаты`:

```tsv
result_id	дата_завершения	event_id	btm_id	st	type	utm_source	utm_medium	utm_campaign	utm_content	page_url	result_url	raw_params	имя_собственника	фамилия_собственника	ФИО_собственника	телефон	email	город	организация	test_id	test_session_id	статус_теста	Лидерство	Успешность_планирования	Умение_организовывать	Правильность_оценки	Контроль_финансов	Контроль_деятельности	Подбор_персонала	Маркетинг	Продажи	scores_json	syndromes_json	created_at	ошибка	комментарий
```

`Кандидаты_HR` уже содержит `источник`, `город`, `telegram_chat_id`, `telegram_username_из_бота`, `btm_id`, статусы Zoom, статусы выдачи `business_test_main` и `hr_invite`, но не содержит единой source-модели.

## [СПРАВОЧНИК_ИСТОЧНИКИ]

Предложить новый лист:

```text
Справочник_Источники
```

Назначение: одна строка = один источник / реферер / носитель ссылок.

Не создавать без отдельного решения. Сначала согласовать структуру и миграцию.

TSV-заголовки:

```tsv
source_id	btm_id	source_pool	source_role	source_status	priority_level	ФИО	telegram_username	telegram_chat_id	телефон	email	город	филиал	branch_id	роль_в_Академии	curator_id	business_test_main_link	hr_invite_link	links_issued_status	links_issued_at	created_at	updated_at	комментарий
```

Правила:

- `source_id` — главный стабильный ID источника. Рекомендуемый формат: `src_000001`.
- `btm_id` — технический ID ссылок, сохраняется для совместимости.
- `source_pool` — крупный пул источника.
- `source_role` — фактическая роль источника.
- `source_status` — текущий статус в Академии.
- `priority_level` — управленческий приоритет обработки.
- `business_test_main_link` и `hr_invite_link` — ссылки, уже выданные или закреплённые.
- `links_issued_status` — `not_issued / issued / paused / revoked`.

## [ДОСКА*СВОДКА*ИСТОЧНИКОВ]

Предложить новый лист:

```text
Доска_Сводка_Источников
```

Назначение: одна строка = один источник, сводка по всей цепочке от HR и тестов до разборов и продаж.

Не создавать без отдельного решения. Сначала согласовать формулы, источники данных и права доступа.

TSV-заголовки:

```tsv
source_id	btm_id	source_pool	source_role	source_status	priority_level	ФИО	город	telegram_username	дата_активации	business_test_clicks	hr_invite_clicks	hr_forms	zoom_invites	zoom_attended	became_batman	business_test_registrations	business_test_results	owner_bot_starts	qualifications_done	razbor_booked	razbor_completed	sales_count	sales_amount	conversion_to_form	conversion_to_test	conversion_to_razbor	conversion_to_sale	last_activity_at	комментарий
```

Источники данных:

- `Справочник_Источники`: базовая карточка источника.
- `Кандидаты_HR`: HR-анкеты, Zoom, вступление в группу, активация Бэтмана.
- `Ссылки_Бэтманов`: факт наличия и выдачи ссылок.
- `БизнесТест_Переходы`: клики.
- `БизнесТест_Регистрации`: регистрации собственников.
- `БизнесТест_Результаты`: завершённые тесты и показатели.
- owner/razbor таблица: bot start, квалификация, запись, разбор, комментарий, продажа.

Обновление доски не должно работать через schedule каждые 5 минут. Обновлять через события и редкую сверку.

## [СТАТУСЫ]

Процесс изменения статуса:

```text
кандидат / Бэтман достиг нужного результата
-> на доске появляется рекомендация статуса
-> куратор подтверждает
-> source_status меняется
-> source_role меняется при необходимости
-> ссылки выдаются / активируются
-> источник попадает в сводку
```

Пример для массового Бэтмана:

```text
статус_Zoom = пришёл
и вступил в TG-группу
и получил business_test_main
-> рекомендация: source_status = active
-> source_role = batman
-> source_pool = batman
-> priority_level = D
```

Пример повышения:

```text
куратор / Максим решил, что источник перспективен как партнёр
-> рекомендация: source_status = candidate_to_partner
-> после подтверждения:
   source_role = partner
   source_status = partner
   priority_level = B или A
   source_pool = priority_referrer
```

Пример сотрудника / филиала:

```text
source_role = employee или branch
source_status = employee или branch_active
priority_level = A/B
source_pool = employee или branch
```

Важно: автоматическая рекомендация не должна сама переводить человека в партнёры или филиалы. Нужен ручной шаг куратора.

## [ПРИОРИТЕТНАЯ ОБРАБОТКА]

Если:

```text
source_pool = priority_referrer
или priority_level = A/B
```

то источник считается приоритетным.

### HR Zoom brief

В brief ведущему нужно показывать:

```text
Источник: приоритетный
Реферер: [ФИО]
Тип: [source_role]
Уровень: [priority_level]
```

Для массового Бэтмана:

```text
Источник: Бэтман / стажёр
Реферер: [ФИО или btm_id]
Уровень: D
```

### Owner/Razbor seller notification

В уведомлении продавцу / разборщику показывать:

```text
Источник: [ФИО / source_role / priority_level]
btm_id: [btm_id]
Город источника: [город]
```

Это важно, чтобы продавец видел, что собственник пришёл от филиала, ключевого партнёра или стратегического реферера.

### Доска_OWNER_RAZBOR

Сортировать выше:

1. `priority_level = A`
2. `priority_level = B`
3. ближайшая дата разбора
4. свежие результаты теста

### Статистика

Считать отдельно:

- массовые Бэтманы;
- стажёры;
- партнёры;
- сотрудники;
- филиалы;
- стратегические рефереры;
- ручные источники;
- неизвестные источники.

## [БОТ-СООБЩЕНИЯ]

Команда `Моя статистика` не должна смотреть только на `btm_id`.

Новая логика:

1. Найти пользователя по `telegram_chat_id`.
2. Найти его `source_id` / `btm_id` в `Справочник_Источники`.
3. Определить `source_role`, `source_status`, `priority_level`, `source_pool`.
4. Выбрать шаблон статистики.

### Если `source_role = batman`

Показывать обычную статистику:

```text
ID Бэтмана: [btm_id]
Переходы по бизнес-тесту: [business_test_clicks]
Тестов заполнено: [business_test_results]
Разборов назначено: [razbor_booked]
Продаж: [sales_count]
```

### Если `source_role = partner / employee / branch / strategic_referrer`

Показывать расширенную статистику источника:

```text
Источник: [ФИО]
Роль: [source_role]
Статус: [source_status]
Приоритет: [priority_level]

HR-анкеты: [hr_forms]
Переходы на бизнес-тест: [business_test_clicks]
Регистрации на тест: [business_test_registrations]
Результаты теста: [business_test_results]
Owner bot starts: [owner_bot_starts]
Квалификации: [qualifications_done]
Разборы назначены: [razbor_booked]
Разборы проведены: [razbor_completed]
Продажи: [sales_count]
Сумма продаж: [sales_amount]
```

### Если источник не найден

Показывать безопасное сообщение:

```text
Не нашёл ваш источник в системе. Напишите куратору.
```

Не раскрывать общую базу и чужую статистику.

## [МИГРАЦИЯ]

Безопасная миграция в 5 шагов:

1. Утвердить модель `Источник / Реферер` и значения `source_role/source_status/priority_level/source_pool`.
2. Создать локально/черновиком TSV для `Справочник_Источники`, не меняя живые таблицы.
3. Заполнить первичный справочник из существующих данных:
   - `Кандидаты_HR`: `btm_id`, ФИО, город, Telegram, телефон, статус активации;
   - `Ссылки_Бэтманов`: `btm_id`, `business_test_main`, `hr_invite`, статус выдачи;
   - ручной список приоритетных источников: `btm_000001-btm_001000`.
4. Создать `Доска_Сводка_Источников` как агрегат, сначала без записи в production workflow.
5. После проверки обновить import-ready версии workflow:
   - `AS-BOT__00_MAIN_ROUTER`: `Моя статистика` через source model;
   - business-test webhook: сохранять source-поля в регистрации/результате или обогащать при агрегации;
   - owner/razbor notification: показывать источник и приоритет;
   - HR Zoom brief: показывать приоритетный источник.

Минимальное правило совместимости:

```text
Если source-поля ещё не заполнены:
  source_pool = priority_referrer, если btm_id 000001-001000
  source_pool = batman, если btm_id >= 001001
  source_role = batman для массового диапазона
  source_status = unknown или active по текущим статусам
  priority_level = D для массового диапазона
```

## [РИСКИ]

1. Если оставить только `btm_id`, система не сможет корректно отличать партнёра, филиал, сотрудника и обычного Бэтмана.
2. Если создать отдельные доски под каждую роль, появится дублирование логики, сложная аналитика и риск расхождения данных.
3. Если `btm_000001-btm_001000` выдать обычным стажёрам, приоритетный пул будет испорчен.
4. Если `Моя статистика` останется только по `btm_id`, партнёры и филиалы не увидят расширенную статистику.
5. Если owner/razbor не получит приоритет источника, продавец не увидит важность лида.
6. Если обновлять аналитику schedule каждые 5 минут, можно быстро сжечь executions n8n.
7. Если сразу менять live workflow без тестовой import-ready версии, можно сломать рабочую выдачу `business_test_main` и `hr_invite`.
8. Если source model хранить только в формулах Google Sheets, при росте до 2000+ участников появится риск медленной и хрупкой аналитики.

## [ЧТО НЕ ТРОГАТЬ]

Без отдельного решения не менять:

- живые Google Sheets;
- листы и названия колонок;
- `AS-BOT__00_MAIN_ROUTER`;
- `AS-HR-ZOOM-MVP` workflows;
- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
- owner/razbor workflow;
- credentials;
- webhook URL;
- Telegram bot token / credentials;
- n8n API key;
- cached schema;
- диапазон `btm_000001-btm_001000` для массовых Бэтманов;
- schedule каждые 5 минут.

## [СЛЕДУЮЩИЙ ШАГ]

Утвердить решение:

```text
Создаём единый Справочник_Источники и Доска_Сводка_Источников как общий слой источников / рефереров.
btm_id оставляем техническим ID ссылок.
source_role/source_status/priority_level/source_pool считаем главной бизнес-логикой источника.
```

После утверждения следующий безопасный технический шаг: подготовить локальный TSV-шаблон и миграционный план заполнения `Справочник_Источники` из текущих `Кандидаты_HR`, `Ссылки_Бэтманов`, `БизнесТест_*` и owner/razbor таблицы, без записи в живые таблицы.
