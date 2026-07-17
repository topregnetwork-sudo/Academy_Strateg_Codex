# AS-OWNER-RAZBOR-SALES-MVP__03A_FIX_YARO_BUSINESS_TEST_LINKS — отчёт

Дата: 2026-07-15.

## [ПОДТВЕРЖДЕНО] Исходная ошибка

OWNER parent workflow `xLcyZ78h78bhncPa` формировал ссылку бизнес-теста от старой базы:

```text
https://academy.ecck.ru/tests?btm_id=...
```

Параметр филиала `city=YARO` отсутствовал. До исправления проходить тест по этой кнопке было запрещено.

## [ПОДТВЕРЖДЕНО] Аудит BTM-ссылок

Проверены live-листы исходной BTM-таблицы.

Результат:

- в `Ссылки_Бэтманов` найдено 3000 строк `business_test_main`;
- все 3000 ссылок являются переходниками Google Apps Script;
- все 3000 сохраняют соответствие `st` своему `btm_id`;
- все 3000 сохраняют `type=business_test_main`;
- конечная база переходника в live-настройках уже равна `https://academy.ecck.ru/tests?city=YARO`;
- старой конечной базы в проверенных настройках не найдено;
- переходник записывает статистику клика и формирует конечный URL с `city=YARO`, `st`, `btm_id`, `type` и UTM-метками.

## [РЕШЕНИЕ]

3000 BTM-ссылок не изменялись. Их прямая замена сломала бы подтверждённый слой учёта переходов.

Ошибка была изолирована только в OWNER parent workflow.

## [BACKUP]

До изменения созданы резервные копии:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_FIX_YARO_BUSINESS_TEST_LINKS/20260715_153453/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_FIX_YARO_BUSINESS_TEST_LINKS/20260715_153453/
```

Сохранены:

- OWNER parent workflow: 25 узлов, 1 Telegram Trigger;
- `Настройки_Квалификации`: 23 строки с заголовком;
- `Сообщения_OWNER`: 38 строк с заголовком;
- `Ссылки_Бэтманов`: 6001 строка с заголовком;
- контрольные хэши Batman и platform workflow.

Credentials сохранены только в redacted-виде. Токены и секреты не сохранены.

## [ИСПРАВЛЕНО]

В `Настройки_Квалификации` добавлена активная настройка:

```text
business_test_base_url
https://academy.ecck.ru/tests?city=YARO
active
```

В OWNER parent workflow:

- добавлен один узел `OWNER — read qualification settings`;
- изменён только существующий узел `OWNER — resolve entry`;
- сборщик ссылки читает `business_test_base_url`;
- безопасный fallback также равен `https://academy.ecck.ru/tests?city=YARO`;
- старый шаблон `tests?btm_id=` удалён.

Целевой формат OWNER-ссылки:

```text
https://academy.ecck.ru/tests?city=YARO&btm_id=<btm_id_referrer>&type=business_test_main&owner_id=<owner_id>
```

## [АВТОМАТИЧЕСКАЯ ПРОВЕРКА]

После записи подтверждено:

- OWNER parent активен;
- 26 узлов;
- ровно 1 Telegram Trigger;
- ровно 1 узел чтения OWNER-настройки;
- настройка присутствует и активна;
- `Сообщения_OWNER` не изменён;
- `Ссылки_Бэтманов` не изменены;
- Batman workflow не изменён;
- platform workflow не изменён.

## [ТЕСТ OWNER]

Команда:

```text
/start owner_from_btm_001001
```

Execution `380`, status `success`.

Подтверждено:

- повторно использован `owner_000001`;
- новый owner не создан;
- `btm_id_referrer=btm_001001`;
- полный сформированный URL содержит:
  - `city=YARO`;
  - `btm_id=btm_001001`;
  - `type=business_test_main`;
  - `owner_id=owner_000001`;
- пользовательское сообщение содержит этот URL;
- кнопка присутствует;
- execution-ошибок и ошибок каталога нет.

## [ВИЗУАЛЬНЫЙ ТЕСТ КНОПКИ]

Кнопка открыла страницу:

```text
academy.ecck.ru/tests?city=YARO&btm_id=btm_001001&type=business_test_main&owner_id=owner_000001
```

На странице отображается форма бизнес-теста, а филиал выбран как:

```text
Ярославль
```

Форма не заполнялась и тест на этом этапе не запускался.

## [НЕ ТРОГАЛИ]

- BTM-переходник и статистику кликов;
- 3000 BTM-ссылок;
- `AS-BOT__00_MAIN_ROUTER`;
- Batman workflow;
- HR-Zoom;
- platform webhook и HMAC;
- Telegram и Google Sheets credentials;
- названия листов, колонок и mappings;
- AI;
- квалификацию;
- слоты;
- оплату;
- платформу;
- существующие owner_id и btm_id;
- тестовые строки.

## [ПОДТВЕРЖДЕНО] End-to-end прохождение теста

Собственник прошёл бизнес-тест по OWNER-ссылке до страницы результата.

Создан результат:

```text
019f65e3-9e5f-7962-b25e-c575c795eb74
```

Страница результата открылась корректно, график и дата отображаются.

Read-only аудит platform webhook и Google Sheets подтвердил:

- executions `384`, `385`, `386`, `387` завершены со статусом `success`;
- registration webhook получил `owner_id=owner_000001` и `btm_id=btm_001001`;
- result webhook получил `owner_id=owner_000001` и `btm_id=btm_001001`;
- в сыром листе platform созданы четыре новые строки с `owner_id=owner_000001` внутри `raw_params_json`;
- в `БизнесТест_Регистрации` строка 10 содержит `owner_id=owner_000001` внутри `raw_params`;
- в `БизнесТест_Результаты` строка 9 содержит `owner_id=owner_000001` внутри `raw_params`;
- строка результата содержит `btm_id=btm_001001` и result ID `019f65e3-9e5f-7962-b25e-c575c795eb74`.

## [АРХИТЕКТУРНОЕ НАБЛЮДЕНИЕ]

Текущий platform workflow сохраняет полный `raw_params`, поэтому прямая связь owner → result подтверждена без изменения platform webhook.

При этом отдельной нормализованной колонки `owner_id` в текущем mapping результата нет. Это не блокирует закрытие YARO-этапа, но должно быть отдельно учтено при проектировании result match и квалификации.

## [РЕШЕНИЕ]

Этап `AS-OWNER-RAZBOR-SALES-MVP__03A_FIX_YARO_BUSINESS_TEST_LINKS` закрыт как стабильный, включая end-to-end проверку.

Патч platform webhook в рамках этого этапа не требуется.

## [СЛЕДУЮЩИЙ ШАГ]

Отдельно подготовить и подтвердить этап `AS-OWNER-RAZBOR-SALES-MVP__03_RESULT_MATCH_AND_QUALIFICATION`: сопоставить результат с `owner_000001`, записать `result_id` в OWNER-контур и только после этого запускать квалификационный сценарий.
