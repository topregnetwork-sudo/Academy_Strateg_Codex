# Codex Autonomous Worker

Локальный polling-worker для репозитория `topregnetwork-sudo/Academy_Strateg_Codex`.

## Что он делает

1. Использует отдельный checkout в `.runtime/repo`.
2. Периодически выполняет fast-forward-only синхронизацию `main`.
3. Читает `00_CONTROL/ACTIVE_TASK.md`.
4. Запускает новую задачу через `codex exec` с `workspace-write`.
5. Проверяет пути и секреты.
6. Коммитит и пушит безопасный результат.
7. Не повторяет один и тот же hash задачи.

`.runtime/` находится в `.gitignore`; локальные state, lock, checkout и логи не отправляются в GitHub.

## Предварительные условия

- `git` доступен и Git Credential Manager уже авторизован для репозитория;
- `codex` доступен и локальная авторизация Codex действует;
- `ACTIVE_TASK.md` соответствует протоколу;
- никто не меняет runtime checkout вручную.

Worker не читает файлы из `C:\Users\admin\.secrets` и не принимает секреты через параметры.

## Безопасная проверка одного цикла

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\codex_autonomous_worker\start_worker.ps1 -Once -DryRun
```

Dry-run создаёт/синхронизирует отдельный checkout и проверяет задачу, но не запускает Codex, не коммитит и не пушит.

## Один рабочий цикл

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\codex_autonomous_worker\start_worker.ps1 -Once
```

## Постоянный foreground-режим

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\codex_autonomous_worker\start_worker.ps1 -PollSeconds 300
```

Окно PowerShell должно оставаться открытым. Регистрация Windows Scheduled Task является отдельным постоянным изменением системы и этим этапом автоматически не выполняется.

## Когда worker остановится

- checkout содержит незавершённые изменения;
- `git pull --ff-only` невозможен;
- задача не содержит `[CHATGPT→CODEX]`;
- задача уже выполнена или hash уже обработан;
- Codex требует недоступное подтверждение;
- изменён путь вне allowlist;
- обнаружен файл/содержимое с признаками секрета;
- тест или Codex-run завершился ошибкой;
- commit или push не удался.

Подробные правила: `00_CONTROL/AUTONOMOUS_WORKER_PROTOCOL.md`.
