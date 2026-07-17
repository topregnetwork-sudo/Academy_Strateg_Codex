# AS-HR-ZOOM-SOURCE-MODEL__NO_5MIN_SCHEDULE_CHECK

## [ПРОВЕРЕНО]

Дата проверки: 2026-07-13.

Проверка выполнена через n8n API после live cutover HR-Zoom scheduled layer.

Активные workflow, важные для текущей воронки:

| Workflow | ID | Active | Archived |
|---|---|---:|---:|
| `AS-BOT__00_MAIN_ROUTER` | `fw0azBkY7IwZzhW2` | true | false |
| `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT` | `QQ2J0N3pXVVgSBb6` | true | false |
| `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` | `SFmMI8gezZqaXHko` | true | false |
| `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | `KJoZSqVP7fM1NQsf` | true | false |

Старые scheduled workflow выключены:

| Workflow | ID | Active |
|---|---|---:|
| `AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN` | `zrZxAFVAGM0k0MUL` | false |
| `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` | `XFtElyi3ec9Sz65l` | false |

## [SCHEDULE TRIGGERS]

В активных workflow найден только один scheduled workflow:

| Workflow | Node | Schedule | Риск 5 минут |
|---|---|---|---|
| `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | `SCHEDULE — -30 reminder + host` | weekly: Пн/Вт/Ср 07:30, Пн/Ср 17:30, Сб 05:30 | нет |
| `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | `SCHEDULE — +10 dogon` | weekly: Пн/Вт/Ср 08:10, Пн/Ср 18:10, Сб 06:10 | нет |

## [TELEGRAM TRIGGERS]

Найден один активный Telegram Trigger:

| Workflow | Node | Updates | Риск дубля |
|---|---|---|---|
| `AS-BOT__00_MAIN_ROUTER` | `Telegram Trigger` | `message`, `callback_query` | дублей не найдено |

## [НАЙДЕНО]

Schedule каждые 5 минут не найден.

Schedule каждые 1/2/3/5/10 минут в active workflow не найден.

Дублей активного Telegram Trigger на основном bot не найдено.

Zoom-click webhook оставлен отдельным active workflow, потому что клики нужно считать и писать отдельно от факта прихода.

## [NO 5 MIN CHECK PASSED]

Да: риск schedule каждые 5 минут в текущем live n8n не обнаружен.
