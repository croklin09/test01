# Registra la auditoria semanal de Claude Code en el Programador de tareas de Windows.
# Corre todos los viernes 18:00 (hora local de la PC; debe estar en America/Argentina/Buenos_Aires).
# Uso (PowerShell, usuario lucho, sin admin):
#   powershell -ExecutionPolicy Bypass -File .\registrar-auditoria-semanal.ps1
# Solo hace falta si NO usas la tarea programada de la app Claude Desktop.

$ErrorActionPreference = 'Stop'

$claude = (Get-Command claude -ErrorAction Stop).Source
$logDir = Join-Path $env:USERPROFILE '.claude\logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Herramientas permitidas en modo headless: lectura + git log + escritura (la skill limita
# la escritura al archivo de salida en el vault).
$allowed = 'Read,Glob,Grep,Write,Bash(git log:*),Bash(git -C:*),Bash(powershell:*)'

$cmd = "Set-Location `"$env:USERPROFILE`"; " +
       "& `"$claude`" -p `"/auditoria-semanal`" --allowedTools `"$allowed`" " +
       "*> `"$logDir\auditoria-semanal-`$(Get-Date -Format yyyy-MM-dd).log`""

$action   = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -WindowStyle Hidden -Command $cmd"
$trigger  = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Friday -At 18:00
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RunOnlyIfNetworkAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 1)

Register-ScheduledTask -TaskName 'Claude - Auditoria semanal' `
  -Action $action -Trigger $trigger -Settings $settings `
  -Description 'Corre /auditoria-semanal de Claude Code y guarda el informe en Obsidian' -Force

Write-Host "OK. Proxima ejecucion:" (Get-ScheduledTask 'Claude - Auditoria semanal' | Get-ScheduledTaskInfo).NextRunTime
Write-Host "Probar ahora: Start-ScheduledTask 'Claude - Auditoria semanal'"
