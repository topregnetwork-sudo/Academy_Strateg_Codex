# DECISION REQUIRED

[CODEX→CHATGPT]

## [ЭТАП]

`AS-SMART-LINK-ROUTER-CLOUDFLARE-WORKER-PLAN-001`

## [БЛОКЕР БУДУЩЕГО DEPLOY]

Документация завершена, но безопасный deploy Cloudflare Worker сейчас не разрешён и не может быть начат, потому что не подтверждены:

1. точный `SITE_BASE_URL` и path `/index.html`;
2. стабильный `ROUTER_HOST` и Cloudflare zone/account;
3. достаточен ли для MVP sampled Analytics Engine или требуется точный ledger;
4. owner click-log, доступы, retention и допустимые поля;
5. разрешение создать отдельные test Worker и test dataset;
6. отдельное разрешение на test deployment.

Credentials не нужны в чат или GitHub. Если позже потребуется API-доступ, пользователь должен предоставить существующую Wrangler-авторизацию либо least-privilege token только вне проекта.

## [ОТДЕЛЬНЫЙ БЛОКЕР ТЕСТА ОДНОЙ СТРОКИ]

Даже после успешного test deployment нельзя менять строку `hr_invite`, пока пользователь отдельно не выберет одну точную строку, не разрешит её backup и одно изменение. Это разрешение не распространяется на остальные 2999 строк.

## [ЗАПРЕТ]

- не deploy и не создавать Cloudflare resources;
- не применять generator diff;
- не менять production Apps Script, 3000 строк или `business_test_main`;
- не трогать n8n, Telegram, HR-форму и боевые таблицы;
- не читать, не печатать и не сохранять credentials.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Пользователю подтвердить только три значения/решения: `SITE_BASE_URL`, `ROUTER_HOST` и Analytics Engine либо точный ledger. После этого сформировать отдельную задачу на synthetic test без deploy.
