# AS-OWNER-RAZBOR-SALES-MVP — корректировка архитектуры Telegram-ботов

Дата: 2026-07-15  
Этап: `AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK`

## [ПОДТВЕРЖДЕНО]

Боты, воронки, workflow и Telegram-чаты разделены:

```text
@batman_strateg_bot
→ Бэтманы / HR-BTM
→ существующий AS-BOT__00_MAIN_ROUTER
→ отдельные чаты Бэтманов

@Akademya_Strateg_bot
→ собственники / OWNER
→ новый отдельный OWNER-workflow
→ отдельная операторская группа собственников
```

Из executions `353/354` подтверждено, что `AS-BOT__00_MAIN_ROUTER` использует `@batman_strateg_bot`, Telegram bot ID `8745817259`, credential name `Telegram account 2`.

Read-only аудит всех 8 видимых workflow показал: отдельного OWNER-workflow нет; найденные Telegram-узлы используют только `Telegram account 2`.

Отдельный read-only аудит списка credentials нашёл:

```text
Telegram OWNER_RAZBOR_BOT
credential ID: CzrNjapszGIBX9nZ
type: telegramApi
```

Token не читался и не выводился. Соответствие credential боту `@Akademya_Strateg_bot` ещё не подтверждено штатным connection test.

Пользователь выполнил штатный connection test: n8n показал `Соединение проверено успешно`, token на скриншоте скрыт. Публичный username будет дополнительно подтверждён по execution отдельного OWNER Trigger.

## [ПОДТВЕРЖДЕНО] Операторские листы

В таблице `AS-OWNER-RAZBOR-SALES-MVP` созданы:

```text
Диалоги_OWNER_BOT
Операторские_Сообщения
Операторы
```

Проверка после записи: 14 → 17 листов, точные заголовки новых листов, прежние листы не изменены. Backup до записи и снимок после сохранены в:

```text
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_OPERATOR_SHEETS/20260715_040810/
```

## [ОШИБОЧНАЯ ГИПОТЕЗА ОТМЕНЕНА]

Предположение, что OWNER-логику нужно добавлять в `AS-BOT__00_MAIN_ROUTER`, неверно. Отсутствие executions после команд в `@Akademya_Strateg_bot` не является ошибкой Telegram-группы: этот бот не подключён к Batman-роутеру.

Ранее подготовленный patch Batman-роутера признан устаревшим, не применялся и программно заблокирован от запуска.

## [РЕШЕНИЕ]

Для `@Akademya_Strateg_bot` создаётся отдельный OWNER-workflow с собственным Telegram Trigger и собственным credential. Наличие второго Trigger допустимо, потому что это другой bot token и другая воронка. Дублировать Trigger одного и того же бота запрещено.

## [ЗАПРЕТ]

- Не менять `AS-BOT__00_MAIN_ROUTER`.
- Не менять `Telegram account 2`.
- Не подключать OWNER-логику к `@batman_strateg_bot`.
- Не смешивать чаты Бэтманов и собственников.
- Не раскрывать Telegram tokens.

## [СЛЕДУЮЩИЙ ШАГ]

API write/activate доступ подтверждён. Создан и активирован отдельный трёхузловой bootstrap-workflow `AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK`, ID `xLcyZ78h78bhncPa`, с credential `Telegram OWNER_RAZBOR_BOT`. Batman-роутер не изменился.

Следующий шаг: отправить `/owner_operator_test@Akademya_Strateg_bot` в отдельной OWNER-группе и подтвердить по execution username бота, `group_chat_id` и ID оператора.

## [ПОДТВЕРЖДЕНО] Bootstrap test и entry layer

Execution `357` успешно подтвердил `@Akademya_Strateg_bot`, bot ID `8926610922`, OWNER group_chat_id `-5471702764` и первого оператора `@HRAcademyStrateg` / `6100981026`.

Оператор записан в whitelist как `operator_000001`. OWNER-workflow расширен с 3 до 22 узлов: добавлены проверка BTM, создание/reuse `owner_id`, выдача `business_test_main`, диалоговый журнал, зеркало и event log. Workflow active, содержит один Trigger; Batman-роутер не изменён.

Backup перед обновлением:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_ENTRY_LAYER/20260715_100503/
```

Следующий тест: `/start owner_from_btm_999999` в личном OWNER-боте. Ожидается отказ без создания собственника, с записью диалога/ошибки и зеркалом в OWNER-группу.
