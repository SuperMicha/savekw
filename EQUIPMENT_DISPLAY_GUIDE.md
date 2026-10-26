# Функціональність відображення необхідного обладнання

## Опис

Реалізовано динамічне відображення необхідного обладнання на основі вибраних приладів користувача на сторінці `/settings/appliances`.

## Архітектура

### 1. Таблиця Equipment (Prisma)

```prisma
model Equipment {
    id         String   @id @default(cuid())
    name       String
    type       String
    properties Json     @default("{}")
    userId     String?
    imageData  String?  @db.Text // base64 зображення
    imageName  String?
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt

    @@index([userId])
    @@map("equipment")
}
```

Поля:

- `id` - унікальний ідентифікатор
- `name` - назва обладнання
- `imageData` - картинка в форматі base64
- `properties` - JSON з додатковими властивостями (description, gateway, price)

### 2. API Layer (tRPC)

**Router:** `src/server/api/routers/equipment.ts`

Endpoints:

- `equipment.getAll` - отримати всі записи обладнання
- `equipment.getById` - отримати одну одиницю обладнання за ID
- `equipment.getByIds` - отримати кілька одиниць за масивом ID

### 3. Бізнес-логіка

**Файл:** `src/lib/equipment-logic.ts`

#### ID обладнання в базі даних:

```typescript
export const EQUIPMENT_IDS = {
  WIFI_MODULE_PRO_05: "wifi-module-pro-05", // WiFi module Pro 05
  SMART_WIFI_SOCKET: "smart-wifi-socket", // Розумна Wi-Fi розетка Tuya
  BUTTON_PUSHER: "button-pusher", // Натискач кнопок
  BLUETOOTH_GATEWAY: "bluetooth-gateway", // Bluetooth Smart Gateway
};
```

#### Правила відповідності приладів та обладнання:

| Прилад                | Необхідне обладнання       | ID                   | Кількість |
| --------------------- | -------------------------- | -------------------- | --------- |
| Двотарифний лічильник | -                          | -                    | -         |
| Сонячні панелі        | -                          | -                    | -         |
| Інвертор з АКБ        | WiFi module Pro 05         | `wifi-module-pro-05` | 1         |
| Посудомийка           | Натискач кнопок            | `button-pusher`      | 1         |
| Пральна Машина        | Натискач кнопок            | `button-pusher`      | 1         |
| Бойлер                | Розумна Wi-Fi розетка Tuya | `smart-wifi-socket`  | 1         |
| Зарядка електромобіля | Розумна Wi-Fi розетка Tuya | `smart-wifi-socket`  | 1         |

**Спеціальне правило:**

- Якщо вибрано **хоча б один** з: `dishwasher` або `washer` → потрібен **Bluetooth Smart Gateway** (тільки **один**, незалежно від кількості приладів)

#### Функція `getRequiredEquipment()`

Приймає масив ID вибраних приладів та повертає масив необхідного обладнання з кількістю:

```typescript
interface RequiredEquipment {
  id: string; // ID обладнання
  count: number; // Кількість одиниць
  reason: string; // Причина/призначення
}
```

**Приклад:**

```typescript
// Вхідні дані
const selected = ["washer", "dishwasher", "boiler"];

// Результат
[
  {
    id: "button-pusher",
    count: 2,
    reason: "Для управління пральною машиною, Для управління посудомийкою",
  },
  {
    id: "bluetooth-gateway",
    count: 1,
    reason: "Для підключення натискача кнопок до інтернету",
  },
  {
    id: "smart-wifi-socket",
    count: 1,
    reason: "Для управління бойлером",
  },
];
```

### 4. UI Компонент

**Файл:** `src/pages/settings/appliances.tsx`

#### Структура:

```
┌─────────────────┬──────────────────────┐
│  Чекбокси       │  Необхідне обладнання│
│  приладів       │  (карточки)          │
│                 │                      │
│  ☑ Інвертор     │  [📷] WiFi Module    │
│  ☑ Посудомийка  │  [📷] Натискач       │
│  ☑ Пральна      │  [📷] BT Gateway     │
│  ☐ Бойлер       │                      │
└─────────────────┴──────────────────────┘
        [Зберегти]
```

#### Ключові особливості:

1. **Динамічне оновлення:**
   - Права панель оновлюється миттєво при зміні чекбоксів
   - Використовується `useMemo` для оптимізації обчислень

2. **Відображення обладнання:**
   - Картинка 80x80px (base64 з БД або placeholder)
   - Назва обладнання
   - Причина (для якого приладу)
   - Кількість (якщо більше 1)

3. **Пусте стан:**
   - Якщо не вибрано жодного приладу → показується placeholder з іконкою

4. **Посилання на магазин:**
   - Кнопка "Придбати →" веде на `/equipment/shop` (сторінка для майбутньої реалізації)

## Додавання обладнання в БД

Для роботи функціоналу необхідно створити 4 записи в таблиці `equipment`:

### Запити SQL:

```sql
-- 1. WiFi module Pro 05
INSERT INTO equipment (id, name, type, properties, "imageData", "imageName")
VALUES (
  'wifi-module-pro-05',
  'WiFi module Pro 05',
  'wifi-module',
  '{"description": "Для підключення інвертора", "gateway": "", "price": 1500}',
  'data:image/jpeg;base64,...', -- ваша картинка
  'wifi-module.jpg'
);

-- 2. Розумна Wi-Fi розетка Tuya
INSERT INTO equipment (id, name, type, properties, "imageData", "imageName")
VALUES (
  'smart-wifi-socket',
  'Розумна Wi-Fi розетка Tuya',
  'smart-socket',
  '{"description": "Для управління бойлером та зарядкою електромобіля", "gateway": "", "price": 500}',
  'data:image/jpeg;base64,...',
  'smart-socket.jpg'
);

-- 3. Натискач кнопок (Cubetouch switch button)
INSERT INTO equipment (id, name, type, properties, "imageData", "imageName")
VALUES (
  'button-pusher',
  'Натискач кнопок Cubetouch',
  'button-pusher',
  '{"description": "Для управління пральною машиною та посудомийкою", "gateway": "", "price": 800}',
  'data:image/jpeg;base64,...',
  'button-pusher.jpg'
);

-- 4. Bluetooth Smart Gateway
INSERT INTO equipment (id, name, type, properties, "imageData", "imageName")
VALUES (
  'bluetooth-gateway',
  'Bluetooth Smart Gateway',
  'gateway',
  '{"description": "Для підключення натискача кнопок до інтернету", "gateway": "main", "price": 1200}',
  'data:image/jpeg;base64,...',
  'bluetooth-gateway.jpg'
);
```

## Конвертація картинок в base64

### Варіант 1: Online конвертер

1. Відкрити https://base64.guru/converter/encode/image
2. Завантажити картинку
3. Скопіювати результат у форматі `data:image/jpeg;base64,/9j/4AAQ...`

### Варіант 2: Node.js скрипт

```javascript
const fs = require("fs");
const path = "./image.jpg";
const base64 = fs.readFileSync(path, { encoding: "base64" });
console.log(`data:image/jpeg;base64,${base64}`);
```

## Тестування

1. Запустити сервер: `npm run dev`
2. Відкрити: `http://localhost:3000/settings/appliances`
3. Вибрати галочки приладів зліва
4. Перевірити, що справа з'являються відповідні карточки обладнання
5. Перевірити кількість (наприклад, вибрати і посудомийку, і пральну → має бути 2 натискача)
6. Перевірити, що при виборі посудомийки/пральної з'являється Bluetooth Gateway

## Майбутні покращення

1. ✅ **Сторінка магазину** (`/equipment/shop`)
   - Каталог обладнання
   - Додавання в кошик
   - Оформлення замовлення

2. ✅ **Адмін-панель** для управління обладнанням
   - CRUD операції
   - Завантаження картинок через UI
   - Редагування цін та описів

3. ✅ **Розрахунок вартості**
   - Показувати ціну кожної позиції
   - Загальна сума необхідного обладнання

4. ✅ **Історія замовлень**
   - Збереження замовлень користувача
   - Статус доставки

## Файли

- `prisma/schema.prisma` - схема БД (модель Equipment)
- `src/server/api/routers/equipment.ts` - tRPC API
- `src/lib/equipment-logic.ts` - бізнес-логіка
- `src/pages/settings/appliances.tsx` - UI компонент
- `src/server/api/root.ts` - реєстрація equipment роутера

## Залежності

- Prisma - ORM для роботи з БД
- tRPC - type-safe API
- React useMemo - оптимізація обчислень
- Tailwind CSS - стилізація
