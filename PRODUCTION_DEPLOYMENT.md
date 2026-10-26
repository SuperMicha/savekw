# 🚀 Быстрый деплой (TL;DR)

```bash
# 1. Коміт всіх змін
git add -A
git commit -m "Опис змін"

# 2. Push на GitHub
git push origin main

# 3. Деплой на продакшн
ssh root@YOUR_SERVER_IP "cd /root/savekw2 && ./scripts/deploy.sh"
```

---

# 🚀 Production Deployment Guide

Полное руководство по деплою SaveKW2 на production сервер с автоматическими health checks и rollback.

## 📋 Что создано

### Файлы конфігурації:

- `docker-compose.prod.yml` - Production Docker Compose конфигурация
- `.env.production.template` - Шаблон переменных окружения
- `nginx/useradmin.savekw.tech.conf` - Nginx конфигурация для домена

### Скрипти для сервера:

- `scripts/deploy.sh` - **[ПОКРАЩЕНО]** Основной скрипт деплоя с health checks та rollback
- `scripts/health-check.sh` - **[НОВИЙ]** Перевірка стану всіх сервісів
- `scripts/backup.sh` - Создание backup базы данных
- `scripts/restore.sh` - Восстановление базы данных из backup
- `scripts/setup-nginx.sh` - Настройка Nginx и SSL сертификата

### Локальні скрипти:

- `scripts/setup-server.sh` - Первичная настройка сервера (запускается локально)
- `scripts/deploy-to-production.sh` - Деплой с локальной машины

---

## ✨ Нові можливості deploy.sh

### 🎯 Автоматизація

- ✅ **Автопідтвердження** - немає інтерактивних prompt
- ✅ **--force флаг** - деплой навіть без нових змін
- ✅ **Автоматичний rollback** при невдачі
- ✅ **Health checks** - перевірка здоров'я після деплою
- ✅ **Використання Docker cache** - швидші білди
- ✅ **Логування з timestamp** - детальні логи деплою
- ✅ **Rotation логів** - тільки останній deploy.log (макс 10MB)

### 🛡️ Безпека та надійність

- ✅ Перевірка змінних оточення перед деплоєм
- ✅ Збереження попереднього образу для rollback
- ✅ Автоматичне очищення старих образів
- ✅ Structured logging в `/root/savekw2/logs/deploy.log`

---

## 🎯 Пошаговая инструкция

### Шаг 1: Подготовка локально

#### 1.1. Закоммитить и запушить изменения

```bash
# Добавить все новые файлы
git add .

# Закоммитить
git commit -m "Add production deployment configuration"

# Запушить в GitHub
git push origin main
```

#### 1.2. Сделать скрипты исполняемыми (для Git Bash на Windows)

```bash
git update-index --chmod=+x scripts/*.sh
git commit -m "Make scripts executable"
git push origin main
```

---

### Шаг 2: Первичная настройка сервера

Запустите скрипт setup-server.sh с локальной машины:

```bash
# В Git Bash или WSL
bash scripts/setup-server.sh
```

Этот скрипт:

- ✅ Установит необходимые пакеты (Git, Docker, Nginx, Certbot)
- ✅ Клонирует репозиторий на сервер в `/root/savekw2`
- ✅ Создаст структуру директорий
- ✅ Создаст файл `.env.production` (с placeholder паролями)

---

### Шаг 3: Настройка переменных окружения

#### 3.1. Подключитесь к серверу

```bash
ssh root@YOUR_SERVER_IP
```

#### 3.2. Сгенерируйте надежный пароль для БД

```bash
openssl rand -base64 32
```

#### 3.3. Отредактируйте `.env.production`

```bash
cd /root/savekw2
nano .env.production
```

Замените:

- `POSTGRES_PASSWORD=...` - на сгенерированный пароль
- `DATABASE_URL` - обновите пароль в строке подключения
- `DIRECT_URL` - обновите пароль в строке подключения
- `SUPABASE_SERVICE_ROLE_KEY` - если изменился

Сохраните: `Ctrl+X`, затем `Y`, затем `Enter`

---

### Шаг 4: Загрузка backup базы данных

#### 4.1. С локальной машины скопируйте последний backup

```bash
# Выберите последний backup
scp backups/backup-prod-XXXXXX.sql root@YOUR_SERVER_IP:/root/savekw2/backups/

# Или используйте ваш локальный backup
scp backups/backup-supabase-public.sql root@YOUR_SERVER_IP:/root/savekw2/backups/backup-initial.sql
```

---

### Шаг 5: Первый деплой приложения

#### 5.1. На сервере запустите первый деплой

```bash
cd /root/savekw2
./scripts/deploy.sh
```

Скрипт выполнит:

1. Pull последнего кода из GitHub
2. Build Docker образа
3. Запуск PostgreSQL контейнера
4. Миграции базы данных (Prisma)
5. Запуск приложения

#### 5.2. Проверьте что контейнеры запустились

```bash
docker compose -f docker-compose.prod.yml ps
```

Должны быть запущены:

- `savekw_postgres` - база данных
- `savekw_app` - приложение

#### 5.3. Проверьте логи

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Нажмите `Ctrl+C` чтобы выйти.

---

### Шаг 6: Восстановление базы данных из backup

Если база пустая, восстановите её из backup:

```bash
cd /root/savekw2
./scripts/restore.sh backup-initial.sql
```

Скрипт:

1. Создаст safety backup текущей БД
2. Удалит и пересоздаст базу
3. Восстановит данные из backup
4. Перезапустит приложение

---

### Шаг 7: Настройка Nginx и SSL

#### 7.1. Остановите Coolify proxy (если работает)

```bash
docker stop coolify-proxy
docker stop coolify
```

#### 7.2. Запустите setup Nginx

```bash
cd /root/savekw2
./scripts/setup-nginx.sh
```

Скрипт:

1. Установит Nginx и Certbot
2. Скопирует конфигурацию Nginx
3. Получит SSL сертификат от Let's Encrypt
4. Настроит автоматическое обновление сертификата

**ВАЖНО:** Перед запуском убедитесь, что:

- DNS запись `useradmin.savekw.tech` указывает на `YOUR_SERVER_IP`
- Порты 80 и 443 открыты на сервере

---

### Шаг 8: Проверка

#### 8.1. Проверьте статус сервисов

```bash
# Nginx
systemctl status nginx

# Docker containers
docker compose -f /root/savekw2/docker-compose.prod.yml ps
```

#### 8.2. Проверьте сайт в браузере

- HTTP: http://useradmin.savekw.tech (должен редиректить на HTTPS)
- HTTPS: https://useradmin.savekw.tech (должен работать)

#### 8.3. Проверьте логи Nginx

```bash
tail -f /var/log/nginx/savekw_access.log
tail -f /var/log/nginx/savekw_error.log
```

---

## 🔄 Деплой оновлень (Production Workflow)

### ✅ Рекомендований процес

#### 1. Локально: Commit & Push

```bash
# 1. Зробіть зміни в коді
# 2. Закоммитьте
git add .
git commit -m "Your changes"
git push origin main
```

#### 2. На сервері: Автоматичний деплой

```bash
ssh root@YOUR_SERVER_IP
cd /root/savekw2

# Звичайний деплой (скіпає якщо немає змін)
./scripts/deploy.sh

# Форсований деплой (навіть без змін)
./scripts/deploy.sh --force
```

### 🎬 Що відбувається під час деплою:

1. **📥 Git Pull** - отримання свіжого коду з GitHub
2. **🔍 Перевірка змін** - порівняння commit-ів
3. **✓ Validation** - перевірка змінних оточення
4. **💾 Backup** - збереження попереднього образу
5. **🔨 Build** - білд нового Docker образу (з кешем!)
6. **🗄️ Migrations** - оновлення схеми БД
7. **🚀 Start** - запуск нових контейнерів
8. **🏥 Health Check** - перевірка здоров'я (60 сек)
9. **✅ Success** або **🔄 Rollback** при невдачі

### 📊 Моніторинг деплою

```bash
# Переглянути логи деплою
cat /root/savekw2/logs/deploy.log

# Переглянути логи додатку в реальному часі
docker compose -f /root/savekw2/docker-compose.prod.yml logs -f app

# Перевірити здоров'я системи
cd /root/savekw2
./scripts/health-check.sh
```

---

## 🏥 Перевірка стану (Health Check)

### Автоматичний health check

```bash
cd /root/savekw2
./scripts/health-check.sh
```

Перевіряє:

- ✅ Docker запущений
- ✅ Всі контейнери працюють
- ✅ PostgreSQL відповідає
- ✅ Додаток доступний
- ✅ Nginx працює
- ✅ Використання диску та пам'яті
- ✅ Поточна версія коду

---

## 🔄 Rollback (відкат змін)

### Автоматичний rollback

Якщо деплой завершується помилкою, `deploy.sh` автоматично:

1. Зупиняє проблемні контейнери
2. Відновлює попередній образ
3. Запускає контейнери з попередньої версії

### Ручний rollback

Якщо потрібно відкотити успішний деплой:

```bash
cd /root/savekw2

# Зупинити поточні контейнери
docker compose -f docker-compose.prod.yml down

# Відновити попередній образ
docker tag savekw2-app:previous savekw2-app:latest

# Запустити
docker compose -f docker-compose.prod.yml up -d

# Перевірити
./scripts/health-check.sh
```

---

## 🔍 Верифікація деплою

### Після деплою перевірте:

1. **Контейнери запущені:**

```bash
docker compose -f /root/savekw2/docker-compose.prod.yml ps
```

2. **Додаток відповідає:**

```bash
curl -f https://useradmin.savekw.tech
```

3. **Логи без помилок:**

```bash
docker compose -f /root/savekw2/docker-compose.prod.yml logs app --tail 50
```

4. **Перевірити версію:**

```bash
cd /root/savekw2
git log -1 --oneline
```

5. **Перевірити нову фічу:**
   - Відкрийте https://useradmin.savekw.tech
   - Авторизуйтесь
   - Протестуйте нову функціональність

---

## 🚨 Troubleshooting

### ⚠️ Деплой не запускається

**Симптом:** `deploy.sh` виводить помилку

```bash
# 1. Перевірте логи деплою
cat /root/savekw2/logs/deploy.log

# 2. Перевірте змінні оточення
cd /root/savekw2
source .env.production
echo $DATABASE_URL

# 3. Перевірте Docker
docker --version
docker compose version

# 4. Запустіть деплой вручну з детальним виводом
cd /root/savekw2
bash -x ./scripts/deploy.sh
```

### 🔴 Health check fails (автоматичний rollback)

**Симптом:** Після деплою додаток не відповідає, відбувається rollback

```bash
# 1. Перевірте логи додатку
docker compose -f /root/savekw2/docker-compose.prod.yml logs app --tail 100

# 2. Перевірте чи слухається порт 3000
docker exec savekw_app netstat -tlnp | grep 3000

# 3. Спробуйте запустити вручну
docker compose -f /root/savekw2/docker-compose.prod.yml up app

# 4. Перевірте змінні всередині контейнера
docker exec savekw_app env | grep -E '(DATABASE|NEXT)'
```

### 🗄️ Помилка міграції БД

**Симптом:** `prisma migrate deploy` падає з помилкою

```bash
# 1. Перевірте стан БД
docker exec savekw_postgres pg_isready -U savekw

# 2. Перевірте підключення
docker exec savekw_app npx prisma db push --skip-generate

# 3. Подивіться стан міграцій
docker exec -it savekw_postgres psql -U savekw -d savekw_prod -c "SELECT * FROM _prisma_migrations;"

# 4. Якщо треба - reset БД (⚠️ видалить дані!)
docker compose -f /root/savekw2/docker-compose.prod.yml exec app npx prisma migrate reset --force
```

### 🌐 Nginx показує 502 Bad Gateway

**Симптом:** Сайт недоступний, помилка 502

```bash
# 1. Перевірте статус Nginx
systemctl status nginx

# 2. Перевірте що додаток працює
docker compose -f /root/savekw2/docker-compose.prod.yml ps

# 3. Перевірте логи Nginx
tail -f /var/log/nginx/savekw_error.log

# 4. Перезапустіть Nginx
systemctl reload nginx

# 5. Якщо не допомагає - перезапустіть додаток
docker compose -f /root/savekw2/docker-compose.prod.yml restart app
```

### 📦 Docker образи займають багато місця

**Симптом:** Диск заповнений

```bash
# 1. Подивіться використання
df -h
docker system df

# 2. Видаліть старі образи (deploy.sh робить це автоматично)
docker image prune -a --filter "until=72h"

# 3. Видаліть невикористовувані volume
docker volume prune

# 4. Повне очищення (⚠️ обережно!)
docker system prune -a --volumes
```

### 🔄 Потрібен rollback після успішного деплою

**Симптом:** Деплой пройшов, але є проблеми з новою версією

```bash
cd /root/savekw2

# 1. Зупинити поточну версію
docker compose -f docker-compose.prod.yml down

# 2. Відновити попередній образ
docker tag savekw2-app:previous savekw2-app:latest

# 3. Запустити
docker compose -f docker-compose.prod.yml up -d

# 4. Перевірити
./scripts/health-check.sh

# 5. Відкотити зміни в git (опціонально)
git reset --hard HEAD~1
```

### 🔒 SSL сертификат не працює

**Симптом:** HTTPS недоступний або показує помилку

```bash
# 1. Перевірте DNS
nslookup useradmin.savekw.tech

# 2. Перевірте сертифікат
certbot certificates

# 3. Перевірте конфіг Nginx
nginx -t

# 4. Оновити сертифікат
certbot renew --dry-run
certbot renew

# 5. Перезапустити Nginx
systemctl reload nginx
```

### 📊 Повільна робота додатку

**Симптом:** Сторінки відкриваються довго

```bash
# 1. Перевірте використання ресурсів
./scripts/health-check.sh

# 2. Подивіться на CPU/Memory контейнерів
docker stats

# 3. Перевірте логи на помилки
docker compose -f /root/savekw2/docker-compose.prod.yml logs app --tail 200 | grep -i error

# 4. Оптимізуйте БД
docker exec -it savekw_postgres psql -U savekw -d savekw_prod -c "VACUUM ANALYZE;"

# 5. Restart додатку
docker compose -f /root/savekw2/docker-compose.prod.yml restart app
```

---

## 💾 Робота з базою данних

### Створити backup

```bash
ssh root@YOUR_SERVER_IP
cd /root/savekw2
./scripts/backup.sh
```

Backup зберігається в `backups/backup-prod-TIMESTAMP.sql`

### Відновити з backup

```bash
ssh root@YOUR_SERVER_IP
cd /root/savekw2
./scripts/restore.sh backup-prod-XXXXXX.sql
```

### Завантажити backup на локальну машину

```bash
scp root@YOUR_SERVER_IP:/root/savekw2/backups/backup-prod-latest.sql ./backups/
```

### Підключитися до БД

```bash
# Підключитися до PostgreSQL
docker exec -it savekw_postgres psql -U savekw -d savekw_prod

# Всередині psql:
\dt              # Список таблиць
\d table_name    # Структура таблиці
SELECT * FROM "User" LIMIT 5;  # Запит
\q               # Вихід
```

---

## 📊 Корисні команди

### Перегляд логів

```bash
# Логи додатку
docker compose -f /root/savekw2/docker-compose.prod.yml logs -f app

# Логи бази данних
docker compose -f /root/savekw2/docker-compose.prod.yml logs -f postgres

# Логи Nginx
tail -f /var/log/nginx/savekw_access.log
tail -f /var/log/nginx/savekw_error.log

# Логи деплою
tail -f /root/savekw2/logs/deploy.log
```

### Restart сервісів

```bash
# Restart додатку
docker compose -f /root/savekw2/docker-compose.prod.yml restart app

# Restart всього
docker compose -f /root/savekw2/docker-compose.prod.yml restart

# Restart Nginx
systemctl reload nginx
```

### Зупинка/запуск

```bash
# Зупинити всі контейнери
docker compose -f /root/savekw2/docker-compose.prod.yml down

# Запустити всі контейнери
docker compose -f /root/savekw2/docker-compose.prod.yml up -d

# Запустити з rebuild
docker compose -f /root/savekw2/docker-compose.prod.yml up -d --build
```

### Моніторинг системи

```bash
# Health check всієї системи
cd /root/savekw2
./scripts/health-check.sh

# Використання ресурсів контейнерами
docker stats

# Використання диску
df -h
docker system df

# Процеси
docker compose -f /root/savekw2/docker-compose.prod.yml ps
```

---

## 🔒 Безпека

### Рекомендації:

1. **Використовуйте складні паролі** для PostgreSQL
2. **НЕ коммітьте** `.env.production` в Git
3. **Регулярно робіть backup** бази данних (автоматизуйте через cron)
4. **Оновлюйте** Docker образи та пакети системи
5. **Налаштуйте firewall** (UFW):

```bash
ufw allow 22    # SSH
ufw allow 80    # HTTP
ufw allow 443   # HTTPS
ufw enable
```

6. **Обмежте доступ до SSH:**

```bash
# Редагуйте /etc/ssh/sshd_config
PermitRootLogin prohibit-password
PasswordAuthentication no
```

7. **Ротація логів** (автоматично через deploy.sh, але можна налаштувати logrotate)

---

## 📞 Підтримка

Якщо виникли проблеми:

1. Перевірте логи (див. розділ "Корисні команди")
2. Запустіть health check: `./scripts/health-check.sh`
3. Перевірте конфігурацію (.env.production, nginx config)
4. Перевірте що всі контейнери запущені: `docker compose ps`
5. Перевірте DNS налаштування домену

### 🔍 Діагностика:

```bash
# Повна діагностика сервера
cd /root/savekw2
bash scripts/server-diagnostics.sh
```

---

**Успішного деплою! 🚀**
