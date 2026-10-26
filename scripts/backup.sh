#!/bin/bash

# Backup SaveKW2 Production Database
# Создает backup базы данных с timestamp

set -e

PROJECT_DIR="/root/savekw2"
BACKUP_DIR="$PROJECT_DIR/backups"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="backup-prod-$TIMESTAMP.sql"

echo "======================================"
echo "💾 Database Backup"
echo "======================================"
echo ""

# Create backup directory if not exists
mkdir -p $BACKUP_DIR

echo "📦 Creating backup: $BACKUP_FILE"
docker exec savekw_postgres pg_dump -U savekw -d savekw_prod > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "📊 Size: $SIZE"
    echo "📁 Location: $BACKUP_DIR/$BACKUP_FILE"
    
    # Create symlink to latest backup
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/backup-prod-latest.sql"
    echo "🔗 Symlink created: backup-prod-latest.sql"
else
    echo "❌ Backup failed!"
    exit 1
fi

# Keep only last 10 backups
echo ""
echo "🧹 Cleaning old backups (keeping last 10)..."
cd $BACKUP_DIR
ls -t backup-prod-*.sql | grep -v "backup-prod-latest.sql" | tail -n +11 | xargs -r rm
echo "✅ Cleanup complete"

# List all backups
echo ""
echo "📋 Available backups:"
ls -lh $BACKUP_DIR/backup-prod-*.sql | grep -v "backup-prod-latest.sql"

echo ""
echo "======================================"
echo "✅ Backup Complete"
echo "======================================"
