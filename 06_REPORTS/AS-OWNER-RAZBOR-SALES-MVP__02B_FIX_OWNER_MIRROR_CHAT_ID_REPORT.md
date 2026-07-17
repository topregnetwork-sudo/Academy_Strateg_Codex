# AS-OWNER-RAZBOR-SALES-MVP__02B_FIX_OWNER_MIRROR_CHAT_ID — отчёт

Дата: 2026-07-15.

## [ПОДТВЕРЖДЕНО]

После команды `/start owner_from_btm_001001` служебное исходящее зеркало ошибочно отправлялось не только в OWNER-группу, но и в личный чат собственника.

Причина подтверждена execution `376` workflow `xLcyZ78h78bhncPa`:

- нормальное сообщение с бизнес-тестом и кнопкой было отправлено собственнику;
- входящее зеркало было отправлено в OWNER-группу `-5471702764`;
- исходящее зеркало дополнительно ушло в личный чат собственника;
- ошибочная отправка прошла через узел `OWNER — send operator mirror`;
- в узле использовался динамический адрес `{{$json.telegram_chat_id}}`, который после ответа бота содержал личный `telegram_chat_id` собственника.

Дубль собственника не создавался. `owner_000001` и `btm_id_referrer=btm_001001` были определены правильно.

## [BACKUP]

До изменения созданы redacted-копии обоих live OWNER-workflow:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_FIX_OWNER_MIRROR_CHAT_ID/20260715_155146/
```

В backup зафиксированы:

- OWNER parent `xLcyZ78h78bhncPa`: 26 узлов, 1 Telegram Trigger;
- OWNER RAZBOR CHAT `mBaJjoCgCyEFwjSy`: 24 узла, без Telegram Trigger;
- контрольные SHA256 Batman и platform workflow;
- credentials сохранены только в redacted-виде;
- токены и секреты не сохранены.

## [ИСПРАВЛЕНО]

Изменены только адреса назначения двух служебных mirror-узлов:

1. `OWNER — send operator mirror`
2. `CHAT — mirror owner to razbor group`

Для обоих узлов установлен строгий `chat_id`:

```text
-5471702764
```

Не изменялись:

- тексты сообщений;
- `Сообщения_OWNER`;
- личные Telegram send-узлы;
- кнопка и ссылка бизнес-теста;
- connections и settings workflow;
- количество узлов;
- количество Telegram Trigger.

Автоматическая проверка после записи подтвердила:

- оба OWNER-workflow активны;
- parent содержит 26 узлов и 1 Telegram Trigger;
- chat-workflow содержит 24 узла и 0 Telegram Trigger;
- в каждом workflow изменён только один целевой mirror-узел;
- оба mirror-узла имеют `chat_id=-5471702764`;
- Batman и platform workflow не изменились.

## [ТЕСТЫ]

### Test A — повторный `/start`

Команда:

```text
/start owner_from_btm_001001
```

Execution: `380`, status `success`.

Подтверждено:

- в личный чат отправлено ровно одно пользовательское сообщение с кнопкой;
- входящее и исходящее служебные зеркала отправлены только в OWNER-группу;
- `owner_000001` повторно использован, новый owner не создан;
- ссылка содержит `city=YARO`, `btm_id=btm_001001`, `type=business_test_main`, `owner_id=owner_000001`;
- ошибок каталога сообщений и execution-ошибок нет.

### Test B — обычное сообщение

Сообщение:

```text
Хочу записаться на разбор
```

Executions:

- parent `381`, status `success`;
- OWNER RAZBOR CHAT `382`, status `success`.

Подтверждено:

- собственник получил только обычное подтверждение;
- служебное зеркало отправлено только в OWNER-группу;
- зеркало содержит `owner_000001` и команду ответа `/send_owner owner_000001 текст`;
- входящий диалог записан;
- событие `owner_chat_received` записано;
- подтверждение собственнику записано;
- execution-ошибок нет.

## [НЕ ТРОГАЛИ]

- `AS-BOT__00_MAIN_ROUTER`;
- Batman workflow и Telegram credential;
- HR-Zoom;
- platform webhook и HMAC;
- Google Sheets mappings и названия листов/колонок;
- Telegram credentials;
- AI;
- квалификацию;
- слоты;
- оплату;
- платформу;
- тестовые строки.

## [РЕШЕНИЕ]

Этап `AS-OWNER-RAZBOR-SALES-MVP__02B_FIX_OWNER_MIRROR_CHAT_ID` закрыт как стабильный.

## [СЛЕДУЮЩИЙ ШАГ]

Одно действие: отдельно проверить фактическое открытие YARO-бизнес-теста по кнопке OWNER-бота. До этого не переходить к result match и квалификации.
