# AS-OWNER-RAZBOR-SALES-MVP — финальный отчёт создания структуры

Дата: 2026-07-14  
Этап: `AS-OWNER-RAZBOR-SALES-MVP__00_CREATE_STRUCTURE_FROM_SCRATCH_FINAL`

## [ПОДТВЕРЖДЕНО] Результат

Создана базовая структура новой Google Sheets таблицы для воронки:

```text
собственник
→ бизнес-тест
→ OWNER-бот
→ квалификация
→ ИИ-предразбор
→ график результата
→ запись на Zoom-разбор
→ эксперт
→ продажа курса
→ оплата
→ доступ к платформе
→ статистика Бэтмана / эксперта
```

Название таблицы:

```text
AS-OWNER-RAZBOR-SALES-MVP
```

Spreadsheet ID:

```text
1qQPFHowLjJ7cPuOD4gzwW6sCmAJBANR3J_fn3zksyGQ
```

Ссылка:

https://docs.google.com/spreadsheets/d/1qQPFHowLjJ7cPuOD4gzwW6sCmAJBANR3J_fn3zksyGQ/edit

Цена обзорного курса:

```text
60000
```

## Созданные листы и колонки

### 1. Владельцы

`owner_id`, `created_at`, `updated_at`, `result_id`, `registration_id`, `btm_id_referrer`, `ФИО`, `телефон`, `email`, `Telegram`, `telegram_chat_id`, `город`, `сфера_бизнеса`, `количество_сотрудников`, `оборот_в_месяц`, `статус_собственника`, `источник`, `дата_первого_теста`, `дата_последнего_контакта`, `комментарий`.

### 2. Квалификация

`qualification_id`, `created_at`, `updated_at`, `owner_id`, `result_id`, `btm_id_referrer`, `роль`, `количество_сотрудников`, `сфера_бизнеса`, `оборот_в_месяц`, `главная_проблема`, `готов_внедрять`, `запросил_AI_разбор`, `статус_квалификации`, `маршрут`, `ручное_решение`, `комментарий`.

### 3. Эксперты

`expert_id`, `created_at`, `updated_at`, `btm_id_expert`, `ФИО`, `Telegram`, `telegram_chat_id`, `роль_в_системе`, `статус_эксперта`, `video_service`, `video_url`, `часовой_пояс`, `schedule_until`, `нужно_продлить_расписание`, `кол_слотов_активных`, `кол_разборов_проведено`, `кол_продаж`, `сумма_продаж`, `комментарий`.

### 4. Слоты_Разборов

`slot_id`, `created_at`, `updated_at`, `expert_id`, `btm_id_expert`, `дата`, `время_начала`, `время_окончания`, `длительность_мин`, `статус_слота`, `owner_id`, `booking_id`, `reserved_until`, `video_url`, `комментарий`.

### 5. Записи_Разборов

`booking_id`, `created_at`, `updated_at`, `owner_id`, `result_id`, `btm_id_referrer`, `expert_id`, `btm_id_expert`, `slot_id`, `дата`, `время`, `статус_записи`, `can_cancel_until`, `can_reschedule_until`, `owner_reminder_24h_sent_at`, `owner_reminder_1h_sent_at`, `expert_brief_sent_at`, `no_show_at`, `итог_разбора`, `комментарий`.

### 6. Продажи

`sale_id`, `created_at`, `updated_at`, `owner_id`, `booking_id`, `expert_id`, `btm_id_referrer`, `btm_id_expert`, `product_name`, `amount`, `payment_region`, `payment_url_ru`, `payment_url_minsk`, `payment_status`, `paid_at`, `course_started_at`, `platform_url`, `platform_url_sent_at`, `статус_продажи`, `комментарий`.

### 7. Вознаграждения

`reward_id`, `created_at`, `updated_at`, `sale_id`, `owner_id`, `btm_id`, `role_in_sale`, `base_amount`, `percent`, `reward_amount`, `reward_reason`, `reward_status`, `paid_at`, `comment`.

### 8. Статистика_Бэтманов

`btm_id`, `updated_at`, `переходы`, `тест_завершён`, `квал`, `не_квал`, `разбор_проведён`, `кол_продаж`, `сумма_продаж`, `сумма_вознаграждения`.

Лишние технические поля не добавлены.

### 9. Сообщения_OWNER

`message_key`, `message_text`, `status`, `comment`.

Добавлены 26 ключей сообщений из ТЗ. Тексты оставлены в статусе `черновик`, потому что утверждённые формулировки не предоставлены.

### 10. Настройки_Квалификации

`setting_key`, `setting_value`, `status`, `comment`.

Добавлены 22 настройки из ТЗ, включая:

- `qualification_mode = all_to_razbor`;
- `default_payment_amount = 60000`;
- расписание на 28 дней;
- ограничение переноса и отмены за 3 часа;
- диапазоны внутренних BTM и экспертов;
- проценты вознаграждений.

### 11. AI_Предразбор

`ai_report_id`, `created_at`, `updated_at`, `owner_id`, `result_id`, `qualification_id`, `btm_id_referrer`, `request_payload_no_pii`, `ai_response`, `ai_status`, `manual_review_status`, `expert_summary`, `expert_instruction_version`, `ai_prompt_version`, `ошибка`, `комментарий`.

AI не подключён. Структура подготовлена без передачи персональных данных.

### 12. Графики_Теста

`chart_id`, `created_at`, `updated_at`, `owner_id`, `result_id`, `btm_id_referrer`, `Лидерство`, `Успешность_планирования`, `Умение_организовывать`, `Правильность_оценки`, `Контроль_финансов`, `Контроль_деятельности`, `Подбор_персонала`, `Маркетинг`, `Продажи`, `chart_file_url`, `chart_status`, `комментарий`.

### 13. Справочник_BTM_Роли

`role_key`, `role_name`, `btm_range`, `can_be_expert`, `comment`.

Добавлены 7 ролей и диапазоны:

- `btm_000001-btm_000100` — каналы найма и служебные источники;
- `btm_000101-btm_000200` — основной резерв экспертов;
- `btm_000201-btm_001000` — внутренние роли;
- `btm_001001+` — обычные Бэтманы HR-воронки.

### 14. Логи

`log_id`, `created_at`, `source`, `event_type`, `owner_id`, `btm_id_referrer`, `btm_id_expert`, `result_id`, `booking_id`, `sale_id`, `status`, `payload_json`, `error`, `comment`.

## Дополнительная подготовка

- Первая строка каждого листа закреплена и оформлена как заголовок.
- На листах включены фильтры.
- Для подтверждённых статусов и маршрутов добавлены выпадающие списки.
- Исходник будущей инструкции эксперта сохранён в проекте как `Codex01_CONTEXTREELS_TRANSCRIPTS/Разбор теста/2.Оценка теста — исходник.txt`.
- Workflow для AI и OWNER-бота не создавались.

## [ЗАПРЕТ] Что не трогали

- действующие n8n workflow;
- HR-Zoom;
- platform webhook и рабочий приём событий бизнес-теста;
- HMAC, API-ключи, credentials и Telegram token;
- Telegram Trigger и боевую цепочку OWNER-бота;
- существующие Google Sheets;
- действующие BTM-ссылки и `business_test_main`;
- Spell-book;
- AI-сервисы;
- старую OWNER/RAZBOR таблицу.

## Каких данных не хватает

- утверждённых текстов для 26 OWNER-сообщений;
- платёжных ссылок для России и Минска;
- фактических профилей экспертов, их `video_url` и расписаний;
- утверждённого правила переходного поиска результата по телефону, email или `result_id`;
- версии инструкции эксперта и версии AI-промпта;
- решения по сервису генерации и хранению PNG-графиков;
- рабочего слоя OWNER-бота, бронирования, оплаты и доступа к платформе.

## [СЛЕДУЮЩИЙ ШАГ]

Отдельным этапом разработать и проверить:

```text
AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
```

Первый рабочий слой должен создавать `owner_id`, определять `btm_id_referrer`, выдавать собственнику ссылку на бизнес-тест и сохранять связку идентификаторов. До отдельного решения workflow не создавать.
