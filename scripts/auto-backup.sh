#!/bin/bash

# Automated Database Backup Script for Cron
# Runs daily at 3:00 AM via cron
# 
# To install:
# chmod +x /root/savekw2/scripts/auto-backup.sh
# crontab -e
# Add: 0 3 * * * /root/savekw2/scripts/auto-backup.sh >> /root/savekw2/logs/backup.log 2>&1

set -e

PROJECT_DIR="/root/savekw2"
BACKUP_DIR="$PROJECT_DIR/backups"
LOG_DIR="$PROJECT_DIR/logs"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
BACKUP_FILE="backup-prod-$TIMESTAMP.sql"
MAX_BACKUPS=10

# Ensure directories exist
mkdir -p "$BACKUP_DIR"
mkdir -p "$LOG_DIR"

echo ""
echo "======================================"
echo "$(date '+%Y-%m-%d %H:%M:%S') 💾 Auto Backup Started"
echo "======================================"

# Check if PostgreSQL container is running
if ! docker ps --format '{{.Names}}' | grep -q "savekw_postgres"; then
    echo "❌ ERROR: PostgreSQL container 'savekw_postgres' is not running!"
    exit 1
fi

# Create backup using pg_dump inside container
echo "📦 Creating backup: $BACKUP_FILE"
docker exec savekw_postgres pg_dump -U savekw -d savekw_prod > "$BACKUP_DIR/$BACKUP_FILE"

# Check if backup was successful
if [ -f "$BACKUP_DIR/$BACKUP_FILE" ] && [ -s "$BACKUP_DIR/$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    echo "✅ Backup created successfully!"
    echo "📊 Size: $SIZE"
    echo "📁 Location: $BACKUP_DIR/$BACKUP_FILE"
    
    # Create symlink to latest backup
    ln -sf "$BACKUP_FILE" "$BACKUP_DIR/backup-prod-latest.sql"
    echo "🔗 Symlink updated: backup-prod-latest.sql"
else
    echo "❌ Backup failed - file is empty or missing!"
    rm -f "$BACKUP_DIR/$BACKUP_FILE"
    exit 1
fi

# Cleanup old backups (keep only last MAX_BACKUPS)
echo ""
echo "🧹 Cleaning old backups (keeping last $MAX_BACKUPS)..."

# Count current backups (excluding symlink and safety backups)
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/backup-prod-*.sql 2>/dev/null | grep -v "backup-prod-latest.sql" | grep -v "backup-before-restore" | wc -l)

if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    # Get list of files to delete
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    echo "📋 Found $BACKUP_COUNT backups, will delete $DELETE_COUNT oldest"
    
    ls -1t "$BACKUP_DIR"/backup-prod-*.sql | grep -v "backup-prod-latest.sql" | grep -v "backup-before-restore" | tail -n "$DELETE_COUNT" | while read file; do
        echo "🗑️  Deleting: $(basename "$file")"
        rm -f "$file"
    done
    
    echo "✅ Cleanup complete"
else
    echo "✅ No cleanup needed ($BACKUP_COUNT backups, max $MAX_BACKUPS)"
fi

# Also cleanup old safety backups (keep last 5)
SAFETY_COUNT=$(ls -1 "$BACKUP_DIR"/backup-before-restore-*.sql 2>/dev/null | wc -l)
if [ "$SAFETY_COUNT" -gt 5 ]; then
    echo ""
    echo "🧹 Cleaning old safety backups (keeping last 5)..."
    ls -1t "$BACKUP_DIR"/backup-before-restore-*.sql | tail -n +6 | while read file; do
        echo "🗑️  Deleting: $(basename "$file")"
        rm -f "$file"
    done
fi

# List remaining backups
echo ""
echo "📋 Current backups:"
ls -lh "$BACKUP_DIR"/backup-prod-*.sql 2>/dev/null | grep -v "backup-prod-latest.sql" | tail -5

# Calculate total disk usage
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)
echo ""
echo "💾 Total backup folder size: $TOTAL_SIZE"

echo ""
echo "======================================"
echo "$(date '+%Y-%m-%d %H:%M:%S') ✅ Auto Backup Complete"
echo "======================================"
