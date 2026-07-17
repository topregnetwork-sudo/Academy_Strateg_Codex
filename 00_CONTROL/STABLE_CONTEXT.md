# STABLE CONTEXT

## [ОПЕРАЦИОННЫЙ ПРОТОКОЛ]

- Текущий чат — операционный терминал проекта.
- Codex пишет отчёты с `[CODEX→CHATGPT]`.
- Архитектор отвечает с `[CHATGPT→CODEX]`.
- После отчёта Codex ждёт решение перед следующим опасным действием.
- Важные факты параллельно фиксируются в `00_CONTROL`.
- Секреты в чат не передаются.

## [ПОДТВЕРЖДЕНО]

- Таблица: `1Master_Batmany_3000_Reestr_ssylok_Form2_Akademiya_Strateg`.
- Лист: `Ссылки_Бэтманов`.
- 3000 уникальных строк `hr_invite` сейчас ведут напрямую в Google Form.
- Формат `link_id`: `btm_XXXXXX_hr_invite`.
- Локальный экспорт содержит функцию `AS_BTM_buildHrInviteUrl_`, которая формирует prefilled Google Form URL.
- `business_test_main` формируется отдельной логикой и не должен меняться.
- Целевой вход Hub: `index.html?ref=btm_XXXXXX&source_id=hr_invite&link_type=hr_invite&click_id=...`.
- Live Apps Script project id: `1l5yny3So7Ybyq-6SSqhPd3T0iIVZwXMb-QP0p4ZTphB6wBVv-vixdU7u`.
- Live-проект: `Проект без названия`, один файл `Код.gs`.
- Live и локальный экспорт совпадают полностью: 542 строки, 17 функций, SHA-256 `ac598a03a33f0a529bf83584717051ca202a3b32639af21710fa739c09cc9e41`.
- Live `AS_BTM_buildHrInviteUrl_` использует `HR_FORM_URL` и шесть полей `entry.*`.
- Router URL в live отсутствует.
- Live-backup создан; diff готов и не применён.
- Протокол моста зафиксирован в `00_CONTROL/BRIDGE_PROTOCOL.md`.

## [НЕ ПОДТВЕРЖДЕНО]

- Публичный URL `AS_Team_Recruiting_Hub`.
- Deployment URL отдельного Smart Link Router.
- Следующее решение архитектора по Router.
