#!/bin/bash

# Initial Server Setup for SaveKW2 Production
# Настраивает сервер для первого деплоя

set -e

SERVER="root@YOUR_SERVER_IP"
PROJECT_DIR="/root/savekw2"
REPO_URL="https://github.com/SuperMicha/savekw2.git"

echo "======================================"
echo "⚙️  Server Setup for SaveKW2"
echo "======================================"
echo ""

echo "🔌 Connecting to server: $SERVER"
echo ""

ssh $SERVER << 'ENDSSH'
set -e

PROJECT_DIR="/root/savekw2"
REPO_URL="https://github.com/SuperMicha/savekw2.git"

echo "📦 Installing required packages..."
apt-get update
apt-get install -y git curl nginx certbot python3-certbot-nginx

echo ""
echo "🐳 Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
else
    echo "✅ Docker already installed"
fi

echo ""
echo "📥 Cloning repository..."
if [ -d "$PROJECT_DIR" ]; then
    echo "⚠️  Directory already exists, pulling latest changes..."
    cd $PROJECT_DIR
    git fetch origin main
    git reset --hard origin/main
else
    git clone $REPO_URL $PROJECT_DIR
    cd $PROJECT_DIR
fi

echo ""
echo "🔧 Setting up directory structure..."
mkdir -p backups
chmod +x scripts/*.sh

echo ""
echo "📋 Creating .env.production file..."
if [ ! -f ".env.production" ]; then
    cat > .env.production << 'EOF'
# ========================================
# SaveKW2 Production Environment
# ========================================

# PostgreSQL Database
POSTGRES_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

# Database URLs (используется одна и та же БД)
DATABASE_URL=postgresql://savekw:CHANGE_THIS_STRONG_PASSWORD@postgres:5432/savekw_prod
DIRECT_URL=postgresql://savekw:CHANGE_THIS_STRONG_PASSWORD@postgres:5432/savekw_prod

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=ADD_YOUR_SERVICE_ROLE_KEY_HERE

# hCaptcha (Test key - replace with real one for production)
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001

# Node Environment
NODE_ENV=production

# Git Info (автоматически заполняется при деплое)
GIT_SHA=unknown
GIT_DATE=unknown
EOF
    echo "⚠️  IMPORTANT: Edit .env.production and set secure passwords!"
    echo "   File location: $PROJECT_DIR/.env.production"
else
    echo "✅ .env.production already exists"
fi

echo ""
echo "======================================"
echo "✅ Server Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Edit $PROJECT_DIR/.env.production with secure passwords"
echo "2. Upload database backup to $PROJECT_DIR/backups/"
echo "3. Run initial deployment"
echo ""
echo "Commands:"
echo "  SSH to server:     ssh $SERVER"
echo "  Edit environment:  nano $PROJECT_DIR/.env.production"
echo "  First deployment:  cd $PROJECT_DIR && ./scripts/deploy.sh"
echo ""
ENDSSH

echo ""
echo "======================================"
echo "✅ Setup script completed!"
echo "======================================"
echo ""
echo "⚠️  IMPORTANT: Don't forget to:"
echo "1. Set secure password in .env.production"
echo "2. Upload database backup"
echo ""
