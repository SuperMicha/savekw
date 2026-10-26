# System Log Guide

## Огляд

Системний лог (`SystemLog`) — це централізована система для відстеження змін, помилок та подій у системі SaveKW. Лог зберігає історію дій користувачів та системи для аудиту та налагодження.

## Структура таблиці

### Модель Prisma

```prisma
model SystemLog {
  id            Int       @id @default(autoincrement())
  dateTime      DateTime  @default(now()) @map("created_at")
  userId        String?   @map("userid")
  source        String?
  type          String?
  valueName     String?   @map("valuename")
  previousValue String?   @map("previousvalue")
  currentValue  String?   @map("currentvalue")

  @@map("syslog")
  @@schema("public")
}
```

### Поля

| Поле            | Тип      | Опис                                                  | Приклад                                |
| --------------- | -------- | ----------------------------------------------------- | -------------------------------------- |
| `id`            | Int      | Унікальний ідентифікатор (автоінкремент)              | 1, 2, 3...                             |
| `dateTime`      | DateTime | Час події (UTC+0, автоматично)                        | `2025-10-25T14:30:00Z`                 |
| `userId`        | String?  | UUID користувача (може бути NULL для системних подій) | `dd253d6c-b461-43a7-abe4-b8caa56e0667` |
| `source`        | String?  | Джерело події                                         | `User`, `System`                       |
| `type`          | String?  | Тип події                                             | `Change`, `Error`                      |
| `valueName`     | String?  | Назва параметра, що змінився                          | `NightTariffTime`, `DayTariffStart`    |
| `previousValue` | String?  | Попереднє значення                                    | `22:00`                                |
| `currentValue`  | String?  | Нове значення                                         | `23:00`                                |

## API Endpoints (tRPC)

### 1. `systemLog.getSysLog`

Отримати системні логи з фільтрацією та пагінацією.

**Input:**

```typescript
{
  userId?: string;           // Фільтр по користувачу
  limit?: number;            // Кількість записів (default: 200, max: 1000)
  skip?: number;             // Пропустити записів (для пагінації)
  source?: string;           // Фільтр по джерелу (User, System)
  type?: string;             // Фільтр по типу (Change, Error)
  valueName?: string;        // Фільтр по назві параметра
  sortBy?: string;           // Поле для сортування (dateTime, userId, source, type, valueName)
  sortOrder?: "asc" | "desc"; // Порядок сортування
}
```

**Output:**

```typescript
{
  logs: SystemLog[];         // Масив логів
  total: number;             // Загальна кількість записів
  hasMore: boolean;          // Чи є ще записи
}
```

**Приклад використання:**

```typescript
const { data } = api.systemLog.getSysLog.useQuery({
  userId: "dd253d6c-b461-43a7-abe4-b8caa56e0667",
  limit: 40,
  skip: 0,
  sortBy: "dateTime",
  sortOrder: "desc",
});
```

### 2. `systemLog.writeSysLog`

Записати нову подію в системний лог.

**Input:**

```typescript
{
  userId?: string | null;    // UUID користувача (опціонально)
  source: string;            // Джерело: "User" або "System"
  type: string;              // Тип: "Change", "Error", тощо
  valueName: string;         // Назва параметра
  previousValue?: string | null; // Попереднє значення
  currentValue?: string | null;  // Нове значення
}
```

**Output:**

```typescript
SystemLog; // Створений запис лога
```

**Приклад використання:**

```typescript
const mutation = api.systemLog.writeSysLog.useMutation();

await mutation.mutateAsync({
  userId: user?.id,
  source: "User",
  type: "Change",
  valueName: "NightTariffTime",
  previousValue: "22:00",
  currentValue: "23:00",
});
```

### 3. `systemLog.getFilterOptions`

Отримати унікальні значення для фільтрів (для випадаючих списків).

**Output:**

```typescript
{
  sources: string[];         // Унікальні джерела
  types: string[];           // Унікальні типи
  valueNames: string[];      // Унікальні назви параметрів
}
```

### 4. `systemLog.exportCSV`

Експортувати логи в CSV формат (тільки для авторизованих користувачів).

**Input:**

```typescript
{
  userId?: string;           // Фільтр по користувачу
  source?: string;           // Фільтр по джерелу
  type?: string;             // Фільтр по типу
  valueName?: string;        // Фільтр по назві параметра
}
```

**Output:**

```
string // CSV файл у вигляді тексту
```

**Приклад використання:**

```typescript
const csv = await api.systemLog.exportCSV.query({
  userId: "dd253d6c-b461-43a7-abe4-b8caa56e0667",
});

// Завантажити як файл
const blob = new Blob([csv], { type: "text/csv" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `system-log-${new Date().toISOString()}.csv`;
a.click();
URL.revokeObjectURL(url);
```

## UI

### Адміністратор (`/admin`)

**Вкладка "Системний лог":**

- ✅ Таблиця з усіма логами всіх користувачів
- ✅ Фільтри: User ID, Source, Type, Value Name (з datalist для автозаповнення)
- ✅ Сортування по всіх колонках (клік на заголовок)
- ✅ Пагінація (40 записів на сторінку)
- ✅ Експорт в CSV (до 10,000 записів)
- ✅ Кнопка "Оновити" для рефречу даних

**Колонки таблиці:**

1. DateTime
2. User ID
3. Source
4. Type
5. Value Name
6. Previous Value
7. Current Value

### Користувач (`/settings/logs`)

**Сторінка "Системний лог":**

- ✅ Таблиця з логами **тільки поточного користувача**
- ✅ Фільтри: Source, Type, Value Name (без User ID)
- ✅ Сортування по всіх колонках
- ✅ Пагінація (40 записів на сторінку)
- ✅ Візуальні бейджі для Source (System - синій, User - зелений) та Type (Error - червоний)

**Колонки таблиці:**

1. Дата і час
2. Джерело
3. Тип
4. Параметр
5. Попереднє значення
6. Нове значення

## Приклади використання

### 1. Логування зміни налаштувань користувачем

```typescript
await api.systemLog.writeSysLog.mutateAsync({
  userId: user.id,
  source: "User",
  type: "Change",
  valueName: "NightTariffStart",
  previousValue: "22:00",
  currentValue: "23:00",
});
```

### 2. Логування системної помилки

```typescript
await api.systemLog.writeSysLog.mutateAsync({
  userId: null, // Системна подія
  source: "System",
  type: "Error",
  valueName: "SchedulerExecution",
  previousValue: null,
  currentValue: "Failed to execute algorithm1: Connection timeout",
});
```

### 3. Логування автоматичної зміни параметра алгоритмом

```typescript
await api.systemLog.writeSysLog.mutateAsync({
  userId: user.id,
  source: "System",
  type: "Change",
  valueName: "InverterMode",
  previousValue: "Solar Priority",
  currentValue: "Battery Priority",
});
```

## Міграція Prisma

Після оновлення `schema.prisma`, виконайте:

```bash
# Згенерувати Prisma Client
npx prisma generate

# Створити міграцію (якщо таблиця ще не існує)
npx prisma migrate dev --name add_system_log

# Або застосувати в production
npx prisma migrate deploy
```

## Best Practices

### 1. Коли логувати

- ✅ Зміни налаштувань користувачем
- ✅ Автоматичні зміни системою (алгоритми)
- ✅ Помилки виконання
- ✅ Критичні події (підключення/відключення обладнання)

### 2. Коли НЕ логувати

- ❌ Читання даних (GET запити)
- ❌ Часті події (кожна секунда)
- ❌ Чутливі дані (паролі, токени)

### 3. Формат значень

- Для простих значень: `"22:00"`, `"enabled"`, `"123"`
- Для складних об'єктів: JSON рядок `'{"start": "22:00", "end": "06:00"}'`

### 4. Назви параметрів (valueName)

Використовуйте змістовні назви:

- ✅ `"NightTariffStart"`, `"DayTariffEnd"`
- ✅ `"InverterMode"`, `"BatterySOC"`
- ❌ `"param1"`, `"value"`, `"temp"`

## Безпека

- ✅ `getSysLog` - публічний endpoint, але в User UI обмежений поточним користувачем
- ✅ `writeSysLog` - публічний, але рекомендується використовувати з перевіркою аутентифікації
- ✅ `exportCSV` - захищений (`protectedProcedure`), тільки для авторизованих користувачів
- ✅ User ID не показується користувачам (тільки адмінам)

## Troubleshooting

### Проблема: Логи не відображаються

**Рішення:**

1. Перевірте, чи таблиця `syslog` існує в БД
2. Запустіть `npx prisma generate`
3. Перезапустіть сервер

### Проблема: Помилка "relation does not exist"

**Рішення:**

```bash
npx prisma migrate deploy
```

### Проблема: Експорт CSV не працює

**Рішення:**

- Переконайтеся, що користувач авторизований
- Перевірте ліміт записів (макс 10,000)

## Roadmap

- [ ] Автоматичне логування змін через middleware
- [ ] Архівація старих логів (після 1 року)
- [ ] Real-time оновлення логів через WebSocket
- [ ] Розширені фільтри (діапазон дат, пошук по тексту)
- [ ] Експорт в інші формати (JSON, Excel)
