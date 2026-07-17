# AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH — итоговый отчёт

Дата: 2026-07-15  
Статус: завершено и проверено live-тестами.

## [ПОДТВЕРЖДЕНО]

Завершён минимальный patch действующей OWNER-архитектуры:

```text
@Akademya_Strateg_bot
→ AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
→ Execute Sub-workflow
→ AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_RAZBOR_CHAT
→ отдельная OWNER-группа «Разборы рабочая с ботом»
```

Изменены только два существующих workflow:

```text
xLcyZ78h78bhncPa — OWNER parent, active, 25 узлов
mBaJjoCgCyEFwjSy — OWNER RAZBOR CHAT, active, 24 узла
```

В parent остался ровно один Telegram Trigger. В chat sub-workflow Telegram Trigger отсутствует; используется один `Execute Sub-workflow Trigger`. Новые workflow не создавались. Количество видимых workflow до и после patch — 10.

`AS-BOT__00_MAIN_ROUTER` / Batman проверен по backup-хешу и не изменён.

### Источник текстов OWNER-бота

Оба workflow читают лист `Сообщения_OWNER`. В workflow хранятся `message_key`, а изменяемый `message_text` берётся из таблицы.

Текущий parent использует ключи:

```text
owner_start
owner_test_link_issued
invalid_referrer
owner_test_button
owner_operator_test_reply
owner_group_mirror_inbound
owner_group_mirror_outbound
```

Текущий OWNER RAZBOR CHAT использует ключи:

```text
owner_chat_default_registered
owner_chat_default_unregistered
owner_chat_group_mirror_registered
owner_chat_group_mirror_unregistered
operator_send_success
operator_send_error
```

Текст, который оператор вводит после `/send_owner`, остаётся операторским пользовательским содержимым и передаётся без замены шаблоном.

Обязательные ключи ТЗ `owner_find_result_by_phone`, `expert_not_allowed` и `expert_role_detected` также присутствуют в каталоге и подготовлены для соответствующих веток. В листе 37 строк; дубли `message_key` и пустые обязательные `message_text` отсутствуют.

Новые и заполненные тексты добавлены со статусом `черновик` согласно ТЗ. Текущий runtime использует все статусы, кроме `inactive`.

Поддержаны подстановки:

```text
[test_url]
[owner_id]
[btm_id_referrer]
[telegram_username]
[error]
```

Для служебных зеркал дополнительно используется `[message_text]`.

Если ключ или обязательная переменная отсутствует, workflow не падает: применяется короткий fallback `Сообщение временно недоступно.`, а диагностическое событие `owner_message_catalog_error` записывается в `Логи`.

## [ТЕСТЫ]

### D — невалидный BTM

Команда:

```text
/start owner_from_btm_999999
```

Результат:

- execution `370`, success;
- `valid_referrer=false`, owner не создан;
- ответ точно совпал с `Сообщения_OWNER.invalid_referrer`;
- `Диалоги_OWNER_BOT`: inbound строка 13, outbound строка 14, Telegram `message_id` сохранён;
- `Логи`: строка 6, событие `owner_deeplink_invalid_referrer`;
- fallback-событий каталога нет.

### B — первый валидный вход

Команда:

```text
/start owner_from_btm_001001
```

Результат:

- execution `371`, success;
- создан `owner_000001`, `btm_id_referrer=btm_001001`;
- `Владельцы`: ровно одна строка, строка 2;
- ссылка содержит `btm_id=btm_001001`, `type=business_test_main`, `owner_id=owner_000001`;
- текст и кнопка взяты из `Сообщения_OWNER`;
- `Диалоги_OWNER_BOT`: строки 15/16;
- `Логи`: строка 7, событие `owner_created`;
- fallback-событий каталога нет.

### `/send_owner`

Команда из OWNER-группы:

```text
/send_owner owner_000001 Тестовое сообщение оператора
```

Результат:

- parent execution `372`, success;
- OWNER RAZBOR CHAT execution `373`, success;
- подтверждены группа, `operator_000001`, active и `can_send_owner`;
- сообщение доставлено `owner_000001` через `@Akademya_Strateg_bot`;
- подтверждение оператору взято из `operator_send_success`;
- `Операторские_Сообщения`: строка 2;
- `Диалоги_OWNER_BOT`: строка 17;
- `Логи`: строка 8, событие `operator_send_owner_success`;
- Telegram `message_id` сохранён;
- fallback-событий каталога нет.

### C — повторный валидный вход

Команда:

```text
/start owner_from_btm_001001
```

Результат:

- execution `375`, success;
- использован существующий `owner_000001`;
- узел `OWNER — append owner` не запускался;
- в `Владельцы` осталась ровно одна строка `owner_000001` с исходным `btm_001001`;
- возвращена текущая ссылка на бизнес-тест;
- `Диалоги_OWNER_BOT`: строки 18/19;
- `Логи`: строка 9, событие `repeated_owner_start`;
- `owner_created` в окне повторного теста отсутствует;
- fallback-событий каталога нет.

## [BACKUP]

До patch сохранены live-снимки parent, chat и Batman, метаданные с SHA256 и снимок `Сообщения_OWNER`:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH/20260715_130427/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_CHAT_MESSAGES_AND_TESTS_PATCH/20260715_130427/
```

В n8n-backup также сохранены redacted preview и exports опубликованных активных версий. Секреты, токены и credential values в файлы не записаны.

## [НЕ ТРОГАЛИ]

- `AS-BOT__00_MAIN_ROUTER` и Batman-workflow;
- `Telegram account 2` и все Telegram credentials;
- HR-Zoom;
- platform webhook и HMAC;
- существующие названия листов, колонок и mappings;
- AI и квалификацию;
- слоты разборов;
- оплату и доступ к платформе;
- диагностические тестовые дубли — ничего не удалялось.

## [РИСКИ]

- Новые тексты находятся в статусе `черновик`, но текущий runtime использует любой статус, кроме `inactive`. Перед редакционной публикацией статусы нужно утвердить отдельно.
- Негативные варианты `/send_owner` — неверный формат, неавторизованный оператор и отсутствующий owner — реализованы, но отдельными live-тестами этого этапа не проверялись.
- `/send_btm` и `/send_expert` не подключены и не входили в данный MVP.
- Тексты будущих веток квалификации, слотов, оплаты и платформы ещё не проектировались.

## [РЕШЕНИЕ]

Базовый OWNER-чат закрыт:

```text
1. Изменяемые ответы берутся из Сообщения_OWNER.
2. /send_owner проверен live.
3. D/B/C проверены live.
4. Дубля owner нет.
5. Batman workflow не затронут.
```

## [СЛЕДУЮЩИЙ ШАГ]

Одно действие: подготовить отдельное ТЗ и архитектуру без внедрения для этапа:

```text
AS-OWNER-RAZBOR-SALES-MVP__03_RESULT_MATCH_AND_QUALIFICATION
```

Сначала определить, как результат бизнес-теста связывается с `owner_id` и по каким подтверждённым правилам выполняется квалификация. AI, слоты, оплата и платформа до отдельного решения не подключаются.
