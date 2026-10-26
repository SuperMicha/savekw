#!/bin/bash

# Deploy SaveKW2 to Production from Local Machine
# Запускается локально для деплоя на удаленный сервер

SERVER="root@YOUR_SERVER_IP"
PROJECT_DIR="/root/savekw2"

echo "======================================"
echo "🚀 Deploy to Production Server"
echo "======================================"
echo ""

# Check if we have uncommitted changes
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Commit changes first? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Please commit your changes first, then run this script again"
        exit 1
    fi
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Wait a bit for GitHub to process
echo "⏳ Waiting for GitHub..."
sleep 2

# SSH to server and run deploy
echo ""
echo "🔌 Connecting to server..."
ssh $SERVER "cd $PROJECT_DIR && ./scripts/deploy.sh"

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "🌐 Check your application: https://useradmin.savekw.tech"
echo ""
