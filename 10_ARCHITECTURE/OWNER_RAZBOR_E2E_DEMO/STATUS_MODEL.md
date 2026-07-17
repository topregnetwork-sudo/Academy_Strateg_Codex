# Статусы демонстрационного OWNER-цикла

## Фактически проверенный live demo snapshot

Проверено read-only аудитом после записи placeholder-строки:

```text
owner_status=разбор_забронирован
qualification_status=квал
queue_status=booking_created
booking_status=booked
ai_status=needs_manual_ai
chart_status=data_ready
expert_packet_status=expert_packet_ready
sale_status=offer_prepared
payment_status=payment_link_pending
platform_access_status=platform_access_pending
```

Первые четыре значения не переводились в post-call статусы: реальный разбор и
реальное согласие собственника не имитировались.

## Целевой post-call demo snapshot

Этот блок описывает ожидаемое состояние после отдельного разрешённого demo-call.
В live-таблицу на текущем этапе он не записывался.

```text
owner_status=course_offer_accepted
qualification_status=qualified_for_razbor
queue_status=razbor_completed
booking_status=completed
ai_status=needs_manual_ai
chart_status=data_ready
expert_packet_status=ready_for_expert
sale_status=offer_accepted_pending_payment_setup
payment_status=payment_link_pending
platform_access_status=platform_access_pending
```

## Переходы

| Этап | Изменяемый статус | Значение после шага |
|---|---|---|
| результат теста связан | `owner_status` | `test_result_matched` |
| квалификация завершена | `qualification_status` | `qualified_for_razbor` |
| собственник попал в очередь | `queue_status` | `waiting_for_slot` |
| слот предложен | `queue_status` | `slots_offered` |
| слот выбран | `booking_status` | `booked` |
| график подготовлен | `chart_status` | `data_ready` |
| rule-based предразбор подготовлен | `ai_status` | `needs_manual_ai` |
| эксперт проверил пакет | `expert_packet_status` | `ready_for_expert` |
| разбор проведён | `booking_status` / `queue_status` | `completed` / `razbor_completed` |
| курс предложен | `sale_status` | `offer_presented` |
| собственник согласился | `owner_status` / `sale_status` | `course_offer_accepted` / `offer_accepted_pending_payment_setup` |
| ссылка ещё не подключена | `payment_status` | `payment_link_pending` |
| платформа ещё не открыта | `platform_access_status` | `platform_access_pending` |

## Guardrails

- `payment_link_pending` не означает оплату.
- `PAYMENT_LINK_NOT_SET` — единственное допустимое demo-значение URL оплаты.
- `platform_access_pending` не означает наличие доступа.
- Переходы `paid`, `payment_confirmed`, `platform_access_granted` запрещены на этом
  этапе.
- Demo snapshot не записывается в живой лист `Продажи` и не изменяет существующую
  бронь.
