# System Settings - Системні налаштування

## Що реалізовано:

### 1. Prisma модель `SystemSettings`

Таблиця для зберігання системних налаштувань у форматі ключ-значення.

```prisma
model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     String   @db.Text // JSON string

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([key])
  @@map("system_settings")
}
```

### 2. tRPC Router (`systemSettings`)

API для роботи з системними налаштуваннями:

#### Доступні ендпоінти:

**Всі ендпоінти захищені (потрібна авторизація):**

- `systemSettings.get` - отримати одне налаштування за ключем
- `systemSettings.getAllKeys` - отримати список всіх ключів
- `systemSettings.set` - створити/оновити налаштування
- `systemSettings.delete` - видалити налаштування

### 3. Початкові дані (seed)

**Ключ:** `default_algorithms`
**Значення:** JSON з алгоритмами та загальними налаштуваннями

**Ключ:** `weather_api_token`  
**Значення:** `your-weatherapi-token`

## Налаштування БД:

### Крок 1: Застосувати зміни в БД

```bash
# Якщо є підключення до БД:
npx prisma db push

# Або створити міграцію:
npx prisma migrate dev --name add_system_settings
```

### Крок 2: Регенерувати Prisma Client

```bash
npx prisma generate
```

### Крок 3: Заповнити початкові дані

```bash
npx tsx prisma/seed-system-settings.ts
```

## Використання в коді:

### 1. Отримати список всіх ключів (тільки авторизовані):

```typescript
import { api } from "@/utils/api";

function MyComponent() {
  const { data: keys } = api.systemSettings.getAllKeys.useQuery();

  console.log(keys); // ["default_algorithms", "weather_api_token"]

  return <div>...</div>;
}
```

### 2. Отримати будь-яке налаштування за ключем (тільки авторизовані):

```typescript
const { data: setting } = api.systemSettings.get.useQuery({
  key: "default_algorithms",
});

console.log(setting?.value); // Parsed JSON object
console.log(setting?.updatedAt); // Last update time

// Приклад отримання алгоритмів:
const { data: algorithms } = api.systemSettings.get.useQuery({
  key: "default_algorithms",
});
console.log(algorithms?.value.general_settings.sunny_hours_threshold); // 6
console.log(algorithms?.value.algorithms[0].description); // "Робота інвертора за прогнозом"

// Приклад отримання Weather API токена:
const { data: token } = api.systemSettings.get.useQuery({
  key: "weather_api_token",
});
// Використовувати в API запитах
const response = await fetch(
  `https://api.weatherapi.com/v1/current.json?key=${token?.value}&q=Kyiv`,
);
```

### 3. Створити/оновити налаштування (тільки авторизовані):

```typescript
const setMutation = api.systemSettings.set.useMutation();

// Зберегти об'єкт (автоматично серіалізується в JSON)
await setMutation.mutateAsync({
  key: "app_config",
  value: { theme: "dark", language: "uk" },
});

// Зберегти строку
await setMutation.mutateAsync({
  key: "api_key",
  value: "some-secret-key",
});
```

### 4. Отримати всі ключі (тільки авторизовані):

```typescript
const { data: keys } = api.systemSettings.getAllKeys.useQuery();

keys?.forEach((key) => {
  console.log(`Знайдено ключ: ${key}`);
});
```

### 5. Видалити налаштування (тільки авторизовані):

```typescript
const deleteMutation = api.systemSettings.delete.useMutation();

await deleteMutation.mutateAsync({ key: "old_setting" });
```

## Структура default_algorithms:

```typescript
interface DefaultAlgorithms {
  general_settings: {
    sunny_hours_threshold: number;
    day_tarif_start: number;
    night_tarif_start: number;
    active_solar_start: number;
    active_solar_end: number;
  };
  algorithms: Array<{
    id: number;
    device_id: string;
    description: string;
    status: number;
    name: string;
    // ... інші поля залежно від алгоритму
    appliances_required: string[];
    appliances_absent: string[];
    equipment: number[];
  }>;
}
```

## Приклади використання алгоритмів:

### Отримати активні алгоритми:

```typescript
const { data: setting } = api.systemSettings.get.useQuery({
  key: "default_algorithms",
});

const activeAlgorithms = setting?.value.algorithms.filter(
  (alg: any) => alg.status === 1,
);
```

### Знайти алгоритм за назвою:

```typescript
const algorithm1 = setting?.value.algorithms.find(
  (alg: any) => alg.name === "algorithm1",
);
console.log(algorithm1?.description); // "Робота інвертора за прогнозом"
```

### Перевірити необхідне обладнання:

```typescript
const algorithm6 = setting?.value.algorithms.find((alg: any) => alg.id === 6);
console.log(algorithm6?.appliances_required);
// ["energy_meeter", "boiler", "solar_panel", "invertor"]
```

### Отримати загальні налаштування:

```typescript
const settings = setting?.value.general_settings;
console.log(`День починається о ${settings?.day_tarif_start}:00`);
console.log(`Ніч починається о ${settings?.night_tarif_start}:00`);
```

## Тестування:

### 1. Через tRPC UI:

Відкрийте http://localhost:3000/api/trpc-ui

### 2. Через консоль браузера:

```javascript
// Отримати алгоритми
const response = await fetch("/api/trpc/systemSettings.getAlgorithms");
const data = await response.json();
console.log(data);
```

### 3. Через Prisma Studio:

```bash
npx prisma studio
```

Відкрийте таблицю `system_settings`

## Безпека:

⚠️ **Всі ендпоінти захищені** (потрібна авторизація через Supabase):

- `get` - читання одного налаштування
- `getAllKeys` - читання списку ключів
- `set` - запис налаштувань
- `delete` - видалення налаштувань
