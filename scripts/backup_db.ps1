<#
 PROJ-103: Respaldo diario de PostgreSQL con subida a Google Drive.

 Uso:
   .\scripts\backup_db.ps1                 # respalda y sube a Drive (rclone)
   .\scripts\backup_db.ps1 -SkipUpload     # solo respaldo local
   .\scripts\backup_db.ps1 -Register       # registra tarea programada diaria (02:00)

 Requisitos para la subida: rclone con un remoto de Google Drive configurado
 (`rclone config` -> nombre "gdrive"). Las credenciales viven en rclone, nunca en el repo.
 Nota: el respaldo contiene datos de investigacion; usar una carpeta de Drive restringida.
#>
param(
    [string]$Container = "rag_postgres",
    [string]$DbUser = $(if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "postgres" }),
    [string]$DbName = $(if ($env:POSTGRES_DB) { $env:POSTGRES_DB } else { "university_rag" }),
    [string]$BackupDir = (Join-Path $PSScriptRoot "..\backups"),
    [string]$RcloneRemote = $(if ($env:BACKUP_RCLONE_REMOTE) { $env:BACKUP_RCLONE_REMOTE } else { "gdrive:respaldos_rag" }),
    [int]$RetentionDays = 14,
    [switch]$SkipUpload,
    [switch]$Register
)

$ErrorActionPreference = "Stop"

if ($Register) {
    $action = New-ScheduledTaskAction -Execute "powershell.exe" `
        -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
    $trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
    Register-ScheduledTask -TaskName "RAG_DB_Backup" -Action $action -Trigger $trigger -Force | Out-Null
    Write-Host "Tarea programada 'RAG_DB_Backup' registrada (diaria 02:00)."
    return
}

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null
$stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$file = Join-Path $BackupDir "$DbName`_$stamp.sql.gz"

Write-Host "[1/4] pg_dump de '$DbName' desde el contenedor '$Container'..."
# Se comprime dentro del contenedor para no corromper el binario con la tuberia de PowerShell.
docker exec $Container sh -c "pg_dump -U $DbUser -d $DbName --no-owner | gzip -9 > /tmp/backup.sql.gz"
if ($LASTEXITCODE -ne 0) { throw "pg_dump fallo." }
docker cp "${Container}:/tmp/backup.sql.gz" $file
docker exec $Container rm -f /tmp/backup.sql.gz

if (-not (Test-Path $file) -or (Get-Item $file).Length -lt 200) { throw "El respaldo esta vacio o no se creo." }
Write-Host "[2/4] Respaldo local: $file ($([math]::Round((Get-Item $file).Length/1KB,1)) KB)"

if (-not $SkipUpload) {
    if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
        throw "rclone no esta instalado. Instalelo (winget install Rclone.Rclone) o use -SkipUpload."
    }
    Write-Host "[3/4] Subiendo a $RcloneRemote ..."
    rclone copy $file $RcloneRemote
    if ($LASTEXITCODE -ne 0) { throw "La subida a Google Drive fallo." }
    rclone delete $RcloneRemote --min-age "$($RetentionDays)d" | Out-Null
} else {
    Write-Host "[3/4] Subida omitida (-SkipUpload)."
}

Write-Host "[4/4] Limpiando respaldos locales con mas de $RetentionDays dias..."
Get-ChildItem $BackupDir -Filter "*.sql.gz" |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } | Remove-Item -Force
Write-Host "Respaldo completado."
