#!/bin/bash

# SaveKW2 Deploy Webhook Server
# Легковесный webhook сервер, работающий на хосте (не в контейнере)
# Слушает POST запросы и запускает deploy.sh
# 
# УСТАНОВКА НА СЕРВЕРЕ:
#   1. Скопировать на сервер: scp scripts/deploy-webhook.sh root@YOUR_SERVER_IP:/root/savekw2/scripts/
#   2. Сделать исполняемым: chmod +x /root/savekw2/scripts/deploy-webhook.sh
#   3. Сгенерировать токен: openssl rand -hex 32
#   4. Добавить токен в .env.production: DEPLOY_WEBHOOK_TOKEN=ваш_токен
#   5. Установить сервис: /root/savekw2/scripts/deploy-webhook.sh install
#   6. Добавить в nginx проксирование на порт 9000

set -e

PROJECT_DIR="/root/savekw2"
WEBHOOK_PORT="${DEPLOY_WEBHOOK_PORT:-9000}"
LOG_FILE="$PROJECT_DIR/logs/webhook.log"
PID_FILE="/var/run/deploy-webhook.pid"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    local message="[$(date +'%Y-%m-%d %H:%M:%S')] $1"
    echo -e "$message"
    echo "$message" >> "$LOG_FILE"
}

# Загрузить токен из .env.production
load_token() {
    if [ -f "$PROJECT_DIR/.env.production" ]; then
        source "$PROJECT_DIR/.env.production"
    fi
    
    if [ -z "$DEPLOY_WEBHOOK_TOKEN" ]; then
        log "${RED}ERROR: DEPLOY_WEBHOOK_TOKEN not set in .env.production${NC}"
        exit 1
    fi
}

# Обработчик HTTP запроса
handle_request() {
    local request_line
    local content_length=0
    local body=""
    local auth_header=""
    
    # Читаем HTTP заголовки
    while IFS= read -r line; do
        line="${line%%$'\r'}"
        [ -z "$line" ] && break
        
        if [[ "$line" == POST* ]]; then
            request_line="$line"
        elif [[ "$line" == Authorization:* ]]; then
            auth_header="${line#Authorization: Bearer }"
        elif [[ "$line" == Content-Length:* ]]; then
            content_length="${line#Content-Length: }"
        fi
    done
    
    # Читаем body если есть
    if [ "$content_length" -gt 0 ] 2>/dev/null; then
        read -n "$content_length" body
    fi
    
    # Проверяем токен
    if [ "$auth_header" != "$DEPLOY_WEBHOOK_TOKEN" ]; then
        log "${RED}Unauthorized request${NC}"
        echo -e "HTTP/1.1 401 Unauthorized\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"error\":\"Unauthorized\"}"
        return
    fi
    
    log "${GREEN}Valid webhook received, starting deployment...${NC}"
    
    # Отвечаем сразу (асинхронный деплой)
    echo -e "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\nConnection: close\r\n\r\n{\"status\":\"deployment_started\",\"timestamp\":\"$(date -Iseconds)\"}"
    
    # Запускаем деплой в фоне
    nohup bash -c "cd $PROJECT_DIR && ./scripts/deploy.sh" >> "$LOG_FILE" 2>&1 &
}

# Запуск webhook сервера
start_server() {
    load_token
    
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log "${GREEN}Starting webhook server on port $WEBHOOK_PORT...${NC}"
    
    # Используем socat для простого HTTP сервера
    # Если socat не установлен, используем netcat
    if command -v socat &> /dev/null; then
        while true; do
            socat TCP-LISTEN:$WEBHOOK_PORT,reuseaddr,fork EXEC:"$0 handle",pty,setsid 2>/dev/null || {
                log "${RED}Server error, restarting in 5s...${NC}"
                sleep 5
            }
        done
    elif command -v nc &> /dev/null; then
        while true; do
            # netcat версия (менее надежная)
            { echo -e "HTTP/1.1 200 OK\r\n\r\n"; } | nc -l -p $WEBHOOK_PORT -q 1 | {
                handle_request
            }
        done
    else
        log "${RED}ERROR: Neither socat nor netcat installed. Install: apt install socat${NC}"
        exit 1
    fi
}

# Установка systemd сервиса
install_service() {
    cat > /etc/systemd/system/savekw-webhook.service << 'EOF'
[Unit]
Description=SaveKW2 Deploy Webhook Server
After=network.target docker.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/savekw2
ExecStart=/root/savekw2/scripts/deploy-webhook.sh start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable savekw-webhook.service
    systemctl start savekw-webhook.service
    
    log "${GREEN}Service installed and started!${NC}"
    log "Check status: systemctl status savekw-webhook"
    log "View logs: journalctl -u savekw-webhook -f"
}

# Удаление сервиса
uninstall_service() {
    systemctl stop savekw-webhook.service 2>/dev/null || true
    systemctl disable savekw-webhook.service 2>/dev/null || true
    rm -f /etc/systemd/system/savekw-webhook.service
    systemctl daemon-reload
    log "${YELLOW}Service uninstalled${NC}"
}

# Простой Python HTTP сервер (альтернатива если есть Python)
start_python_server() {
    load_token
    
    log "${GREEN}Starting Python webhook server on port $WEBHOOK_PORT...${NC}"
    
    python3 << PYEOF
import http.server
import socketserver
import subprocess
import json
import os
import threading
from datetime import datetime

PORT = $WEBHOOK_PORT
TOKEN = os.environ.get('DEPLOY_WEBHOOK_TOKEN', '$DEPLOY_WEBHOOK_TOKEN')
PROJECT_DIR = '$PROJECT_DIR'

class WebhookHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        with open(f'{PROJECT_DIR}/logs/webhook.log', 'a') as f:
            f.write(f"[{datetime.now().isoformat()}] {args[0]}\n")
    
    def do_POST(self):
        # Проверяем путь
        if self.path != '/api/deploy' and self.path != '/deploy':
            self.send_response(404)
            self.end_headers()
            return
        
        # Проверяем токен
        auth = self.headers.get('Authorization', '')
        if auth != f'Bearer {TOKEN}':
            self.send_response(401)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"error":"Unauthorized"}')
            return
        
        # Отвечаем сразу
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        response = json.dumps({
            'status': 'deployment_started',
            'timestamp': datetime.now().isoformat()
        })
        self.wfile.write(response.encode())
        
        # Запускаем деплой в фоне
        def run_deploy():
            subprocess.run(
                ['./scripts/deploy.sh'],
                cwd=PROJECT_DIR,
                stdout=open(f'{PROJECT_DIR}/logs/deploy.log', 'a'),
                stderr=subprocess.STDOUT
            )
        
        thread = threading.Thread(target=run_deploy)
        thread.start()
        print(f"[{datetime.now().isoformat()}] Deployment started via webhook")

with socketserver.TCPServer(("", PORT), WebhookHandler) as httpd:
    print(f"Webhook server running on port {PORT}")
    httpd.serve_forever()
PYEOF
}

# Показать справку
show_help() {
    echo "SaveKW2 Deploy Webhook Server"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  start       - Start webhook server (foreground)"
    echo "  install     - Install as systemd service"
    echo "  uninstall   - Remove systemd service"
    echo "  handle      - Internal: handle single request"
    echo ""
    echo "Configuration (in .env.production):"
    echo "  DEPLOY_WEBHOOK_TOKEN  - Secret token for authentication (required)"
    echo "  DEPLOY_WEBHOOK_PORT   - Port to listen on (default: 9000)"
    echo ""
    echo "Generate token: openssl rand -hex 32"
}

# Main
case "${1:-}" in
    start)
        if command -v python3 &> /dev/null; then
            start_python_server
        else
            start_server
        fi
        ;;
    install)
        install_service
        ;;
    uninstall)
        uninstall_service
        ;;
    handle)
        load_token
        handle_request
        ;;
    *)
        show_help
        ;;
esac
