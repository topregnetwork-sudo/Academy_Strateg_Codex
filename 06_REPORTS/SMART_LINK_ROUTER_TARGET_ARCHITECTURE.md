# Smart Link Router — Target Architecture

[ЭТАП] `AS-SMART-LINK-ROUTER-TARGET-ARCHITECTURE-001`

## [ПОДТВЕРЖДЕНО]

- `hr_invite` является именной ссылкой, логически постоянной для конкретного `btm_id`.
- Read-only аудит ранее подтвердил 3000 `hr_invite`, 3000 уникальных `link_id` и 3000 уникальных `btm_id`.
- Текущие значения ведут прямо на Google Form, а отдельного redirect target нет.
- Подготовлен standalone Apps Script MVP, но он не развёрнут.
- Production-генератор, строки и рабочие интеграции этим этапом не изменяются.

## [КЛЮЧЕВОЙ ВЫВОД]

У прямой Google Form ссылки нельзя изменить destination, сохранив тот же URL. Поэтому текущие значения не являются настоящими постоянными smart links.

Целевая модель требует один раз перевести каждую подтверждённую ссылку на стабильный Router URL. После этого меняется только конфигурация destination в Router, а публичная именная ссылка остаётся неизменной.

[ЗАПРЕТ] Одноразовая миграция не разрешена этим документом. Сначала только отдельный тест одного `hr_invite` после backup и deploy-разрешения.

## [ЦЕЛЕВАЯ ЦЕПОЧКА]

```text
постоянный hr_invite URL
→ стабильный публичный hostname Router
→ строгая проверка link_id
→ извлечение btm_id/link_type/source_id
→ click_id + event-log
→ HTTP redirect на текущий SITE_BASE_URL
→ сайт сохраняет referrer_btm_id
→ выбор sales / trainer
→ утверждённая форма соответствующего направления
```

## [КОНТРАКТ ПОСТОЯННОЙ ССЫЛКИ]

Рекомендуемый внешний контракт:

```text
https://ROUTER_HOST/r?link_id=btm_XXXXXX_hr_invite
```

Неизменяемые поля:

- `link_id=btm_XXXXXX_hr_invite`;
- `btm_id=btm_XXXXXX`;
- `link_type=hr_invite`;
- `source_id=hr_invite`.

Изменяемая конфигурация:

- `SITE_BASE_URL`;
- разрешённый path назначения, для текущего этапа `/index.html`;
- включение и место event-log;
- статус маршрута (`active`, `disabled`) после появления registry.

## [TARGET URL]

```text
SITE_BASE_URL/index.html
  ?ref=btm_XXXXXX
  &source_id=hr_invite
  &link_type=hr_invite
  &click_id=CLICK_ID
```

Target строится сервером только из проверенного `link_id` и утверждённой конфигурации. Клиент не передаёт готовый `target_url`.

## [RUNTIME]

Целевой Router должен поддерживать настоящий серверный HTTP 302/307 и стабильный hostname. Apps Script `HtmlService` этого надёжно не обеспечивает из-за iframe sandbox и дополнительного пользовательского клика.

Поэтому:

- Apps Script остаётся локальным MVP логики и не считается утверждённым production runtime;
- production runtime выбирается отдельным решением;
- Router hostname должен быть независим от версии deployment;
- секреты и credentials не должны находиться в URL, репозитории или event-log.

## [EVENT LOG]

Схема остаётся отдельной:

`timestamp`, `click_id`, `link_id`, `btm_id`, `link_type`, `source_id`, `target_url`, `status`, `user_agent`, `error`.

Журнал не размещается в HR-Zoom или таблице с кандидатами. До включения нужны владелец, доступы, срок хранения и политика удаления `user_agent`.

## [ОТКАЗОУСТОЙЧИВОСТЬ]

- Неверный `link_id`: отказ без redirect.
- Нет/невалиден `SITE_BASE_URL`: безопасная ошибка без внешнего перехода.
- Event-log недоступен: Router может продолжить валидный redirect, помечая потерю аналитики в техническом мониторинге.
- Route disabled: контролируемая безопасная страница, без fallback на неизвестный адрес.
- Конфигурация меняется отдельно от permanent URL.

## [БЕЗОПАСНЫЙ ПЛАН МИГРАЦИИ]

1. Утвердить `SITE_BASE_URL`, Router runtime/hostname и отдельный event-log.
2. Создать изолированный test deployment без production-изменений.
3. Проверить synthetic `link_id` без изменения таблиц.
4. Сделать backup одной заранее выбранной строки `hr_invite`.
5. После отдельного разрешения заменить только эту строку на стабильный Router URL.
6. Выполнить один переход, проверить referrer, target и event-log.
7. Выполнить rollback либо отдельно подтвердить результат.
8. Массовую миграцию рассматривать как новый этап с отдельным diff и подтверждением.

## [ЧТО НЕ ТРОГАЛИ]

- production Apps Script;
- generator diff;
- 3000 строк;
- `business_test_main`;
- `AS-BOT__00_MAIN_ROUTER` и n8n;
- Telegram;
- HR-форму и HR-Zoom;
- боевые Google Sheets;
- сайт и его production-публикацию.

## [РИСКИ]

- До одноразовой миграции текущие прямые Form URL не получают свойства permanent smart link.
- Неправильно выбранный deployment URL снова сделает ссылку зависимой от версии; нужен стабильный hostname.
- Потеря `click_id` или referrer в форме разорвёт атрибуцию.
- User-agent и журналы требуют политики приватности.
- Массовая замена без поэтапного теста может сломать всю рекрутинговую воронку.

## [НУЖНО РЕШИТЬ]

1. Точный `SITE_BASE_URL`.
2. Runtime и стабильный hostname с настоящим HTTP redirect.
3. Отдельное место и политика event-log.
4. Разрешение на test deployment.
5. Позднее — отдельное разрешение на тест одной строки.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Выбрать production-capable Router runtime/hostname и `SITE_BASE_URL`; не deploy и не менять строку на этом шаге.
