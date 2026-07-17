# AS-OWNER-RAZBOR-MVP__03_BUILD_ON_NEW_OWNER_SPREADSHEET

## [ПОДТВЕРЖДЕНО]

- Стабильный контекст принят.
- Работа велась только с новой owner/razbor таблицей.
- HR/Batman слой не трогался.
- `AS-BOT__00_MAIN_ROUTER` не менялся.
- `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT` не менялся.
- Новая Google Sheets таблица доступна сервисному аккаунту на запись.
- Созданы листы, заголовки, справочники, seller, TEST owner и TEST slots.
- Создан локальный паспорт таблицы.
- Создан read/write helper script для идемпотентной подготовки таблицы.
- Создан audit snapshot новой таблицы:
  `reports/google_sheets_audit/20260710_142556_AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS_audit.json`.

## [НОВАЯ ТАБЛИЦА]

name:

```text
AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS
```

id:

```text
1vTx2jiibH4rDNRkIBfMv-mRKG2zYXI08W7r2uujYhPA
```

url:

```text
https://docs.google.com/spreadsheets/d/1vTx2jiibH4rDNRkIBfMv-mRKG2zYXI08W7r2uujYhPA/edit?gid=0#gid=0
```

Листы:

```text
README
Владельцы_Бизнеса
Владельцы_Квалификация
Разборщики
Разборщики_Доступность
Разборы_Слоты
Разборы_Записи
Разборы_Напоминания
Разборы_Комментарии
Логи_OWNER_BOT
Логи_SELLER_BOT
Справочник_Квалификация
Справочник_Триггеры_Продаж
Справочник_Статусы_Разборов
Справочник_Сообщения_OWNER
Справочник_Сообщения_SELLER
Справочник_Zoom_Правила
Справочник_Продажи_Курс_СУ
```

## [БОТ]

username:

```text
@Akademya_Strateg_bot
```

MVP-решение: owner и seller роли временно работают через один bot, но должны быть разделены по:

- `telegram_username`;
- `telegram_chat_id`;
- командам;
- `bot_state`;
- таблицам owner/seller;
- веткам workflow.

Важно: нельзя включать два активных Telegram Trigger на один и тот же bot.

## [WORKFLOWS]

Созданы локально:

- таблица и справочники для будущих workflow;
- спецификация bridge;
- тестовый owner deep-link;
- helper scripts.

Не создано/не импортировано в n8n:

- `AS-OWNER-BOT__00_MAIN_ROUTER`;
- `AS-SELLER-RAZBOR-BOT__00_MAIN_ROUTER`;
- `AS-OWNER-RAZBOR__03_REMINDERS`.

Причина: в окружении не найден n8n API key, а хранить его в проекте нельзя.

## [OWNER FLOW]

Тестовая ссылка:

```text
https://t.me/Akademya_Strateg_bot?start=r_test_owner_razbor_token_001
```

TEST owner создан в `Владельцы_Бизнеса`:

```text
owner_id: TEST_owner_001
registration_id: TEST_registration_001
result_id: TEST_result_001
test_session_id: TEST_session_001
btm_id: btm_001001
token_raw_TEST_ONLY: test_owner_razbor_token_001
token_status: active
bot_state: result_ready
```

## [SELLER FLOW]

MVP seller создан в `Разборщики`:

```text
seller_id: seller_001
ФИО: Максим Шипунов
telegram_username: @TopregStrateg
роль: эксперт Академии Стратег
статус: active
meeting_provider: Zoom
часовой_пояс: Europe/Moscow
max_разборов_в_день: 5
```

Будущие команды:

```text
/seller
/availability
/schedule
/comment
/help
```

## [СЛОТЫ]

Созданы 3 TEST слота:

```text
TEST_slot_001
TEST_slot_002
TEST_slot_003
```

Статус:

```text
свободен
```

Защита от double-booking должна быть в workflow:

1. показывать только `статус = свободен`;
2. перед booking повторно перечитывать `slot_id`;
3. если статус уже не свободен — не создавать booking;
4. update делать по `slot_id`;
5. в slot сохранять `owner_id` и `booking_id`;
6. в booking сохранять `owner_id`, `seller_id`, `slot_id`.

## [ZOOM]

Zoom хранится в таблице, не хардкодится в workflow:

- `Разборщики.zoom_link`;
- `Разборы_Слоты.zoom_link`;
- `Разборы_Записи.zoom_link`.

Дополнительно предусмотрены:

- `backup_meeting_link`;
- `meeting_provider`;
- `meeting_comment`.

Позже проверить: тариф Zoom, параллельные встречи, права ведущих, backup-ссылки.

## [НАПОМИНАНИЯ]

Таблица `Разборы_Напоминания` создана.

Целевые pending-типы:

```text
owner_24h
owner_2h
owner_15m
seller_24h
seller_2h
seller_15m
```

Авто-reminders workflow не включён, потому что нет n8n API key для безопасного создания/import.

## [ТРИГГЕРЫ ПРОДАЖ]

Источники найдены:

```text
Codex01_CONTEXTREELS_TRANSCRIPTS/Разбор теста/1.разбор теста.txt
Codex01_CONTEXTREELS_TRANSCRIPTS/Транскрибация вебинаров АС/1. rutube_transcript.txt
Codex01_CONTEXTREELS_TRANSCRIPTS/Транскрибация вебинаров АС/рилсы .txt
```

В таблицу добавлены 5 source-based триггеров со статусом `active`:

```text
SRC_TRG_001 — цели и стратегия
SRC_TRG_002 — эффективность сотрудников
SRC_TRG_003 — планирование / управление будущим
SRC_TRG_004 — управление на расстоянии
SRC_TRG_005 — система вместо героев
```

Также есть временные строки `TRG_001...TRG_005` со статусом `НЕ ПРОВЕРЕНО`; они оставлены как черновые и не утверждаются.

## [ИНТЕГРАЦИЯ С САЙТОМ]

Рекомендованный MVP-вариант: Вариант А.

Почему:

- secure token создаёт наша система;
- связка owner/result/bot хранится у нас;
- сайт не генерирует чувствительную часть процесса;
- проще контролировать срок действия и статус токена.

### Вариант А

`business_test_result webhook` возвращает сайту:

```json
{
  "ok": true,
  "event": "business_test_result",
  "result_id": "site-result-id",
  "owner_id": "owner_xxx",
  "next_step": {
    "type": "owner_razbor_bot",
    "bot_link": "https://t.me/Akademya_Strateg_bot?start=r_<secure_token>",
    "deep_link_token_id": "token_xxx"
  }
}
```

Сайт берёт `next_step.bot_link` из ответа и показывает кнопку:

```text
Получить разбор результата
```

Формат кнопки:

```text
https://t.me/Akademya_Strateg_bot?start=r_<secure_token>
```

### Вариант B

Если сайт не может использовать response webhook:

- сайт сам генерирует `secure_token`;
- сайт формирует `bot_link`;
- сайт передаёт их в `business_test_result` payload:

```json
{
  "next_step": {
    "type": "owner_razbor_bot",
    "deep_link_token": "<secure_token>",
    "bot_link": "https://t.me/Akademya_Strateg_bot?start=r_<secure_token>"
  }
}
```

n8n сохраняет token/bot_link в новой owner/razbor таблице.

### Что должен передать сайт

Минимум:

- `registration_id`;
- `result_id`;
- `test_session_id`;
- `btm_id`;
- `st`;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_content`;
- `result_url`;
- owner phone/email;
- scores/result reference при необходимости.

### Что нельзя передавать в URL

- телефон;
- email;
- ФИО;
- результат теста;
- webhook token;
- scores JSON;
- btm_id в открытом виде, если можно избежать.

### Что отправить программистам

Сообщить:

```text
После внедрения Варианта А сайт должен читать response от business_test_result webhook
и показывать кнопку "Получить разбор результата" по next_step.bot_link.
```

Пока текущий production webhook бизнес-теста не менять без отдельного решения.

## [ТЕСТОВЫЙ ПРОГОН ДЛЯ МАКСИМА]

Пока n8n workflow не импортирован, тестовый прогон ограничен проверкой таблицы.

После появления n8n API key:

1. Открыть `https://t.me/Akademya_Strateg_bot?start=r_test_owner_razbor_token_001`.
2. Проверить `/start` без token.
3. Проверить `/seller` от `@TopregStrateg`.
4. Пройти 5 вопросов qualification.
5. Выбрать один из `TEST_slot_001...003`.
6. Проверить создание booking.
7. Проверить уведомление seller.
8. Проверить `/schedule`.
9. Проверить `/comment`.
10. Проверить строки в новой таблице и логи.
11. Повторить выбор того же slot_id и убедиться, что double-booking блокируется.

## [НЕ ХВАТАЕТ]

1. n8n API key.
   - Куда: `C:\Users\admin\.secrets\n8n_owner_razbor_api.env`.
   - Нельзя сохранять в проект.

2. Подтверждение credential:
   - `Telegram OWNER_RAZBOR_BOT`;
   - `Telegram SELLER_RAZBOR_BOT`.

3. Решение по текущему business-test webhook:
   - менять существующий `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT`;
   - или создать отдельный bridge workflow после него.

## [ЗАПРЕТЫ]

- Не менять `AS-BOT__00_MAIN_ROUTER`.
- Не менять HR/Batman bot.
- Не менять текущий webhook бизнес-теста без отдельного решения.
- Не менять webhook token бизнес-теста.
- Не менять `business_test_main`.
- Не менять `БизнесТест_Переходы`.
- Не использовать два активных Telegram Trigger на один bot.
- Не показывать владельцу данные Бэтмана.
- Не показывать Бэтману телефоны/результаты владельца без отдельного решения.
- Не хранить Telegram token в файлах проекта.
- Не хранить n8n API key в проектных файлах.
- Не утверждать неподтверждённые триггеры продаж как подтверждённые.

## [СЛЕДУЮЩИЙ ШАГ]

Сохранить n8n API key вне проекта:

```text
C:\Users\admin\.secrets\n8n_owner_razbor_api.env
```

После этого можно импортировать/создать workflow и выполнить живой тест owner/seller bot.
