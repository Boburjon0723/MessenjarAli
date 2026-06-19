# ExpertLine — To'liq Arxitektura Hujjati

> **ExpertLine** — mutaxassislar (ekspertlar, ustozlar, huquqshunoslar, psixologlar) bilan mijozlarni bog'lovchi xavfsiz konsultatsiya va o'qitish platformasi. Real vaqt chat, video qo'ng'iroqlar (LiveKit), ichki to'lov tizimi (MALI token + escrow), Telegram OTP tasdiqlash va ko'p platformali kirish (Web + Desktop + Mobile) bilan jihozlangan.

---

## Mundarija

1. [Loyiha haqida umumiy ma'lumot](#1-loyiha-haqida-umumiy-malumot)
2. [Yuqori darajadagi arxitektura](#2-yuqori-darajadagi-arxitektura)
3. [Texnologiyalar steki](#3-texnologiyalar-steki)
4. [Repository tuzilishi](#4-repository-tuzilishi)
5. [Backend arxitekturasi](#5-backend-arxitekturasi)
6. [Ma'lumotlar bazasi (Data layer)](#6-malumotlar-bazasi-data-layer)
7. [Real-time qatlam (Socket.IO + Redis)](#7-real-time-qatlam-socketio--redis)
8. [Video / Live konsultatsiya (LiveKit)](#8-video--live-konsultatsiya-livekit)
9. [Token va Escrow tizimi (Wallet)](#9-token-va-escrow-tizimi-wallet)
10. [Autentifikatsiya va xavfsizlik](#10-autentifikatsiya-va-xavfsizlik)
11. [Telegram Bot integratsiyasi](#11-telegram-bot-integratsiyasi)
12. [Frontend (Next.js + Electron)](#12-frontend-nextjs--electron)
13. [Mobile App (Expo / React Native)](#13-mobile-app-expo--react-native)
14. [Fayl yuklash va saqlash](#14-fayl-yuklash-va-saqlash)
15. [API yo'nalishlari (Routes)](#15-api-yonalishlari-routes)
16. [Deploy va infratuzilma](#16-deploy-va-infratuzilma)
17. [Konfiguratsiya (Environment variables)](#17-konfiguratsiya-environment-variables)
18. [Kuzatuv va xavfsizlik (Observability)](#18-kuzatuv-va-xavfsizlik-observability)
19. [Yo'l xaritasi (Roadmap)](#19-yol-xaritasi-roadmap)

---

## 1. Loyiha haqida umumiy ma'lumot

**ExpertLine** quyidagi asosiy domenlarni qamrab oladi:

| Domen | Tavsif |
|-------|--------|
| **Auth** | Telefon raqam + parol bilan ro'yxatdan o'tish, Telegram OTP tasdiqlash, JWT (access + refresh), parolni tiklash. |
| **Chat** | Shaxsiy (private), guruh (group) va kanal (channel) chatlar, xabarlar, oxirgi xabar holati, "yozmoqda" va "online" indikatorlari. |
| **Expert profile** | Mutaxassis profili: diplom, sertifikat, kasb, yo'nalish, narx (MALI token), tildagi xizmatlar, soatlik tarif. |
| **Booking / Service** | Mutaxassis xizmatlarini bron qilish, ish e'lonlari (Jobs), P2P savdo (listing-deal). |
| **Wallet** | Ichki MALI token, balans, escrow (hold/release/refund), tranzaksiyalar, platforma komissiyasi. |
| **Live session** | Video sessiyalar (LiveKit Cloud), ekran ulashish, yozib olish (Egress → S3), darslik materiali, viktorina (quiz). |
| **Notifications** | Real-time (socket) + Firebase push (mobile), ichki bildirishnomalar jadvali. |
| **Admin** | Mutaxassisni tasdiqlash, foydalanuvchi nazorati, audit log, platforma sozlamalari (komissiya, obuna). |
| **Bot API** | Tashqi botlar uchun `Authorization: Bot <token>` API kirishi. |

---

## 2. Yuqori darajadagi arxitektura

```
                                ┌──────────────────────────────┐
                                │     KLIENTLAR (Clients)      │
                                └──────────────────────────────┘
                                  │            │            │
                ┌─────────────────┘            │            └─────────────────┐
                ▼                              ▼                              ▼
        ┌───────────────┐              ┌───────────────┐              ┌───────────────┐
        │  Web (Next.js) │              │  Desktop     │              │  Mobile      │
        │  + PWA         │              │  (Electron)  │              │  (Expo / RN) │
        └───────┬────────┘              └───────┬──────┘              └───────┬──────┘
                │   HTTPS (REST)                │                              │
                │   WSS  (Socket.IO)            │  (frontend `out/`            │  (REST + WSS
                │                               │   ichida xosting)            │   + Expo push)
                └─────────────┬─────────────────┴──────────────────────────────┘
                              ▼
                  ┌───────────────────────────┐         ┌────────────────────────┐
                  │   Backend (Node.js)       │ ◀────▶ │  Redis (cache, pub/sub,│
                  │   Express 5 + Socket.IO   │         │  online presence,      │
                  │   - REST API              │         │  socket.io adapter)    │
                  │   - WebSocket             │         └────────────────────────┘
                  │   - Swagger              │
                  └─────────┬─────────────────┘
                            │
        ┌───────────────────┼─────────────────────┬──────────────────────┐
        ▼                   ▼                     ▼                      ▼
┌───────────────┐  ┌────────────────┐   ┌──────────────────┐   ┌─────────────────┐
│ PostgreSQL    │  │ LiveKit Cloud  │   │ AWS S3 / Supabase│   │ Firebase Admin  │
│ (Supabase /   │  │ (WebRTC, SFU,  │   │ Storage (faylar, │   │ (FCM push)      │
│  Railway)     │  │  Egress S3)    │   │ media, recordings)│  │                 │
└───────────────┘  └────────────────┘   └──────────────────┘   └─────────────────┘
        ▲
        │ HTTP (internal)
        ▼
┌───────────────────────┐
│ Telegram Bot service  │
│ (Node + node-telegram │
│  -bot-api + Express)  │
└───────────────────────┘
```

---

## 3. Texnologiyalar steki

### Backend
- **Node.js + TypeScript** (`commonjs`, TS 5.9)
- **Express 5** — REST API
- **Socket.IO 4.8** — real-time, **`@socket.io/redis-adapter`** bilan klasterlash
- **PostgreSQL** (`pg`) — asosiy ma'lumotlar bazasi
- **Mongoose** — ixtiyoriy (faqat skriptlar va eski kontaktlar uchun)
- **Redis** — cache, online presence, rate-limit, pub/sub adapter
- **JWT** (`jsonwebtoken`) + **bcryptjs**
- **Helmet**, **CORS**, **Morgan** — xavfsizlik va logging
- **express-rate-limit** + **rate-limit-redis**
- **Multer** — fayl yuklash
- **Swagger** (`swagger-jsdoc` + `swagger-ui-express`) — `/api/docs`
- **LiveKit Server SDK** — video token + Egress
- **Firebase Admin** — push bildirishnoma

### Frontend (Web + Desktop)
- **Next.js 16** (App Router) + **React 19**
- **TailwindCSS 4**
- **Socket.IO client**
- **LiveKit components-react + livekit-client**
- **lucide-react** — ikonkalar
- **date-fns**, **jspdf**, **classnames**
- **Electron 40** + **electron-builder** (NSIS) — desktop variant
- **PWA** (`manifest.json`, service worker)

### Mobile
- **Expo 54** + **React Native 0.81**
- **React Navigation** (native-stack)
- **Zustand** — state
- **@livekit/react-native** + **@livekit/react-native-webrtc**
- **expo-secure-store** — token saqlash, app passcode
- **expo-notifications** — push
- **expo-image-picker**, **expo-document-picker**, **expo-file-system**

### Bot
- **node-telegram-bot-api** + **express** + **axios**

---

## 4. Repository tuzilishi

```
expertline/
├── backend/                        # API server (Node.js + Express + Socket.IO)
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/        # HTTP handlerlar (auth, chat, wallet, ...)
│   │   │   └── routes/             # Express router fayllari
│   │   ├── config/                 # database, redis, firebase, swagger
│   │   ├── middleware/             # auth, rate-limit, upload, cache
│   │   ├── models/
│   │   │   ├── postgres/           # PG model wrapperlari (User, Chat, ...)
│   │   │   └── mongo/              # Mongoose modellar (legacy)
│   │   ├── services/               # Business logic (token, escrow, livekit, ...)
│   │   ├── socket/socket.service.ts  # Socket.IO event handlerlar
│   │   ├── migrations/             # Imperative migration helpers
│   │   ├── utils/
│   │   ├── app.ts                  # Express ilova konfiguratsiyasi
│   │   └── index.ts                # Bootstrap + auto-migration + Socket.IO
│   ├── migrations/                 # SQL migrationlar
│   ├── uploads/                    # Local fayl xotirasi (dev)
│   ├── scripts/                    # Maintenance skriptlar
│   ├── database_schema.sql         # Boshlang'ich sxema
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                       # Next.js + Electron (Web/Desktop)
│   ├── src/
│   │   ├── app/                    # App Router sahifalari
│   │   │   ├── AdminZero0723s/     # Admin panel (yashirin yo'l)
│   │   │   ├── api/                # Next.js route handlerlari
│   │   │   ├── login/  register/
│   │   │   ├── messages/           # Chat sahifasi (~88 KB)
│   │   │   └── layout.tsx, page.tsx
│   │   ├── components/             # auth, chat, dashboard, jobs, pwa, ui
│   │   ├── context/                # Socket, Notification, Confirm, Language
│   │   ├── hooks/
│   │   └── lib/                    # api, auth-storage, chat-cache, translations
│   ├── electron/                   # Desktop wrapper
│   ├── public/
│   ├── next.config.ts
│   └── package.json
│
├── mobile-app/                     # Expo / React Native
│   ├── src/
│   │   ├── features/
│   │   │   ├── auth/               # Login, Register, Passcode + locale
│   │   │   ├── chat/               # ChatList, ChatDetail, Settings, Theme
│   │   │   ├── dashboard/          # Profile, Wallet, ExpertDetail, Theme
│   │   │   └── jobs/               # JobList
│   │   ├── components/             # AvatarImage, CachedImage, ChatBackground
│   │   ├── lib/                    # api, socket, notifications, storage
│   │   └── store/                  # Zustand (chatStore)
│   ├── App.tsx                     # Navigation root
│   ├── eas.json                    # EAS Build profilelari
│   └── app.json
│
├── messenjrali-tasdiqlash-bot/     # Telegram bot xizmati
│   ├── index.js                    # Bot + internal HTTP API
│   └── package.json
│
├── fix_dashboard.py                # Maintenance utility
├── .gitignore
└── package.json                    # Root (workspace meta)
```

---

## 5. Backend arxitekturasi

### 5.1 Ilova bootstrap oqimi (`backend/src/index.ts` + `app.ts`)

1. **`dotenv/config`** — env yuklanadi.
2. **`app.ts`** — Express ilova:
   - `trust proxy: 1` (Railway proxy uchun).
   - `express.json({ limit: '32mb' })`, `urlencoded`.
   - **CORS** — `CORS_ORIGINS` + barcha `*.vercel.app` ruxsat etiladi.
   - **Helmet** (`crossOriginResourcePolicy: cross-origin`).
   - **Global rate limiter** (`globalLimiter`).
   - **Morgan** logging (prod: `tiny`, dev: `dev`).
   - **Statik** `/uploads`.
   - **Swagger UI** — `setupSwagger(app)`.
   - 25+ route modullarini ulash (`/api/...`).
3. **`http.createServer(app)`** + **Socket.IO** ishga tushiriladi.
4. **Redis adapter** — agar `REDIS_URL` mavjud bo'lsa, Socket.IO multi-instance rejimga o'tadi.
5. **`SocketService(io)`** — barcha realtime event'lar qayd qilinadi.
6. **`runAutoMigration()`** — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ko'rinishidagi imperative migration'lar har bir ishga tushishda chaqiriladi (idempotent).
7. **`server.listen(PORT)`** — odatda Railway tomonidan beriladigan port.

### 5.2 Qatlamli model

```
HTTP Request
   ↓
[ Middleware: helmet, cors, rate-limit, auth, cache, upload ]
   ↓
[ Route ] (api/routes/*.routes.ts)
   ↓
[ Controller ] (api/controllers/*.controller.ts)
   ↓
[ Service ] (services/*.service.ts)        ← business logic, transaksiyalar
   ↓
[ Model ] (models/postgres/*.ts)           ← SQL query'lar (parametrlangan)
   ↓
PostgreSQL
```

Yon kanallar:
- **Socket.IO** → `socket/socket.service.ts` to'g'ridan-to'g'ri modelga murojaat qiladi va kanallarga emit qiladi.
- **Redis** → `config/redis.ts` (`safeGet/Set/Del`, online presence, cache cleanup).

### 5.3 Asosiy servislar (`src/services/`)

| Servis | Vazifa |
|--------|--------|
| **`token.service.ts`** | MALI token transferi (ACID: `BEGIN` + `SELECT FOR UPDATE`), 1% P2P komissiyasi, platform balance hisobi, mutaxassis obunasi (oylik). |
| **`escrow.service.ts`** | Pulni "hold" qilish, "release" (mutaxassisga + platforma komissiyasi 5%), "refund". Har bir bosqich uchun `transactions` jadvalida yozuv. |
| **`livekitRecording.service.ts`** | LiveKit Room Composite Egress orqali sessiyani S3 ga MP4 yozish. `startRoomCompositeRecording`, `stopRoomRecordingAndResolveUrl`. |
| **`consultSession.service.ts`** | Konsultatsiya sessiya hayot-sikli (start, end, expert ↔ client). |
| **`notification.service.ts`** | DB ga bildirishnoma yozish + Firebase push yuborish. |
| **`video.service.ts`** | Jitsi fallback (LiveKit yo'q bo'lsa). |

### 5.4 Middleware

- **`auth.middleware.ts`** — `authenticateToken`: `Authorization: Bearer <jwt>` ni tekshiradi va `req.user` ga yozadi.
- **`rateLimit.middleware.ts`** — `globalLimiter`, `authLimiter`. Redis bo'lsa `rate-limit-redis` orqali shared store.
- **`cache.middleware.ts`** — GET cheklangan response'larni Redis'ga keshlash.
- **`upload.middleware.ts`** — Multer (in-memory) — keyin Supabase/S3 ga uzatish.

---

## 6. Ma'lumotlar bazasi (Data layer)

### 6.1 PostgreSQL (asosiy)

Ulanish — `backend/src/config/database.ts`, Pool: `max: 20`, idle/connect timeout 30s, SSL `rejectUnauthorized: false` (Supabase/Railway uchun).

**Asosiy jadvallar** (tahlilga ko'ra ~25+):

| Jadval | Maqsadi |
|--------|---------|
| `users` | Asosiy foydalanuvchi (phone unique, password_hash, role). |
| `user_profiles` | Ekspert/foydalanuvchi profili (is_expert, profession, hourly_rate, diplom URL, services_json, ...). |
| `token_balances` | Wallet: balance, locked_balance, lifetime_earned/spent, pin_hash. |
| `platform_balance` | Yagona satr (id=1) — platforma yig'ilgan komissiya. |
| `platform_settings` | Komissiya foizi, ekspert oylik obunasi va h.k. |
| `user_contacts` | Foydalanuvchi kontaktlari (custom_name/surname). |
| `jobs` + `job_categories` | Ish e'lonlari + kategoriya. |
| `services` | Ekspert xizmatlari (price_mali, duration). |
| `chats`, `chat_participants` | Chat metadata + a'zolar. |
| `messages`, `chat_messages` | Asosiy va sessiya chat xabarlari. |
| `escrow` | Hold/release/refund holatlari. |
| `transactions` | Hamma pul harakatlari (type: transfer, escrow_hold, escrow_release, subscription, ...). |
| `sessions`, `live_sessions` | Bron qilingan va jonli (LiveKit) sessiyalar. |
| `session_materials` | Sessiya darsligi: fayl URL, type, hajmi. |
| `quizzes` | Mentor tomonidan yaratilgan testlar. |
| `notifications` | Foydalanuvchi bildirishnomalari. |
| `expert_reviews` | Mijoz bahosi (1–5 yulduz + izoh). |
| `specialist_notes` | Mutaxassisning xususiy yozuvlari. |
| `student_mentor_subscriptions` | 30 kunlik o'quvchi-ustoz obunasi. |
| `password_reset_codes` | OTP (Telegram orqali). |
| `phone_verification_codes` | Telefon raqamni ro'yxatga olish OTP. |
| `admin_login_audit` | Admin kirishini audit qilish (IP, UA, sabab). |
| `bots` | Tashqi botlar (`token_hash` orqali API kirish). |
| `case_folders`, `whiteboard_snapshots` | Mutaxassis ish jildlari va doska. |

**Ikki migration strategiyasi**:
1. **`backend/migrations/*.sql`** — qo'lda ishga tushiriladigan SQL (`ALL_RECENT_MIGRATIONS.sql`).
2. **`runAutoMigration()`** (`backend/src/index.ts`) — har bir start'da `ADD COLUMN IF NOT EXISTS`, `CREATE TABLE IF NOT EXISTS` orqali sxemani moslash. Mahalliy va prod muhitlarda yo'qotmaslik uchun ishlatiladi.

**`SELECT FOR UPDATE`** orqali pul harakatlarida row-level lock qo'llaniladi (`token.service`, `escrow.service`).

### 6.2 MongoDB (legacy / ixtiyoriy)

- `models/mongo/`: `Chat.ts`, `Message.ts`, `Group.ts` — eski kontakt migration skriptlari va ba'zi keshlash ishlari uchun (asosiy oqimda ishlatilmaydi).
- `MONGODB_URI` ixtiyoriy.

### 6.3 Redis

- **Cache** — kalit prefiks: `cache:*`. Vaqt: 60–900s.
- **Online presence** — `mali_online_users` (HASH: `userId → socketCount`).
- **Rate-limit store** — multi-instance uchun.
- **Socket.IO adapter** (`@socket.io/redis-adapter`) — bir nechta backend instans bo'lsa, ular bir-biriga emit ko'rishi uchun pub/sub.
- Agar `REDIS_URL` yo'q bo'lsa, ilova **gracefully** ishlaydi (no-op).

---

## 7. Real-time qatlam (Socket.IO + Redis)

**Fayl**: `backend/src/socket/socket.service.ts` (~52 KB).

### 7.1 Ulanish (handshake)
- Klient `auth: { token }` yoki `query.token` orqali JWT yuboradi.
- `jwt.verify(token, JWT_SECRET)` → `socket.user = decoded`.
- Token noto'g'ri / yo'q bo'lsa: `next(new Error(...))`.
- Transports: `['websocket', 'polling']`, `pingTimeout: 60s`, `pingInterval: 25s`.

### 7.2 Asosiy event'lar

| Event (klient → server) | Maqsadi |
|--------------------------|---------|
| `join_chat`, `leave_chat` | Chat room'iga kirish/chiqish. |
| `send_message` | Yangi xabar (DB ga yozish + emit + push notification). |
| `typing`, `stop_typing` | Indikator. |
| `mark_read` | Xabar o'qildi sifatida belgilash. |
| `session:join`, `session:leave` | LiveKit xona ID'siga ulanish. |
| `session:start_recording`, `session:stop_recording` | Mentor tomonidan yozib olishni boshqarish. |
| `session:raise_hand` | Talaba qo'l ko'tarish (mutex `verifyUserCanControlSession`). |
| `session:control_mic` | Ekspert talaba mikrofonini boshqaradi. |
| `balance_updated` | Wallet o'zgargach broadcast. |

| Event (server → klient) | Maqsadi |
|--------------------------|---------|
| `message:new`, `message:deleted`, `message:edited` | Chatdagi o'zgarishlar. |
| `chat:updated` | Last message metadata. |
| `presence:online`, `presence:offline` | Online holat. |
| `notification:new` | Yangi bildirishnoma. |
| `session:state` | LiveKit sessiya holati (started, recording, ended). |
| `balance_updated` | Yangi balans. |

### 7.3 Presence va o'qildi-belgisi
- `addUserToOnline(userId, socketId)` / `removeUserFromOnline` — Redis hash counter.
- `disconnect` da agar foydalanuvchi oxirgi socket bo'lsa — barcha mos chat'larga `offline` emit qilinadi.

---

## 8. Video / Live konsultatsiya (LiveKit)

### 8.1 Token yaratish
- **GET** `/api/livekit/token?room=<sessionId>&identity=<userId>`
- `backend/src/api/controllers/livekit.controller.ts` → `AccessToken` (LiveKit server SDK) hosil qiladi, `grant: { roomJoin, room, canPublish, canSubscribe }`.

### 8.2 Sessiya hayot-sikli
1. **Ekspert** chat orqali "boshlash" tugmasini bosadi → `livekit/token` olinadi → LiveKit xonaga ulanadi.
2. Boshqa a'zolar ham chat orqali "qo'shilish" tugmasidan kiradi.
3. **Yozib olish (ixtiyoriy)** — `POST /api/sessions/:id/record/start`:
   - `EgressClient.startRoomCompositeEgress` → S3 `mali-lessons/<sid>/<ts>.mp4`.
   - `live_sessions.egress_id`, `recording_staging_key` saqlanadi.
4. **Tugatish** — `POST /api/sessions/:id/record/stop`:
   - `stopEgress` → S3 URL aniqlanadi.
   - `live_sessions.status = 'recorded'`, `recording_url` saqlanadi.
   - `recording-done` orqali guruh chatiga "Dars yozuvi tayyor" xabari yuboriladi.
5. **Fallback**: agar LiveKit yo'q bo'lsa — `JITSI_DOMAIN` bilan oddiy Jitsi link.

### 8.3 Mobile WebRTC
- `App.tsx` da `NativeModules.WebRTCModule` mavjud bo'lsa `@livekit/react-native-webrtc` `registerGlobals()` chaqiriladi (faqat development build / EAS native build'da ishlaydi, Expo Go'da emas).

---

## 9. Token va Escrow tizimi (Wallet)

### 9.1 MALI token
- Ichki birlik: `MALI` (`token_balances.balance DECIMAL(20,4)`).
- Tashqi kassa tushumi: hozircha rejalashtirilgan (Click/Payme keyingi bosqich).

### 9.2 P2P transfer (`TokenService.transferTokens`)
1. `BEGIN`
2. `SELECT balance FROM token_balances WHERE user_id = $sender FOR UPDATE`
3. Balans tekshiruvi
4. **fee = amount * 0.01** (1% P2P)
5. Sender'dan ayirish, receiver'ga `netAmount` qo'shish, platform'ga fee
6. `transactions` jadvaliga 2 ta yozuv (sender debit / receiver credit)
7. `COMMIT` → `NotificationService.send(...)` chaqiriladi
8. `balance_updated` socket event ikkala foydalanuvchiga.

### 9.3 Escrow oqimi (`EscrowService`)
- **Hold**: `balance -= amount`, `locked_balance += amount`, `escrow.status = 'held'`.
- **Release**:
  - `commission = amount * SERVICE_COMMISSION_PERCENTAGE` (5%)
  - Mutaxassis `net = amount - commission` oladi, platforma komissiyani oladi.
  - `escrow.status = 'released'`.
- **Refund**: `locked_balance` mijozning `balance`'iga qaytariladi, `escrow.status = 'refunded'`.

### 9.4 Mutaxassis obunasi
- `MENTOR_MONTHLY_MALI=100` — har oy ekspert hisobidan platforma foydasiga avtomatik o'tkaziladi (`student_mentor_subscriptions`).

---

## 10. Autentifikatsiya va xavfsizlik

### 10.1 JWT siyosati
- **Access token** — `JWT_SECRET`, `expiresIn: NEXT_PUBLIC_JWT_EXPIRES_IN` (default `1d`).
- **Refresh token** — `JWT_REFRESH_SECRET`, `expiresIn: NEXT_PUBLIC_JWT_REFRESH_EXPIRES_IN` (default `7d`), `users.refresh_token` ga hash qilib saqlanadi.
- Klient: web — `localStorage`/`cookie`, mobile — `expo-secure-store`.

### 10.2 Ro'yxatdan o'tish oqimi
1. **`POST /api/auth/register`** — telefon + parol + ism. `phone_verification_codes` ga OTP yoziladi.
2. **Telegram bot** orqali kod yetkaziladi (`POST /internal/send-registration-code` → bot → user).
3. **`POST /api/auth/verify-registration`** — OTP tasdiqlash → `users.phone_verified = true` → access + refresh qaytariladi.
4. **`POST /api/auth/resend-registration-otp`** — qayta yuborish.
5. **`/auth/registration-status`** — frontend polling uchun.

### 10.3 Parolni tiklash
- **`POST /api/auth/request-reset`** → `password_reset_codes` + bot orqali kod yuborish.
- **`POST /api/auth/confirm-reset`** → OTP + yangi parol → `password_hash` yangilanadi.

### 10.4 Boshqa himoyalar
- **Helmet** + qattiq CORS allow-list.
- **Rate-limit** — login (`authLimiter`), umumiy (`globalLimiter`), Redis store bo'lsa multi-instance.
- **Admin audit** — `admin_login_audit` (IP, User-Agent, success/reason).
- **App passcode** (mobile) — `expo-secure-store` da SHA-2 hash (faqat ilova ichida).
- **Bot API token** — `Authorization: Bot <token>` (`bots.token_hash` bilan bcrypt taqqoslash).

---

## 11. Telegram Bot integratsiyasi

**Xizmat**: `messenjrali-tasdiqlash-bot/index.js`

### 11.1 Vazifalari
1. **Foydalanuvchini bog'lash** (`/start` → link kodi → `POST /api/auth/link-telegram` → `users.telegram_chat_id` saqlanadi).
2. **Telefon raqamni yangilash** (`/phone` → `request_contact` → `POST /api/bot/update-phone`).
3. **Reset OTP yetkazib berish** (`POST /internal/send-reset-code` — faqat backend chaqira oladi, `x-bot-control-token` orqali).
4. **Ro'yxatdan o'tish OTP** (`POST /internal/send-registration-code`).

### 11.2 Tokenlar
- `BOT_TOKEN` — Telegram BotFather token (bot polling uchun).
- `BOT_CONTROL_TOKEN` — backend → bot internal API.
- `BOT_LINK_TOKEN` — bot → backend `link-telegram`.
- `BOT_API_TOKEN` — bot → backend `update-phone`.

### 11.3 Ulanish topologiyasi
```
Backend  ──HTTP──▶  Bot service (Express:8080)
   ▲                    │
   │                    ▼
   └──HTTP──── User ◀── Telegram Bot API (polling)
```

---

## 12. Frontend (Next.js + Electron)

### 12.1 Tuzilma
- **Next.js App Router** (`src/app/`).
- Asosiy sahifalar:
  - `/` (`page.tsx`) — landing.
  - `/login`, `/register`.
  - `/messages` — chat (~88 KB monolit page).
  - `/AdminZero0723s` — admin panel (yashirin URL — ~101 KB).
- **Context providers** (`src/context/`): `SocketContext`, `NotificationContext`, `ConfirmContext`, `LanguageContext` — `layout.tsx` da ichma-ich joylashgan.
- **`lib/`** — domain logikasi:
  - `api.ts` — `fetch` wrapper (`Authorization` + base URL).
  - `auth-storage.ts` — token + user persist.
  - `chat-message-cache.ts` — IndexedDB cache (`~28 KB`).
  - `translations.ts` (uz, ru — 130+ KB) + `LanguageContext`.
  - `expert-roles.ts`, `service-terms`, `expert-compliance-copy`.

### 12.2 PWA
- `manifest.json`, `icon-192`, `apple-touch-icon`.
- `appleWebApp.statusBarStyle: 'black-translucent'`, `viewport.themeColor: '#0f172a'`.
- `viewportFit: 'cover'` (mobil notch).

### 12.3 Desktop (Electron)
- `frontend/electron/main.js` (entry).
- `npm run dist` → Next.js `out/` ni Electron asar ichida paketlaydi.
- `electron-builder` (NSIS, Windows).
- `appId: com.mali.messenger`, `productName: MaliDesktop`.

### 12.4 Real-time
- `SocketContext` ulanishi `NEXT_PUBLIC_BACKEND_URL` ga ulanadi, JWT'ni auth orqali uzatadi.
- Chat keshi bilan optimistic update — server tasdiqlasa "delivered" indikatori.

---

## 13. Mobile App (Expo / React Native)

### 13.1 Navigatsiya
- `@react-navigation/native-stack` (App.tsx da Root Stack).
- Ekranlar: `Login → Register → Passcode → Messages → ChatDetail → ChatPeerInfo → Settings → ThemeDesign → Profile → Wallet → LanguageSettings → DataStorageSettings → PrivacySettings → NotificationSettings → AboutApp → Support → Jobs → JobDetail → ExpertDetail`.

### 13.2 State va saqlash
- **Zustand** — `chatStore.ts`.
- **`expo-secure-store`** — `accessToken`, `refreshToken`, `app_passcode_key`.
- **AsyncStorage** — non-sensitive sozlamalar (tema, til).
- **`appearance-store.ts`** — chat fon rasmi va tema.

### 13.3 Realtime
- `src/lib/socket.ts` — `io(BACKEND_URL, { auth: { token } })`.
- App fonidan qaytganda **AppState** orqali passcode lock triggeri (App.tsx).

### 13.4 Push bildirishnoma
- `expo-notifications` — `setupNotifications()` App start'da.
- Token backend'ga yuboriladi (`/api/notifications/register-device`).

### 13.5 Build
- **`eas.json`** — dev / preview / production profillari.
- WebRTC native modullar uchun `expo-dev-client` kerak (Expo Go ishlamaydi).

---

## 14. Fayl yuklash va saqlash

| Vositasi | Maqsadi |
|----------|---------|
| **Multer (in-memory)** | HTTP `multipart/form-data` qabul qilish. |
| **`/uploads`** (local) | Faqat development; statik berib qo'yiladi (`express.static`). |
| **Supabase Storage** | Diplom, sertifikat, avatar, kichik media (ko'p ishlatiladi). |
| **AWS S3** | LiveKit sessiya yozuvlari (`LIVEKIT_RECORDINGS_BUCKET`). |
| **Firebase Storage** | Ixtiyoriy (ba'zi modullar uchun). |

API: `POST /api/upload`, `POST /api/media`, `POST /api/uploads/...` — controller'lar:
`upload.controller.ts`, `chat.controller.ts` (xabar uchun fayl).

---

## 15. API yo'nalishlari (Routes)

`backend/src/api/routes/*.routes.ts` (25+ modul). Asosiy guruhlar:

```
/api/health                       health.routes
/api/auth/*                       auth.routes        (register, login, refresh, otp, telegram-link)
/api/users/*                      user.routes        (me, update, search, contacts)
/api/admin/*                      admin.routes      (verify expert, settings, audit)
/api/chats/*                      chat.routes        (CRUD, messages, search, read, leave)
/api/token/*                      token.routes       (transfer, pin, recovery)
/api/wallet/*                     wallet.routes      (balance, settings, transactions)
/api/service/*                    service.routes
/api/listing-deals/*              listing-deal.routes (P2P savdo)
/api/p2p/*                        p2p.routes
/api/jobs/*                       job.routes         (CRUD + apply)
/api/specialists/*                specialist.routes
/api/notifications/*              notification.routes
/api/expenses/*                   expense.routes
/api/reviews/*                    review.routes
/api/sessions/*                   session.routes     (history, chat, recording start/stop)
/api/livekit/*                    livekit.routes     (token, end-session)
/api/quiz/*                       quiz.routes
/api/escrow/*                     escrow.routes
/api/media/*                      media.routes
/api/upload/*                     upload.routes
/api/desktop/*                    desktop.routes
/api/bot/*                        bot.routes        (Telegram bot endpoints)
/api/botApi/*                     botApi.routes     (Authorization: Bot <token>)
/api/video/*                      video.routes
/api/docs                         Swagger UI
```

Hammasi `authenticateToken` middleware bilan himoyalangan (`auth`, `health`, `ping`, bot endpointlaridan tashqari).

---

## 16. Deploy va infratuzilma

### 16.1 Backend
- **Railway** (yoki shunga o'xshash) — Dockerfile / native Node detect.
- **Build**: `npm run build` → `dist/`.
- **Start**: `node dist/index.js`.
- **Root Directory**: `backend`.
- **Trust proxy: 1** + Railway forward headers.

### 16.2 Frontend (Web)
- **Vercel** (`vercel.json` mavjud).
- Build: `next build` → SSR/ISR + statik export (`out/`).
- Allowed origins: `*.vercel.app` (CORS'da).

### 16.3 Frontend (Desktop)
- **GitHub Actions** + `electron-builder` (NSIS, Windows).
- Output: `frontend/dist/MaliDesktop-Setup-*.exe`.

### 16.4 Mobile
- **EAS Build** (Expo) — `eas.json`.
- iOS/Android **dev-client** zarur (LiveKit native modullari).
- Push: Expo Push + Firebase.

### 16.5 Bot
- Alohida Railway/Heroku xizmati (Express:8080).
- `BOT_TOKEN`, `BACKEND_URL`, `BOT_CONTROL_TOKEN`, `BOT_LINK_TOKEN`, `BOT_API_TOKEN` env.

### 16.6 Ma'lumotlar bazasi
- **Supabase Postgres** (yoki Railway managed PG).
- `migrations/ALL_RECENT_MIGRATIONS.sql` deploy'dan oldin/keyin ishga tushiriladi.

---

## 17. Konfiguratsiya (Environment variables)

### 17.1 Backend (`backend/.env`)

```bash
# Database
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require

# Server
PORT=4000
NODE_ENV=production
CORS_ORIGINS=https://app.expertline.uz,https://expertline.vercel.app
SOCKET_CORS_ORIGINS=https://app.expertline.uz

# Auth
JWT_SECRET=<random 64+ chars>
JWT_REFRESH_SECRET=<random 64+ chars>
NEXT_PUBLIC_JWT_EXPIRES_IN=1d
NEXT_PUBLIC_JWT_REFRESH_EXPIRES_IN=7d

# Redis (optional)
REDIS_URL=redis://default:pass@host:6379

# LiveKit
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
LIVEKIT_URL=wss://your-project.livekit.cloud

# LiveKit → S3 recordings
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
LIVEKIT_RECORDINGS_BUCKET=expertline-recordings
RECORDING_PUBLIC_BASE_URL=https://cdn.expertline.uz

# Firebase (push)
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
FIREBASE_STORAGE_BUCKET=expertline.appspot.com

# Telegram bot integratsiyasi
BOT_SERVICE_URL=https://bot.expertline.uz
BOT_CONTROL_TOKEN=<random>
BOT_LINK_TOKEN=<random>

# Business
MENTOR_MONTHLY_MALI=100
SERVICE_COMMISSION_PERCENTAGE=0.05

# Fallback video
JITSI_DOMAIN=meet.jit.si
```

### 17.2 Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_BACKEND_URL=https://api.expertline.uz
NEXT_PUBLIC_WS_URL=wss://api.expertline.uz
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 17.3 Mobile (`mobile-app/.env`)

```bash
EXPO_PUBLIC_BACKEND_URL=https://api.expertline.uz
EXPO_PUBLIC_WS_URL=wss://api.expertline.uz
EXPO_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 17.4 Bot (`messenjrali-tasdiqlash-bot/.env`)

```bash
BOT_TOKEN=123456:AA...
BACKEND_URL=https://api.expertline.uz
BOT_CONTROL_TOKEN=<random>
BOT_LINK_TOKEN=<random>
BOT_API_TOKEN=<random>
PORT=8080
```

---

## 18. Kuzatuv va xavfsizlik (Observability)

### 18.1 Logging
- **Morgan** — `tiny` (prod) / `dev` (local).
- `console.error` PG / Redis xatolarini yozadi (uncrashable: `pool.on('error')` faqat warning).

### 18.2 Health endpoint
- `GET /api/health` — DB + Redis + LiveKit konfiguratsiya bayrog'i.
- `GET /api/ping` — diagnostika.

### 18.3 Swagger
- `setupSwagger(app)` → `/api/docs`.
- JSDoc bloklari controller/route fayllarida.

### 18.4 Audit
- `admin_login_audit` — har bir admin urinishini yozadi.
- `transactions` — moliyaviy audit log (immutable, faqat insert).

### 18.5 Xavfsizlik tavsiyalari
1. Production'da `JWT_SECRET` va `JWT_REFRESH_SECRET` ni har xil va kuchli qiling.
2. `BOT_CONTROL_TOKEN` — qattiq xavfsizlik (faqat backend → bot internal).
3. `database_schema.sql` boshlang'ich qadam — qolgani migration orqali.
4. Bot's `update-phone` endpoint `Authorization: Bot <token>` siz **rad qilinishi kerak**.
5. CORS faqat aniq domainlar bilan cheklang (production).
6. `helmet` + `csp` (frontend manbalari) ni production'da kuchaytiring.

---

## 19. Yo'l xaritasi (Roadmap)

### Yaqinda
- [ ] Migration system'ni **`node-pg-migrate`** yoki **`knex`** ga ko'chirish (idempotent SQL fayllar bilan).
- [ ] **TypeScript strict** rejimini yoqish (asta-sekin).
- [ ] **API client** ni OpenAPI'dan generate qilish (web + mobile).
- [ ] **Test coverage** — backend uchun Vitest/Jest + supertest.

### O'rta muddatli
- [ ] **Click / Payme integratsiyasi** — MALI tokenni real puldan to'ldirish.
- [ ] **AI-yordamchi** — mutaxassisni tavsiya qilish (vector search).
- [ ] **Video sessiya tahliliy paneli** — davomat, ekran vaqti, viktorina natijasi.
- [ ] **i18n** — uz, ru, en, qq, krg.

### Uzoq muddatli
- [ ] **iOS / Android store** chiqarish.
- [ ] **Microservice'larga bo'lish** — wallet, chat, video alohida.
- [ ] **Kubernetes + Helm chart** — to'liq IaC.
- [ ] **End-to-end shifrlash** (Signal protocol) shaxsiy chatlar uchun.

---

## Qo'shimcha foydali fayllar

| Fayl | Tavsif |
|------|--------|
| `backend/DEPLOY_GUIDE.md` | Umumiy deploy yo'riqnomasi. |
| `backend/RAILWAY_DEPLOY.md` | Railway uchun aniq qadamlar. |
| `backend/database_schema.sql` | Boshlang'ich PG sxemasi. |
| `backend/migrations/ALL_RECENT_MIGRATIONS.sql` | Yangi sxema o'zgarishlari. |
| `mobile-app/docs/` | Mobile uchun ichki hujjatlar. |

---

**Versiya:** 1.0  
**Yangilangan:** 2026-05-11  
**Mualliflar:** ExpertLine jamoasi (Mali Team)
