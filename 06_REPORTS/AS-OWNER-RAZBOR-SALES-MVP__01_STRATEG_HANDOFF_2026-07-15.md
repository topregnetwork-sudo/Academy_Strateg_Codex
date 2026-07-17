# AS-OWNER-RAZBOR-SALES-MVP — отчёт Стратегу

Дата: 2026-07-15  
Этап: `AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK`

## [ГЛАВНАЯ ЦЕЛЬ]

Собственник должен входить по персональной ссылке Бэтмана, получать `owner_id`, проходить бизнес-тест, попадать на анализ / разбор и далее в продажу обзорного курса стоимостью `60000` рублей.

Текущий участок воронки:

```text
Бэтман / источник
→ @Akademya_Strateg_bot
→ проверка btm_id_referrer
→ создание или повторное использование owner_id
→ ссылка на business_test_main
→ журнал и операторская OWNER-группа
```

## [ПОДТВЕРЖДЕНО] Раздельная архитектура

Боты и воронки не смешаны.

```text
Бэтманы:
bot: @batman_strateg_bot
workflow: AS-BOT__00_MAIN_ROUTER
workflow_id: fw0azBkY7IwZzhW2
credential: Telegram account 2

Собственники:
bot: @Akademya_Strateg_bot
workflow: AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
workflow_id: xLcyZ78h78bhncPa
credential: Telegram OWNER_RAZBOR_BOT
```

`btm_id_referrer` в OWNER-команде — идентификатор источника / Бэтмана, который привёл собственника. Он не направляет сообщение в Batman-workflow.

`AS-BOT__00_MAIN_ROUTER` до и после OWNER-работ проверялся и не изменялся.

## [ПОДТВЕРЖДЕНО] Что создано

Отдельная OWNER-таблица:

```text
AS-OWNER-RAZBOR-SALES-MVP
spreadsheet_id: 1qQPFHowLjJ7cPuOD4gzwW6sCmAJBANR3J_fn3zksyGQ
```

В таблице 17 листов. В том числе созданы и проверены:

```text
Диалоги_OWNER_BOT
Операторские_Сообщения
Операторы
```

Создан и активирован отдельный OWNER-workflow. В нём 22 узла и один Telegram Trigger. Реализованы:

- разбор `/start owner_from_btm_XXXXXX`;
- проверка `btm_id_referrer`;
- поиск владельца по `telegram_chat_id`;
- подготовка последовательного `owner_id`;
- сохранение первоначального источника;
- подготовка ссылки `business_test_main`;
- журнал входящих и исходящих сообщений;
- зеркало сообщений в отдельную OWNER-группу;
- запись событий в `Логи`.

OWNER-группа подтверждена:

```text
Разборы рабочая с ботом
group_chat_id: -5471702764
```

Первый оператор зарегистрирован в листе `Операторы`:

```text
operator_id: operator_000001
username: @HRAcademyStrateg
status: active
```

## [ПОДТВЕРЖДЕНО] Что реально работает

Execution `357`:

- OWNER-бот `@Akademya_Strateg_bot` подтверждён;
- операторская группа подтверждена;
- команда `/owner_operator_test` обработана успешно.

Execution `358`:

- личный `/start` получен OWNER Trigger;
- входящее сообщение записано в журнал;
- сообщение зеркалировано в OWNER-группу.

Executions `359` и `360`:

- команды `/start owner_from_btm_999999` получены именно OWNER-workflow;
- маршрут распознан как `owner_deeplink`;
- `btm_id_referrer=btm_999999` извлечён правильно;
- входящее сообщение зеркалировано в отдельную OWNER-группу;
- Batman-workflow не участвовал.

## [ИСПРАВЛЕНИЕ ПРЕЖНЕГО ВЫВОДА]

Telegram webhook OWNER-бота не был остановлен.

Команды не пропали: они выполнялись очень долго. Execution `359` занял около 14 минут 25 секунд, execution `360` — около 14 минут 46 секунд.

Предыдущий вывод о необходимости перерегистрировать webhook был сделан до завершения этих executions и оказался неверным. Перерегистрация webhook сейчас не является подтверждённым решением.

## [ПОДТВЕРЖДЕНО] Фактическая ошибка

Безопасный аудит execution `360` показал:

```text
OWNER — deeplink only: 1 выходной элемент
OWNER — read BTM sources: 3000 выходных элементов
OWNER — read owners: 0 выходных элементов
OWNER — read messages: не запущен
OWNER — resolve entry: не запущен
```

Execution получил статус `success`, потому что технической ошибки узла не возникло. Но бизнес-сценарий не завершился: пустой результат `OWNER — read owners` обнулил поток данных и остановил последующие узлы.

Из-за этого:

- не выполнено окончательное решение `invalid referrer`;
- собственник не получил сообщение об ошибочной ссылке;
- исходящий ответ не попал в журнал;
- исходящий ответ не зеркалирован в OWNER-группу;
- событие `owner_deeplink_invalid_referrer` не записано в `Логи`.

Строка собственника при невалидном `btm_999999` не создавалась: узел добавления владельца не запускался.

## [РЕШЕНИЕ] Что нужно исправить

Менять только OWNER-workflow `xLcyZ78h78bhncPa` после нового backup его live-версии.

Нужно:

1. Не передавать все 3000 строк BTM последовательно в следующее чтение.
2. Искать только нужный `btm_id_referrer` или объединять независимые чтения через контролируемое объединение данных.
3. Гарантировать продолжение цепочки при пустом листе `Владельцы`.
4. Гарантировать продолжение цепочки при отсутствии искомого владельца.
5. После исправления повторить три теста:
   - D: невалидный BTM не создаёт owner и возвращает отказ;
   - B: валидный первый вход создаёт один `owner_id` и выдаёт тест;
   - C: повторный вход не создаёт дубль и сохраняет первоначальный `btm_id_referrer`.

Целевой результат теста D:

```text
один execution без многоминутной задержки
→ ответ пользователю о невалидной ссылке
→ 0 новых строк в Владельцы
→ входящая и исходящая записи в Диалоги_OWNER_BOT
→ событие owner_deeplink_invalid_referrer в Логи
→ входящее и исходящее зеркало в OWNER-группе
```

## [ЗАПРЕТ]

- не менять `AS-BOT__00_MAIN_ROUTER`;
- не менять `Telegram account 2`;
- не менять `Telegram OWNER_RAZBOR_BOT` и его token;
- не смешивать OWNER- и Batman-чаты;
- не менять названия листов, колонок и mappings;
- не создавать новый OWNER-workflow вместо исправления текущего;
- не подключать AI, бронирование, оплату и операторские `/send_*` до прохождения тестов D, B и C;
- не сохранять и не выводить реальные секреты.

## [BACKUP]

Существующие подтверждённые backup:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_WORKFLOW_CREATE/20260715_094558/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_ENTRY_LAYER/20260715_100503/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_OPERATOR_SHEETS/20260715_040810/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_OPERATOR_REGISTER/20260715_095633/
```

Перед исправлением требуется новый backup текущей live-версии OWNER-workflow.

## [СЛЕДУЮЩИЙ ШАГ]

Один следующий шаг для технического исполнителя:

```text
Сделать backup live OWNER-workflow xLcyZ78h78bhncPa
и подготовить минимальный patch чтения данных,
не применяя его до проверки preview и подтверждения,
что Batman-workflow не затрагивается.
```

После preview — применить patch только к OWNER-workflow и повторить тест D.

## [БЕЗОПАСНОСТЬ]

В отчёте нет token, API key, OAuth secret, cookies или значений credentials.
