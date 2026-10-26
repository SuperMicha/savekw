#!/bin/bash

# Setup Nginx and SSL for SaveKW2
# Настраивает Nginx и получает SSL сертификат

set -e

DOMAIN="useradmin.savekw.tech"
NGINX_CONFIG="/etc/nginx/sites-available/$DOMAIN"
EMAIL="your-email@example.com"  # Change this!

echo "======================================"
echo "🌐 Nginx & SSL Setup"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Stop old Coolify proxy if running
echo "🛑 Stopping Coolify proxy (if running)..."
docker stop coolify-proxy 2>/dev/null || true

# Install Nginx if not installed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi

# Install Certbot if not installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot..."
    apt-get install -y certbot python3-certbot-nginx
fi

# Copy Nginx configuration
echo ""
echo "📝 Installing Nginx configuration..."
cp /root/savekw2/nginx/useradmin.savekw.tech.conf $NGINX_CONFIG

# Create symlink
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/$DOMAIN

# Remove default site if exists
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo ""
echo "✅ Testing Nginx configuration..."
nginx -t

# Get SSL certificate
echo ""
echo "🔒 Obtaining SSL certificate..."
echo "⚠️  Make sure DNS is pointing to this server!"
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Temporarily start Nginx without SSL for certificate validation
echo ""
echo "🚀 Starting Nginx temporarily for certificate..."

# Create temporary config without SSL
cat > /etc/nginx/sites-available/$DOMAIN.tmp << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name useradmin.savekw.tech;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

ln -sf /etc/nginx/sites-available/$DOMAIN.tmp /etc/nginx/sites-enabled/$DOMAIN
mkdir -p /var/www/certbot
systemctl restart nginx

# Get certificate
certbot certonly --nginx -d $DOMAIN --email $EMAIL --agree-tos --non-interactive || {
    echo "❌ Certificate failed. Check DNS settings!"
    exit 1
}

# Restore full configuration with SSL
echo ""
echo "📝 Activating full Nginx configuration with SSL..."
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/$DOMAIN
rm -f /etc/nginx/sites-available/$DOMAIN.tmp

# Restart Nginx
systemctl restart nginx
systemctl enable nginx

# Setup auto-renewal
echo ""
echo "🔄 Setting up SSL auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "======================================"
echo "✅ Nginx & SSL Setup Complete!"
echo "======================================"
echo ""
echo "🌐 Your site: https://$DOMAIN"
echo "📋 Nginx logs: /var/log/nginx/savekw_*.log"
echo "🔒 SSL certificate: /etc/letsencrypt/live/$DOMAIN/"
echo ""
echo "Useful commands:"
echo "  Reload Nginx:     systemctl reload nginx"
echo "  Check status:     systemctl status nginx"
echo "  View logs:        tail -f /var/log/nginx/savekw_access.log"
echo "  Renew SSL:        certbot renew --dry-run"
echo ""
