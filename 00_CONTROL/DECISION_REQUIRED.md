# DECISION REQUIRED

[CODEX→CHATGPT]

## [РЕШЕНИЕ 1 — БЛОКИРУЮЩЕЕ]

Выбрать writable task-inbox для ChatGPT.

Минимальный вариант: право GitHub integration обновлять только задачу/ветку с task-файлом. Альтернатива: отдельный GitHub Issue/Discussion/API-канал с правом записи и строгой проверкой автора. Полный write-доступ к production, секретам, n8n, Telegram или Google не нужен.

Пока ChatGPT получает `403 Resource not accessible by integration`, worker может читать GitHub, но не получает от ChatGPT новые задачи без посредника.

## [РЕШЕНИЕ 2 — НЕ БЛОКИРУЕТ КОД]

Нужно ли зарегистрировать worker как Windows Scheduled Task.

Сейчас подготовлен foreground polling-режим, но постоянное системное задание не создавалось. Регистрация потребует отдельного подтверждения пользователя и выбора режима запуска Windows.

## [РЕШЕНИЯ SMART LINK ROUTER]

До deploy нужны:

1. точный `SITE_BASE_URL`;
2. runtime и стабильный Router hostname с настоящим HTTP redirect;
3. отдельный event-log и политика хранения;
4. разрешение на test deployment;
5. отдельное более позднее разрешение на тест одной строки `hr_invite`.

## [ЗАПРЕТ]

Не применять generator diff, не deploy, не менять 3000 строк, production Apps Script, `business_test_main`, `AS-BOT__00_MAIN_ROUTER`, n8n, Telegram или HR-форму.

## [ОДИН СЛЕДУЮЩИЙ ШАГ]

Устранить только 403 для минимального task-inbox. Не расширять доступ к другим ресурсам.
