# Smart Life Quick Start

## For End Users

### 1. Download Smart Life App

- iOS: [App Store](https://apps.apple.com/app/smart-life-smart-living/id1115101477)
- Android: [Google Play](https://play.google.com/store/apps/details?id=com.tuya.smartlife)

### 2. Register Account

- Open Smart Life app
- Create account with email/phone + password
- Verify via code sent to email/SMS

### 3. Add Devices

- Plug in your smart device (Tuya plug or Cubetouch button pusher)
- In app: Tap "+" → Select device type → Follow pairing instructions
- Connect device to your Wi-Fi network

### 4. Get Device IDs

For each device:

- Open device in Smart Life app
- Tap ⚙️ Settings (top right)
- Scroll to "Device Information"
- Copy "Device ID" (20-24 characters)

### 5. Configure in SaveKW

- Go to [Settings → Параметри Smart Life](http://localhost:3000/settings/smartlife)
- Enter Smart Life username (email/phone)
- Enter Smart Life password
- For each device, paste its Device ID
- Click "Зберегти"

### Supported Devices

- **Dishwasher:** Cubetouch button pusher
- **Washing Machine:** Cubetouch button pusher
- **Boiler:** Tuya Wi-Fi smart plug
- **Car Charger:** Tuya Wi-Fi smart plug

---

## For Developers

### API Structure

**Credentials stored in:** `UserProperties.smart_life_creds`

```json
{
  "smart_life_user": "user@example.com",
  "smart_life_pswd": "password123",
  "smart_life_token": "auto_generated_token"
}
```

**Device IDs stored in:** `UserProperties.user_appliances`

```json
[
  {
    "type": "dishwasher",
    "control_device_id": "bf1234567890abcdefgh",
    "control_api": "smart_life"
  }
]
```

### Key Files

- **Frontend:** `src/pages/settings/smartlife.tsx`
- **tRPC Router:** `src/server/api/routers/smartlife.ts`
- **Backend API:** `src/server/parthnersapi/smartlifeapi.ts`
- **Helpers:** `src/lib/appliances.ts` (device descriptions)
- **Docs:** `src/pages/docs/smartlife-setup.tsx`

### Authentication Flow

1. User enters credentials on `/settings/smartlife`
2. Frontend saves credentials + device IDs via `api.properties.set`
3. Frontend calls `api.smartlife.auth` (rate-limited to once per 180 seconds)
4. Backend calls `SmartLifeAuth(user_id)` → POST to Tuya API
5. Token is auto-saved to `smart_life_creds.smart_life_token`
6. Success/error message displayed to user

### Rate Limiting

- **Client-side:** `localStorage` stores timestamp of last auth
- **Limit:** 180 seconds between auth calls
- **UI:** Button disabled with countdown timer

---

## Full Documentation

See [SMART_LIFE_SETUP.md](./SMART_LIFE_SETUP.md) for complete technical documentation.
