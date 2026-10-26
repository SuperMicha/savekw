#!/bin/bash

# Health Check Script for SaveKW2
# Checks the health of all services

set -e

PROJECT_DIR="/root/savekw2"
COMPOSE_FILE="docker-compose.prod.yml"

echo "======================================"
echo "🏥 SaveKW2 Health Check"
echo "======================================"
echo ""

cd "$PROJECT_DIR"

# Check Docker
echo "🐳 Docker Status:"
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running!"
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Check containers
echo "📦 Container Status:"
docker compose -f "$COMPOSE_FILE" ps
echo ""

# Check if containers are up
if ! docker compose -f "$COMPOSE_FILE" ps | grep -q "Up"; then
    echo "❌ Some containers are not running!"
    exit 1
fi
echo "✅ All containers are up"
echo ""

# Check PostgreSQL
echo "🗄️  PostgreSQL Health:"
if docker exec savekw_postgres pg_isready -U savekw > /dev/null 2>&1; then
    echo "✅ PostgreSQL is healthy"
else
    echo "❌ PostgreSQL is not responding!"
    exit 1
fi
echo ""

# Check Application
echo "🌐 Application Health:"
# Check if app is listening on port 3000
if docker exec savekw_app sh -c 'command -v wget > /dev/null' 2>/dev/null; then
    HTTP_CODE=$(docker exec savekw_app wget -q -O /dev/null -S http://localhost:3000 2>&1 | grep "HTTP/" | awk '{print $2}')
elif docker exec savekw_app sh -c 'command -v nc > /dev/null' 2>/dev/null; then
    if docker exec savekw_app nc -z localhost 3000 2>/dev/null; then
        HTTP_CODE="200"
    else
        HTTP_CODE="000"
    fi
else
    # Fallback: check from host
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
fi

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✅ Application is responding (HTTP $HTTP_CODE)"
else
    echo "❌ Application is not responding! (HTTP $HTTP_CODE)"
    echo "Recent logs:"
    docker compose -f "$COMPOSE_FILE" logs app --tail 20
    exit 1
fi
echo ""

# Check Nginx
echo "🔧 Nginx Status:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "❌ Nginx is not running!"
    exit 1
fi
echo ""

# Check disk space
echo "💾 Disk Space:"
df -h / | tail -1 | awk '{printf "  Used: %s / %s (%s)\n", $3, $2, $5}'
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "⚠️  Warning: Disk usage is above 90%!"
fi
echo ""

# Check memory
echo "🧠 Memory Usage:"
free -h | grep "Mem:" | awk '{printf "  Used: %s / %s\n", $3, $2}'
echo ""

# Get application version
echo "📊 Application Version:"
GIT_SHA=$(git rev-parse --short HEAD)
GIT_DATE=$(git log -1 --format=%cd --date=short)
echo "  Commit: $GIT_SHA"
echo "  Date: $GIT_DATE"
echo ""

echo "======================================"
echo "✅ All systems operational!"
echo "======================================"
