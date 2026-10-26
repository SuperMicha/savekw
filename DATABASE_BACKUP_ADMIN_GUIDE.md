# 💾 Database Backup Management - Admin Panel

## ✅ Що створено:

### 1. API Endpoints

- **`POST /api/admin/backup-db`** - створює новий бекап БД
- **`GET /api/admin/list-backups`** - список всіх доступних бекапів
- **`GET /api/admin/download-backup/[filename]`** - завантажити бекап

### 2. UI Компонент

- **DatabaseTab** - новий таб в адмін панелі з:
  - Кнопка "➕ Створити бекап"
  - Список всіх бекапів з датою та розміром
  - Кнопка "⬇️ Завантажити" для кожного бекапу
  - Інструкції як відновити бекап

### 3. Інтеграція

- Використовує існуючий скрипт [`scripts/backup.sh`](scripts/backup.sh)
- Зберігає бекапи в `/root/savekw2/backups/`
- Автоматично залишає останні 10 бекапів

---

## 🚀 Як використовувати:

### В адмін панелі:

1. Зайди в адмін: https://useradmin.savekw.tech/admin
2. Таб **"База даних"**
3. Клік **"➕ Створити бекап"** (займе 10-30 секунд)
4. Клік **"⬇️ Завантажити"** на потрібному бекапі

---

## 🔧 Як працює під капотом:

### Створення бекапу:

```typescript
POST /api/admin/backup-db
Body: { secret: DEPLOY_SECRET }

→ Викликає: /root/savekw2/scripts/backup.sh
→ Створює: /root/savekw2/backups/backup-prod-YYYYMMDD-HHMMSS.sql
→ Повертає: { success, filename, size }
```

### Список бекапів:

```typescript
GET /api/admin/list-backups

→ Читає директорію: /root/savekw2/backups/
→ Парсить дати з імен файлів
→ Повертає: [{ filename, size, date, timestamp }]
```

### Завантаження:

```typescript
GET /api/admin/download-backup/backup-prod-20231130-143000.sql

→ Читає файл: /root/savekw2/backups/backup-prod-20231130-143000.sql
→ Встановлює headers: Content-Type, Content-Disposition
→ Віддає файл для завантаження
```

---

## 🔐 Безпека:

1. ✅ **Авторизація** - потрібен DEPLOY_SECRET для створення бекапу
2. ✅ **Валідація імені файлу** - перевіряє формат та забороняє `..` і `/`
3. ✅ **Ізоляція директорії** - доступ тільки до `/root/savekw2/backups/`
4. ✅ **Без docker socket** - використовує exec на хості (безпечніше)

---

## 📝 Відновлення бекапу:

### Локально (dev):

```powershell
# 1. Завантажити бекап з адмін панелі
# 2. Відновити через PowerShell скрипт
.\scripts\restore-local-db.ps1 -BackupFile "backup-prod-20231130-143000.sql"
```

### На production:

```bash
# 1. Завантажити бекап на сервер
scp backup.sql root@YOUR_SERVER_IP:/root/savekw2/backups/

# 2. Відновити
ssh root@YOUR_SERVER_IP
cd /root/savekw2
docker exec -i savekw_postgres psql -U savekw -d savekw_prod < backups/backup.sql
```

---

## 🎯 Переваги нового функціоналу:

- ✅ **Зручно** - створити та завантажити бекап одним кліком
- ✅ **Безпечно** - не потрібен Docker socket в контейнері
- ✅ **Швидко** - бекап створюється за 10-30 секунд
- ✅ **Прозоро** - видно всі бекапи, дати, розміри
- ✅ **Автоматично** - старі бекапи видаляються (тільки останні 10)

---

## 🔍 Troubleshooting:

### Помилка: "Permission denied"

- Перевір що додаток має доступ до `/root/savekw2/backups/`
- Перевір що backup.sh має execute права: `chmod +x scripts/backup.sh`

### Помилка: "Docker container not found"

- Перевір що контейнер `savekw_postgres` запущений: `docker ps`

### Бекап не створюється

- Подивись логи: `docker logs savekw_app`
- Перевір що DEPLOY_SECRET правильний в `.env.production.local`

### Завантаження не працює

- Перевір що файл існує: `ls -lh /root/savekw2/backups/`
- Перевір права доступу: `chmod 644 /root/savekw2/backups/*.sql`

---

## 🎉 Готово!

Тепер бекапи БД доступні прямо з адмін панелі! 💾
