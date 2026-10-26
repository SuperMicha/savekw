# Smart ESS Integration Guide

## Огляд

Інтеграція Smart ESS дозволяє системі SaveKW автоматично керувати вашим інвертором на основі різних алгоритмів економії електроенергії.

## Налаштування

### Веб-інтерфейс

1. Перейдіть на сторінку [Smart ESS налаштування](/settings/smartess)
2. Заповніть три обов'язкові поля:
   - **Smart ESS User Name**: Ваше ім'я користувача з додатку Smart ESS Monitor
   - **Smart ESS Password**: Ваш пароль від додатку Smart ESS Monitor
   - **Інвертор ID**: Device ID вашого інвертора (можна знайти в додатку)
3. Натисніть кнопку **Зберегти**

### Що відбувається при збереженні

1. **Збереження облікових даних** (`smart_ess_creds`):
   ```json
   {
     "smart_ess_user": "your_username",
     "smart_ess_pswd": "your_password",
     "smart_ess_token": "",
     "smart_ess_secret": ""
   }
   ```
2. **Оновлення Device ID в алгоритмах**:
   - Система автоматично оновлює поле `device_id` в алгоритмах 1 і 2 (якщо вони існують)
   - Якщо алгоритми ще не створені, цей крок пропускається без помилок

3. **Виклик Discovery**:
   - Система підключається до Smart ESS API
   - Виконує аутентифікацію
   - Отримує список пристроїв
   - Налаштовує поля управління інвертором
   - При успіху зберігає додаткові параметри в user properties

## Структура даних

### User Properties

#### `smart_ess_creds`

Облікові дані для підключення до Smart ESS API:

```json
{
  "smart_ess_user": "string",
  "smart_ess_pswd": "string",
  "smart_ess_token": "string",
  "smart_ess_secret": "string"
}
```

#### `smart_ess_devices`

Список підключених інверторів (заповнюється автоматично після Discovery):

```json
[
  {
    "pn": "DGS2300123456",
    "sn": "ESS123456789",
    "devcode": "2304",
    "devaddr": "1"
  }
]
```

#### `output_priority_options`

Налаштування пріоритету виходу (заповнюється автоматично):

```json
{
  "id": "123",
  "item": [
    { "key": "0", "val": "Utility first" },
    { "key": "1", "val": "Solar first" },
    { "key": "2", "val": "Battery first" }
  ]
}
```

#### `charge_source_priority_options`

Налаштування пріоритету заряджання (заповнюється автоматично):

```json
{
  "id": "124",
  "item": [
    { "key": "0", "val": "Utility first" },
    { "key": "1", "val": "Solar first" },
    { "key": "2", "val": "Solar and utility" }
  ]
}
```

### Algorithms

Device ID зберігається в конфігурації алгоритмів:

```json
{
  "algorithm1": {
    "device_id": "DGS2300123456",
    "enabled": true,
    ...
  },
  "algorithm2": {
    "device_id": "DGS2300123456",
    "enabled": true,
    ...
  }
}
```

## API Endpoints

### tRPC Router: `smartess`

#### `smartess.discovery`

Налаштування інвертора через Discovery процес.

**Тип**: Mutation  
**Аутентифікація**: Обов'язкова

**Повертає**:

```typescript
{
  success: boolean;
  message: string;
}
```

**Приклад використання**:

```typescript
const discoveryMutation = api.smartess.discovery.useMutation();

const result = await discoveryMutation.mutateAsync();
if (result.success) {
  console.log("Discovery successful:", result.message);
} else {
  console.error("Discovery failed:", result.message);
}
```

## Backend API (Smartessapi)

### Основні методи

#### `init()`

Ініціалізація API клієнта (отримання baseUrl та companyKey з system settings).

#### `authRequest(user_id: string)`

Аутентифікація користувача в Smart ESS API.

**Параметри**:

- `user_id`: ID користувача з бази даних

**Повертає**:

```typescript
{
  err: number;
  desc?: string;
  dat?: {
    token: string;
    secret: string;
  }
}
```

#### `Discovery(user_id: string)`

Виконує повний цикл налаштування інвертора:

1. Отримує Device ID з алгоритмів
2. Викликає `GetESSdevices()` для отримання списку пристроїв
3. Фільтрує потрібний пристрій за Device ID
4. Викликає `GetDeviceControlFields()` для налаштування полів управління
5. Зберігає результати в user properties

**Параметри**:

- `user_id`: ID користувача

**Повертає**: `boolean` (true = успіх, false = помилка)

#### `setMode(user_id, device_id, out_priority, charge_priority)`

Встановлює режим роботи інвертора.

**Параметри**:

- `user_id`: ID користувача
- `device_id`: ID інвертора
- `out_priority`: Пріоритет виходу ("0", "1", "2")
- `charge_priority`: Пріоритет заряджання ("0", "1", "2")

**Повертає**: `boolean`

#### `GetPvChart(user_id, date)`

Отримує графік виробництва сонячної енергії за день.

**Параметри**:

- `user_id`: ID користувача
- `date`: Дата у форматі YYYY-MM-DD

**Повертає**: Array з даними графіка або null

## Налаштування системи (System Settings)

Для роботи Smart ESS необхідні наступні системні налаштування:

- `dessmonitor_url`: Base URL Smart ESS API
- `dessmonitor_comp_key`: Company Key для Smart ESS API

Ці параметри налаштовуються через адмін-панель або безпосередньо в базі даних.

## Обробка помилок

### Валідація на фронтенді

- Всі три поля (username, password, device_id) обов'язкові
- Порожні або пробільні значення не приймаються

### Помилки Discovery

- Невірні облікові дані → перевірте username/password
- Device ID не знайдено → перевірте правильність Device ID
- Помилка підключення → перевірте інтернет-з'єднання інвертора

### Помилки збереження

- Відображаються користувачу у вигляді зрозумілих повідомлень
- Логуються на сервері для діагностики

## Приклад повного флоу

```typescript
// 1. Користувач заповнює форму
const username = "inverterUser";
const password = "secretPassword";
const deviceId = "DGS2300123456";

// 2. Збереження облікових даних
await saveMutation.mutateAsync({
  property: "smart_ess_creds",
  value: JSON.stringify({
    smart_ess_user: username,
    smart_ess_pswd: password,
    smart_ess_token: "",
    smart_ess_secret: "",
  }),
});

// 3. Оновлення device_id в алгоритмах
const algorithms = await getAlgorithms();
if (algorithms.algorithm1) {
  algorithms.algorithm1.device_id = deviceId;
}
if (algorithms.algorithm2) {
  algorithms.algorithm2.device_id = deviceId;
}
await updateAlgorithms(algorithms);

// 4. Виклик Discovery
const result = await discoveryMutation.mutateAsync();

if (result.success) {
  // Успіх! Інвертор налаштовано
  showSuccessMessage(result.message);
} else {
  // Помилка
  showErrorMessage(result.message);
}
```

## Інструкція для користувачів

Детальну інструкцію для кінцевих користувачів можна знайти на сторінці:

- Веб-версія: `/docs/smartess-setup`
- Вбудована в налаштування: `/settings/smartess` (права колонка)

## Безпека

1. **Паролі зберігаються у відкритому вигляді** в user properties, але:
   - Доступ до user properties тільки через захищені tRPC endpoints
   - Необхідна аутентифікація користувача
   - Кожен користувач бачить тільки свої дані

2. **Токени оновлюються автоматично**:
   - При помилках аутентифікації система автоматично викликає `authRequest()`
   - Нові токени зберігаються в `smart_ess_creds`

3. **Рекомендації**:
   - Використовуйте окремий обліковий запис Smart ESS для кожного інвертора
   - Регулярно змінюйте паролі
   - Не діліться обліковими даними

## Troubleshooting

### Discovery fails repeatedly

1. Перевірте облікові дані в додатку Smart ESS Monitor
2. Переконайтеся, що Device ID правильний
3. Перевірте що інвертор онлайн в додатку
4. Перевірте system settings (`dessmonitor_url`, `dessmonitor_comp_key`)

### Device ID not found

- Device ID може мати різні назви (SN, PN, Serial Number)
- Перевірте технічну документацію інвертора
- Спробуйте різні значення з розділу "Device Info" в додатку

### Algorithms not updated

- Це нормально якщо алгоритми ще не створені
- Device ID буде збережено при першому створенні алгоритмів
- Перевірте `/settings/appliances` для налаштування алгоритмів

## Подальший розвиток

Майбутні можливості:

- [ ] Автоматичне оновлення токенів по розкладу
- [ ] Відображення статусу інвертора в реальному часі
- [ ] Історія команд керування
- [ ] Тестування підключення без збереження
- [ ] Підтримка декількох інверторів на одному акаунті
