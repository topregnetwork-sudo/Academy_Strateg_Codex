# AS-OWNER-RAZBOR-SALES-MVP — OWNER RAZBOR CHAT

Дата: 2026-07-15  
Статус: опубликовано; входящее личное OWNER-сообщение подтверждено live-тестом.

## [РЕШЕНИЕ]

Не создавать второй Telegram Trigger для `@Akademya_Strateg_bot`.

Правильная архитектура:

```text
@Akademya_Strateg_bot
→ AS-OWNER-RAZBOR-SALES-MVP__01_OWNER_BOT_ENTRY_AND_TEST_LINK
  workflow_id: xLcyZ78h78bhncPa
  один Telegram Trigger
→ Execute Sub-workflow
→ AS-OWNER-RAZBOR-SALES-MVP__02_OWNER_RAZBOR_CHAT
  workflow_id: mBaJjoCgCyEFwjSy
  Execute Sub-workflow Trigger
  без Telegram Trigger
→ группа «Разборы рабочая с ботом»
```

## [ПОДТВЕРЖДЕНО] Parent OWNER router

- active: `true`;
- узлов: `24`;
- Telegram Trigger: `1`;
- credential Trigger: `Telegram OWNER_RAZBOR_BOT`;
- вызов OWNER RAZBOR CHAT: `1`;
- чтения entry layer используют `executeOnce + alwaysOutputData`;
- прежний обрыв на пустом листе `Владельцы` устранён архитектурно.

## [ПОДТВЕРЖДЕНО] OWNER RAZBOR CHAT

- active: `true`;
- узлов: `22`;
- Telegram Trigger: `0`;
- Execute Sub-workflow Trigger: `1`;
- Telegram action-узлов: `5`;
- Telegram credential: `Telegram OWNER_RAZBOR_BOT`;
- Google Sheets credential: `Google Sheets OAuth2 API`.

Чат использует только OWNER-таблицу `AS-OWNER-RAZBOR-SALES-MVP` и листы:

```text
Владельцы
Операторы
Диалоги_OWNER_BOT
Операторские_Сообщения
Логи
```

## [РЕАЛИЗОВАНО]

- личные сообщения собственников направляются в отдельную OWNER-группу;
- зарегистрированный собственник определяется по `telegram_chat_id`;
- собственник получает подтверждение от бота;
- оператор отвечает через `/send_owner owner_id текст`;
- команда принимается только из подтверждённой OWNER-группы;
- оператор проверяется по листу `Операторы`, статусу `active` и праву `can_send_owner`;
- получатель определяется по `owner_id`, произвольный `chat_id` не принимается;
- входящие, исходящие, успешные отправки и ошибки журналируются.

## [ПОДТВЕРЖДЕНО] Batman не затронут

```text
AS-BOT__00_MAIN_ROUTER
workflow_id: fw0azBkY7IwZzhW2
credential: Telegram account 2
```

Workflow проверен до и после публикации OWNER-чата и не изменился.

## [ТЕХНИЧЕСКИЙ ИНЦИДЕНТ И ВОССТАНОВЛЕНИЕ]

Первая попытка подключения получила штатный отказ n8n: parent не может ссылаться на неопубликованный sub-workflow. Новый OWNER-chat был создан как draft, parent production не был опубликован.

После проверки partial state выполнен правильный порядок:

```text
1. Опубликован OWNER RAZBOR CHAT.
2. Повторно опубликован parent OWNER router.
3. Проверены active-state, количество Trigger и Batman-контроль.
```

Итоговая публикация успешна.

## [BACKUP]

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_RAZBOR_CHAT/20260715_113657/
```

В папке находятся backup parent до завершения публикации, metadata, redacted previews и redacted live exports.

Точечные backup и redacted active exports после live-тестов:

```text
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_114816/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_115818/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_120517/
03_N8N_WORKFLOWS/_LIVE_BACKUP_BEFORE_OWNER_BOT_ENTRY_AND_TEST_LINK/20260715_122408/
```

## [ПОДТВЕРЖДЕНО] Live-тест входящего сообщения

Контрольный тест подтверждён executions:

```text
parent OWNER: 368, success
OWNER RAZBOR CHAT: 369, success
route: owner_chat
```

Подтверждены:

- сообщение получено единственным OWNER Telegram Trigger;
- вызван отдельный OWNER RAZBOR CHAT;
- зеркало отправлено в группу `Разборы рабочая с ботом`;
- личный ответ отправлен через `@Akademya_Strateg_bot`;
- записаны входящий диалог, событие и исходящий ответ;
- Telegram `message_id` исходящего ответа присутствует в журнале.

Тестовый пользователь ещё не зарегистрирован через валидный deep-link, поэтому штатно получил сообщение об открытии персональной ссылки Бэтмана.

## [ПОДТВЕРЖДЕНО] Исправления по результатам live-теста

1. Telegram отклонял служебный текст с `owner_id` как незакрытую Markdown-сущность. Для пяти OWNER Telegram action-узлов включён HTML-режим с экранированием динамического текста.
2. Telegram возвращает отправленное сообщение внутри `result`. Журналирование исправлено на чтение `result.message_id` для ответа бота и ответа оператора.
3. Временный лимит записи Google Sheets не должен блокировать Telegram. Восемь журнальных узлов переведены в `continueRegularOutput`.
4. Автоматический retry append-записей дал дубли тестовых строк и был отключён как неидемпотентный. Дубли диагностического теста не удалялись без отдельного разрешения.

Финальная версия active; `versionId` совпадает с `activeVersionId`. Количество workflow осталось `10`. Parent OWNER и Batman-workflow не изменены.

## [НЕ ПРОВЕРЕНО]

- ответ оператора через `/send_owner`;
- повторные тесты entry layer D, B и C.

## [СЛЕДУЮЩИЙ ШАГ]

Проверить зарегистрированного собственника и операторский ответ:

```text
/start owner_from_btm_XXXXXX
→ получить owner_id
→ /send_owner owner_id тестовый ответ
```

Для deep-link использовать только подтверждённый валидный `btm_id`.

## [БЕЗОПАСНОСТЬ]

Реальные token, API key, OAuth secret и credential values не выводились и не сохранялись в проекте.
