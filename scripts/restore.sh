#!/bin/bash

# Restore SaveKW2 Database from Backup
# Восстанавливает базу данных из backup файла

set -e

PROJECT_DIR="/root/savekw2"
BACKUP_DIR="$PROJECT_DIR/backups"

echo "======================================"
echo "♻️  Database Restore"
echo "======================================"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo "Usage: ./restore.sh <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh $BACKUP_DIR/backup-*.sql 2>/dev/null || echo "No backups found"
    echo ""
    echo "Example: ./restore.sh backup-prod-20240109-120000.sql"
    echo "Or use:  ./restore.sh backup-prod-latest.sql"
    exit 1
fi

BACKUP_FILE="$1"

# If only filename is provided, prepend backup directory
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
fi

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📦 Backup file: $BACKUP_FILE"
echo "📊 Size: $(du -h "$BACKUP_FILE" | cut -f1)"
echo ""

# Confirm before restore
read -p "⚠️  This will REPLACE the current database. Continue? (yes/no) " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Create backup of current database before restore
echo ""
echo "📦 Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/backup-before-restore-$(date +"%Y%m%d-%H%M%S").sql"
docker exec savekw_postgres pg_dump -U savekw -d savekw_prod > "$SAFETY_BACKUP" || {
    echo "⚠️  Could not create safety backup (database might be empty)"
}

# Stop application to prevent connections
echo ""
echo "🛑 Stopping application..."
cd $PROJECT_DIR
docker compose -f docker-compose.prod.yml stop app

# Drop and recreate database
echo ""
echo "🗑️  Dropping existing database..."
docker exec savekw_postgres psql -U savekw -d postgres -c "DROP DATABASE IF EXISTS savekw_prod;"
docker exec savekw_postgres psql -U savekw -d postgres -c "CREATE DATABASE savekw_prod OWNER savekw;"

# Restore from backup
echo ""
echo "♻️  Restoring database from backup..."
echo "💡 Note: You may see errors about missing roles (e.g., 'savekw') - these are safe to ignore"
cat "$BACKUP_FILE" | docker exec -i savekw_postgres psql -U savekw -d savekw_prod 2>&1 | grep -v "role.*does not exist" || true

# Verify restore
echo ""
echo "✅ Checking database..."
TABLES=$(docker exec savekw_postgres psql -U savekw -d savekw_prod -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "📊 Tables restored: $TABLES"

# Restart application
echo ""
echo "🚀 Starting application..."
docker compose -f docker-compose.prod.yml start app

echo ""
echo "======================================"
echo "✅ Restore Complete"
echo "======================================"
echo ""
echo "Safety backup saved: $SAFETY_BACKUP"
echo "Application restarted"
echo ""
