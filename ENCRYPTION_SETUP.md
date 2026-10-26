# Настройка шифрования паролей

## Что изменилось

### 1. Исправлена работа с базой данных

- Заменены все обращения к `auth.users` на `users` (таблица в схеме `public`)
- Исправлено в функциях: `EnsureUserProfile`, `getAllUsers`, `getUserById`, `userExistsByEmail`, `getUsersCount`

### 2. Удален пункт WiFi из меню

- Удален пункт "Параметри WiFi" из бокового меню настроек
- Удален файл страницы `src/pages/settings/wifi.tsx`

### 3. Реализовано шифрование паролей

Пароли пользователей теперь автоматически шифруются при сохранении и дешифруются при чтении.

**Шифруемые свойства:**

- `smart_ess_creds` - учетные данные для Smart ESS
- `smart_life_creds` - учетные данные для Smart Life

**Технические детали:**

- Алгоритм: AES-256-GCM (быстрый и безопасный)
- Ключ: 256 бит (32 байта), хранится в переменной окружения `ENCRYPTION_KEY`
- Формат зашифрованных данных: `iv:authTag:cipherText` (все в base64)

## Установка на локальной машине

### 1. Обновите файл `.env.local`

Ключ шифрования уже добавлен в файл `env.local`:

```bash
ENCRYPTION_KEY="<generate-with-openssl-rand-base64-32>"
```

### 2. Запустите проект

```bash
npm run dev
```

### 3. Проверьте работу

1. Зайдите в настройки Smart ESS или Smart Life
2. Сохраните учетные данные
3. Проверьте в базе данных, что значения зашифрованы:

   ```sql
   SELECT property, value
   FROM "UserProperties"
   WHERE property IN ('smart_ess_creds', 'smart_life_creds');
   ```

   Вы должны увидеть зашифрованные строки вида: `ABC123==:DEF456==:GHI789==`

4. Перезагрузите страницу - данные должны корректно дешифроваться и отображаться

## Деплой на production сервер

### 1. Сгенерируйте новый ключ для production

**ВАЖНО:** НЕ используйте тот же ключ, что и на локальной машине!

На сервере выполните:

```bash
openssl rand -base64 32
```

### 2. Обновите переменные окружения на сервере

Добавьте в файл `.env` на сервере:

```bash
ENCRYPTION_KEY="<сгенерированный_ключ>"
```

### 3. Задеплойте изменения

```bash
git add .
git commit -m "Add password encryption and fix database schema"
git push origin main

# На сервере
cd /root/savekw2
git pull
./scripts/deploy.sh
```

### 4. Проверьте работу на сервере

1. Откройте сайт https://useradmin.savekw.tech
2. Зайдите в настройки и сохраните учетные данные
3. Проверьте логи: `docker logs savekw2-web-1`
4. Должны увидеть сообщения: `🔐 Encrypted property...` и `✅ Decrypted property...`

## Важные замечания

### Безопасность ключа шифрования

- **НЕ коммитьте** `ENCRYPTION_KEY` в git
- Используйте **разные ключи** для dev/staging/production
- Храните production ключ в безопасном месте (password manager)
- При компрометации ключа - все данные придется перешифровать

### Миграция существующих данных

Текущая реализация **не шифрует** существующие данные. Шифрование работает только для **новых** записей.

Если нужно зашифровать существующие пароли, создайте миграционный скрипт:

```typescript
import { db } from "@/server/db";
import { encrypt, isEncrypted } from "@/lib/encryption";

async function migratePasswords() {
  const properties = await db.userProperties.findMany({
    where: {
      property: {
        in: ["smart_ess_creds", "smart_life_creds"],
      },
    },
  });

  for (const prop of properties) {
    if (!isEncrypted(prop.value)) {
      const encrypted = encrypt(prop.value);
      await db.userProperties.update({
        where: { id: prop.id },
        data: { value: encrypted },
      });
      console.log(`Encrypted ${prop.property} for user ${prop.userId}`);
    }
  }
}
```

## Troubleshooting

### Ошибка: "ENCRYPTION_KEY environment variable is not set"

Добавьте `ENCRYPTION_KEY` в файл `.env` или `.env.local`.

### Ошибка: "Failed to decrypt data"

- Проверьте, что `ENCRYPTION_KEY` правильный
- Если ключ был изменен, старые данные не смогут быть дешифрованы

### Пароли не отображаются после обновления

- Проверьте логи на наличие ошибок дешифрования
- Убедитесь что `ENCRYPTION_KEY` не изменился

## Создание нового файла для производственного окружения

На сервере нужно создать файл `.env` с production настройками:

```bash
# На сервере
cd /root/savekw2
cat > .env << 'EOF'
# PostgreSQL Database
DATABASE_URL="postgresql://savekw:<password>@postgres:5432/savekw_prod"
DIRECT_URL="postgresql://savekw:<password>@postgres:5432/savekw_prod"

# Supabase (для Auth)
NEXT_PUBLIC_SUPABASE_URL="https://your-project-ref.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon_key>"
SUPABASE_SERVICE_ROLE_KEY="<service_role_key>"

# Encryption Key (сгенерировать новый!)
ENCRYPTION_KEY="<новый_ключ_сгенерированный_openssl>"

# hCaptcha
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="10000000-ffff-ffff-ffff-000000000001"

# Environment
NODE_ENV="production"
EOF
```
