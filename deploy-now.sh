#!/bin/bash
set -e
cd /root/savekw2
git pull
export GIT_SHA=$(git rev-parse HEAD)
export GIT_DATE=$(git log -1 --format=%cd --date=short)
echo "Building with version: ${GIT_SHA:0:7} ($GIT_DATE)"
docker compose -f docker-compose.prod.yml up -d --build
echo "Deployment complete!"
