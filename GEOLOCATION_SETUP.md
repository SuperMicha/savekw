# Geolocation Setup Guide

## Огляд

Функція геолокації дозволяє системі SaveKW визначати місцезнаходження користувача для отримання актуальних даних про погоду та оптимізації роботи алгоритмів енергозбереження.

## Використані сервіси

### 1. **ipapi.co** (Geo-IP Detection)

- **Призначення**: Автоматичне визначення локації за IP-адресою
- **API**: `https://ipapi.co/json/`
- **Безкоштовно**: До 1000 запитів/день
- **API Key**: Не потрібен

**Приклад відповіді**:

```json
{
  "latitude": 50.4501,
  "longitude": 30.5234,
  "city": "Kyiv",
  "country_name": "Ukraine"
}
```

### 2. **Nominatim** (OpenStreetMap Geocoding)

- **Призначення**: Пошук координат за адресою і навпаки
- **API**:
  - Forward: `https://nominatim.openstreetmap.org/search?format=json&q={address}`
  - Reverse: `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lon}`
- **Безкоштовно**: Необмежено
- **Обмеження**: 1 запит/секунду
- **API Key**: Не потрібен
- **User-Agent**: Рекомендується вказувати у production

**Приклад запиту**:

```typescript
const response = await fetch(
  `https://nominatim.openstreetmap.org/search?format=json&q=Київ,Україна&accept-language=uk&limit=1`,
);
```

### 3. **Leaflet + OpenStreetMap** (Interactive Map)

- **Призначення**: Інтерактивна карта для візуального вибору локації
- **Бібліотека**: `leaflet` v1.9.4
- **Тайли**: OpenStreetMap (безкоштовно)
- **Ліцензія**: BSD 2-Clause
- **CDN для іконок**: `https://unpkg.com/leaflet@1.9.4/dist/images/`

## Структура коду

### Компоненти

#### `src/pages/settings/smartess.tsx`

Головна сторінка з формою налаштувань інвертора та геолокації.

**Стани**:

```typescript
const [latitude, setLatitude] = useState("");
const [longitude, setLongitude] = useState("");
const [address, setAddress] = useState("");
const [isDetectingLocation, setIsDetectingLocation] = useState(false);
```

**Основні функції**:

- `autoDetectLocation()` - Geo-IP визначення
- `forwardGeocode(address)` - Адреса → Координати
- `reverseGeocode(lat, lng)` - Координати → Адреса
- `handleMapMove(lat, lng)` - Обробка переміщення маркера
- `handleAddressSearch()` - Пошук за адресою

#### `src/components/LocationMap.tsx`

React-компонент з Leaflet картою.

**Props**:

```typescript
interface LocationMapProps {
  latitude: number;
  longitude: number;
  onLocationChange: (lat: number, lng: number) => void;
}
```

**Особливості**:

- Використовує `useRef` для збереження інстансів карти та маркера
- Динамічний імпорт через `next/dynamic` (SSR-безпечний)
- Cleanup при unmount
- Draggable marker

### База даних

**Таблиця**: `UserProperties`  
**Поле**: `location`  
**Формат**: `"latitude,longitude"` (наприклад, `"50.4715159,30.7506052"`)

**Приклад збереження**:

```typescript
await api.properties.set.mutate({
  property: "location",
  value: `${latitude.trim()},${longitude.trim()}`,
});
```

**Приклад завантаження**:

```typescript
const { data: locationData } = api.properties.get.useQuery({
  property: "location",
});

if (locationData?.value) {
  const [lat, lng] = locationData.value.split(",");
  setLatitude(lat.trim());
  setLongitude(lng.trim());
}
```

## Workflow користувача

### 1. Автоматичне визначення (за замовчуванням)

```
Користувач відкриває сторінку
     ↓
Якщо locationData порожня
     ↓
autoDetectLocation() викликається автоматично
     ↓
ipapi.co повертає координати
     ↓
Поля заповнюються + reverseGeocode для адреси
```

### 2. Ручне введення координат

```
Користувач вводить latitude/longitude
     ↓
Карта оновлюється
     ↓
reverseGeocode() отримує адресу
```

### 3. Пошук за адресою

```
Користувач вводить "Україна, Львів"
     ↓
Натискає "Пошук"
     ↓
forwardGeocode() викликає Nominatim
     ↓
Координати оновлюються + reverseGeocode
```

### 4. Вибір на карті

```
Користувач перетягує маркер
     ↓
marker.on('dragend') спрацьовує
     ↓
handleMapMove(lat, lng)
     ↓
Поля оновлюються + reverseGeocode
```

## Rate Limiting та Best Practices

### Nominatim

- **Ліміт**: 1 запит/секунду
- **Рекомендація**: Додати debounce для пошуку за адресою
- **User-Agent**: У production додати:
  ```typescript
  headers: {
    'User-Agent': 'SaveKW/1.0 (contact@savekw.com)'
  }
  ```

### ipapi.co

- **Ліміт**: 1000 запитів/день (без реєстрації)
- **Рекомендація**: Кешувати результат у localStorage або викликати лише один раз при першому вході

### Leaflet

- **OpenStreetMap Tile Usage Policy**:
  - Tile loads are free
  - Heavy usage requires tile caching
  - Recommended to host own tile server for production

## Troubleshooting

### Проблема: Карта не відображається

**Рішення**:

1. Перевірте що `leaflet.css` імпортований в `_app.tsx`
2. Перевірте що компонент імпортується через `next/dynamic` з `ssr: false`
3. Перевірте консоль браузера на помилки завантаження іконок

### Проблема: Geo-IP не працює

**Рішення**:

1. Перевірте мережеві запити (може бути блокування CORS)
2. Спробуйте альтернативний сервіс: `https://ip-api.com/json/`
3. Додайте fallback на ручне введення

### Проблема: Nominatim повертає помилку 429

**Рішення**:

1. Додайте затримку між запитами (мінімум 1 секунда)
2. Додайте User-Agent заголовок
3. Розгляньте хостинг власного Nominatim instance

## Майбутні покращення

1. **Кешування Geo-IP** - зберігати результат у localStorage
2. **Debounce для пошуку** - затримка при введенні адреси
3. **Offline режим** - зберігати останню відому локацію
4. **Адреса autocomplete** - dropdown з варіантами при пошуку
5. **Геолокація браузера** - кнопка "Використати мою локацію" через `navigator.geolocation`

## Ресурси

- [Leaflet Documentation](https://leafletjs.com/)
- [Nominatim API Docs](https://nominatim.org/release-docs/latest/api/Overview/)
- [ipapi.co Documentation](https://ipapi.co/api/)
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)
