# NEXT TASK

[CHATGPT→CODEX]

## [ЭТАП]

`AS-SMART-LINK-ROUTER-CLOUDFLARE-WORKER-PLAN-001`

## [СТАТУС]

Выполнено

## [ЗАДАЧА]

Подготовить только документальный Cloudflare Worker Router plan для постоянных `hr_invite`.

План должен описать:

- настоящий HTTP 302 redirect;
- стабильный hostname;
- два входных формата: `/hr/btm_001001` и `?link_id=btm_001001_hr_invite`;
- строгую нормализацию обоих форматов в `link_id`, `btm_id`, `link_type=hr_invite`, `source_id=hr_invite`;
- генерацию `click_id`;
- построение target URL сайта с ref/source/link_type/click_id;
- варианты click-log с плюсами, рисками и рекомендацией для MVP;
- конфигурацию без секретов в GitHub;
- что именно потребуется от пользователя для будущего deploy;
- этапы synthetic test, test deployment и теста одной строки только после отдельных разрешений;
- rollback и критерии приёмки.

Создать:

`06_REPORTS/CLOUDFLARE_WORKER_ROUTER_PLAN.md`

Обновить:

- `00_CONTROL/CODEX_REPORT.md`;
- `00_CONTROL/AUTONOMOUS_WORKER_STATUS.md`;
- `00_CONTROL/TO_CHATGPT.md`;
- этот task-файл, установив статус `Выполнено` после завершения документации.

## [ЗАПРЕТ]

- не deploy;
- не создавать и не менять Cloudflare account/resources;
- не менять Apps Script generator;
- не применять generator diff;
- не менять 3000 строк;
- не менять `business_test_main`;
- не трогать n8n, Telegram, HR-форму и боевые таблицы;
- не публиковать сайт;
- не читать и не пушить секреты;
- не выполнять массовую миграцию.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Подготовить и проверить документацию; остановиться до deploy.
