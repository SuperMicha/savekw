#!/bin/bash

# Extract environment variables from running container
# Ищем контейнер с приложением SaveKW

echo "🔍 Searching for SaveKW container..."
echo ""

# Найти контейнер с приложением (может быть несколько вариантов имени)
CONTAINER_ID=$(docker ps --filter "ancestor=savekw" --format "{{.ID}}" | head -1)

if [ -z "$CONTAINER_ID" ]; then
    # Попробуем найти по имени
    CONTAINER_ID=$(docker ps --filter "name=savekw" --format "{{.ID}}" | head -1)
fi

if [ -z "$CONTAINER_ID" ]; then
    # Попробуем найти по порту 3000
    CONTAINER_ID=$(docker ps --filter "publish=3000" --format "{{.ID}}" | head -1)
fi

if [ -z "$CONTAINER_ID" ]; then
    echo "❌ SaveKW container not found!"
    echo "Available containers:"
    docker ps --format "table {{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Ports}}"
    exit 1
fi

echo "✅ Found container: $CONTAINER_ID"
echo ""

# Получить имя контейнера
CONTAINER_NAME=$(docker inspect --format='{{.Name}}' $CONTAINER_ID | sed 's/\///')
echo "📦 Container name: $CONTAINER_NAME"
echo ""

echo "📝 Environment Variables:"
echo "======================================"
docker exec $CONTAINER_ID env | grep -E "(DATABASE_URL|SUPABASE|HCAPTCHA|NEXT_PUBLIC)" | sort
echo ""

echo "======================================"
echo "💾 Saving to file: env.production.extracted"
docker exec $CONTAINER_ID env | grep -E "(DATABASE_URL|SUPABASE|HCAPTCHA|NEXT_PUBLIC)" | sort > env.production.extracted
echo "✅ Saved!"
echo ""

echo "🔍 Container Details:"
echo "======================================"
docker inspect $CONTAINER_ID --format='Image: {{.Config.Image}}'
docker inspect $CONTAINER_ID --format='Created: {{.Created}}'
docker inspect $CONTAINER_ID --format='Ports: {{.NetworkSettings.Ports}}'
