# AS-HR-INVITE-LIVE-BACKUP-AND-DIFF-001 — отчёт

Дата: 2026-07-17, Europe/Moscow.

## [ЭТАП]

Live-backup и read-only сверка Apps Script генератора `hr_invite`.

## [ЧТО СДЕЛАНО]

- Открыт подтверждённый Apps Script project id `1l5yny3So7Ybyq-6SSqhPd3T0iIVZwXMb-QP0p4ZTphB6wBVv-vixdU7u`.
- Подтверждено название live-проекта: `Проект без названия`.
- Подтверждён один live-файл: `Код.gs`.
- Полный live-код выгружен без редактирования.
- Создан отдельный live-backup.
- Live-код побайтово сравнен с локальным экспортом после нормализации CRLF/LF.
- Проверены `AS_BTM_buildHrInviteUrl_`, business-test функции, `HR_FORM_URL`, Router URL и `entry.*`.
- Подготовлен diff замены только `AS_BTM_buildHrInviteUrl_`; diff не применён.

## [ПОДТВЕРЖДЕНО]

- Live-код: 542 строки, 17 функций.
- SHA-256 live-кода после нормализации LF:
  `ac598a03a33f0a529bf83584717051ca202a3b32639af21710fa739c09cc9e41`.
- Локальный экспорт имеет те же 542 строки, 17 функций и тот же SHA-256.
- Кнопка `Сохранить проект на Диск` после аудита неактивна: несохранённых live-изменений нет.
- Live URL проекта в момент проверки совпадает с переданным project id.

## [LIVE BACKUP]

Папка:

`08_ARCHIVE/APPS_SCRIPT_LIVE_BACKUP/AS-HR-INVITE-LIVE-BACKUP-AND-DIFF-001/20260717034946/`

Файлы:

- `Code.gs` — полный live-код;
- `LIVE_BACKUP_MANIFEST.md` — сведения о проекте, дате, hash и функциях;
- `COMPARISON.json` — машинная сверка live/local;
- `PROPOSED_NOT_APPLIED.diff` — подготовленный, но неприменённый diff.

## [СОВПАДАЕТ ЛИ LIVE С ЛОКАЛЬНЫМ ЭКСПОРТОМ]

Да, полностью после нормализации переносов строк CRLF/LF.

Содержимое, количество строк, список функций и SHA-256 совпадают.

## [AS_BTM_buildHrInviteUrl_]

В live функция:

- принимает `btmId`;
- использует `AS_BTM_CONFIG.HR_FORM_URL`;
- создаёт прямой prefilled Google Form URL;
- передаёт шесть полей `entry.*`;
- записывает `btmId` в `entry.1555497680`;
- передаёт тип `hr_invite` через `entry.2049861495`.

Найдены поля:

- `entry.1151304556`;
- `entry.699716568`;
- `entry.1948817733`;
- `entry.1555497680`;
- `entry.2049861495`;
- `entry.568552810`.

В live есть `HR_FORM_URL`. Константы или Script Property для Smart Link Router в live нет.

## [BUSINESS_TEST_MAIN]

В live подтверждены отдельные функции:

- `AS_BTM_buildBusinessTestFinalUrl_`;
- `AS_BTM_UPDATE_BUSINESS_TEST_MAIN_URLS`;
- `AS_BTM_TOP_UP_LINKS_IF_NEEDED`;
- `AS_BTM_safeLogBusinessTestClick_`;
- `doGet` текущего business-test переходника.

Они полностью совпадают с локальным экспортом. Ни одна из них не изменялась. Подготовленный diff заменяет только `AS_BTM_buildHrInviteUrl_`.

## [ГОТОВ ЛИ DIFF]

Да.

Diff находится в live-backup как `PROPOSED_NOT_APPLIED.diff` и соответствует локальному файлу:

`tools/apps_script_hr_invite_generator/Generator_HrInvite_Patch.gs`.

Целевая правка:

- валидировать `btm_id`;
- читать `HR_INVITE_ROUTER_URL` из Script Properties;
- строить `ROUTER_URL?link_id=btm_XXXXXX_hr_invite`;
- не менять `business_test_main`, `link_id`, `btm_id` и `type`.

Diff не применялся.

## [ЧТО НЕ ТРОГАЛИ]

- live Apps Script;
- deployment Apps Script;
- Google Sheets;
- одну тестовую строку и остальные 3000 строк;
- генерацию ссылок;
- `business_test_main`;
- Smart Link Router deployment;
- n8n и `AS-BOT__00_MAIN_ROUTER`;
- Telegram;
- HR-форму и HR-Zoom;
- credentials и секреты.

## [РИСКИ]

- Smart Link Router ещё не развёрнут.
- Production Router URL отсутствует.
- Публичный production URL `AS_Team_Recruiting_Hub` ещё не подтверждён в этом этапе.
- Отдельное хранилище click log Router не создано.
- Применение generator diff до появления рабочего Router URL остановит создание новых `hr_invite` — подготовленный код специально fail-closed.
- Миграция существующих 3000 ссылок остаётся отдельным запрещённым действием без нового решения.

## [НУЖНО РЕШЕНИЕ]

Да.

Нужно отдельное задание на создание и тестирование Smart Link Router либо отдельный стоп. Generator diff пока не применять.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Архитектору утвердить отдельный этап: создать и протестировать Smart Link Router на изолированной тестовой ссылке без изменения генератора и без изменения 3000 live-строк.

