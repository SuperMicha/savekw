# 1. Коміт всіх змін

git add -A
git commit -m "Опис змін"

# 2. Push на GitHub

git push origin main

# 3. Деплой на продакшн (з автопідтвердженням)

ssh root@YOUR_SERVER_IP "cd /root/savekw2 && echo 'y' | ./scripts/deploy.sh"

# ⚡ Quick Start - Production Deployment

Быстрое руководство для деплоя SaveKW2 в production.

## 📝 Checklist

- [ ] Git репозиторий запушен в GitHub
- [ ] DNS запись `useradmin.savekw.tech` → `YOUR_SERVER_IP`
- [ ] SSH доступ к серверу `root@YOUR_SERVER_IP`
- [ ] Backup базы данных готов

## 🚀 Быстрый деплой (5 шагов)

### 1. Закоммитить изменения

```bash
git add .
git commit -m "Add production deployment"
git push origin main
```

### 2. Первичная настройка сервера

```bash
bash scripts/setup-server.sh
```

### 3. Настроить пароли на сервере

```bash
ssh root@YOUR_SERVER_IP

# Сгенерировать пароль
openssl rand -base64 32

# Отредактировать .env.production
cd /root/savekw2
nano .env.production
# Заменить POSTGRES_PASSWORD и обновить DATABASE_URL, DIRECT_URL
# Ctrl+X, Y, Enter для сохранения

exit
```

### 4. Загрузить backup и сделать первый деплой

```bash
# Загрузить backup
scp backups/backup-supabase-public.sql root@YOUR_SERVER_IP:/root/savekw2/backups/backup-initial.sql

# SSH на сервер
ssh root@YOUR_SERVER_IP

# Первый деплой
cd /root/savekw2
./scripts/deploy.sh

# Восстановить БД
./scripts/restore.sh backup-initial.sql

# Проверить
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f app
# Ctrl+C для выхода
```

### 5. Настроить Nginx и SSL

```bash
# На сервере
cd /root/savekw2

# Остановить Coolify
docker stop coolify-proxy coolify 2>/dev/null || true

# Настроить Nginx
./scripts/setup-nginx.sh
# Следуйте инструкциям скрипта

# Проверить
systemctl status nginx
```

## ✅ Проверка

Откройте в браузере: **https://useradmin.savekw.tech**

## 🔄 Последующие деплои

```bash
# После изменений в коде:
git add .
git commit -m "Your changes"
bash scripts/deploy-to-production.sh
```

## 📚 Полная документация

См. [PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)

## 🆘 Проблемы?

```bash
# Логи приложения
ssh root@YOUR_SERVER_IP "docker compose -f /root/savekw2/docker-compose.prod.yml logs app"

# Логи Nginx
ssh root@YOUR_SERVER_IP "tail -50 /var/log/nginx/savekw_error.log"

# Статус контейнеров
ssh root@YOUR_SERVER_IP "docker compose -f /root/savekw2/docker-compose.prod.yml ps"
```
