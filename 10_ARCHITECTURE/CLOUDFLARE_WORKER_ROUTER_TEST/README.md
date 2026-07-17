# Cloudflare Worker Router — synthetic test deployment

Изолированный тестовый Worker для этапа
`AS-SMART-LINK-ROUTER-CLOUDFLARE-TEST-DEPLOY-001`.

## Входы

- `/hr/btm_001001`
- `/?link_id=btm_001001_hr_invite`
- `/r?link_id=btm_001001_hr_invite` — совместимый alias из архитектурного плана

Успешный запрос возвращает настоящий HTTP `302` с `Cache-Control: no-store`.

## Тестовая конфигурация

`SITE_BASE_URL=https://example.com` — только явная синтетическая заглушка. Это не
утверждённый боевой сайт. Custom domain, таблицы и внешние bindings отсутствуют.

Логирование выполняется в стандартный Workers log как структурированный JSON без
IP-адреса, user-agent, cookies и персональных данных. Постоянный click-ledger в этой
версии не создаётся.

## Локальная проверка

```powershell
node --test test/router.test.mjs
```

## Deploy

Deploy выполняется Wrangler из этого каталога. В конфигурации включён только
`workers.dev`; routes и custom domains не заданы.
