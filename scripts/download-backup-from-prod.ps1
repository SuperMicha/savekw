# Download Database Backup from Production Server
# Скачує останній backup з продакшн сервера

param(
    [string]$Server = "useradmin.savekw.tech",
    [string]$User = "root",
    [string]$BackupName = "backup-prod-latest.sql"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Download Backup from Production ===" -ForegroundColor Cyan
Write-Host ""

# Paths
$RemoteBackupPath = "/root/savekw2/backups/$BackupName"
$LocalBackupDir = "backups"
$LocalBackupPath = Join-Path $LocalBackupDir $BackupName

# Create local backup directory if not exists
if (!(Test-Path $LocalBackupDir)) {
    Write-Host "📁 Creating backup directory: $LocalBackupDir" -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $LocalBackupDir | Out-Null
}

Write-Host "📥 Downloading backup from $Server..." -ForegroundColor Yellow
Write-Host "   Remote: $RemoteBackupPath" -ForegroundColor Gray
Write-Host "   Local:  $LocalBackupPath" -ForegroundColor Gray
Write-Host ""

# Download backup using SCP
try {
    scp "${User}@${Server}:${RemoteBackupPath}" $LocalBackupPath
    
    if (Test-Path $LocalBackupPath) {
        $Size = (Get-Item $LocalBackupPath).Length / 1MB
        Write-Host ""
        Write-Host "✅ Backup downloaded successfully!" -ForegroundColor Green
        Write-Host "   File: $LocalBackupPath" -ForegroundColor White
        Write-Host "   Size: $($Size.ToString('F2')) MB" -ForegroundColor White
        Write-Host ""
        
        # List available backups
        Write-Host "📋 Available backups locally:" -ForegroundColor Yellow
        Get-Item "backups\backup-*.sql" 2>$null | ForEach-Object {
            $size = $_.Length / 1MB
            Write-Host "   - $($_.Name) ($($size.ToString('F2')) MB)" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Download failed!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error downloading backup:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next step: Use 'restore-local-db.ps1' to restore this backup locally" -ForegroundColor Cyan
