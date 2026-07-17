# N8N_WORKFLOWS_CLEANUP_20260713

## [ПОДТВЕРЖДЕНО]

Проверены все workflow в n8n через API.

До очистки найдено: 16 workflow.

После очистки осталось: 7 workflow.

Лишних active workflow не найдено.

## [ОСТАЛИСЬ ACTIVE]

| Workflow | ID | Причина |
|---|---|---|
| `AS-BOT__00_MAIN_ROUTER` | `fw0azBkY7IwZzhW2` | главный Telegram router |
| `AS-BTM-OWNER-TEST-MVP__03_WEBHOOK_REGISTRATION_AND_RESULT` | `QQ2J0N3pXVVgSBb6` | owner/business-test webhook |
| `AS-HR-ZOOM-MVP__03_ZOOM_CLICK_REDIRECT` | `SFmMI8gezZqaXHko` | Zoom-click tracking, `zoom_click_valid_at` |
| `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` | `KJoZSqVP7fM1NQsf` | объединённый HR-Zoom reminder/host/dogon |

## [ОСТАЛИСЬ ВЫКЛЮЧЕНЫ]

Эти workflow не активны и оставлены как rollback до проверки первого боевого запуска нового scheduled слоя:

| Workflow | ID | Active | Причина |
|---|---|---:|---|
| `AS-HR-ZOOM-MVP__01_START_TO_ZOOM` | `Ow4dQHFmnPZRZpF6` | false | старый слой `/start`, логика перенесена в main router |
| `AS-HR-ZOOM-MVP__02_ZOOM_REMINDER_30MIN` | `zrZxAFVAGM0k0MUL` | false | старый reminder, заменён `SCHEDULED_ZOOM_EVENTS` |
| `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` | `XFtElyi3ec9Sz65l` | false | старый dogon, заменён `SCHEDULED_ZOOM_EVENTS` |

## [УДАЛЕНО]

Удалены только workflow, которые уже были `archived = true` и `active = false`.

| Workflow | ID | Статус удаления |
|---|---|---:|
| `01_START_TO_ZOOM_CLEAN` | `QhxaoHNKZ8bbcZmY` | deleted |
| `AI Agent workflow` | `5yZulVgX5wqpGyxJ` | deleted |
| `AS-BOT__00_MAIN_ROUTER` archived old | `5YLg3P9Bttdi13fY` | deleted |
| `AS-BOT__00_MAIN_ROUTER` archived empty | `P8alOTMc4yIyq1ez` | deleted |
| `AS-HR-ZOOM-MVP__03_POST_ZOOM_WEBHOOK` | `eErlKNiaAaEyf8Lh` | deleted |
| `AS-HR-ZOOM-MVP__04_ZOOM_DOGON_10MIN` archived old | `8uD1u4QVq6mzVcs2` | deleted |
| `AS-ZOOM-STATUS-AUTO-001` | `HuE0eC7MikS0kJMF` | deleted |
| `AS-ZOOM-WEBHOOK-PARTICIPANT-001` | `frkY0dY1xS8bCkKI` | deleted |
| `HR_START_TO_ZOOM` | `FPkRqL0tAK58IU6q` | deleted |

## [BACKUP]

Перед удалением каждый удалённый workflow сохранён локально:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_DELETE_UNUSED/20260713_170219
```

Manifest:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_DELETE_UNUSED/20260713_170219/DELETE_UNUSED_WORKFLOWS_MANIFEST.json
```

Полный read-only аудит до удаления:

```text
06_REPORTS/N8N_WORKFLOWS_FULL_AUDIT_20260713.json
```

## [ЧТО НЕ ТРОГАЛИ]

Не удалялись и не менялись:

- active production workflow;
- credentials;
- webhook URL;
- Telegram credentials;
- Google Sheets mappings;
- n8n cached schema;
- выключенные rollback workflow `01`, `02`, `04`.

## [РИСКИ]

1. `01`, `02`, `04` пока оставлены выключенными, чтобы был быстрый rollback до первого подтверждённого execution нового scheduled слоя.
2. Полное удаление rollback workflow лучше делать только после проверки ближайшего боевого HR-Zoom окна.
3. Если удалить rollback сейчас, восстановление возможно только через локальные JSON backup/import.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

После первого успешного execution `AS-HR-ZOOM-MVP__SCHEDULED_ZOOM_EVENTS` принять решение: удалить или оставить архивом выключенные rollback workflow `01`, `02`, `04`.
