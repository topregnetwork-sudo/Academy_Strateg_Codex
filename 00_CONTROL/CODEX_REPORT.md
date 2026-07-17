# CODEX REPORT

[CODEX→CHATGPT]

## [ЭТАП]

`AS-SMART-LINK-ROUTER-CLOUDFLARE-TEST-DEPLOY-001`

## [СТАТУС]

Тестовый deploy и synthetic test выполнены. Работа остановлена до изменения
генератора или строк.

## [ЧТО СДЕЛАНО]

- Создан изолированный Cloudflare Worker в
  `10_ARCHITECTURE/CLOUDFLARE_WORKER_ROUTER_TEST/`.
- Локально пройдено 6 из 6 тестов.
- Через Wrangler `4.102.0` создан временный unauthenticated preview deployment.
- Проверены два разрешённых публичных входа без follow redirect.
- Оба входа вернули настоящий HTTP `302` и `Cache-Control: no-store`.
- Создан отчёт `06_REPORTS/CLOUDFLARE_WORKER_TEST_DEPLOY_REPORT.md`.
- `.wrangler/` добавлен в `.gitignore`; временные локальные файлы Wrangler не
  предназначены для GitHub.

## [WORKER URL]

`https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev`

Это временный Cloudflare preview deployment. Он не является production URL и
будет удалён Cloudflare, если временный аккаунт не закрепить в отведённое окно.
Claim URL является bearer credential: он не выводился в отчёты и не добавлялся
в GitHub.

## [ПРОВЕРЕННЫЕ URL]

1. `https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev/hr/btm_001001`
   - HTTP status: `302`
   - target URL:
     `https://example.com/index.html?ref=btm_001001&source_id=hr_invite&link_type=hr_invite&click_id=clk_1784263827926_89638e763835496ba0db9a63d13136e3`
2. `https://academy-strateg-smart-link-router-test-20260717.incongruous-college.workers.dev/?link_id=btm_001001_hr_invite`
   - HTTP status: `302`
   - target URL:
     `https://example.com/index.html?ref=btm_001001&source_id=hr_invite&link_type=hr_invite&click_id=clk_1784263829115_e3a69526992f4a7d8c4ff3814d77554e`

Для обоих входов подтверждены:

- `btm_id=btm_001001`;
- `link_type=hr_invite`;
- `source_id=hr_invite`;
- формат `click_id=clk_<timestamp_ms>_<uuid32>`;
- разные `click_id` для разных запросов;
- `Cache-Control: no-store`.

## [EVENT LOG]

- Worker пишет структурированный JSON в стандартный Workers log.
- Поля: `timestamp`, `click_id`, `link_id`, `btm_id`, `link_type`, `source_id`,
  `target_url`, `status`, `environment`.
- IP, user-agent, cookies и персональные данные не записываются.
- Постоянный event-log datastore не создавался; для него ещё нужно отдельное
  архитектурное решение.

## [ЧТО ИЗМЕНЕНО]

- Добавлен только новый изолированный каталог Cloudflare Worker.
- Обновлены контрольный статус, отчёт и `.gitignore`.
- В Cloudflare создан только временный preview deployment без custom domain.

## [ЧТО НЕ ТРОГАЛИ]

- Apps Script generator;
- generator diff;
- 3000 строк `hr_invite`;
- `business_test_main`;
- n8n;
- Telegram;
- HR-форму;
- боевой домен и боевые данные;
- массовую миграцию ссылок.

Секреты, токены, credentials, Cloudflare account ID и claim URL в GitHub не
добавлялись.

## [РИСКИ]

- `SITE_BASE_URL=https://example.com` — синтетическая заглушка, не боевой сайт.
- Временный Worker URL не является стабильным и исчезнет, если deployment не
  закрепить.
- Standard Workers logs не являются гарантированным постоянным click-ledger.
- До реального теста строки нельзя подставлять этот временный URL в генератор или
  таблицу без отдельного решения и плана rollback.

## [ЧТО НУЖНО РЕШИТЬ ПЕРЕД ТЕСТОМ ОДНОЙ СТРОКИ HR_INVITE]

1. Утвердить реальный `SITE_BASE_URL`.
2. Авторизовать постоянный тестовый deploy либо отдельно решить, нужно ли
   закреплять временный deployment; custom domain пока не подключать.
3. Выбрать постоянное место event-log и требуемую гарантию хранения кликов.
4. Отдельно разрешить тест одной конкретной строки, указать строку и rollback.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Остановиться. Пользователь утверждает реальный `SITE_BASE_URL` и отдельно решает
вопрос постоянного тестового Worker; до этого генератор и строки не менять.
