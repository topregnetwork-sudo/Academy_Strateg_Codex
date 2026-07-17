[CmdletBinding()]
param(
    [ValidateRange(30, 86400)]
    [int]$PollSeconds = 120,

    [switch]$Once,

    [switch]$DryRun,

    [string]$RemoteUrl = 'https://github.com/topregnetwork-sudo/Academy_Strateg_Codex.git',

    [ValidatePattern('^[A-Za-z0-9._/-]+$')]
    [string]$Branch = 'main'
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RuntimeRoot = Join-Path $PSScriptRoot '.runtime'
$RepoPath = Join-Path $RuntimeRoot 'repo'
$StatePath = Join-Path $RuntimeRoot 'state.txt'
$CompletedHistoryPath = Join-Path $RuntimeRoot 'completed_sha_history.txt'
$AttemptedHistoryPath = Join-Path $RuntimeRoot 'attempted_sha_history.txt'
$LogPath = Join-Path $RuntimeRoot 'worker.log'
$LockPath = Join-Path $RuntimeRoot 'worker.lock'
$LastMessagePath = Join-Path $RuntimeRoot 'last_codex_message.txt'
$TaskRelativePaths = @('00_CONTROL/ACTIVE_TASK.md', '00_CONTROL/NEXT_TASK.md')

New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null

function Write-WorkerLog {
    param([string]$Message)
    $line = '{0} {1}' -f ([DateTime]::UtcNow.ToString('o')), $Message
    Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
    Write-Host $line
}

function Resolve-Executable {
    param([string]$Name, [string]$Fallback)
    $command = Get-Command $Name -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    if ($Fallback -and (Test-Path -LiteralPath $Fallback)) { return $Fallback }
    throw "Required executable not found: $Name"
}

$Git = Resolve-Executable -Name 'git' -Fallback 'C:\Users\admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'

function Invoke-Git {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Arguments)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $Git -C $RepoPath @Arguments 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    foreach ($line in $output) { Write-Host $line }
    if ($exitCode -ne 0) {
        throw "Git command failed with exit code $exitCode"
    }
}

function Read-State {
    $state = @{}
    if (Test-Path -LiteralPath $StatePath) {
        foreach ($line in Get-Content -LiteralPath $StatePath -Encoding UTF8) {
            if ($line -match '^([^=]+)=(.*)$') { $state[$matches[1]] = $matches[2] }
        }
    }
    return $state
}

function Write-State {
    param([string]$TaskHash, [string]$TaskPath, [string]$Status, [switch]$Completed)
    $state = Read-State
    $state['last_attempted_sha'] = $TaskHash
    $state['last_task_path'] = $TaskPath
    $state['last_status'] = $Status
    $state['updated_at'] = [DateTime]::UtcNow.ToString('o')
    if ($Completed) { $state['last_completed_sha'] = $TaskHash }

    @('last_completed_sha', 'last_attempted_sha', 'last_task_path', 'last_status', 'updated_at') |
        ForEach-Object {
            if ($state.ContainsKey($_)) { $_ + '=' + $state[$_] }
        } | Set-Content -LiteralPath $StatePath -Encoding UTF8
}

function Test-HashKnown {
    param([string]$HistoryPath, [string]$TaskHash)
    if (-not (Test-Path -LiteralPath $HistoryPath)) { return $false }
    return @((Get-Content -LiteralPath $HistoryPath -Encoding UTF8) | Where-Object { $_ -ceq $TaskHash }).Count -gt 0
}

function Add-HashOnce {
    param([string]$HistoryPath, [string]$TaskHash)
    if (-not (Test-HashKnown -HistoryPath $HistoryPath -TaskHash $TaskHash)) {
        Add-Content -LiteralPath $HistoryPath -Value $TaskHash -Encoding UTF8
    }
}

function Test-TaskCompleted {
    param([string[]]$TaskLines)
    $statusRu = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('0KHQotCQ0KLQo9Ch'))
    $completedRu = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('0LLRi9C/0L7Qu9C90LXQvdC+'))

    for ($index = 0; $index -lt $TaskLines.Count; $index++) {
        $line = $TaskLines[$index]
        $isStatusLabel = $line -match '(?i)^\s*#*\s*\[?status\]?' -or
            $line.IndexOf($statusRu, [StringComparison]::OrdinalIgnoreCase) -ge 0
        if (-not $isStatusLabel) { continue }

        $lastIndex = [Math]::Min($TaskLines.Count - 1, $index + 3)
        for ($valueIndex = $index; $valueIndex -le $lastIndex; $valueIndex++) {
            $valueLine = $TaskLines[$valueIndex]
            if ($valueLine -match '(?i)\b(completed|done)\b' -or
                $valueLine.IndexOf($completedRu, [StringComparison]::OrdinalIgnoreCase) -ge 0) {
                return $true
            }
        }
    }
    return $false
}

function Test-AllowedPath {
    param([string]$Path)
    $normalized = $Path.Replace('\', '/')
    return $normalized -match '^(00_CONTROL|00_START_HERE|01_CONTEXT|02_STABLE_DATA|06_REPORTS|07_CURRENT_TASKS|10_ARCHITECTURE|tools)/' -or
        $normalized -in @('.gitignore', 'README.md', 'AGENTS.md')
}

function Test-SecretRisk {
    param([string[]]$Paths)

    $secretNamePattern = '(?i)(^|/)(\.env($|\.)|credentials?|secrets?|tokens?)(/|$)|(?i)(service-account|oauth|private[-_ ]?key)|(?i)\.(pem|key|p12|pfx)$'
    $privateKeyMarker = '-----BEGIN ' + '[A-Z ]*' + 'PRIVATE KEY-----'
    $secretContentPattern = '(?i)(api[_ -]?key|client_secret|access_token|refresh_token|password)\s*[:=]|' + $privateKeyMarker + '|AIza[0-9A-Za-z_-]{20,}|[0-9]{8,10}:[A-Za-z0-9_-]{30,}'
    $textExtensions = @('.md', '.txt', '.ps1', '.js', '.gs', '.html', '.css', '.toml', '.yml', '.yaml', '.xml')

    foreach ($path in $Paths) {
        $normalized = $path.Replace('\', '/')
        if ($normalized -match $secretNamePattern) {
            Write-WorkerLog "BLOCKED secret-like filename: $normalized"
            return $true
        }

        $fullPath = Join-Path $RepoPath $path
        if (-not (Test-Path -LiteralPath $fullPath -PathType Leaf)) { continue }
        $item = Get-Item -LiteralPath $fullPath
        if ($item.Length -gt 5MB -or $item.Extension.ToLowerInvariant() -notin $textExtensions) { continue }
        $content = Get-Content -LiteralPath $fullPath -Encoding UTF8 -Raw
        if ($content -match $secretContentPattern) {
            Write-WorkerLog "BLOCKED secret-like content in: $normalized"
            return $true
        }
    }
    return $false
}

function Ensure-Checkout {
    if (Test-Path -LiteralPath (Join-Path $RepoPath '.git')) { return }
    if (Test-Path -LiteralPath $RepoPath) {
        throw 'Runtime repo exists without .git; manual inspection required.'
    }
    Write-WorkerLog 'LIGHT WATCHER: creating isolated checkout.'
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $output = @(& $Git clone --branch $Branch --single-branch -- $RemoteUrl $RepoPath 2>&1)
        $exitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    foreach ($line in $output) { Write-Host $line }
    if ($exitCode -ne 0) { throw "Git clone failed with exit code $exitCode" }
}

function Get-LightWatcherDecision {
    Ensure-Checkout

    $dirtyBefore = @(& $Git -C $RepoPath status --porcelain)
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect checkout.' }
    if ($dirtyBefore.Count -gt 0) {
        throw 'Runtime checkout is dirty; watcher will not pull or overwrite unfinished work.'
    }

    $aheadText = (& $Git -C $RepoPath rev-list --count '@{u}..HEAD').Trim()
    if ($LASTEXITCODE -ne 0) { throw 'Unable to inspect unpushed commits.' }
    if ([int]$aheadText -gt 0) { throw 'Runtime checkout contains unpushed commits.' }

    Write-WorkerLog 'LIGHT WATCHER: git pull --ff-only.'
    Invoke-Git pull --ff-only origin $Branch

    $trustedMarker = '[CHATGPT' + [char]0x2192 + 'CODEX]'
    foreach ($taskRelativePath in $TaskRelativePaths) {
        $taskPath = Join-Path $RepoPath $taskRelativePath
        if (-not (Test-Path -LiteralPath $taskPath -PathType Leaf)) { continue }

        $taskHash = (Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if (Test-HashKnown -HistoryPath $CompletedHistoryPath -TaskHash $taskHash) { continue }
        if (Test-HashKnown -HistoryPath $AttemptedHistoryPath -TaskHash $taskHash) { continue }

        $taskText = Get-Content -LiteralPath $taskPath -Encoding UTF8 -Raw
        $taskLines = @($taskText -split "`r?`n")
        $hasTrustedMarker = @($taskLines | Where-Object { $_.Trim() -ceq $trustedMarker }).Count -gt 0
        if (-not $hasTrustedMarker) { continue }

        if (Test-TaskCompleted -TaskLines $taskLines) {
            Add-HashOnce -HistoryPath $CompletedHistoryPath -TaskHash $taskHash
            Write-State -TaskHash $taskHash -TaskPath $taskRelativePath -Status 'completed_before_run' -Completed
            continue
        }

        return [pscustomobject]@{
            ShouldRun = $true
            TaskPath = $taskRelativePath
            TaskHash = $taskHash
            TaskText = $taskText
        }
    }

    return [pscustomobject]@{
        ShouldRun = $false
        TaskPath = ''
        TaskHash = ''
        TaskText = ''
    }
}

function Invoke-CodexExecLayer {
    param([Parameter(Mandatory = $true)]$Decision)

    Add-HashOnce -HistoryPath $AttemptedHistoryPath -TaskHash $Decision.TaskHash
    Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'codex_started'

    $codex = Resolve-Executable -Name 'codex' -Fallback 'C:\Users\admin\.codex\plugins\.plugin-appserver\codex.exe'
    $prompt = @"
You are the local autonomous Codex worker for Academy_Strateg_Codex.

Read AGENTS.md and then, before any task action, read:
00_START_HERE/00_PROJECT_INDEX.md
01_CONTEXT/01_MAIN_GOAL.md
02_STABLE_DATA/02_STABLE_CONTEXT.md
07_CURRENT_TASKS/CURRENT_TASK.md
00_CONTROL/AUTONOMOUS_WORKER_PROTOCOL.md
00_CONTROL/DO_NOT_BREAK.md

Execute only $($Decision.TaskPath). Do not analyze the whole project beyond the context required by AGENTS.md and that task. When finished, mark the selected task completed. For any action requiring user confirmation or unavailable access, do not perform it. Instead update 00_CONTROL/DECISION_REQUIRED.md, 00_CONTROL/CODEX_REPORT.md, 00_CONTROL/TO_CHATGPT.md, and 00_CONTROL/AUTONOMOUS_WORKER_STATUS.md with the exact blocker and one next step.

Never read C:\Users\admin\.secrets. Never print or store credentials. Never deploy, modify production, perform bulk data changes, use destructive Git, expand access, or bypass approvals. Do not commit or push; the wrapper validates and performs Git operations. Do not change files outside the allowlist in AUTONOMOUS_WORKER_PROTOCOL.md. Verify safe local changes before returning.
"@

    Write-WorkerLog ('CODEX EXEC: starting task ' + $Decision.TaskPath + ' sha=' + $Decision.TaskHash)
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        & $codex exec --ephemeral --sandbox workspace-write -c 'approval_policy="never"' -C $RepoPath -o $LastMessagePath $prompt
        $codexExitCode = $LASTEXITCODE
    } finally {
        $ErrorActionPreference = $previousPreference
    }
    if ($codexExitCode -ne 0) {
        Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'codex_failed'
        throw "Codex exec failed with exit code $codexExitCode. The same SHA will not retry automatically."
    }

    $changed = @(& $Git -C $RepoPath diff --name-only)
    $changed += @(& $Git -C $RepoPath ls-files --others --exclude-standard)
    $changed = @($changed | Where-Object { $_ } | Sort-Object -Unique)
    if ($changed.Count -eq 0) {
        Add-HashOnce -HistoryPath $CompletedHistoryPath -TaskHash $Decision.TaskHash
        Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'no_changes' -Completed
        Write-WorkerLog 'CODEX EXEC: complete with no repository changes; no commit or push.'
        return
    }

    foreach ($path in $changed) {
        if (-not (Test-AllowedPath -Path $path)) {
            Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'blocked_path'
            throw "Change outside allowlist: $path"
        }
    }
    if (Test-SecretRisk -Paths $changed) {
        Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'blocked_secret_scan'
        throw 'Secret scan blocked commit. Values were not printed.'
    }

    Invoke-Git add --all
    & $Git -C $RepoPath diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Add-HashOnce -HistoryPath $CompletedHistoryPath -TaskHash $Decision.TaskHash
        Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'no_staged_changes' -Completed
        Write-WorkerLog 'CODEX EXEC: no staged changes; no commit or push.'
        return
    }
    if ($LASTEXITCODE -ne 1) { throw 'Unable to inspect staged changes.' }

    $taskId = 'AUTONOMOUS_TASK'
    if ($Decision.TaskText -match '(?m)^\s*`?(AS-[A-Z0-9_-]+)`?\s*$') { $taskId = $matches[1] }
    Invoke-Git -c user.name='Codex Autonomous Worker' -c user.email='codex-worker@users.noreply.github.com' commit -m ("Worker: " + $taskId)
    Invoke-Git push origin $Branch

    Add-HashOnce -HistoryPath $CompletedHistoryPath -TaskHash $Decision.TaskHash
    Write-State -TaskHash $Decision.TaskHash -TaskPath $Decision.TaskPath -Status 'pushed' -Completed
    Write-WorkerLog ('CODEX EXEC: pushed task ' + $taskId)
}

$lockStream = $null
try {
    $lockStream = [System.IO.File]::Open($LockPath, 'OpenOrCreate', 'ReadWrite', 'None')
    do {
        try {
            $decision = Get-LightWatcherDecision
            if (-not $decision.ShouldRun) {
                Write-WorkerLog 'LIGHT WATCHER: no new task; exit without codex exec, commit or push.'
            } elseif ($DryRun) {
                Write-WorkerLog ('LIGHT WATCHER DRY RUN: new task detected sha=' + $decision.TaskHash)
            } else {
                Invoke-CodexExecLayer -Decision $decision
            }
        } catch {
            Write-WorkerLog ('BLOCKED: ' + $_.Exception.Message)
            if ($Once) { throw }
        }

        if (-not $Once) {
            Write-WorkerLog ("LIGHT WATCHER: sleeping for $PollSeconds seconds.")
            Start-Sleep -Seconds $PollSeconds
        }
    } while (-not $Once)
} finally {
    if ($lockStream) { $lockStream.Dispose() }
}
