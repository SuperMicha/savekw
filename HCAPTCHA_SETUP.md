# hCaptcha Integration - Setup Guide

## ✅ Completed Steps

### 1. Package Installation

- Installed `@hcaptcha/react-hcaptcha` v1.10.4
- Added React component for hCaptcha widget

### 2. Environment Configuration

- Created `.env.local` file with placeholder
- Added `NEXT_PUBLIC_HCAPTCHA_SITE_KEY` variable

### 3. Auth Context Updates

- Updated `src/lib/auth-context.tsx`
- Added optional `captchaToken` parameter to `signUp()` method
- Added optional `captchaToken` parameter to `signIn()` method
- Both methods now pass the token to Supabase Auth API

### 4. Signup Page Integration

- Updated `src/pages/auth/signup.tsx`
- Imported `HCaptcha` component
- Added state for captcha token (`captchaToken`)
- Added ref for captcha widget (`captchaRef`)
- Added hCaptcha widget to form (before submit button)
- Added captcha validation (checks token exists before submission)
- Passes `captchaToken` to `signUp()` method
- Resets captcha on error

### 5. Signin Page Integration

- Updated `src/pages/auth/signin.tsx`
- Imported `HCaptcha` component
- Added state for captcha token (`captchaToken`)
- Added ref for captcha widget (`captchaRef`)
- Added hCaptcha widget to form (before submit button)
- Added captcha validation (checks token exists before submission)
- Passes `captchaToken` to `signIn()` method
- Resets captcha on error

## 🔧 Required User Action

**Test keys are already configured in `.env.local`:**

The project now uses hCaptcha **test keys** that work on any domain including localhost:

```
NEXT_PUBLIC_HCAPTCHA_SITE_KEY=10000000-ffff-ffff-ffff-000000000001
```

⚠️ **Important for Production:**
Before deploying to production, you must replace test keys with real keys:

1. Get your Site Key from: https://dashboard.hcaptcha.com/
2. Open `.env.local` file
3. Replace the test key with your actual Site Key:
   ```
   NEXT_PUBLIC_HCAPTCHA_SITE_KEY=your_actual_site_key_here
   ```
4. Add your production domain to hCaptcha Dashboard settings

## 🧪 Testing Instructions

1. **Restart Dev Server** (to load new environment variables):

   ```powershell
   npm run dev
   ```

2. **Test Signup Flow**:
   - Navigate to `/auth/signup`
   - Fill in the form (name, email, password)
   - Complete the hCaptcha challenge
   - Click "Зареєструватись"
   - Should successfully create account

3. **Test Signin Flow**:
   - Navigate to `/auth/signin`
   - Enter email and password
   - Complete the hCaptcha challenge
   - Click "Увійти"
   - Should successfully sign in

4. **Test Validation**:
   - Try submitting without completing captcha
   - Should see error: "Будь ласка, пройдіть перевірку hCaptcha"

5. **Test Error Handling**:
   - Enter wrong credentials
   - Captcha should reset (you'll need to complete it again)

## 🔒 Security Benefits

### Bot Protection

- Prevents automated bot signups
- Protects against credential stuffing attacks
- Rate limits malicious attempts

### Supabase Limits Protection

Your Supabase free tier includes:

- **50,000 monthly active users** (MAU)
- **500 MB database storage**
- **2 GB bandwidth**
- **50,000 monthly email sends**

hCaptcha prevents bots from:

- Creating fake accounts (consuming MAU quota)
- Filling database with spam data (consuming storage)
- Triggering verification emails (consuming email quota)

## 📋 How It Works

1. **User visits signup/signin page** → hCaptcha widget loads
2. **User fills form** → User completes captcha challenge
3. **User submits** → Frontend validates captcha token exists
4. **Token sent to Supabase** → `signUp()`/`signIn()` includes `captchaToken`
5. **Supabase validates token** → Checks with hCaptcha API server-side
6. **Token valid** → Account created/login succeeds
7. **Token invalid** → Supabase rejects request, user sees error

## 🎨 Widget Styling

The hCaptcha widget is currently centered and uses default styling. You can customize it by:

1. **Theme**: Add `theme="dark"` or `theme="light"` prop
2. **Size**: Add `size="compact"` or `size="normal"` prop
3. **Container**: Adjust the wrapper div classes

Example with custom styling:

```tsx
<div className="my-4 flex justify-center">
  <HCaptcha
    ref={captchaRef}
    sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ""}
    onVerify={handleCaptchaVerify}
    onExpire={handleCaptchaExpire}
    theme="light"
    size="normal"
  />
</div>
```

## ✅ Integration Complete

All code changes are done! Just add your Site Key to `.env.local` and test the flows.

## 📚 Resources

- **hCaptcha Dashboard**: https://dashboard.hcaptcha.com/
- **hCaptcha React Docs**: https://docs.hcaptcha.com/
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth/auth-captcha
