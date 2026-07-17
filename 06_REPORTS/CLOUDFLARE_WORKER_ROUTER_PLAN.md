# Cloudflare Worker Router Plan

[CODEX→CHATGPT]

[ЭТАП] `AS-SMART-LINK-ROUTER-CLOUDFLARE-WORKER-PLAN-001`

## [ЦЕЛЬ]

Подготовить production-capable Router для постоянных `hr_invite`: одна именная ссылка Бэтмана остаётся неизменной, а Router измеряет переход и отправляет посетителя на текущий сайт настоящим серверным HTTP `302`.

Усиливаемый участок воронки: источник / рекомендация / стажёр → собственник бизнеса. Результат — управляемый destination и сквозные `btm_id` / `click_id` без изменения `business_test_main`.

Этот документ не разрешает deploy, создание Cloudflare resources, изменение генератора, одной или 3000 боевых строк.

## [ПОДТВЕРЖДЕНО]

- Формат `link_id`: `btm_XXXXXX_hr_invite`.
- `btm_id`: `btm_XXXXXX`.
- Для этого маршрута `link_type=hr_invite` и `source_id=hr_invite` задаются сервером.
- Целевой вход сайта: `/index.html?ref=btm_XXXXXX&source_id=hr_invite&link_type=hr_invite&click_id=...`.
- Точный `SITE_BASE_URL`, Cloudflare account/zone и стабильный Router hostname пока не подтверждены.
- Текущие 3000 прямых Google Form URL не становятся постоянными smart links до отдельной миграции.

## [ЦЕЛЕВАЯ ЦЕПОЧКА]

```text
постоянный hr_invite URL
→ стабильный custom hostname Cloudflare Worker
→ строгий parse и normalize
→ новый click_id
→ неблокирующее событие click-log
→ HTTP 302 + Location
→ SITE_BASE_URL/index.html?ref=...&source_id=hr_invite&link_type=hr_invite&click_id=...
```

## [СТАБИЛЬНЫЙ HOSTNAME]

Для production нужен отдельный custom domain вида `https://<ROUTER_HOST>`, принадлежащий Академии и подключённый к Worker. Имя выбирает пользователь; в репозитории используется только placeholder `ROUTER_HOST`.

Почему не использовать deployment URL как постоянную ссылку:

- `workers.dev` предназначен для теста и не рекомендуется Cloudflare для business-critical production;
- preview/version URL зависит от тестового окружения или версии;
- custom domain отделяет публичный контракт ссылки от имени Worker и версии кода.

Предпочтительный постоянный формат после отдельного rollout-решения:

```text
https://ROUTER_HOST/hr/btm_001001
```

Совместимый формат для уже подготовленного генератора:

```text
https://ROUTER_HOST/r?link_id=btm_001001_hr_invite
```

Оба формата работают на одном hostname и дают один нормализованный объект. Path-формат предпочтителен для будущих публичных ссылок; query-формат сохраняет совместимость с подготовленным, но не применённым generator diff.

## [HTTP-КОНТРАКТ]

Worker принимает только `GET` и `HEAD`. Иные методы возвращают `405 Method Not Allowed` с `Allow: GET, HEAD`.

Для валидного запроса ответ создаётся сервером:

```text
HTTP/1.1 302 Found
Location: <TARGET_URL>
Cache-Control: no-store
```

`no-store` обязателен: каждый реальный переход должен дойти до Worker и получить новый `click_id`, а не использовать закэшированный redirect. Для `HEAD` вычисляется тот же контракт ответа без тела. HTML, JavaScript-переход и дополнительный пользовательский клик не используются.

Безопасные ошибки:

| Ситуация | HTTP | Redirect |
|---|---:|---|
| Неверный или неоднозначный вход | `400` | нет |
| Неизвестный path | `404` | нет |
| Метод не разрешён | `405` | нет |
| Невалидная конфигурация destination | `503` | нет |
| Валидный маршрут | `302` | да |

Ответы ошибок не содержат stack trace, конфигурацию, account ID или credentials.

## [СТРОГАЯ НОРМАЛИЗАЦИЯ]

Разрешены ровно два входа.

### 1. Path

```text
/hr/btm_001001
```

Полный шаблон: `^/hr/(btm_[0-9]{6})$`. Query string отсутствует. Лишний slash, дополнительные сегменты, другой регистр и query-параметры отклоняются.

### 2. Query

```text
/r?link_id=btm_001001_hr_invite
```

Path строго `/r`; присутствует ровно один параметр `link_id`; полный шаблон значения: `^btm_[0-9]{6}_hr_invite$`. Дубли `link_id`, пустое значение и дополнительные query-параметры отклоняются.

Если одновременно переданы path-ID и `link_id`, запрос отклоняется как неоднозначный. Значения не приводятся к нижнему регистру и не исправляются автоматически.

После проверки оба входа дают только такой объект:

```text
link_id   = btm_001001_hr_invite
btm_id    = btm_001001
link_type = hr_invite
source_id = hr_invite
```

`link_type` и `source_id` никогда не берутся из клиентских параметров. Готовый `target_url` от клиента не принимается.

## [CLICK_ID]

На каждый валидный запрос генерируется новый идентификатор:

```text
clk_<timestamp_ms>_<uuid32>
```

Рекомендуемая реализация — `Date.now()` плюс `crypto.randomUUID()` без дефисов. Ожидаемый шаблон: `^clk_[0-9]{13}_[0-9a-f]{32}$`.

Невалидному запросу `click_id` не выдаётся. Значение не содержит `btm_id`, персональных данных или секрета.

## [ПОСТРОЕНИЕ TARGET URL]

`SITE_BASE_URL` читается из environment binding, проверяется до маршрутизации и не принимается из запроса. Требования:

- только `https:`;
- hostname входит в утверждённую конфигурацию;
- отсутствуют username/password, query и fragment;
- итоговый path задаётся сервером как `/index.html`.

URL строится через стандартный `URL` API и `searchParams`, а не конкатенацией непроверенных строк:

```text
SITE_BASE_URL/index.html
  ?ref=btm_001001
  &source_id=hr_invite
  &link_type=hr_invite
  &click_id=clk_...
```

Порядок параметров фиксируется для тестов: `ref`, `source_id`, `link_type`, `click_id`. `ref` равен проверенному `btm_id`. При ошибке конфигурации Router fail-closed: возвращает `503`, а не отправляет на Google Form или неизвестный fallback.

## [ВАРИАНТЫ CLICK-LOG]

| Вариант | Плюсы | Риски / ограничения | Роль |
|---|---|---|---|
| Workers Logs, структурированный JSON | Нет отдельной бизнес-БД; удобно диагностировать `302`, ошибки и latency | Retention/sampling зависят от настроек; не является точным реестром кликов | Техническая диагностика |
| Workers Analytics Engine | Неблокирующая запись; быстрые агрегаты по `btm_id`, status и времени; не добавляет latency redirect | Данные хранятся 3 месяца; возможен sampling; нет гарантии получить конкретную отдельную запись | Рекомендация для MVP-измерений |
| D1, отдельная таблица событий | Точные строки, SQL, уникальность `click_id`, управляемая схема | Новый stateful resource, миграция/backup/retention; запись и стоимость требуют контроля; отдельное разрешение | Следующий этап, если нужен точный ledger |
| Внешний HTTPS event collector | Можно встроить в будущую общую аналитику/CRM | Новый credential, сетевой отказ, риск задержки и дублирования; n8n/production сейчас вне области | Не для первого MVP |

### [РЕКОМЕНДАЦИЯ MVP]

Использовать два неблокирующих слоя:

1. Workers Logs — безопасные технические события без IP, cookies, ФИО, телефона, email и Telegram ID.
2. Analytics Engine binding — агрегируемое событие маршрута, отправляемое через `ctx.waitUntil()`; сбой аналитики не отменяет валидный `302`.

Минимальные поля события: `timestamp`, `click_id`, `link_id`, `btm_id`, `link_type`, `source_id`, `target_url`, `status`, `error_code`. `user_agent` по умолчанию не сохранять; включать только после отдельной политики приватности.

Analytics Engine не считать бухгалтерским или аудиторским источником истины. Если приёмка требует гарантированно найти каждый `click_id`, до production rollout нужно отдельное решение по D1 или другому точному хранилищу.

## [КОНФИГУРАЦИЯ БЕЗ СЕКРЕТОВ В GITHUB]

В GitHub допустимы:

- исходный код Worker;
- `wrangler.jsonc` / `wrangler.toml` только с именами bindings и placeholders;
- неперсональные enum, regex, error codes;
- `.gitignore` для `.dev.vars*`, `.env*` и локальных артефактов;
- документированная схема события без реальных значений account/resource IDs.

Не коммитятся и не печатаются:

- `CLOUDFLARE_API_TOKEN`, API key, cookies;
- account ID/zone ID, если они не утверждены как публичная конфигурация;
- реальные `.dev.vars*` / `.env*`;
- credentials внешнего event collector;
- реальные секреты или production dumps.

`SITE_BASE_URL` и имя dataset сами по себе не секреты, но до утверждения остаются placeholders. Секреты задаются только как Cloudflare secret bindings или через локальное защищённое окружение; `vars` для секретов не используются.

Рекомендуется два независимых окружения:

- `test`: preview/`workers.dev`, отдельный test dataset, без production hostname и боевых строк;
- `production`: custom domain и отдельные bindings после приёмки.

## [ЧТО ПОТРЕБУЕТСЯ ОТ ПОЛЬЗОВАТЕЛЯ ДЛЯ БУДУЩЕГО DEPLOY]

Каждый пункт предоставляется отдельным решением, без публикации секрета в чате или репозитории:

1. Подтвердить точный `SITE_BASE_URL` и ожидаемый `/index.html`.
2. Выбрать стабильный `ROUTER_HOST` и подтвердить владение Cloudflare zone/domain.
3. Выбрать Cloudflare account и способ доступа: существующая авторизация Wrangler либо least-privilege API token вне проекта.
4. Разрешить или запретить создание отдельного test Worker и test Analytics Engine dataset.
5. Утвердить owner click-log, список доступа, retention и допустимые поля; отдельно решить, достаточно ли sampled analytics.
6. Дать отдельное разрешение на test deployment. Оно не разрешает custom production hostname и изменение строк.
7. Позже выбрать ровно одну тестовую строку `hr_invite`, подтвердить её backup и отдельно разрешить одно изменение.
8. После теста отдельно решить: rollback строки, сохранение одной строки или подготовка нового плана массовой миграции.

## [ЭТАПЫ ПРОВЕРКИ И РАЗРЕШЕНИЯ]

### Этап 0 — документация

Разрешён этой задачей и завершён данным планом. Никаких внешних изменений.

### Этап 1 — synthetic test

Требует новой задачи, но не Cloudflare deploy:

- unit-тест двух валидных форматов и единого normalize-результата;
- invalid matrix: регистр, длина ID, extra slash, duplicate/extra query, смешанный ввод, неверный тип;
- проверка `GET`, `HEAD`, `405`;
- проверка настоящего `302`, точного `Location` и `Cache-Control: no-store`;
- два последовательных запроса дают разные `click_id`;
- config error не перенаправляет;
- logging failure не меняет валидный redirect;
- локальный поиск секретов без вывода значений.

Synthetic test не меняет Cloudflare, сайт, генератор или таблицы.

### Этап 2 — test deployment

Только после отдельного разрешения пользователя:

- создать изолированный test Worker/version и отдельный test dataset;
- явно включить preview URL либо test `workers.dev` endpoint;
- не подключать production custom domain;
- прогнать synthetic ID, не совпадающий с боевой строкой;
- проверить status/headers без автоматического follow redirect;
- затем проверить target в тестовом браузерном проходе;
- проверить событие и отсутствие чувствительных данных;
- зафиксировать version ID и команду rollback.

### Этап 3 — тест одной строки `hr_invite`

Только после ещё одного отдельного разрешения:

- назвать таблицу, лист, точную строку и исходное значение;
- сделать проверяемый backup этой строки;
- убедиться, что Router test принят и stable production hostname отдельно разрешён;
- заменить только выбранную строку;
- выполнить один переход и проверить `302`, target, `ref`, `click_id` и click-log;
- остановиться и получить решение: сохранить либо откатить.

Ни один этап не даёт разрешения менять остальные 2999 строк.

## [ROLLBACK]

### Worker

- До каждого deployment сохранить active deployment/version ID и экспорт конфигурации без секретов.
- При функциональной ошибке вернуть предыдущую Worker version штатным rollback.
- Если production route/custom domain ещё не подключён, test deployment просто не продвигается; resource не удаляется без отдельного разрешения.
- Изменения D1/Analytics Engine state не откатываются вместе с Worker version; поэтому test и production datasets должны быть раздельными.

### Destination

- Перед сменой `SITE_BASE_URL` сохранить предыдущее утверждённое значение.
- При ошибке восстановить предыдущую конфигурацию и проверить один synthetic redirect.

### Одна строка

- Восстановить точное исходное значение из backup.
- Read-only сверкой подтвердить совпадение строки и отсутствие изменений остальных строк.
- Массовый rollback не нужен и не разрешён, потому что массовой миграции в этом плане нет.

Click-log не удаляется автоматически при rollback: тестовые события помечаются тестовым окружением и удаляются только по отдельной утверждённой retention-процедуре.

## [КРИТЕРИИ ПРИЁМКИ]

- Production public URL использует утверждённый custom hostname, независимый от версии Worker.
- Оба входных формата дают одинаковые `link_id`, `btm_id`, `link_type`, `source_id`.
- Невалидный или неоднозначный ввод никогда не перенаправляется.
- Валидный запрос возвращает настоящий HTTP `302` с точным `Location` и `Cache-Control: no-store`.
- Каждый валидный запрос получает новый корректный `click_id`.
- Target строится только из проверенного ID и утверждённой серверной конфигурации.
- В target сохранены точные `ref`, `source_id`, `link_type`, `click_id`.
- Сбой click-log не блокирует валидный redirect и виден в технической диагностике.
- В коде, конфигурации, логах и GitHub нет credentials и персональных данных.
- Test и production resources разделены.
- `business_test_main`, Apps Script generator, n8n, Telegram, HR-форма и боевые таблицы не изменены.
- До отдельного разрешения не изменена ни одна строка `hr_invite`.

## [РИСКИ]

- Ошибка DNS/custom domain затронет все уже переведённые ссылки; поэтому hostname подключается только после изолированного теста.
- Кэшированный `302` разрывает генерацию уникального `click_id`; ответ обязан иметь `no-store`.
- Analytics Engine подходит для метрик, но sampling и трёхмесячный retention не дают точного вечного реестра.
- Асинхронный log повышает скорость воронки, но аналитический сбой нужно видеть через Workers Logs/alerts.
- Массовая миграция до теста одной строки может одновременно сломать 3000 входов и запрещена.

## [ОФИЦИАЛЬНЫЕ ТЕХНИЧЕСКИЕ ОСНОВАНИЯ]

- [Cloudflare Workers: Routes and domains](https://developers.cloudflare.com/workers/configuration/routing/)
- [Cloudflare Workers: Response API](https://developers.cloudflare.com/workers/runtime-apis/response/)
- [Cloudflare Workers: Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers: Observability](https://developers.cloudflare.com/workers/observability/)
- [Cloudflare Workers: Metrics and Analytics Engine](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/)
- [Analytics Engine limits and retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/)
- [Cloudflare Workers: Versions and deployments](https://developers.cloudflare.com/workers/versions-and-deployments/)

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Получить от пользователя только решение по `SITE_BASE_URL`, `ROUTER_HOST` и допустимости Analytics Engine для MVP; deploy и изменение строк не выполнять.
