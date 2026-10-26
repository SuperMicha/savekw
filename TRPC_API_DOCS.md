# tRPC API Documentation

## 🎯 Інтерактивна документація API

Ваш проект тепер має інтерактивну документацію всіх tRPC endpoints!

### Відкрити документацію:

```
http://localhost:3000/api/trpc-ui
```

### Що можна робити:

✅ **Переглядати всі endpoints** - автоматично генерується з вашого коду  
✅ **Бачити типи input/output** - TypeScript типи для кожного endpoint  
✅ **Тестувати API** - виконувати запити прямо в браузері  
✅ **Бачити приклади** - автоматичні приклади запитів  
✅ **Працює з auth** - cookies автоматично передаються

## 📋 Доступні роутери:

### 1. **properties** - Керування властивостями користувача

#### `properties.get` - Отримати властивість

```typescript
Input: { property: string }
Output: { property: string, value: string | null }
```

#### `properties.getAll` - Отримати всі властивості

```typescript
Input: void
Output: Array<{ property: string, value: string }>
```

#### `properties.set` - Створити/оновити властивість

```typescript
Input: { property: string, value: string }
Output: { success: boolean, property: string, value: string }
```

#### `properties.delete` - Видалити властивість

```typescript
Input: { property: string }
Output: { success: boolean, property: string }
```

### 2. **equipment** - Керування обладнанням

#### `equipment.getAll` - Отримати все обладнання

```typescript
Input: void
Output: Array<Equipment>
```

#### `equipment.getById` - Отримати обладнання за ID

```typescript
Input: {
  id: string;
}
Output: Equipment | null;
```

#### `equipment.getByIds` - Отримати обладнання за масивом ID

```typescript
Input: { ids: string[] }
Output: Array<Equipment>
```

## 🔐 Автентифікація

Всі endpoints вимагають авторизації через Supabase Auth.  
Cookies автоматично передаються при використанні UI.

## 💡 Використання в коді

```typescript
import { api } from "@/utils/api";

// В React компоненті:
const { data, isLoading } = api.properties.get.useQuery({
  property: "user_appliances",
});

const saveMutation = api.properties.set.useMutation({
  onSuccess: () => console.log("Saved!"),
});

saveMutation.mutate({
  property: "user_appliances",
  value: JSON.stringify(data),
});
```

## 🛠️ Розробка

### Додавання нового роутера:

1. Створіть файл в `src/server/api/routers/your-router.ts`
2. Зареєструйте в `src/server/api/root.ts`:

   ```typescript
   import { yourRouter } from "@/server/api/routers/your-router";

   export const appRouter = createTRPCRouter({
     // ...
     your: yourRouter,
   });
   ```

3. Оновіть сторінку `/api/trpc-ui` - новий роутер з'явиться автоматично!

## 📚 Додаткова інформація

- **Пакет:** [trpc-ui](https://www.npmjs.com/package/trpc-ui)
- **Версія tRPC:** 11.6.0
- **Swagger для tRPC** - повноцінна заміна

## 🎨 Скріншоти можливостей:

- Перегляд всіх процедур (queries, mutations)
- Автоматична генерація форм з Zod схем
- Виконання запитів з результатами
- Перегляд помилок валідації
- Копіювання код-прикладів
