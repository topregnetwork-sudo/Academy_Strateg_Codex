# CLOUDFLARE WORKER ROUTER — TEST DEPLOY REPORT

## [ЭТАП]

`AS-SMART-LINK-ROUTER-CLOUDFLARE-TEST-DEPLOY-001`

Дата проверки: `2026-07-17 07:50 MSK`.

## [РЕЗУЛЬТАТ]

Изолированный Smart Link Router развёрнут во временном Cloudflare preview
account и проверен реальными HTTP-запросами. Оба разрешённых формата вернули
настоящий HTTP `302`.

## [1. WORKER URL]

`https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev`

Deployment создан командой Wrangler `deploy --temporary`, потому что постоянная
Cloudflare-сессия на машине не была авторизована. Временный account и Worker будут
удалены Cloudflare, если deployment не закрепить в течение отведённого окна.
Чувствительный claim URL не публиковался и в GitHub не записывался.

## [2–4. ТЕСТОВЫЕ URL, HTTP STATUS И TARGET URL]

### Path format

- Request:
  `GET https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev/hr/btm_001001`
- HTTP status: `302`
- `Cache-Control`: `no-store`
- Location:
  `https://example.com/index.html?ref=btm_001001&source_id=hr_invite&link_type=hr_invite&click_id=clk_1784263827926_89638e763835496ba0db9a63d13136e3`

### Query format

- Request:
  `GET https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev/?link_id=btm_001001_hr_invite`
- HTTP status: `302`
- `Cache-Control`: `no-store`
- Location:
  `https://example.com/index.html?ref=btm_001001&source_id=hr_invite&link_type=hr_invite&click_id=clk_1784263829115_e3a69526992f4a7d8c4ff3814d77554e`

Redirect-follow был отключён: тест проверил именно ответ Worker, а не содержимое
`example.com`.

### Проверенные вычисляемые значения

| Поле | Результат |
|---|---|
| `btm_id` | `btm_001001` |
| `link_id` | `btm_001001_hr_invite` |
| `link_type` | `hr_invite` |
| `source_id` | `hr_invite` |
| `click_id` | валидный `clk_<timestamp_ms>_<uuid32>`, уникальный на запрос |
| `target_url` | корректно сформирован из синтетического `SITE_BASE_URL` |

## [SYNTHETIC TEST]

- Локальные тесты: `6/6 passed`.
- Живые HTTP redirect-тесты: `2/2 passed`.
- Дополнительно локально проверены: alias `/r?link_id=...`, уникальность
  `click_id`, `400` для неверного link ID, `404` для неизвестного route, `405`
  для запрещённого method и `503` для отсутствующего/опасного `SITE_BASE_URL`.

## [EVENT LOG]

Тестовая версия пишет структурированное событие в standard Workers log:

`timestamp`, `click_id`, `link_id`, `btm_id`, `link_type`, `source_id`,
`target_url`, `status`, `environment`.

IP, user-agent, cookies и персональные данные не собираются. Analytics Engine,
D1, KV и внешний collector не создавались. Поэтому этот deploy подтверждает
маршрутизацию и структуру события, но не постоянное хранение каждого клика.

## [5. ЧТО ИЗМЕНЕНО]

- Создан `10_ARCHITECTURE/CLOUDFLARE_WORKER_ROUTER_TEST/`:
  - `src/index.mjs`;
  - `test/router.test.mjs`;
  - `wrangler.toml`;
  - `README.md`.
- В `.gitignore` добавлен `.wrangler/`.
- Обновлены `00_CONTROL/CODEX_REPORT.md` и
  `00_CONTROL/AUTONOMOUS_WORKER_STATUS.md`.
- Внешнее изменение: только временный Cloudflare preview Worker на
  `workers.dev`.

## [6. ЧТО НЕ ТРОГАЛИ]

- Apps Script generator и generator diff;
- 3000 строк `hr_invite`;
- `business_test_main`;
- n8n, Telegram и HR-форму;
- custom/боевой домен;
- боевые данные и массовую миграцию ссылок.

Секреты, токены, credentials, account ID и claim URL не добавлялись в проект и
не публиковались в GitHub.

## [7. РИСКИ]

1. `https://example.com` — только заглушка; ссылка не ведёт в реальную воронку.
2. Временный workers.dev deployment не стабилен и будет удалён без закрепления.
3. workers.dev подходит для теста, но не утверждён как production hostname.
4. Standard Workers logs не дают гарантированный постоянный ledger каждого
   клика.
5. Любая подстановка URL в живую строку до утверждения target и rollback может
   повредить текущую воронку.

## [8. ЧТО НУЖНО РЕШИТЬ ПЕРЕД ТЕСТОМ ОДНОЙ СТРОКИ HR_INVITE]

1. Утвердить реальный `SITE_BASE_URL`.
2. Авторизовать постоянный тестовый Worker либо отдельно закрепить временный
   deployment; боевой домен всё ещё не подключать.
3. Выбрать event-log: Workers Logs, Analytics Engine, D1 или внешний collector,
   а также определить требуемую гарантию хранения.
4. Дать отдельное разрешение на одну конкретную строку `hr_invite`, указать её и
   подтвердить rollback.

## [ПОДТВЕРЖДЕНО]

Router технически возвращает настоящий HTTP `302` для обоих разрешённых входов
и создаёт корректный уникальный `click_id`.

## [НЕ ПОДТВЕРЖДЕНО]

Реальный сайт назначения, постоянный hostname, постоянное хранение кликов и
работа с одной живой строкой.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Остановиться после test deployment. Пользователь утверждает реальный
`SITE_BASE_URL` и отдельное решение по постоянному тестовому Worker; до этого не
менять генератор и строки.

## [ОФИЦИАЛЬНЫЕ ССЫЛКИ]

- https://developers.cloudflare.com/workers/wrangler/commands/workers/
- https://developers.cloudflare.com/workers/platform/claim-deployments/
- https://developers.cloudflare.com/workers/configuration/routing/workers-dev/
