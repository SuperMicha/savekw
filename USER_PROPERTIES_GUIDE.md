# User Properties & Appliances System

## 📋 Обзор

Система для хранения гибких настроек пользователя на основе паттерна EAV (Entity-Attribute-Value).

## 🗂️ Структура

### 1. **База данных**

#### `UserProperties` таблица

```prisma
model UserProperties {
  id        String   @id @default(cuid())
  userId    String
  property  String   // Ключ настройки
  value     String   // JSON или текст

  @@unique([userId, property])
}
```

### 2. **API (tRPC)**

#### `properties.get` - Получить свойство

```typescript
const { data } = api.properties.get.useQuery({
  property: "user_appliances",
});
```

#### `properties.set` - Установить свойство

```typescript
const mutation = api.properties.set.useMutation();
await mutation.mutateAsync({
  property: "user_appliances",
  value: JSON.stringify(data),
});
```

#### `properties.getAll` - Получить все свойства

```typescript
const { data } = api.properties.getAll.useQuery();
```

#### `properties.delete` - Удалить свойство

```typescript
const mutation = api.properties.delete.useMutation();
await mutation.mutateAsync({
  property: "user_appliances",
});
```

### 3. **Типы оборудования** (`src/lib/appliances.ts`)

#### Константы

```typescript
export const APPLIANCE_TYPES = {
  ENERGY_METER: "energy_meeter",
  SOLAR_PANEL: "solar_panel",
  INVERTOR: "invertor",
  DISHWASHER: "dishwasher",
  WASHER: "washer",
  BOILER: "boiler",
  CAR_CHARGER: "CarCharger",
} as const;
```

#### Лейблы

```typescript
export const APPLIANCE_LABELS: Record<ApplianceType, string> = {
  energy_meeter: "Двотарифний лічильник",
  solar_panel: "Сонячні панелі",
  // ...
};
```

#### Хелперы

```typescript
// Парсинг JSON из БД
parseAppliancesData(value: string | null): AppliancesData

// Сериализация в JSON
stringifyAppliancesData(data: AppliancesData): string

// Получение доступных алгоритмов на основе выбранного оборудования
getAvailableAlgorithms(
  userAppliances: AppliancesData,
  defaultAlgorithms: DefaultAlgorithms
): Algorithm[]

// Обновление алгоритмов пользователя с сохранением существующих настроек
updateUserAlgorithms(
  currentData: UserAlgorithms | null,
  newData: { algorithms: Algorithm[] }
): UserAlgorithms
```

## 🎨 UI Components

### Страницы настроек

- `/settings` - Редирект на профиль
- `/settings/profile` - Профиль пользователя
- `/settings/appliances` - **Форма выбора оборудования**
- `/settings/wifi` - Параметры WiFi
- `/settings/smartess` - Параметры SmartESS
- `/settings/smartlife` - Параметры Smart Life
- `/settings/algorithms` - Налаштування Алгоритмів
- `/settings/events` - Журнал Подій
- `/settings/support` - Підтримка

### Layout

`SettingsLayout` - боковое меню навигации для всех страниц настроек

## 📝 Формат данных

### user_appliances

```json
[
  { "type": "energy_meeter", "status": true },
  { "type": "dishwasher", "status": false },
  { "type": "washer", "status": false },
  { "type": "boiler", "status": true },
  { "type": "invertor", "status": true },
  { "type": "solar_panel", "status": true },
  { "type": "CarCharger", "status": false }
]
```

### algorithms

Структура алгоритмів користувача:

```json
{
  "general_settings": {
    "sunny_hours_threshold": 6,
    "day_tarif_start": 6,
    "night_tarif_start": 23,
    "active_solar_start": 7,
    "active_solar_end": 17
  },
  "algorithms": [
    {
      "id": 1,
      "device_id": "",
      "description": "Робота інвертора за прогнозом",
      "status": 1,
      "name": "algorithm1",
      "out_priority_nosun": 3,
      "out_priority_sun": 2,
      "charge_priority_nosun": 2,
      "charge_priority_sun": 1,
      "appliances_required": ["energy_meeter", "invertor", "solar_panel"],
      "appliances_absent": [],
      "equipment": [1]
    }
  ]
}
```

## 🚀 Как добавить новое свойство

### 1. Определить ключ

```typescript
export const MY_NEW_SETTING_KEY = "my_new_setting";
```

### 2. Создать типы

```typescript
export interface MyNewSetting {
  enabled: boolean;
  value: string;
}
```

### 3. Создать хелперы

```typescript
export function parseMyNewSetting(value: string | null): MyNewSetting {
  // Парсинг с валидацией
}

export function stringifyMyNewSetting(data: MyNewSetting): string {
  return JSON.stringify(data);
}
```

### 4. Использовать в компоненте

```typescript
const { data } = api.properties.get.useQuery({
  property: MY_NEW_SETTING_KEY,
});

const parsed = parseMyNewSetting(data?.value);
```

## 🔒 Валидация

Валидация JSON происходит:

1. **На фронтенде** - при парсинге через хелперы
2. **На бэкенде** - в `properties.set` mutation (базовая проверка синтаксиса JSON)

## 📊 Примеры использования

### Сохранение настроек оборудования с обновлением алгоритмов

```typescript
import {
  USER_APPLIANCES_KEY,
  USER_ALGORITHMS_KEY,
  stringifyAppliancesData,
  getAvailableAlgorithms,
  updateUserAlgorithms,
  type AppliancesData,
  type DefaultAlgorithms,
  type UserAlgorithms,
} from "@/lib/appliances";

// 1. Получаем default_algorithms из системных настроек
const defaultAlgorithmsData = await utils.systemSettings.get.fetch({
  key: "default_algorithms",
});
const defaultAlgorithms = defaultAlgorithmsData.value as DefaultAlgorithms;

// 2. Вычисляем доступные алгоритмы
const availableAlgorithms = getAvailableAlgorithms(
  appliances,
  defaultAlgorithms,
);

// 3. Проверяем, что есть доступные алгоритмы
if (availableAlgorithms.length === 0) {
  throw new Error("Обрана комбінація обладнання не призведе до економії");
}

// 4. Получаем текущие алгоритмы пользователя
const currentAlgorithmsData = await utils.properties.get.fetch({
  property: USER_ALGORITHMS_KEY,
});
let currentAlgorithms = currentAlgorithmsData?.value
  ? (JSON.parse(currentAlgorithmsData.value) as UserAlgorithms)
  : null;

// 5. Если нет general_settings, берем из defaults
if (!currentAlgorithms?.general_settings) {
  currentAlgorithms = {
    general_settings: defaultAlgorithms.general_settings,
    algorithms: currentAlgorithms?.algorithms || [],
  };
}

// 6. Обновляем алгоритмы
const updatedAlgorithms = updateUserAlgorithms(currentAlgorithms, {
  algorithms: availableAlgorithms,
});

// 7. Сохраняем appliances
await saveMutation.mutateAsync({
  property: USER_APPLIANCES_KEY,
  value: stringifyAppliancesData(appliances),
});

// 8. Сохраняем обновленные алгоритмы
await saveAlgorithmsMutation.mutateAsync({
  property: USER_ALGORITHMS_KEY,
  value: JSON.stringify(updatedAlgorithms),
});
```

### Сохранение настроек оборудования (старый метод, без алгоритмов)

```typescript
import {
  USER_APPLIANCES_KEY,
  stringifyAppliancesData,
  type AppliancesData,
} from "@/lib/appliances";

const appliances: AppliancesData = [
  { type: "energy_meeter", status: true },
  { type: "solar_panel", status: true },
];

const mutation = api.properties.set.useMutation();
await mutation.mutateAsync({
  property: USER_APPLIANCES_KEY,
  value: stringifyAppliancesData(appliances),
});
```

### Чтение настроек оборудования

```typescript
import { USER_APPLIANCES_KEY, parseAppliancesData } from "@/lib/appliances";

const { data } = api.properties.get.useQuery({
  property: USER_APPLIANCES_KEY,
});

const appliances = parseAppliancesData(data?.value);
```

## 🎯 Best Practices

1. **Всегда используйте хелперы** для парсинга/сериализации
2. **Валидируйте данные** при парсинге
3. **Используйте константы** для ключей свойств
4. **Типизируйте** структуры данных
5. **Обрабатывайте ошибки** при парсинге JSON

## 🔄 Миграция данных

Если нужно изменить структуру данных:

1. Обновить хелперы парсинга с поддержкой старого формата
2. Добавить миграцию значений по умолчанию
3. Постепенно переводить пользователей на новый формат

Пример:

```typescript
export function parseAppliancesData(value: string | null): AppliancesData {
  if (!value) return DEFAULT_APPLIANCES;

  const parsed = JSON.parse(value);

  // Поддержка старого формата
  if (isOldFormat(parsed)) {
    return migrateFromOldFormat(parsed);
  }

  return parsed;
}
```
