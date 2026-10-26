# Restore Database Locally from Backup
# Відновлює локальну БД з бекапу

param(
    [string]$BackupFile = "backup-prod-latest.sql",
    [string]$ContainerName = "savekw-postgres-1",
    [string]$DbUser = "savekw",
    [string]$DbName = "savekw_local",
    [string]$DbPassword = "savekw_dev_password"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Restore Database Locally ===" -ForegroundColor Cyan
Write-Host ""

# Full path to backup file
$BackupPath = if ([System.IO.Path]::IsPathRooted($BackupFile)) {
    $BackupFile
} else {
    Join-Path "backups" $BackupFile
}

# Check if backup file exists
if (!(Test-Path $BackupPath)) {
    Write-Host "❌ Backup file not found: $BackupPath" -ForegroundColor Red
    Write-Host ""
    Write-Host "Available backups:" -ForegroundColor Yellow
    Get-Item "backups\backup-*.sql" 2>$null | ForEach-Object {
        Write-Host "   - $($_.Name)" -ForegroundColor Gray
    }
    exit 1
}

$BackupSize = (Get-Item $BackupPath).Length / 1MB
Write-Host "📦 Backup file: $BackupPath" -ForegroundColor White
Write-Host "   Size: $($BackupSize.ToString('F2')) MB" -ForegroundColor Gray
Write-Host ""

# Check if Docker container exists
Write-Host "🔍 Checking Docker container: $ContainerName" -ForegroundColor Yellow
$Container = docker ps -a --format "{{.Names}}" | Select-String $ContainerName

if (!$Container) {
    Write-Host "❌ Container not found: $ContainerName" -ForegroundColor Red
    Write-Host ""
    Write-Host "Running containers:" -ForegroundColor Yellow
    docker ps --format "table {{.Names}}\t{{.Status}}" | Select-Object -Skip 1 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
    
    Write-Host ""
    Write-Host "💡 Make sure Docker is running and postgres container is started:" -ForegroundColor Cyan
    Write-Host "   docker-compose up -d" -ForegroundColor White
    exit 1
}

Write-Host "✅ Container found and running" -ForegroundColor Green
Write-Host ""

# Confirm restore
Write-Host "⚠️  WARNING:" -ForegroundColor Yellow
Write-Host "   This will REPLACE the current local database with backup data" -ForegroundColor White
Write-Host "   Current database will be saved as 'backup-before-restore-*.sql'" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "Cancelled" -ForegroundColor Yellow
    exit 0
}

# Create safety backup of current database
Write-Host ""
Write-Host "📦 Creating safety backup of current database..." -ForegroundColor Yellow
$SafetyBackup = "backups/backup-before-restore-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"

try {
    $env:PGPASSWORD = $DbPassword
    
    # Try to dump current database
    docker exec $ContainerName `
        pg_dump -U $DbUser -d $DbName `
        | Out-File -Encoding UTF8 $SafetyBackup
    
    $SafetySize = (Get-Item $SafetyBackup).Length / 1MB
    Write-Host "✅ Safety backup created: $SafetyBackup ($($SafetySize.ToString('F2')) MB)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not create safety backup (database might be empty): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Drop existing database
Write-Host ""
Write-Host "🗑️  Dropping existing database..." -ForegroundColor Yellow

try {
    docker exec $ContainerName `
        psql -U $DbUser -d postgres -c "DROP DATABASE IF EXISTS $DbName;"
    
    Write-Host "✅ Database dropped" -ForegroundColor Green
} catch {
    Write-Host "❌ Error dropping database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Create new database
Write-Host ""
Write-Host "🆕 Creating new database..." -ForegroundColor Yellow

try {
    docker exec $ContainerName `
        psql -U $DbUser -d postgres -c "CREATE DATABASE $DbName OWNER $DbUser;"
    
    Write-Host "✅ Database created" -ForegroundColor Green
} catch {
    Write-Host "❌ Error creating database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Restore from backup
Write-Host ""
Write-Host "♻️  Restoring database from backup..." -ForegroundColor Yellow

try {
    $env:PGPASSWORD = $DbPassword
    
    Get-Content $BackupPath | docker exec -i $ContainerName `
        psql -U $DbUser -d $DbName 2>&1 | `
        Where-Object { $_ -notmatch "role.*does not exist" } | Out-Null
    
    Write-Host "✅ Database restored" -ForegroundColor Green
} catch {
    Write-Host "❌ Error restoring database: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Verify restore
Write-Host ""
Write-Host "✅ Checking restored database..." -ForegroundColor Yellow

try {
    $env:PGPASSWORD = $DbPassword
    
    $TableCount = docker exec $ContainerName `
        psql -U $DbUser -d $DbName -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | `
        ForEach-Object { $_.Trim() }
    
    Write-Host "   📊 Tables restored: $TableCount" -ForegroundColor Green
    
    $RecordCount = docker exec $ContainerName `
        psql -U $DbUser -d $DbName -t -c "SELECT SUM(n_live_tup) FROM pg_stat_user_tables;" | `
        ForEach-Object { $_.Trim() }
    
    Write-Host "   📊 Total records: $RecordCount" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Could not verify database: $($_.Exception.Message)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host "✅ Database Restore Complete!" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✨ Your local database is now ready!" -ForegroundColor Yellow
Write-Host "   You can start the application with: docker-compose up" -ForegroundColor White
Write-Host ""
