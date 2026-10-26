#!/bin/bash

# SaveKW2 Server Diagnostics Script
# Собирает информацию о текущем состоянии сервера

echo "======================================"
echo "🔍 SaveKW2 Server Diagnostics"
echo "======================================"
echo ""

echo "📊 System Resources:"
echo "-----------------------------------"
df -h | grep -E '(Filesystem|/$|/var)'
echo ""
free -h
echo ""

echo "🐳 Docker Status:"
echo "-----------------------------------"
docker --version
docker compose version
echo ""

echo "📦 Running Containers:"
echo "-----------------------------------"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

echo "🗄️ All Containers (including stopped):"
echo "-----------------------------------"
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Image}}"
echo ""

echo "🌐 Network Ports:"
echo "-----------------------------------"
netstat -tlnp | grep -E '(3000|8000|5432|80|443)'
echo ""

echo "📂 Coolify Directory:"
echo "-----------------------------------"
ls -lah /data/coolify 2>/dev/null || echo "Coolify directory not found"
echo ""

echo "🔧 Nginx Status:"
echo "-----------------------------------"
systemctl status nginx --no-pager 2>/dev/null || echo "Nginx not installed or not running"
echo ""

echo "🐘 PostgreSQL Status:"
echo "-----------------------------------"
docker exec -it $(docker ps -q -f name=postgres) psql -U savekw -d savekw_prod -c "\l" 2>/dev/null || echo "Could not connect to PostgreSQL"
echo ""

echo "🏷️ Docker Images:"
echo "-----------------------------------"
docker images | head -20
echo ""

echo "💾 Disk Usage by Directory:"
echo "-----------------------------------"
du -sh /var/lib/docker 2>/dev/null
du -sh /data 2>/dev/null
echo ""

echo "======================================"
echo "✅ Diagnostics Complete"
echo "======================================"
