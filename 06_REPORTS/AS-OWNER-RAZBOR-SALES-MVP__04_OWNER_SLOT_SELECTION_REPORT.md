# AS-OWNER-RAZBOR-SALES-MVP__04 — OWNER SLOT SELECTION

Дата закрытия тестов: 2026-07-15  
Тестовый владелец: `owner_000001`

## [ПОДТВЕРЖДЕНО]

- OWNER-бот показывает только подходящие слоты: production-слоты проходят по правилу `статус_слота = free` и пустой `owner_id`; изолированные тестовые слоты — только по правилу `статус_слота = test_free` и `owner_id = owner_000001`.
- Три тестовых слота были показаны только `owner_000001`.
- Выбранный слот `slot_test_final_20260716_1100` получил статус `booked`.
- Создан ровно один `booking_id` и ровно одна строка в `Записи_Разборов`.
- В записи подтверждены `owner_id = owner_000001`, `expert_id = expert_test_000001`, `btm_id_expert = btm_000101`, `статус_записи = booked`.
- Создан один lock в `Блокировки_Слотов`; `booking_id` совпадает с записью.
- Повторный клик по занятому `slot_id` не создал второй booking и не изменил исходный booking.
- Повторный клик получил событие `owner_slot_already_taken`; конфликт записан в `Логи`.
- Служебные зеркала выполнились в async workflow и направлялись в OWNER-группу `-5471702764`.
- После тестов все три тестовых слота переведены в `test_closed`. Строки, booking и lock сохранены, ничего не удалено.
- Telegram Trigger остаётся один в OWNER parent; в OWNER chat и async workflow Telegram Trigger отсутствует.

## [ИЗМЕНЕНО]

Изменён только OWNER chat workflow:

```text
mBaJjoCgCyEFwjSy
```

- исправлена передача динамических callback-кнопок в Telegram;
- вместо трёх отдельных сообщений сделано одно сообщение из `Сообщения_OWNER` с 1–3 inline-кнопками;
- добавлены отдельные безопасные ветки клавиатуры для 1, 2 и 3 слотов;
- исправлены выражения текста и `callback_data` кнопок;
- клиентские тексты в workflow не добавлялись;
- credentials не менялись.

## [BACKUP]

Основной backup перед финальными тестами:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION_TESTS_FINAL/20260715_212158/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OWNER_SLOT_SELECTION_TESTS_FINAL/20260715_212158/
```

Дополнительные точки восстановления перед минимальными UI-правками:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION_TESTS_FINAL/20260715_213434_BEFORE_DYNAMIC_BUTTON_FIX/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION_TESTS_FINAL/20260715_220543_BEFORE_SINGLE_MESSAGE_SLOT_KEYBOARD/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_SLOT_SELECTION_TESTS_FINAL/20260715_221121_BEFORE_SLOT_EXPRESSION_FIX/
```

## [ТЕСТЫ]

### Тест A — показ слотов

Первичный тест трёх слотов:

```text
parent execution: 424, success, 147 ms
OWNER chat execution: 425, success, 8 402 ms
async execution: 426, success, 4 685 ms
```

- сформированы три callback-кнопки;
- три слота имели `test_free`, `owner_id = owner_000001` и тестового эксперта;
- начальная реализация отправляла три карточки и превысила временный SLA.

После UI-оптимизации и бронирования первого слота выполнен повторный показ двух оставшихся слотов:

```text
parent execution: 433, success, 158 ms
OWNER chat execution: 434, success, 4 753 ms
async execution: 435, success, 3 047 ms
```

- один клиентский текст и две inline-кнопки;
- технических выражений в кнопках нет;
- верхняя граница времени до завершения личного ответа — `4,753 секунды`, временный MVP SLA до 5 секунд выполнен.

### Тест B — бронирование свободного слота

```text
parent execution: 427, success, 2 179 ms
OWNER chat execution: 428, success, 10 943 ms
async execution: 429, success, 2 876 ms
```

- слот забронирован;
- booking и lock созданы по одному;
- собственник получил подтверждение и данные встречи;
- async mirror выполнен без ошибки;
- второй booking отсутствует.

### Тест C — повторный клик

```text
parent execution: 436, success, 2 885 ms
OWNER chat execution: 437, success, 3 572 ms
async execution: 438, success, 2 672 ms
```

- слот остался `booked`;
- booking остался один;
- lock остался один;
- бот отправил `slot_already_taken` и актуальные свободные варианты;
- конфликт зафиксирован в логах;
- временный MVP SLA выполнен.

### Конкурентный тест

## [НЕ ПРОВЕРЕНО]

Два одновременных запроса на свободный слот не отправлялись. Для достоверной проверки через текущий live-контур потребовалась бы подмена Telegram update, дополнительный webhook/trigger либо временная тестовая точка входа. Это противоречит запретам этапа и могло затронуть реальный Telegram webhook.

Проверенная защита на текущем этапе:

- append-only lock;
- повторное чтение слота после lock;
- post-write verification;
- повторный callback не создаёт дубль.

## [НЕ ТРОГАЛИ]

- Batman workflow;
- HR-Zoom;
- platform webhook;
- AS-BOT__00_MAIN_ROUTER;
- AI;
- оплату;
- платформу;
- credentials;
- названия листов и колонок;
- дополнительные Telegram Trigger.

## [РИСКИ]

1. Первичное бронирование заняло `10,943 секунды`, что выше допустимого диапазона 7–8 секунд.
2. Основная задержка execution `428` подтверждена в синхронных Google Sheets-операциях:
   - `append razbor booking` — 2 250 ms;
   - `append slot lock` — 2 185 ms;
   - `read owners` — 1 056 ms;
   - `book selected slot` — 772 ms;
   - `update owner booked` — 717 ms.
3. До следующего production-этапа нужно вынести некритичные записи после клиентского подтверждения либо сократить число последовательных чтений/записей, не ослабляя lock.
4. Полная конкурентная атомарность Google Sheets не доказана нагрузочным тестом.
5. Текущий MVP показывает максимум три ближайших слота. Для длинного расписания нужна отдельная двухшаговая навигация `дата → время → другие даты`.

## [РЕШЕНИЕ]

Для масштабируемого выбора времени использовать отдельный следующий UI-этап:

```text
выбор даты → выбор времени → другие даты / назад
```

Тексты навигации хранить только в `Сообщения_OWNER`. В workflow хранить только `message_key`, технические варианты и callback-параметры.

## [СЛЕДУЮЩИЙ ШАГ]

До подключения напоминаний, AI-графика и оплаты провести минимальный этап оптимизации критического пути бронирования, сохранив lock и post-write verification. После достижения стабильного времени не выше 7–8 секунд переходить к отдельным этапам:

```text
напоминания → календарь/график эксперта → AI → оплата
```
