# Codex Autonomous Worker

Локальный двухслойный polling-worker для репозитория `topregnetwork-sudo/Academy_Strateg_Codex`.

## Что он делает

### Слой 1 — LIGHT WATCHER

Каждые 120 секунд:

1. использует отдельный checkout в `.runtime/repo`;
2. выполняет `git pull --ff-only`;
3. читает только `00_CONTROL/ACTIVE_TASK.md` и `00_CONTROL/NEXT_TASK.md`;
4. считает SHA-256 файлов задач;
5. сравнивает SHA с локальной историей выполненных и уже запущенных задач;
6. при отсутствии новой задачи завершает цикл без `codex exec`, анализа проекта, commit и push.

### Слой 2 — CODEX EXEC

Запускается только для новой незавершённой задачи с точной отдельной меткой `[CHATGPT→CODEX]`. Использует `workspace-write`, проверяет пути и секреты, а commit/push выполняет только при реальных безопасных изменениях.

Неудачная попытка того же SHA автоматически не повторяется каждые две минуты. Для повторного запуска task-файл должен быть явно изменён, что создаёт новый SHA.

`.runtime/` находится в `.gitignore`; локальные state, lock, checkout и логи не отправляются в GitHub.

## Предварительные условия

- `git` доступен и Git Credential Manager уже авторизован для репозитория;
- `codex` доступен и локальная авторизация Codex действует;
- `ACTIVE_TASK.md` или `NEXT_TASK.md` соответствует протоколу;
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
powershell -ExecutionPolicy Bypass -File .\tools\codex_autonomous_worker\start_worker.ps1 -PollSeconds 120
```

В foreground-режиме окно PowerShell должно оставаться открытым. Для текущего этапа отдельно разрешена регистрация Windows Scheduled Task ниже.

## Windows Scheduled Task

Для текущего проекта утверждено имя:

`AcademyStrateg_Codex_AutonomousWorker`

Scheduler должен запускать каждые 2 минуты один короткий процесс:

```powershell
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -WindowStyle Hidden -File "C:\Users\admin\Downloads\Academy_Strateg_Codex\tools\codex_autonomous_worker\start_worker.ps1" -Once
```

Параметр `-Once` обязателен: периодичность обеспечивает Windows Scheduler, а lock-файл исключает параллельный экземпляр.

## Когда worker остановится

- checkout содержит незавершённые изменения;
- `git pull --ff-only` невозможен;
- ни одна задача не содержит точную отдельную строку `[CHATGPT→CODEX]`;
- задача уже выполнена или hash уже обработан;
- Codex требует недоступное подтверждение;
- изменён путь вне allowlist;
- обнаружен файл/содержимое с признаками секрета;
- тест или Codex-run завершился ошибкой;
- commit или push не удался.

Подробные правила: `00_CONTROL/AUTONOMOUS_WORKER_PROTOCOL.md`.
