## Web -> Mobile Auth Parity Checklist

### Endpoints and payload contracts
- Login: `POST /api/auth/login` with `{ phone, password }`
- Register: `POST /api/auth/register` with `{ phone, password, name, surname, age }`
- Refresh: `POST /api/auth/refresh` with `{ refreshToken }`
- Request reset: `POST /api/auth/request-reset` with `{ phone }`
- Confirm reset: `POST /api/auth/confirm-reset` with `{ phone, code, newPassword }`

### Validation parity
- Login requires `phone` and `password`
- Login phone keeps digits only and requires at least 9 digits
- Register requires all fields: `name`, `surname`, `phone`, `password`, `confirmPassword`, `age`
- Register password minimum length: 6
- Register `password === confirmPassword`
- Register age must be numeric and `>= 12`

### Button states parity
- Submit buttons are disabled while request is in progress
- Login submit disabled when phone or password is empty, or phone has fewer than 9 digits
- Register submit disabled when request is in progress or registration is successful
- Loading labels:
  - Login: `Kiritilmoqda...`
  - Register: `Yaratilmoqda...`
  - Register success redirect state: `Yo'naltirilmoqda...`

### Error and success parity
- Login `401`: `Telefon raqam yoki parol noto'g'ri. Qayta urinib ko'ring.`
- Login `403`: `Sizning akkauntingiz bloklangan yoki faollashtirilmagan.`
- Login fallback API error: `data.message` or generic login error
- Login network error: `Serverga ulanib bo'lmadi. Internet aloqangizni tekshiring va qayta urinib ko'ring.`
- Register fallback API error: `data.message` or generic register error
- Register network error: same connectivity message as login
- Register success state then redirect intent to login with registered flag

### Navigation parity
- Login success goes to protected area (`/messages` on web)
- Register success returns to login with success context
- Login has route link to register
- Register has route link to login
