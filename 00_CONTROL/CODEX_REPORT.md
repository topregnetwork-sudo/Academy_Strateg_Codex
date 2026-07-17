# CODEX REPORT

[CODEX→CHATGPT]

## [ЭТАП]

`AS-SMART-LINK-ROUTER-CLOUDFLARE-WORKER-PLAN-001`

## [СТАТУС]

Выполнено.

## [ЧТО СДЕЛАНО]

- Создан `06_REPORTS/CLOUDFLARE_WORKER_ROUTER_PLAN.md`.
- Зафиксирован настоящий серверный HTTP `302` с `Location` и `Cache-Control: no-store`.
- Определён production custom hostname и два строгих входа: `/hr/btm_001001` и `/r?link_id=btm_001001_hr_invite`.
- Описана единая нормализация в `link_id`, `btm_id`, `link_type=hr_invite`, `source_id=hr_invite`.
- Описаны `click_id`, безопасная сборка target URL, ошибки fail-closed и неблокирующий click-log.
- Сравнены Workers Logs, Analytics Engine, D1 и внешний collector. Для MVP рекомендованы Workers Logs + Analytics Engine; Analytics Engine не объявлен точным ledger.
- Зафиксированы конфигурация без секретов, данные/разрешения от пользователя, synthetic test, test deployment, тест одной строки, rollback и критерии приёмки.
- В `00_CONTROL/DECISION_REQUIRED.md` записан точный блокер будущего deploy и один безопасный следующий шаг.
- Сверены актуальные официальные документы Cloudflare по routing, secrets, observability, Analytics Engine и versions/deployments.

## [ПРОВЕРЕНО]

- Изменения только в allowlist: `06_REPORTS/` и `00_CONTROL/`.
- Cloudflare account/resources не создавались и не менялись.
- Deploy, publish и внешние записи не выполнялись.
- Apps Script generator и generator diff не менялись и не применялись.
- `business_test_main`, n8n, Telegram, HR-форма, боевые таблицы и 3000 строк не затронуты.
- Секреты и credentials не читались, не печатались и не сохранялись.

## [НЕ ПОДТВЕРЖДЕНО]

- точный `SITE_BASE_URL`;
- точный `ROUTER_HOST` и Cloudflare zone/account;
- разрешение на test Worker/dataset и test deployment;
- достаточен ли sampled Analytics Engine или нужен точный ledger;
- строка для будущего одно-строчного теста.

## [РИСКИ]

- `302` нельзя кэшировать, иначе повторные клики не получат новый `click_id`.
- Analytics Engine имеет sampling и трёхмесячное хранение; для гарантированного поиска каждого клика нужен отдельный точный datastore.
- Custom hostname нельзя подключать к production до изолированной приёмки.
- Массовая миграция 3000 строк остаётся отдельным запрещённым этапом.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Получить решение пользователя по `SITE_BASE_URL`, `ROUTER_HOST` и типу MVP click-log; до этого не deploy и не менять строки.
