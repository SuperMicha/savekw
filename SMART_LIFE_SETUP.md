# Smart Life Integration Setup Guide

## Overview

This document describes the Smart Life integration in the SaveKW application. Smart Life is a home automation platform by Tuya that allows control of various smart devices (smart plugs, button pushers, etc.).

---

## Table of Contents

1. [Data Structure](#data-structure)
2. [API Endpoints](#api-endpoints)
3. [Frontend Components](#frontend-components)
4. [Backend Integration](#backend-integration)
5. [Rate Limiting](#rate-limiting)
6. [Supported Devices](#supported-devices)
7. [User Flow](#user-flow)

---

## Data Structure

### SmartLifeCreds (stored in UserProperties)

Property: `smart_life_creds`

```json
{
  "smart_life_user": "user@example.com",
  "smart_life_pswd": "password123",
  "smart_life_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Fields:**

- `smart_life_user`: Email or phone number used for Smart Life account
- `smart_life_pswd`: Password for Smart Life account
- `smart_life_token`: OAuth access token (auto-generated after successful auth, expires after some time)

### User Appliances (stored in UserProperties)

Property: `user_appliances`

Devices with `control_api: "smart_life"`:

```json
[
  {
    "type": "dishwasher",
    "status": false,
    "control_device_id": "bf1234567890abcdefgh",
    "control_api": "smart_life"
  },
  {
    "type": "washer",
    "status": false,
    "control_device_id": "bf0987654321hgfedcba",
    "control_api": "smart_life"
  },
  {
    "type": "boiler",
    "status": false,
    "control_device_id": "bf5555666677778888",
    "control_api": "smart_life"
  },
  {
    "type": "CarCharger",
    "status": false,
    "control_device_id": "bf9999000011112222",
    "control_api": "smart_life"
  }
]
```

**Fields:**

- `type`: Device type (see [Supported Devices](#supported-devices))
- `status`: Boolean, whether the device is currently enabled
- `control_device_id`: Device ID from Smart Life app (20-24 characters)
- `control_api`: Always `"smart_life"` for Smart Life devices

---

## API Endpoints

### tRPC Router: `smartlife`

Located in: `src/server/api/routers/smartlife.ts`

#### `smartlife.auth` (Mutation)

Authenticates the user with Smart Life API and retrieves an access token.

**Input:** None (uses `ctx.user.id` from protected procedure)

**Output:**

```typescript
{
  success: boolean;
  message: string;
}
```

**Rate Limit:** Once per 180 seconds (enforced client-side via localStorage)

**Backend Implementation:**

- Calls `SmartLifeAPI.SmartLifeAuth(user_id)`
- Auto-saves token to `smart_life_creds.smart_life_token`

**Usage:**

```typescript
const authMutation = api.smartlife.auth.useMutation();
const result = await authMutation.mutateAsync();
```

---

## Frontend Components

### Page: `/settings/smartlife`

Location: `src/pages/settings/smartlife.tsx`

**Features:**

- Username/password input with password visibility toggle (eye icon)
- Dynamic device list (filtered by `control_api: "smart_life"`)
- Device ID input fields for each Smart Life device
- Save button with 180-second rate limit timer
- Success/error notifications

**State Management:**

- Uses `api.properties.get` to load `smart_life_creds` and `user_appliances`
- Uses `api.properties.set` to update credentials and device IDs
- Uses `api.smartlife.auth` to authenticate with Smart Life API
- Uses `localStorage` to track last auth timestamp for rate limiting

**Client-side Rate Limiting:**

```typescript
const RATE_LIMIT_KEY = "smartlife_last_auth";
const RATE_LIMIT_SECONDS = 180;

// Save timestamp on auth
localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());

// Check remaining time
const lastAuth = localStorage.getItem(RATE_LIMIT_KEY);
const elapsed = Math.floor((Date.now() - parseInt(lastAuth)) / 1000);
const remaining = RATE_LIMIT_SECONDS - elapsed;
```

---

## Backend Integration

### SmartLifeAPI Class

Location: `src/server/parthnersapi/smartlifeapi.ts`

#### `SmartLifeAuth(user_id: string)`

Authenticates with Smart Life API and retrieves access token.

**Flow:**

1. Loads `smart_life_creds` from `UserProperties` for the given `user_id`
2. Sends POST request to `https://px1.tuyaeu.com/homeassistant/auth.do`
3. Parses response and extracts `access_token`
4. Saves token back to `smart_life_creds.smart_life_token`
5. Returns response object

**Request Parameters:**

- `userName`: User's email or phone (URL-encoded)
- `password`: User's password (URL-encoded)
- `countryCode`: `44` (UK)
- `bizType`: `smart_life`
- `from`: `tuya`

**Response Structure:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "responseStatus": "success" | "error"
}
```

**Error Handling:**

- If `response.access_token` is `null` or `responseStatus === "error"`, authentication failed
- Common errors: incorrect username/password, network issues, rate limiting from Tuya API

---

## Rate Limiting

**Why 180 seconds?**

Smart Life API (Tuya) has strict rate limits to prevent abuse. Calling the auth endpoint too frequently may result in temporary account suspension or API blocking.

**Implementation:**

- **Client-side:** `localStorage` stores timestamp of last auth call
- **Server-side:** No enforcement (trusts client to respect limit)
- **UI:** Button is disabled and shows countdown timer when rate limit is active

**Note:** Rate limit is per-browser (localStorage is browser-specific). If user switches browsers, they can auth again immediately.

---

## Supported Devices

Devices that can be controlled via Smart Life API:

| Device Type     | `type` value | Description                                               |
| --------------- | ------------ | --------------------------------------------------------- |
| Dishwasher      | `dishwasher` | Cubetouch button pusher for controlling a dishwasher      |
| Washing Machine | `washer`     | Cubetouch button pusher for controlling a washing machine |
| Boiler          | `boiler`     | Tuya Wi-Fi smart plug for controlling a boiler            |
| Car Charger     | `CarCharger` | Tuya Wi-Fi smart plug for electric vehicle charging       |

**Device Descriptions (Ukrainian):**

Stored in: `src/lib/appliances.ts`

```typescript
export const SMARTLIFE_DEVICE_DESCRIPTIONS: Partial<
  Record<ApplianceType, string>
> = {
  dishwasher: "Натискач кнопок Cubetouch для керування посудомийною машиною",
  washer: "Натискач кнопок Cubetouch для керування пральною машиною",
  boiler: "Wi-Fi розетка Tuya для керування роботою бойлера",
  CarCharger: "Wi-Fi розетка Tuya для зарядки електромобіля",
};
```

---

## User Flow

### Setup Flow:

1. **User opens `/settings/smartlife`**
   - Page loads existing credentials from `smart_life_creds`
   - Page loads device list from `user_appliances` (filtered by `control_api: "smart_life"`)

2. **User enters credentials**
   - Username (email/phone)
   - Password (with visibility toggle)

3. **User enters Device IDs**
   - For each Smart Life device, user enters the Device ID from Smart Life app
   - Device ID can be found in Smart Life app: Device Settings → Device Information → Device ID

4. **User clicks "Save"**
   - Frontend validates that username and password are not empty
   - Frontend checks rate limit (180 seconds since last auth)
   - If rate limit active, shows error and countdown timer

5. **Backend saves data**
   - `smart_life_creds` is updated with new username/password
   - `user_appliances` is updated with new Device IDs for Smart Life devices

6. **Backend authenticates with Smart Life**
   - Calls `SmartLifeAuth(user_id)`
   - Retrieves access token and saves to `smart_life_creds.smart_life_token`

7. **Success/Error handling**
   - If auth successful: Show success message, update UI
   - If auth failed: Show error message with instructions to check username/password

---

## Documentation Pages

### User-facing Documentation

**Location:** `/docs/smartlife-setup`

**File:** `src/pages/docs/smartlife-setup.tsx`

**Content:**

- How to download Smart Life app
- How to register an account
- How to add devices to Smart Life
- How to find Device ID
- Step-by-step setup instructions for SaveKW
- Supported device types
- Troubleshooting tips

**Access:** Public page (no authentication required), embedded in iframe on settings page

---

## Example Code

### Loading Credentials

```typescript
const { data: credsData } = api.properties.get.useQuery(
  { property: "smart_life_creds" },
  { refetchOnWindowFocus: false },
);

useEffect(() => {
  if (credsData?.value) {
    const creds = JSON.parse(credsData.value) as SmartLifeCreds;
    setUsername(creds.smart_life_user || "");
    setPassword(creds.smart_life_pswd || "");
  }
}, [credsData]);
```

### Saving Credentials and Device IDs

```typescript
// Save credentials
const creds: SmartLifeCreds = {
  smart_life_user: username.trim(),
  smart_life_pswd: password.trim(),
  smart_life_token: "",
};

await saveMutation.mutateAsync({
  property: "smart_life_creds",
  value: JSON.stringify(creds),
});

// Update device IDs
const appliances = JSON.parse(appliancesData.value) as ApplianceItem[];
const updatedAppliances = appliances.map((item) => {
  if (item.control_api === "smart_life") {
    const deviceInForm = devices.find((d) => d.type === item.type);
    if (deviceInForm) {
      return {
        ...item,
        control_device_id: deviceInForm.control_device_id || "",
      };
    }
  }
  return item;
});

await saveMutation.mutateAsync({
  property: "user_appliances",
  value: JSON.stringify(updatedAppliances),
});
```

### Authenticating with Smart Life

```typescript
localStorage.setItem(RATE_LIMIT_KEY, Date.now().toString());
setRemainingSeconds(RATE_LIMIT_SECONDS);

const authResult = await authMutation.mutateAsync();

if (authResult.success) {
  // Success!
} else {
  // Show error
  setError(authResult.message);
}
```

---

## Troubleshooting

### Common Issues:

1. **"Невірне ім'я користувача або пароль"**
   - User entered wrong credentials
   - Check that username/password match Smart Life account

2. **Rate limit error**
   - User tried to authenticate within 180 seconds of previous attempt
   - Wait for countdown to finish

3. **Network errors**
   - Tuya API may be temporarily unavailable
   - Check internet connection
   - Try again later

4. **Token expires**
   - Access tokens from Smart Life API expire after some time
   - User needs to re-authenticate to get a new token
   - System automatically refreshes token on next auth call

---

## Future Improvements

- [ ] Server-side rate limiting (in addition to client-side)
- [ ] Auto-refresh token before expiration
- [ ] Device status polling (check if devices are online)
- [ ] Device control UI (turn devices on/off manually)
- [ ] Multi-user support (multiple Smart Life accounts)
- [ ] Error logging for failed auth attempts

---

## Security Notes

- Passwords are stored in plain text in `UserProperties` (consider encryption in future)
- Access tokens are stored in database (consider secure vault storage)
- API uses HTTPS for all requests to Tuya servers
- Client-side rate limiting can be bypassed (consider server-side enforcement)

---

## References

- [Smart Life App (iOS)](https://apps.apple.com/app/smart-life-smart-living/id1115101477)
- [Smart Life App (Android)](https://play.google.com/store/apps/details?id=com.tuya.smartlife)
- [Tuya IoT Platform](https://iot.tuya.com/)
