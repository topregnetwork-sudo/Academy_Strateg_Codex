# AS-OWNER-RAZBOR-SALES-MVP__06_RAZBOR_QUEUE_AND_ALERTS — отчёт

Дата: 2026-07-16  
Режим: audit → backup → минимальный patch → live-тест.

## [ПОДТВЕРЖДЕНО]

- Предразбор эксперта хранится в `AI_Предразбор`, данные графика — в `Графики_Теста`.
- Для `owner_000001` / `019f65e3-9e5f-7962-b25e-c575c795eb74` существует одна валидная строка предразбора:
  - `ai_report_id = ai_report_1784202617723_mh5ti5`;
  - `ai_status = needs_manual_ai`;
  - `manual_review_status = pending`;
  - `expert_summary` заполнен.
- Существует одна валидная строка графика:
  - `chart_id = chart_1784202617723_06rplk`;
  - `chart_status = data_ready`.
- Основной запуск предразбора добавлен после `qualification_completed`; `owner_slot_booked` оставлен fallback.
- Если booking/expert ещё отсутствуют, они больше не блокируют создание предразбора.
- Дедупликация по существующему `result_id` сохранена: повторный booking не создаёт вторые строки AI/графика.
- Создан лист `Очередь_Разборов` с 17 утверждёнными колонками.
- Создан активный workflow `AS-OWNER-RAZBOR-SALES-MVP__06_WAITING_SLOT_WATCHER`, ID `Q05uFJYgb8Zstodm`:
  - один Schedule Trigger;
  - период 15 минут;
  - Telegram Trigger отсутствует.
- В `Сообщения_OWNER` добавлены и активированы 8 ключей этапа 06.
- Клиентский no-slots текст берётся из `owner_waiting_for_slot`.
- OWNER-сигналы уходят только в группу `-5471702764`.
- Служебная команда `слоты` использовалась для теста. Целевой вход — кнопка `Выбрать время`; watcher предлагает слоты автоматически.
- Кнопки слотов настроены без имени эксперта. Проверенное итоговое значение на реальной строке: `20.07, пн, 12:00 МСК`.
- После нажатия slot-кнопки сообщение с использованной клавиатурой удаляется фоновой веткой после клиентского ответа.

## [ИЗМЕНЕНО]

- OWNER chat `mBaJjoCgCyEFwjSy`: 76 узлов, active, Telegram Trigger отсутствует.
- Async OWNER logging `dVHYHMrk7G31Ubzk`: 33 узла, active, Telegram Trigger отсутствует.
- Waiting-slot watcher `Q05uFJYgb8Zstodm`: 18 узлов, active, один Schedule Trigger, Telegram Trigger отсутствует.
- Добавлены queue-upsert и короткие OWNER-сигналы для:
  - `owner_result_matched`;
  - `qualification_completed`;
  - `owner_no_slots_available`;
  - `owner_slots_available`;
  - `owner_slot_booked`;
  - `ai_preanalysis_ready`.
- Технические mapping выражения queue-upsert исправлены во всех трёх узлах.
- Watcher использует реальные колонки `дата` и `время_начала`; дата рассчитывается без UTC-сдвига.

## [ТЕСТЫ]

### Test A — existing owner

- В очередь добавлена ровно одна строка `owner_000001`.
- Подтянуты `qualification_id`, `ai_report_id`, `chart_id`, `booking_id`, `expert_id`.
- Начальный статус с существующей бронью: `booking_created`.

### Test B — no slots

- OWNER chat execution `462`: success.
- Async execution `463`: success.
- Собственник получил `owner_waiting_for_slot`.
- Очередь: `waiting_for_slot`, `next_action = wait_for_slots`.
- Событие `owner_no_slots_available` записано в `Логи`.
- OWNER-группа получила `[НЕТ СВОБОДНЫХ СЛОТОВ]`.

### Test C — slot appears

- Watcher execution `467`: success; найден один изолированный `test_free` слот.
- После исправления queue mapping очередь обновилась: `slots_offered`, `next_action = choose_slot`.
- Watcher execution `473`: success; отправка собственнику, queue-upsert и сигнал OWNER-группе выполнены.
- Две ранее отправленные сломанные тестовые кнопки удалены по точным Telegram `message_id`; временные cleanup-узлы после выполнения удалены из watcher.
- Итоговая подпись кнопки после последнего patch проверена по реальной строке данных и live-коду: `20.07, пн, 12:00 МСК`.

### Test D — repeat booking / no duplicate preanalysis

- OWNER chat execution `476`: success, `10 978 ms`.
- Async execution `477`: success.
- Создана бронь `booking_1784211836228_sm0yio`.
- Изолированный слот переведён в `booked`.
- Очередь: одна строка, `status = booking_created`, новый `booking_id` сохранён.
- Фоновое удаление нажатого slot-сообщения выполнено.
- `AI_Предразбор`: одна валидная строка; append повторно не выполнялся.
- `Графики_Теста`: одна валидная строка; append повторно не выполнялся.

## [НАЙДЕННЫЕ И ИСПРАВЛЕННЫЕ ДЕФЕКТЫ]

1. Queue mapping был записан как буквальный `{ $json... }` из-за неверного экранирования генератора. Исправлены 51 mapping-поле; созданная техническая строка очищена после точной проверки.
2. Первые watcher-кнопки содержали буквальное выражение. Исправлены шесть inline text/callback expressions; две сломанные Telegram-кнопки удалены.
3. После исправления выражения watcher формировал `19.07, вс, undefined МСК`: использовалась несуществующая колонка `время`, а дата сдвигалась через UTC. Исправлено на `время_начала` и календарный расчёт без сдвига.

## [НЕ ТРОГАЛИ]

- Batman / `AS-BOT__00_MAIN_ROUTER`: hash до и после `e0930d85c4bb7fdd99bd9acc769a7977b4f729bed6fa68aed37065409a19889e`.
- Platform webhook: hash до и после `b4e1e0b18cefd3bc659dfc2641ddb3737f43e21259854f3f179619186fe6c4c5`.
- OWNER parent: hash до и после `0f53cadaf646b5adca9580823c59821ba670f353f79f90496d0d90c6a15440c7`.
- HR-Zoom workflow не открывались для записи и не изменялись.
- Внешний AI / OpenAI / Spell-book API не подключались.
- Оплата и платформа не подключались.
- Credentials не менялись.

## [РИСКИ]

- Итоговая подпись `20.07, пн, 12:00 МСК` проверена на реальной строке и live-коде после последнего patch, но ещё раз в Telegram не отправлялась, чтобы не заставлять владельца проекта проходить дополнительный тест.
- Полный автоматический сбор старых **ненажатых** slot-сообщений из истории пока не реализован. Реализовано удаление сообщения, на котором собственник выбрал слот.
- Основной запуск предразбора после нового live-события `qualification_completed` подтверждён структурой workflow; отдельная новая квалификация после patch не проводилась. Fallback `owner_slot_booked` и дедупликация подтверждены live.
- Бронирование execution `476` заняло `10 978 ms`; это известная отдельная проблема скорости booking-path и не ошибка очереди/дедупликации.
- Тестовая строка AI и графика с буквальными выражениями, созданная до этапа 06, сохранена: удаление без отдельного разрешения не выполнялось.

## [СЛЕДУЮЩИЙ ШАГ]

Не расширять воронку. Сначала отдельным коротким этапом закрыть cleanup старых ненажатых slot-сообщений и больше не использовать ручную команду `слоты` в пользовательском сценарии.

## [BACKUP]

Основной backup этапа:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_RAZBOR_QUEUE_AND_ALERTS/20260716_152538/
04_GOOGLE_SHEETS/_BACKUP_BEFORE_RAZBOR_QUEUE_AND_ALERTS/20260716_152538/
```

Дополнительные точечные backup сохранены перед UI, mapping и cleanup patch в соответствующих каталогах `03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_*`.
