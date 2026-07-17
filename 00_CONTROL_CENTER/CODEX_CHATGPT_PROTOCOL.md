# CODEX ↔ CHATGPT PROTOCOL

## 1. Перед любым этапом Codex обязан

1. Прочитать:
   - 00_CONTROL_CENTER/CURRENT_STAGE.md
   - 00_CONTROL_CENTER/CURRENT_DECISIONS.md
   - 00_CONTROL_CENTER/DO_NOT_TOUCH.md
   - 07_CURRENT_TASKS/CURRENT_TASK.md

2. Создать backup, если этап меняет live workflow или live sheets.

3. Не выполнять live patch, если:
   - непонятен текущий этап;
   - есть конфликт с DO_NOT_TOUCH;
   - нужен новый credential;
   - нужен внешний API;
   - нужно удалить данные;
   - нужно отправить массовые сообщения.

## 2. После каждого этапа Codex обязан

1. Создать отчёт в:
   06_REPORTS/

2. Обновить:
   - 00_CONTROL_CENTER/LAST_REPORT_POINTER.md
   - 00_CONTROL_CENTER/CURRENT_STAGE.md
   - 00_CONTROL_CENTER/NEXT_ACTION.md
   - 00_CONTROL_CENTER/CHANGELOG.md
   - 07_CURRENT_TASKS/CURRENT_TASK.md

3. В отчёте обязательно дать:
   - что подтверждено;
   - что изменено;
   - какие тесты;
   - execution id;
   - какие workflow не трогали;
   - риски;
   - один следующий шаг.

## 3. Формат связи

Codex не пишет длинные рассуждения.
Codex даёт ChatGPT-стратегу короткий отчёт:

[ЭТАП]
[ПОДТВЕРЖДЕНО]
[ИЗМЕНЕНО]
[ТЕСТЫ]
[НЕ ТРОГАЛИ]
[РИСКИ]
[СЛЕДУЮЩИЙ ШАГ]

## 4. Кто принимает решение

Codex проверяет и внедряет.
ChatGPT-стратег принимает решение о следующем этапе.
Максим утверждает спорные бизнес-решения.
