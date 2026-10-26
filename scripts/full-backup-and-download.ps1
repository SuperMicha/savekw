# Full Backup and Download in One Script
# Отримати backup з сервера і розгорнути локально за один клік

param(
    [string]$Server = "useradmin.savekw.tech",
    [string]$User = "root",
    [switch]$RestoreImmediately = $false
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Full Backup & Download from Production   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create backup on server
Write-Host "Step 1/3: Creating backup on production server..." -ForegroundColor Yellow
Write-Host "Server: $Server" -ForegroundColor Gray
Write-Host ""

try {
    $BackupScript = ssh ${User}@${Server} "cd /root/savekw2 && ./scripts/backup.sh 2>&1"
    Write-Host $BackupScript -ForegroundColor White
} catch {
    Write-Host "❌ Error creating backup on server: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 2: Download backup
Write-Host "Step 2/3: Downloading backup to local machine..." -ForegroundColor Yellow
Write-Host ""

& "$ScriptDir\download-backup-from-prod.ps1" -Server $Server -User $User

Write-Host ""

# Step 3: Optionally restore immediately
if ($RestoreImmediately) {
    Write-Host "Step 3/3: Restoring database locally..." -ForegroundColor Yellow
    Write-Host ""
    
    & "$ScriptDir\restore-local-db.ps1" -BackupFile "backup-prod-latest.sql"
} else {
    Write-Host "Step 3/3: Ready for local restore" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To restore the database locally, run:" -ForegroundColor Cyan
    Write-Host "   .\scripts\restore-local-db.ps1" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use:" -ForegroundColor Cyan
    Write-Host "   .\scripts\full-backup-and-download.ps1 -RestoreImmediately" -ForegroundColor White
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║               ALL DONE!                    ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
