# Налаштування Forgot Password в Supabase

## Що реалізовано:

### 1. Сторінка входу (`/auth/signin`)

- Кнопка "Забули пароль?" під полем пароля
- Відправка листа для скидання на введений email
- Показ повідомлення про успішну відправку

### 2. Сторінка скидання пароля (`/auth/reset-password`)

- Форма для введення нового пароля
- Валідація пароля (мінімум 6 символів, великі/малі літери, цифри)
- Підтвердження пароля
- Автоматичний редирект на сторінку входу після успішної зміни

### 3. Auth Context (`src/lib/auth-context.tsx`)

Додано методи:

- `resetPassword(email, captchaToken)` - відправка листа для скидання (з перевіркою hCaptcha)
- `updatePassword(newPassword)` - зміна пароля

### 4. hCaptcha інтеграція

- Використовується існуюча hCaptcha з сторінки входу
- **Важливо:** Користувач має пройти captcha перед натисканням "Забули пароль?"
- Captcha token передається в Supabase для валідації

## Налаштування Supabase Dashboard:

### Крок 1: Налаштування Redirect URLs

1. Відкрийте https://supabase.com/dashboard
2. Виберіть ваш проект
3. Перейдіть в **Authentication** → **URL Configuration**
4. Додайте в **Redirect URLs**:
   ```
   http://localhost:3000/auth/reset-password
   https://yourdomain.com/auth/reset-password
   ```

### Крок 2: Налаштування Email Templates (опціонально)

1. Перейдіть в **Authentication** → **Email Templates**
2. Виберіть **Reset Password** template
3. Можете кастомізувати текст листа
4. Переконайтеся що `{{ .ConfirmationURL }}` присутній в шаблоні

### Крок 3: Перевірка SMTP налаштувань

1. Перейдіть в **Project Settings** → **Auth**
2. Секція **SMTP Settings**
3. Переконайтеся що SMTP налаштовано або використовується Supabase SMTP

## Як це працює:

### User Flow:

1. **Користувач забув пароль:**
   - Відкриває `/auth/signin`
   - Вводить email
   - **Проходить hCaptcha перевірку** ⚠️
   - Натискає "Забули пароль?"

2. **Supabase відправляє email:**
   - На email приходить лист з посиланням
   - Посилання веде на `/auth/reset-password?token=...`

3. **Користувач встановлює новий пароль:**
   - Відкривається `/auth/reset-password`
   - Вводить новий пароль (двічі)
   - Натискає "Змінити пароль"

4. **Редирект на вхід:**
   - Після успішної зміни - редирект на `/auth/signin`
   - Користувач входить з новим паролем

## Технічні деталі:

### API виклики:

```typescript
// Відправка листа для скидання (з captcha токеном)
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
  captchaToken, // hCaptcha token для валідації
});

// Зміна пароля (користувач має бути авторизований через recovery token)
const { error } = await supabase.auth.updateUser({
  password: newPassword,
});
```

### Валідація пароля:

- Мінімум 6 символів
- Великі літери (A-Z)
- Малі літери (a-z)
- Цифри (0-9)
- Паролі мають співпадати

### Безпека:

✅ Recovery token в URL автоматично обробляється Supabase  
✅ Token одноразовий і має термін дії  
✅ Старий пароль не потрібен (користувач підтверджує через email)  
✅ Після зміни всі активні сесії залишаються активними

## Тестування:

### Local Development:

1. Запустіть dev server: `npm run dev`
2. Відкрийте http://localhost:3000/auth/signin
3. Введіть email існуючого користувача
4. **Пройдіть hCaptcha перевірку** ⚠️
5. Натисніть "Забули пароль?"
6. Перевірте email (або Supabase Dashboard → Authentication → Logs)
7. Скопіюйте посилання з email
8. Відкрийте посилання
9. Встановіть новий пароль
10. Спробуйте увійти з новим паролем

### Перевірка email в Supabase:

Якщо email не приходить:

1. Перевірте **Authentication** → **Logs** в Supabase Dashboard
2. Перевірте SMTP налаштування
3. Перевірте spam/junk папку
4. Для тестування можна використати [Mailtrap](https://mailtrap.io/)

### Альтернатива для тестування (без email):

Якщо email не налаштовано, можна отримати recovery link з Dashboard:

1. Відкрийте **Authentication** → **Logs** в Supabase Dashboard
2. Знайдіть подію `/recover` з вашим запитом
3. У деталях події має бути **recovery link** або **confirmation URL**
4. Скопіюйте цей URL і відкрийте в браузері
5. Або використайте **Authentication** → **Users** → виберіть користувача → **Send password recovery email**

**Також можна тимчасово додати console.log для debug:**

```typescript
// В auth-context.tsx, в resetPassword():
const result = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
  captchaToken,
});
console.log("Reset password result:", result); // Подивіться що повертає
```

## Можливі помилки:

### "captcha verification process failed"

- hCaptcha не пройдено або токен недійсний
- **Рішення:** Пройдіть hCaptcha перевірку перед натисканням "Забули пароль?"

### "Invalid reset password link"

- Token застарів (зазвичай діє 1 годину)
- Посилання вже використано
- **Рішення:** Запросити новий лист для скидання

### "SMTP not configured"

- Supabase не може відправити email
- **Рішення:** Налаштуйте SMTP в Project Settings

### "Redirect URL not allowed"

- URL не додано в Redirect URLs
- **Рішення:** Додайте URL в Dashboard → Authentication → URL Configuration

### Лист приходить з затримкою або в spam

- Gmail/Outlook можуть позначати Supabase листи як підозрілі
- **Рішення для production:**
  1. Налаштуйте власний SMTP (SendGrid, AWS SES, Mailgun)
  2. Додайте SPF/DKIM records для вашого домену
  3. Використайте власний email домен замість Supabase
- **Для development:** Перевіряйте spam папку або використайте [Mailtrap](https://mailtrap.io/)

### "Недійсне посилання для скидання пароля" після переходу з email

- Токен може бути невалідний або застарілий
- Supabase використовує PKCE flow який вимагає правильної обробки
- **Рішення:** Оновлена версія `reset-password.tsx` перевіряє як hash parameters так і активну сесію
- Токени діють 1 годину, після чого потрібно запросити новий лист

## Додаткові можливості (можна додати):

1. **Rate limiting** - обмеження кількості запитів на скидання
2. **Email верифікація** - вимагати підтвердження email перед скиданням
3. **2FA** - двофакторна автентифікація
4. **Історія паролів** - заборона повторного використання старих паролів
5. **Нотифікація про зміну** - email про успішну зміну пароля
