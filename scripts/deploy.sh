#!/bin/bash

# SaveKW2 Production Deployment Script (Enhanced)
# Runs on server to deploy new version with health checks and rollback capability

set -e  # Exit on error

PROJECT_DIR="/root/savekw2"
COMPOSE_FILE="docker-compose.prod.yml"
LOG_DIR="$PROJECT_DIR/logs"
DEPLOY_LOG="$LOG_DIR/deploy.log"
MAX_LOG_SIZE=10485760  # 10MB

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Rotate log if too large (keep only last deploy log)
if [ -f "$DEPLOY_LOG" ]; then
    LOG_SIZE=$(stat -c%s "$DEPLOY_LOG" 2>/dev/null || echo 0)
    if [ "$LOG_SIZE" -gt "$MAX_LOG_SIZE" ]; then
        rm -f "$DEPLOY_LOG"
        echo "📝 Rotated old deploy log (was larger than 10MB)"
    fi
fi

# Logging function with timestamp
log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo "$message"
    echo "$message" >> "$DEPLOY_LOG"
}

# Error handler
handle_error() {
    log "❌ ERROR: Deployment failed at line $1"
    log "Rolling back to previous version..."
    
    # Stop failed containers
    docker compose -f "$COMPOSE_FILE" down 2>/dev/null || true
    
    # Restore previous image if exists
    if docker images | grep -q "savekw2-app:previous"; then
        log "🔄 Restoring previous Docker image..."
        docker tag savekw2-app:previous savekw2-app:latest
        docker compose -f "$COMPOSE_FILE" up -d
        log "✅ Rollback complete - previous version restored"
    else
        log "⚠️  No previous image found for rollback"
    fi
    
    exit 1
}

trap 'handle_error $LINENO' ERR

# Parse command line arguments
FORCE_DEPLOY=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE_DEPLOY=true
            shift
            ;;
        *)
            log "Unknown option: $1"
            exit 1
            ;;
    esac
done

log "======================================"
log "🚀 SaveKW2 Production Deployment"
log "======================================"

cd "$PROJECT_DIR"

# Get current commit info before pull
OLD_COMMIT=$(git rev-parse --short HEAD)
log "📌 Current commit: $OLD_COMMIT"

# Backup .env.production if it exists (not tracked in git)
if [ -f .env.production ]; then
    cp .env.production /tmp/.env.production.backup
    log "💾 Backed up .env.production"
fi

# Pull latest changes
log ""
log "📥 Pulling latest changes from GitHub..."
git fetch origin main
git reset --hard origin/main

# Restore .env.production from backup
if [ -f /tmp/.env.production.backup ]; then
    cp /tmp/.env.production.backup .env.production
    rm /tmp/.env.production.backup
    log "✅ Restored .env.production"
fi

# Check disk space
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    log "⚠️  WARNING: Disk usage is ${DISK_USAGE}%"
    log "🧹 Cleaning up Docker cache..."
    docker system prune -f --volumes > /dev/null 2>&1
    log "✅ Docker cache cleaned"
fi

# Get new commit info
NEW_COMMIT=$(git rev-parse --short HEAD)
GIT_DATE=$(git log -1 --format=%cd --date=format:'%Y-%m-%d %H:%M:%S')
log "✅ Updated to commit: $NEW_COMMIT ($GIT_DATE)"

# Export git info for docker build
export GIT_SHA=$NEW_COMMIT
export GIT_DATE="$GIT_DATE"

# Check if there are changes
if [ "$OLD_COMMIT" = "$NEW_COMMIT" ] && [ "$FORCE_DEPLOY" = false ]; then
    log "⚠️  No new changes detected. Skipping deployment."
    log "Use --force flag to deploy anyway."
    exit 0
fi

# Show what changed
if [ "$OLD_COMMIT" != "$NEW_COMMIT" ]; then
    log ""
    log "📝 Changes:"
    git log --oneline "$OLD_COMMIT..$NEW_COMMIT" | tee -a "$DEPLOY_LOG"
fi

# Check environment variables
log ""
log "🔍 Checking environment variables..."
if [ ! -f .env.production ]; then
    log "❌ .env.production file not found!"
    exit 1
fi

source .env.production

required_vars=("DATABASE_URL" "ENCRYPTION_KEY" "POSTGRES_PASSWORD")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log "❌ Missing required variable: $var"
        exit 1
    fi
done
log "✅ All required variables present"

# Save current image as previous (for rollback)
log ""
log "💾 Saving current image for rollback..."
if docker images | grep -q "savekw2-app"; then
    docker tag savekw2-app:latest savekw2-app:previous 2>/dev/null || true
    log "✅ Previous image saved"
    
    # Clean up old images (keep only latest and previous)
    OLD_IMAGES=$(docker images | grep savekw2-app | grep -v "latest\|previous" | awk '{print $3}')
    if [ -n "$OLD_IMAGES" ]; then
        echo "$OLD_IMAGES" | xargs -r docker rmi -f 2>/dev/null || true
        log "🧹 Cleaned up old images"
    fi
fi

# Stop current containers
log ""
log "🛑 Stopping current containers..."
docker compose -f "$COMPOSE_FILE" down

# Build new image (WITH CACHE for faster builds)
log ""
log "🔨 Building new Docker image (using cache)..."
docker compose -f "$COMPOSE_FILE" build

# Run database migrations
log ""
log "🗄️  Running database migrations..."
MIGRATION_OUTPUT=$(docker compose -f "$COMPOSE_FILE" run --rm app npx prisma migrate deploy 2>&1) || MIGRATION_FAILED=true
echo "$MIGRATION_OUTPUT" | tee -a "$DEPLOY_LOG"

if [ "$MIGRATION_FAILED" = true ]; then
    if echo "$MIGRATION_OUTPUT" | grep -q "P3005"; then
        log "⚠️  Database schema is not empty and needs baseline"
        log "💡 This is expected for existing databases. Migrations may need manual review."
    else
        log "⚠️  Migration failed with unexpected error"
    fi
    log "⚠️  Continuing deployment..."
fi

# Start new containers
log ""
log "🚀 Starting new containers..."
docker compose -f "$COMPOSE_FILE" up -d

# Wait for services to start
log ""
log "⏳ Waiting for services to start..."
sleep 5

# Check if containers are running
log ""
log "📦 Checking if containers are running..."
if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    log "❌ Containers failed to start!"
    docker compose -f "$COMPOSE_FILE" logs --tail 50 | tee -a "$DEPLOY_LOG"
    exit 1
fi
log "✅ Containers are up"

# Show logs
log ""
log "📋 Recent logs:"
docker compose -f "$COMPOSE_FILE" logs --tail 30 | tee -a "$DEPLOY_LOG"

# Show running containers
log ""
log "📦 Running containers:"
docker compose -f "$COMPOSE_FILE" ps | tee -a "$DEPLOY_LOG"

log ""
log "======================================"
log "✅ Deployment complete!"
log "======================================"
log ""
log "🌐 Application: https://useradmin.savekw.tech"
log "📊 Version: $NEW_COMMIT"
log "📅 Date: $GIT_DATE"
log ""
log "Useful commands:"
log "  View logs:    docker compose -f $COMPOSE_FILE logs -f"
log "  Restart:      docker compose -f $COMPOSE_FILE restart"
log "  Stop:         docker compose -f $COMPOSE_FILE down"
log ""
log "📝 Full deployment log: $DEPLOY_LOG"
