# AS-RAZBOR-BOT__00_MAIN_ROUTER_IMPORT_READY — инструкция импорта

## [ПОДТВЕРЖДЕНО]

Import-ready workflow создан локально:

```text
03_N8N_WORKFLOWS/AS-RAZBOR-BOT__00_MAIN_ROUTER_IMPORT_READY.json
```

Проверка:

- JSON валидный;
- workflow `active: false`;
- один Telegram Trigger;
- реальные Telegram/n8n/webhook tokens в файл не сохранены;
- используется новая owner/razbor таблица:
  `1vTx2jiibH4rDNRkIBfMv-mRKG2zYXI08W7r2uujYhPA`.

## [ЧТО ДЕЛАЕТ]

Один общий bot-router для `@Akademya_Strateg_bot`:

- `/start` без token;
- `/start r_test_owner_razbor_token_001`;
- 5 вопросов квалификации;
- запись квалификации в `Владельцы_Квалификация`;
- показ свободных слотов;
- бронирование слота;
- создание строки в `Разборы_Записи`;
- создание pending reminders в `Разборы_Напоминания`;
- seller `/seller`;
- seller `/schedule`;
- seller `/availability 2026-07-15 10:00 12:00 45`;
- seller `/comment BOOKING_ID проведён комментарий`.

## [КАК ИМПОРТИРОВАТЬ]

1. В n8n нажать `Create workflow`.
2. В правом верхнем меню `...` выбрать `Import from file`.
3. Выбрать файл:

```text
C:\Users\admin\Downloads\Academy_Strateg_Codex\03_N8N_WORKFLOWS\AS-RAZBOR-BOT__00_MAIN_ROUTER_IMPORT_READY.json
```

4. После импорта открыть узел:

```text
Telegram Trigger — OWNER/SELLER bot
```

5. Выбрать credential:

```text
Telegram OWNER_RAZBOR_BOT
```

6. Во всех Google Sheets узлах выбрать credential:

```text
Google Sheets OAuth2 API
```

7. Проверить, что в Google Sheets узлах выбран документ:

```text
AS-OWNER-RAZBOR-MVP__OWNERS_RAZBORY_SELLERS
```

8. Не включать workflow, пока старых активных Telegram Trigger на этот же bot нет.

## [ВАЖНО]

Нельзя держать два активных Telegram Trigger на один bot.

Если сейчас есть другой активный workflow на `@Akademya_Strateg_bot`, сначала выключить его или не включать новый.

## [ТЕСТ]

После импорта и выбора credentials:

1. Нажать `Execute workflow`.
2. В Telegram открыть:

```text
https://t.me/Akademya_Strateg_bot?start=r_test_owner_razbor_token_001
```

3. Ответить на 5 вопросов.
4. Выбрать слот `1` или `TEST_slot_001`.
5. Проверить строки:

```text
Владельцы_Квалификация
Разборы_Записи
Разборы_Напоминания
Разборы_Слоты
```

6. Для seller режима написать:

```text
/seller
/schedule
```

## [ОГРАНИЧЕНИЯ MVP]

- Авто-cron напоминаний не включён; создаются pending rows.
- `/availability` сделан в однострочном MVP-формате.
- `/comment` сделан в однострочном MVP-формате.
- Double-booking защита выполняет повторное чтение перед booking в рамках запуска, но Google Sheets не даёт настоящую транзакционную блокировку при одновременном выборе в одну миллисекунду.

## [ЗАПРЕТЫ]

- Не менять `AS-BOT__00_MAIN_ROUTER`.
- Не менять HR/Batman bot.
- Не менять текущий business-test webhook.
- Не менять webhook token.
- Не хранить Telegram token в workflow JSON.
- Не включать два Telegram Trigger на один bot.

## [СЛЕДУЮЩИЙ ШАГ]

Импортировать файл вручную, выбрать credentials, нажать `Execute workflow` и пройти тестовую owner-ссылку.
