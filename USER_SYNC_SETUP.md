# Настройка синхронизации пользователей из Supabase в локальную БД

## Проблема

При добавлении/изменении пользователей в Supabase Auth, они не попадают автоматически в вашу локальную PostgreSQL базу данных.

## Решение: Database Webhooks

У вас уже есть готовый webhook endpoint: `src/pages/api/webhooks/auth.ts`

Теперь нужно настроить Supabase для отправки событий на этот endpoint.

---

## 🚀 Вариант 1: Supabase Database Webhooks (Для Production)

### Шаг 1: Настройка в Supabase Dashboard

1. Откройте [Supabase Dashboard](https://app.supabase.com)
2. Выберите ваш проект
3. Перейдите в **Database** → **Webhooks**
4. Нажмите **Create a new hook**

### Шаг 2: Создание Webhook для INSERT

**Настройки:**

- **Name**: `auth_user_insert`
- **Table**: `auth.users`
- **Events**: ✅ Insert
- **Type**: `HTTP Request`
- **HTTP Request**:
  - **Method**: `POST`
  - **URL**: `https://useradmin.savekw.tech/api/webhooks/auth` (для production)
  - **Headers**:
    ```json
    {
      "Content-Type": "application/json"
    }
    ```
  - **Body**:
    ```json
    {
      "type": "INSERT",
      "record": {
        "id": "{{ record.id }}",
        "email": "{{ record.email }}",
        "email_confirmed_at": "{{ record.email_confirmed_at }}"
      }
    }
    ```

### Шаг 3: Создание Webhook для UPDATE

Повторите Шаг 2 с настройками:

- **Name**: `auth_user_update`
- **Events**: ✅ Update
- **Body**:
  ```json
  {
    "type": "UPDATE",
    "record": {
      "id": "{{ record.id }}",
      "email": "{{ record.email }}",
      "email_confirmed_at": "{{ record.email_confirmed_at }}"
    }
  }
  ```

### Шаг 4: Создание Webhook для DELETE

- **Name**: `auth_user_delete`
- **Events**: ✅ Delete
- **Body**:
  ```json
  {
    "type": "DELETE",
    "record": {
      "id": "{{ old_record.id }}",
      "email": "{{ old_record.email }}"
    }
  }
  ```

---

## 🏠 Вариант 2: Локальная разработка (Ngrok или Cloudflare Tunnel)

Для локальной разработки Supabase не может достучаться до `localhost:3000`.

### Вариант 2A: Использование Ngrok

1. **Установите Ngrok:**

   ```bash
   # Windows (через Chocolatey)
   choco install ngrok

   # Или скачайте с https://ngrok.com/download
   ```

2. **Запустите туннель:**

   ```bash
   ngrok http 3000
   ```

3. **Скопируйте публичный URL** (например: `https://abc123.ngrok.io`)

4. **Используйте в Supabase Webhook:**
   ```
   https://abc123.ngrok.io/api/webhooks/auth
   ```

### Вариант 2B: Использование Cloudflare Tunnel (бесплатно)

1. **Установите cloudflared:**

   ```bash
   # Windows
   winget install cloudflare.cloudflared
   ```

2. **Запустите туннель:**

   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Используйте публичный URL в Supabase**

---

## 🔄 Вариант 3: Database Trigger + Edge Function (Альтернатива)

Если webhooks не работают, можно использовать Supabase Edge Functions.

### Создание Edge Function:

```typescript
// supabase/functions/sync-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { type, record } = await req.json();

    // Отправляем на ваш сервер
    const response = await fetch(
      "https://useradmin.savekw.tech/api/webhooks/auth",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, record }),
      },
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### Создание Database Trigger:

```sql
-- В Supabase SQL Editor
CREATE OR REPLACE FUNCTION handle_user_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM http_post(
    'https://your-project.supabase.co/functions/v1/sync-user',
    jsonb_build_object(
      'type', TG_OP,
      'record', row_to_json(NEW)
    )::text,
    'application/json'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger для INSERT
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_change();

-- Trigger для UPDATE
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_change();

-- Trigger для DELETE
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_user_change();
```

---

## 🧪 Тестирование

### 1. Проверка webhook endpoint локально:

```bash
# PowerShell
$body = @{
    type = "INSERT"
    record = @{
        id = "test-user-id"
        email = "test@example.com"
        email_confirmed_at = "2024-01-01T00:00:00Z"
    }
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/webhooks/auth" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

### 2. Проверка в логах:

```bash
# Должны увидеть в консоли Next.js:
# [Webhook] Event: INSERT { id: '...', email: '...' }
# ✅ User created in local DB: test@example.com
```

### 3. Проверка в базе данных:

```sql
SELECT id, email, "emailConfirmedAt"
FROM users
ORDER BY "createdAt" DESC
LIMIT 5;
```

---

## 🔒 Безопасность (Рекомендуется добавить)

### Добавьте проверку подписи в webhook:

```typescript
// src/pages/api/webhooks/auth.ts
import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

function verifySignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature),
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Проверка подписи (если настроено)
  if (WEBHOOK_SECRET) {
    const signature = req.headers["x-webhook-signature"] as string;
    const rawBody = JSON.stringify(req.body);

    if (!signature || !verifySignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }
  }

  // ... остальной код ...
}
```

И добавьте в `.env`:

```bash
WEBHOOK_SECRET="your-secret-key-here"
```

---

## 📝 Резюме

**Для production (сервер):**

- ✅ Настройте Database Webhooks в Supabase Dashboard
- ✅ URL: `https://useradmin.savekw.tech/api/webhooks/auth`
- ✅ Добавьте проверку подписи для безопасности

**Для локальной разработки:**

- ✅ Используйте Ngrok или Cloudflare Tunnel
- ✅ Или тестируйте вручную через PowerShell/curl

**Альтернатива:**

- ✅ Edge Functions + Database Triggers (если webhooks не работают)

Webhook endpoint уже готов и работает! Нужно только настроить Supabase для его вызова.
