# 📦 Database Backup & Restore Guide

Повна інструкція для роботи з бекапами продакшн БД.

---

## 🚀 Швидкий старт (Один клік)

**Найпростіший спосіб отримати продакшн дані локально:**

```powershell
# Завантажити бекап з сервера і розгорнути локально
.\scripts\full-backup-and-download.ps1

# Або завантажити і розгорнути відразу в один крок
.\scripts\full-backup-and-download.ps1 -RestoreImmediately
```

Це всього! Скрипт:
1. ✅ Створить бекап на продакшн сервері
2. ✅ Завантажить його на локальну машину
3. ✅ Розгорне локально (якщо `-RestoreImmediately`)

---

## 📋 На Сервері (Production)

### 1. Створити бекап

**Локально (з вашої машини):**
```powershell
ssh root@useradmin.savekw.tech "cd /root/savekw2 && ./scripts/backup.sh"
```

**Або безпосередньо на сервері:**
```bash
cd /root/savekw2
./scripts/backup.sh
```

**Що робить скрипт:**
- ✅ Робить dump БД `savekw_prod`
- ✅ Зберігає в `/root/savekw2/backups/backup-prod-TIMESTAMP.sql`
- ✅ Створює symlink `backup-prod-latest.sql`
- ✅ Чистить старі бекапи (зберігає останні 10)
- ✅ Показує список всіх бекапів

**Результат:**
```
✅ Backup created successfully!
📊 Size: 245.3M
📁 Location: /root/savekw2/backups/backup-prod-20251129-143022.sql
🔗 Symlink created: backup-prod-latest.sql
```

### 2. Список бекапів на сервері

```bash
# Все разом
ssh root@useradmin.savekw.tech "ls -lh /root/savekw2/backups/"

# Тільки продакшн бекапи
ssh root@useradmin.savekw.tech "ls -lh /root/savekw2/backups/backup-prod-*.sql"

# Останній бекап
ssh root@useradmin.savekw.tech "ls -lh /root/savekw2/backups/backup-prod-latest.sql"
```

### 3. Видалити старі бекапи (якщо місце скінчилося)

```bash
# На сервері залишити тільки 5 останніх бекапів
ssh root@useradmin.savekw.tech "cd /root/savekw2/backups && ls -t backup-prod-*.sql | tail -n +6 | xargs rm"
```

---

## 💻 На Локальній Машині (Windows)

### Шаг 1: Завантажити Бекап

**Завантажити останній бекап:**
```powershell
.\scripts\download-backup-from-prod.ps1
```

**Завантажити конкретний бекап:**
```powershell
.\scripts\download-backup-from-prod.ps1 -BackupName "backup-prod-20251129-143022.sql"
```

**Що робить скрипт:**
- ✅ Перевіряє з'єднання з сервером
- ✅ Завантажує файл в папку `backups/`
- ✅ Показує розмір і список локальних бекапів

**Результат:**
```
✅ Backup downloaded successfully!
   File: backups\backup-prod-latest.sql
   Size: 245.30 MB

📋 Available backups locally:
   - backup-prod-20251129-143022.sql (245.30 MB)
   - backup-prod-20251128-091500.sql (243.15 MB)
```

### Шаг 2: Розгорнути локально

**Перед тим переконайтесь що Docker запущений:**
```powershell
docker ps
```

**Розгорнути бекап:**
```powershell
.\scripts\restore-local-db.ps1
```

**Розгорнути конкретний бекап:**
```powershell
.\scripts\restore-local-db.ps1 -BackupFile "backup-prod-20251129-143022.sql"
```

**Що робить скрипт:**
- ✅ Перевіряє наявність Docker контейнера
- ✅ Робить safety backup поточної БД
- ✅ Видаляє стару БД
- ✅ Створює нову порожню БД
- ✅ Розгортає дані з бекапу
- ✅ Перевіряє кількість таблиць та записів

**Результат:**
```
✅ Backup downloaded successfully!
   Size: 245.30 MB

✅ Container found and running

⚠️  WARNING:
   This will REPLACE the current local database with backup data

Continue? (yes/no): yes

📦 Creating safety backup of current database...
✅ Safety backup created

🗑️  Dropping existing database...
✅ Database dropped

🆕 Creating new database...
✅ Database created

♻️  Restoring database from backup...
✅ Database restored

✅ Checking restored database...
   📊 Tables restored: 25
   📊 Total records: 15847

✅ Database Restore Complete!
```

---

## ⚡ Одна команда для всього

```powershell
# Всі три кроки в одній команді
.\scripts\full-backup-and-download.ps1 -RestoreImmediately
```

Це:
1. Robить бекап на сервері
2. Завантажує на локал
3. Розгортає локально

**Готово!** Ваша локальна БД містить дані з продакшну.

---

## 🔍 Перевірка Результату

### Перевірити що БД розгорнулася

```bash
# Зв'язатися з контейнером
docker exec -it savekw-postgres-1 psql -U savekw -d savekw_local

# Всередині контейнера, PSQL промпт:
# Показати таблиці
\dt

# Показати кількість записів в таблиці
SELECT COUNT(*) FROM users;

# Вихід
\q
```

### Перевірити через docker exec

```powershell
# Кількість таблиць
docker exec savekw-postgres-1 psql -U savekw -d savekw_local -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# Кількість користувачів
docker exec savekw-postgres-1 psql -U savekw -d savekw_local -t -c "SELECT COUNT(*) FROM users;"

# Список таблиць
docker exec savekw-postgres-1 psql -U savekw -d savekw_local -t -c "\dt"
```

---

## 🆘 Розв'язання Проблем

### Проблема: "Container not found"

**Рішення:** Запустити Docker контейнер

```powershell
# Запустити postgres контейнер
docker-compose up -d

# Перевірити що запущений
docker ps
```

### Проблема: "Connection refused"

**Рішення:** Перевірити що PostgreSQL запущений

```powershell
# Перевірити статус
docker ps | grep postgres

# Якщо не запущений
docker-compose up -d postgres

# Перевірити логи
docker logs savekw-postgres-1
```

### Проблема: "Permission denied" при SCP

**Рішення:** Перевірити SSH ключ

```powershell
# SSH ключ повинен бути за адресою
ls $HOME\.ssh\id_ed25519

# Якщо немає, див. SSH_ACCESS_KIRILL_Z.md
```

### Проблема: Бекап надто великий

**Рішення:** Скоротити процес

```powershell
# Завантажити тільки структуру без даних (значно швидше)
ssh root@useradmin.savekw.tech "docker exec savekw_postgres pg_dump -U savekw -d savekw_prod -s" | Out-File backups\backup-schema-only.sql
```

---

## 📊 Структура Папок

```
savekw2/
├── backups/                          # Локальні бекапи
│   ├── backup-prod-latest.sql
│   ├── backup-prod-20251129-*.sql
│   └── backup-before-restore-*.sql   # Safety бекапи
├── scripts/
│   ├── backup.sh                     # На сервері: створити бекап
│   ├── restore.sh                    # На сервері: розгорнути бекап
│   ├── download-backup-from-prod.ps1 # Завантажити з сервера
│   ├── restore-local-db.ps1          # Розгорнути локально
│   └── full-backup-and-download.ps1  # Все в одному
```

---

## 🔐 Безпека

**ВАЖНО:**
- ✅ Safety бекапи створюються автоматично перед restore
- ✅ Старі бекапи на сервері видаляються (зберігаються останні 10)
- ✅ Локальні бекапи можете видалити вручну
- ✅ БД пароль в `.env` файлі

**Чого НЕ робити:**
- ❌ Не чистити папку `/root/savekw2/backups` на сервері вручну
- ❌ Не публікувати бекапи з реальними даними
- ❌ Не давати доступ до production бекапів

---

## 📚 Інші команди

### Ручне створення бекапу на сервері

```bash
# SSH в сервер
ssh root@useradmin.savekw.tech

# Перейти в проект
cd /root/savekw2

# Запустити бекап
./scripts/backup.sh
```

### Ручне розгортання на сервері

```bash
# SSH в сервер
ssh root@useradmin.savekw.tech

# Перейти в проект
cd /root/savekw2

# Розгорнути конкретний бекап
./scripts/restore.sh backup-prod-20251129-143022.sql

# Або останній
./scripts/restore.sh backup-prod-latest.sql
```

### PostgreSQL командна лінія локально

```powershell
# Підключитися до контейнера
docker exec -it savekw-postgres-1 psql -U savekw -d savekw_local

# Всередині PSQL:
# Список БД
\l

# Підключитися до БД
\c savekw_local

# Список таблиць
\dt

# Кількість записів
SELECT COUNT(*) FROM users;

# Вихід
\q
```

---

## ✅ Чек-лист

Перед розгортанням:
- [ ] Docker запущений (`docker ps`)
- [ ] PostgreSQL контейнер запущений
- [ ] SSH доступ до сервера працює
- [ ] Є вільне місце на локальному диску (розмір бекапу × 3)

Після розгортання:
- [ ] Перевірив кількість таблиць (`\dt`)
- [ ] Перевірив кількість записів (`SELECT COUNT(*)`)
- [ ] Запустив локальне приложение (`npm run dev`)
- [ ] Перевірив що дані завантажилися в UI

---

## 📞 Підтримка

Якщо щось не працює:

1. Запустіть скрипт знову з `-Verbose`
2. Перевірте логи: `docker logs savekw-postgres-1`
3. Проверьте SSH доступ: `ssh root@useradmin.savekw.tech "echo OK"`
4. Перевірте місце на диску: `docker exec savekw-postgres-1 df -h`
