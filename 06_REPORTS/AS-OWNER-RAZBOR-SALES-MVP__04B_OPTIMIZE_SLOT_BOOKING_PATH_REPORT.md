# AS-OWNER-RAZBOR-SALES-MVP__04B — OPTIMIZE SLOT BOOKING PATH

Дата: 2026-07-15  
Статус: завершён, целевое время первичного бронирования достигнуто

## [ПОДТВЕРЖДЕНО]

### Что тормозило

Исходный подтверждённый тест:

```text
OWNER chat execution 428: 10 943 ms
```

Основные синхронные операции до личного подтверждения:

```text
CHAT — append razbor booking: 2 250 ms
CHAT — append slot lock: 2 185 ms
CHAT — read owners: 1 056 ms
CHAT — book selected slot: 772 ms
CHAT — update owner booked: 717 ms
CHAT — read qualification: 472 ms
```

### Что осталось в критическом пути

До личного подтверждения по-прежнему обязательно выполняются:

1. точная идентификация владельца по `telegram_chat_id`;
2. чтение выбранного слота и данных активного эксперта;
3. проверка доступности `slot_id`;
4. создание append-only lock;
5. повторное чтение lock и выбранного слота;
6. проверка победителя lock;
7. обновление слота в `booked`;
8. создание `booking_id`;
9. запись в `Записи_Разборов`;
10. повторное чтение забронированного слота;
11. post-write проверка совпадения `slot_id + owner_id + booking_id`;
12. отправка подтверждения собственнику.

Lock, повторное чтение, booking и post-write verification не ослаблялись.

### Что вынесено после ответа

- `update owner booked` перенесён в существующий async workflow;
- `Логи`;
- `Диалоги_OWNER_BOT`;
- зеркало в OWNER-группу;
- дополнительные диагностические события.

`update owner booked` не нужен для подтверждения факта записи: к моменту ответа слот уже `booked`, booking создан, а совпадение идентификаторов проверено. Async-обновление статуса владельца подтверждено тестом.

### Что сокращено

- Для частной OWNER-ветки добавлено точное чтение владельца по `telegram_chat_id`.
- Полное чтение `Владельцы` сохранено только для операторского маршрута, которому нужен поиск целевого `owner_id`.
- В callback-ветке слота больше не читается `Квалификация`: данные этого листа не участвовали в lock, booking или подтверждении.
- Опасный матчинг по `btm_id` не используется.

### Достигнутый результат

```text
было: 10 943 ms
стало: 7 652 ms
сокращение: 3 291 ms, примерно 30,1%
```

Цель `≤ 7–8 секунд` достигнута. `7,652 секунды` — консервативная верхняя граница по полной длительности OWNER chat execution; личная Telegram-отправка завершилась внутри этого интервала.

## [BACKUP]

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OPTIMIZE_SLOT_BOOKING_PATH/20260715_230318/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_OPTIMIZE_SLOT_BOOKING_PATH/20260715_230318/
```

Сохранены OWNER parent, OWNER chat, async logging и восемь обязательных листов. Backup redacted, secrets и tokens отсутствуют.

## [ИЗМЕНЕНО]

Изменён только workflow:

```text
OWNER chat: mBaJjoCgCyEFwjSy
```

Минимальный patch:

- добавлен отдельный точный private OWNER lookup по `telegram_chat_id`;
- операторский маршрут оставлен на прежнем полном чтении владельцев;
- slot callback пропускает неиспользуемое чтение `Квалификация`;
- связь `append razbor booking → update owner booked → reread booked slot` заменена на `append razbor booking → reread booked slot`;
- существующий async payload теперь передаёт строку обновления статуса владельца после успешного `owner_slot_booked`.

Новый OWNER workflow и новый Telegram Trigger не создавались.

## [ТЕСТЫ]

### A — первичное бронирование нового test_free слота

Тестовый слот:

```text
slot_test_04b_20260717_1100
owner_id: owner_000001
```

Executions:

```text
parent: 442, success, 2 138 ms
OWNER chat: 443, success, 7 652 ms
async: 444, success, 3 032 ms
```

Результат:

- один lock;
- один booking;
- слот `booked`;
- `owner_id`, `expert_id`, `btm_id_expert` и booking status совпали;
- post-write verification выполнен;
- синхронный `update owner booked` не запускался;
- синхронное чтение `Квалификация` не запускалось;
- подтверждение собственнику отправлено;
- SLA `≤ 7–8 секунд` выполнен.

Ключевые длительности после patch:

```text
exact owner read: 1 177 ms
append slot lock: 1 039 ms
append razbor booking: 1 022 ms
book selected slot: 702 ms
reread booked slot: 511 ms
read slot after lock: 522 ms
```

### B — повторный клик

Executions:

```text
parent: 445, success, 2 782 ms
OWNER chat: 446, success, 5 125 ms
async: 447, success, 2 781 ms
```

Результат:

- второй booking не создан;
- второй lock не создан;
- занятый слот остался `booked`;
- бот отправил `slot_already_taken`;
- альтернативный слот остался `test_free`;
- событие конфликта записано;
- SLA выполнен.

### C — async после личного ответа

Execution `444`:

```text
ASYNC — append dialogs: 1 009 ms
ASYNC — append events: 1 001 ms
ASYNC — update owner status: 819 ms
ASYNC — mirror to OWNER group: 130 ms
```

Execution `447`:

- диалог повторного клика записан;
- событие `owner_slot_already_taken` записано;
- зеркало отправлено;
- ошибок нет.

Зеркало по-прежнему отправляется только в OWNER-группу:

```text
-5471702764
```

После тестов оба новых слота переведены в `test_closed`. Строки, booking и lock сохранены; удаления не выполнялись.

## [НЕ ТРОГАЛИ]

- Batman workflow;
- HR-Zoom;
- platform webhook;
- AS-BOT__00_MAIN_ROUTER;
- OWNER parent;
- async workflow — конфигурация не менялась;
- AI;
- оплату;
- платформу;
- credentials;
- названия листов и колонок;
- существующий Telegram Trigger.

Финальная read-only сверка подтвердила:

```text
parent unchanged: true
async unchanged: true
Batman unchanged: true
platform webhook unchanged: true
OWNER chat changed only: true
```

## [РИСКИ]

1. Цель достигнута на одном первичном live-бронировании; задержка Google Sheets остаётся переменной и требует наблюдения на следующих реальных записях.
2. Точное чтение владельца всё ещё заняло `1,177 секунды`; оно оставлено в критическом пути ради безопасной связи Telegram-чата с `owner_id`, `result_id` и источником.
3. Статус владельца обновляется асинхронно. При временном сбое async booking останется действительным, но статус владельца может потребовать повторной синхронизации.
4. Google Sheets не предоставляет полной транзакционной атомарности. Lock, повторное чтение и post-write verification сохранены, но отдельный конкурентный нагрузочный тест в этом этапе не проводился.
5. Значительная часть улучшения связана также с более быстрыми Google Sheets append в новом тесте; стабильность следует подтвердить на следующих production executions.

## [СЛЕДУЮЩИЙ ШАГ]

Оптимизация 04B успешна. Следующим отдельным этапом выбрать один слой:

1. напоминания о разборе; или
2. AI-предразбор.

До отдельного решения ничего из этих слоёв не подключать.
