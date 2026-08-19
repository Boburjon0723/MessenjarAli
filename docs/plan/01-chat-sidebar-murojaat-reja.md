# ExpertLine — Chat sidebar, murojaat va marketplace reja

**Maqsad:** Telegram Desktop uslubidagi chat ro‘yxati + Ishlar/Mutaxassislar bo‘limidan kelgan murojaatlar uchun alohida bo‘limlar, maxfiylik, to‘lov va qo‘ng‘iroq qoidalari.

**Holat:** Implementatsiya davom etmoqda  
**Sana:** 2026-08-19 (yangilangan: 2026-08-19, ko'p band bajarildi)  
**Bog‘liq fayllar:** `ChatList.tsx`, `MessagesPageContent.tsx`, `JobsPanel.tsx`, `listing-chat.ts`, `ChatWindowBanners.tsx`, `ListingDealBar.tsx`, `chat-calls.ts`, `consultPanel.service.ts`, `UserInfoPanel.tsx`, `ChatPreCallModal.tsx`, `ChatCarouselPanel.tsx`

---

## 1. Hozirgi holat (qisqa audit)

| Soha | Hozir | Muammo |
|------|-------|--------|
| Tab joylashuvi | Web: tablar chat ro‘yxati **pastida** | Telegram: qidiruv **tagida** |
| Tablar qidiruvda | Qidiruv yozilganda tablar yashirinadi | Telegramda tablar qoladi |
| Murojaat bo‘limi | Yo‘q — faqat oddiy chatlar ro‘yxati | E’lon/mutaxassis murojaatlari aralash |
| Murojaat ko‘rinishi | Chat metadata (`expert_listing` / `job_listing`) | Qabul qilinguncha alohida bo‘lim yo‘q |
| Tel raqam | Mutaxassis listing chatida yashirilgan | Ish e’loni chatida hali to‘liq yashirilmagan |
| Qo‘ng‘iroq | Barcha shaxsiy chatlarda ochiq | Listing/murojaat chatlarida yopiq bo‘lishi kerak |
| To‘lov | `ListingDealBar` + `service_sessions` | Birlashtirish va “qayta ko‘rib chiqish” UX zaif |
| Panel taklifi | Eski `consult_panel_invite` / `lesson_start` tugmalari doim faol | Yangi sessiya boshlanganda eskilar yopilishi kerak |
| Profil rasmi | `UserInfoPanel` — kattalashtirish yo‘q | Telegram: bosganda lightbox |
| Chat almashish animatsiyasi | `0.42s` carousel (`globals.css`) | Sekinroq, silliqroq o‘tish kerak |
| Kontakt qo‘shish (listing) | Telefon ko‘rsatiladi deb o‘ylangan | **Telefon ko‘rsatmasdan** saqlash — faqat ism/username |
| Pre-call modal | `ChatPreCallModal` bor | **Butunlay olib tashlash** |
| Qo‘ng‘iroq UI | Hozirgi qorong‘u overlay | Telegram uslubi gradient + pastki 4 tugma |
| Mutaxassis formasi | `ProfileExpertModal` — katta padding | **Ixchamroq** UX (2-rasm) |
| O‘z profili | `ProfileViewer` — katta bloklar | **Ixchamroq** UX (3-rasm) |
| Qo‘ng‘iroq ovozi | Kiruvchi qo‘ng‘iroq ring bor (`callRingRef`) | Chiquvchi tomonda ham to‘liq ovoz kerak |
| Rozilik modeli | Yo‘q — xabarlar darhol ochiq | **Ikki tomon roziligi** kerak (xabar, ovoz, video) |
| Qo‘ng‘iroq sharti | Barcha private chatda | Faqat mijoz mutaxassisni **kontaktga saqlagan** bo‘lsa |

---

## 2. Maqsadli UX (Telegram + ExpertLine)

### 2.1 Chat sidebar tartibi (web)

```
┌─────────────────────────────────┐
│ [☰]  [ Qidirish...           ] │  ← sticky header
├─────────────────────────────────┤
│ Barchasi │ Shaxsiy │ Guruhlar │ Kanallar │   ← TABLAR (qidiruv tagida)
├─────────────────────────────────┤
│ 📁 Arxiv (faqat Barchasi)       │
│ 💬 Chat 1                       │
│ 💬 Chat 2                       │
│ ...                             │
├─────────────────────────────────┤
│ 📋 Murojaatlar (shartli)        │  ← YANGI bo‘lim (§3)
└─────────────────────────────────┘
```

**Qoidalar:**
- Tablar **doim** ko‘rinadi (qidiruvda ham), faqat ro‘yxat filtrlanadi.
- `Barchasi` = barcha turlar (arxivdan tashqari).
- `Shaxsiy` = `type: private` va **listing/murojaat chatlari emas** (yoki ixtiyoriy: murojaatlar alohida bo‘limda bo‘lsa, shaxsiydan chiqariladi).
- `Guruhlar` / `Kanallar` = hozirgi `matchesFolder` mantiq.
- Mobile: allaqachon qidiruv tagida chip — web bilan bir xil qilish.

### 2.2 Yangi sidebar bo‘limlari

| Bo‘lim | Kim ko‘radi | Qachon ko‘rinadi |
|--------|-------------|------------------|
| **Murojaatlarim** (murojatchi) | Ish izlovchi / mijoz | Kamida 1 ta **qabul qilingan** murojaat chat bor |
| **Murojaatlar** (mutaxassis) | Tasdiqlangan mutaxassis | Kamida 1 ta listing orqali kelgan chat |
| **Arizalar** (ish beruvchi) | E’lon egasi | Kamida 1 ta `job_listing` + `intent: apply` chat |

**Muhim:** Bo‘lim **faqat shart bajarilganda** paydo bo‘ladi — bo‘sh bo‘lsa ko‘rinmaydi.

---

## 3. Murojaat hayotiy sikli (status modeli)

Hozir faqat `chats.metadata` bor. Reja: metadata ga **status** qo‘shish (DB migratsiyasiz JSONB ichida).

### 3.1 Metadata kengaytmasi

```typescript
// chats.metadata (murojaat/listing chatlar uchun)
{
  source: 'expert_listing' | 'job_listing',
  expert_id?: string,
  job_id?: string,
  poster_id?: string,
  intent: 'consult' | 'apply' | 'chat',
  snapshot: { ... },

  // YANGI
  application_status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled',
  accepted_at?: string,      // ISO
  accepted_by?: string,      // user id (mutaxassis / ish beruvchi)
  listing_chat_kind: 'marketplace',  // sidebar filtri uchun
}
```

### 3.2 Status o‘tishlar

```
[Murojaat yuborildi]  →  pending     (chat yaratiladi, intro xabar)
        ↓
[Mutaxassis/Ish beruvchi qabul qildi]  →  accepted   (murojaat bo‘limida ko‘rinadi)
        ↓
[Xizmat tugadi / ariza yopildi]  →  completed
        ↓
[Rad etildi]  →  rejected  (murojaat bo‘limida ko‘rinmaydi; ixtiyoriy: “Rad etilganlar” arxivi)
```

**Qabul qilish triggerlari (hozirgi kod bilan bog‘lash):**
- Mutaxassis: dashboard **“Qabul xabari”** / `consult_panel_invite` yuborilganda → `application_status: accepted`
- Ish beruvchi: yangi **“Arizani qabul qilish”** tugmasi (hali yo‘q) → `accepted`
- To‘lov so‘rovi yuborilganda ham `accepted` deb hisoblash mumkin (product qarori)

### 3.3 Sidebar filtrlash

```typescript
// Murojatchi bo‘limi
isApplicantSectionChat(chat, me) =>
  isListingChat(chat) &&
  chat.metadata.application_status === 'accepted' &&
  !isExpert(me) && !isJobPoster(me, chat)

// Mutaxassis bo‘limi
isExpertInboxChat(chat, me) =>
  isExpertListingChat(chat) &&
  chat.metadata.expert_id === me.id

// Ish beruvchi bo‘limi
isEmployerInboxChat(chat, me) =>
  isJobListingChat(chat) &&
  chat.metadata.poster_id === me.id &&
  chat.metadata.intent === 'apply'
```

---

## 4. Maxfiylik — telefon raqam

### 4.1 Qoidalar

| Rol | Ko‘radimi | Izoh |
|-----|-----------|------|
| Murojatchi → mutaxassis | **Yo‘q** | Faqat snapshot (kasb, pitch, narx) |
| Murojatchi → ish beruvchi | **Yo‘q** | Job snapshot + username |
| Mutaxassis → murojatchi | **Yo‘q** (listing chat) | `listing_privacy: true` — hozir bor |
| Ish beruvchi → ariza beruvchi | **Yo‘q** | **QO‘SHISH KERAK** — job listing uchun ham |
| Kontakt qo‘shilgandan keyin | **Yo‘q** (listing chatda) | Listing chat maxfiyligi kontaktdan ustun |
| Oddiy shaxsiy chat | Ha | Standart Telegram |

### 4.2 Texnik vazifalar

- [x] `chat.controller.ts` → `enrichPrivateChatRow`: `job_listing` uchun ham telefon maskalash
- [x] `UserInfoPanel.tsx`: job listing uchun `listingIntro` rejimi
- [x] `GET /api/users/:id`: listing chat ishtirokchisi bo‘lsa telefon qaytarmaslik (server-side)
- [x] Qidiruv: listing peer telefon bo‘yicha topilmasin

---

## 5. Chat ichidagi funksiyalar cheklovi

### 5.1 Qo‘ng‘iroq — qattiq cheklovlar (TASDIQLANGAN)

**Asosiy qoida:** Ovozli va video qo‘ng‘iroq **default yopiq**. Faqat quyidagi shartlar **barchasi** bajarilganda ochiladi:

1. **Ikki tomon roziligi** — `messaging_unlocked` (§5.4)
2. **Kontakt sharti (mijoz tomoni)** — mijoz mutaxassisning telefon raqamini **kontaktga saqlagan** (`/api/users/contacts` da peer bor)
3. **Listing/murojaat chat emas** yoki `application_status === 'accepted'` + rozilik berilgan
4. **`CHAT_CALLS_ALLOWED !== false`**

**Mutaxassis paneli:** Xizmat xonasi (LiveKit) alohida — marketplace chat qo‘ng‘irog‘i emas; faqat `consult_panel_invite` / to‘langan sessiya orqali.

**UserInfoPanel (1-rasm):** “Ovozli chaqiruv” tugmasi profil panelida ham **yashirin** bo‘ladi, agar kontakt+rozilik sharti bajarilmasa.

**Pre-call:** **BUTUNLAY OLIB TASHLASH** (TASDIQLANGAN) — `ChatPreCallModal` o‘chiriladi; header yoki profil panelidan bosilganda darhol `ChatCallOverlay` ochiladi.

**Qo‘ng‘iroq ekrani (Telegram taqlidi — 1-rasm, 1:1 emas):**
- [x] `ChatCallOverlay.tsx` qayta dizayn — binafsha gradient fon, yuqorida “← Orqaga”
- [x] Markazda **katta avatar** (bosilsa kattalashtirish — §5A.1)
- [x] Ism (katta, oq) + holat matni: **“So‘rov…”** / **“Javob kutilmoqda…”** (chiquvchi), **“Kiruvchi qo‘ng‘iroq”** (kiruvchi)
- [x] Pastki qator (4 tugma): **Dinamik**, **Video**, **Ovozni o‘chirish**, **Tugatish** (qizil)
- [x] Video tugmasi: faqat rozilik+kontakt bo‘lsa faol; aks holda disabled + tooltip
- [x] **Qo‘ng‘iroq ovozi:** kiruvchi ring + chiquvchi “calling” toni

**Texnik (pre-call olib tashlash):**
- [x] `ChatPreCallModal.tsx` — **o‘chirish**
- [x] `ChatWindow.tsx` — `pendingCallType`, `showPreCallModal`, `lowBandwidth` state olib tashlash
- [x] `handleCall(type)` to‘g‘ridan `setIsCalling(true)` + socket `call_user`
- [x] `canShowChatCalls(chat, { isContact, messagingUnlocked })`:
  ```typescript
  CHAT_CALLS_ALLOWED &&
  chat?.type === 'private' &&
  !chat.isTrade &&
  messagingUnlocked &&
  isContact &&  // mijoz mutaxassisni kontaktga saqlagan
  !isExpertListingChat(chat) || applicationAccepted(chat)
  ```
- [x] `UserInfoPanel.tsx`: profil action row dagi qo‘ng‘iroq tugmasi xuddi shu helper
- [x] Backend: `call_user` socket — shart bajarilmasa rad + xato xabari
- [x] Mobile parity

### 5.4 Ikki tomon roziligi — xabarlar, qo‘ng‘iroq, video (TASDIQLANGAN)

**Qoida:** Chatdagi **xabarlar**, **ovozli qo‘ng‘iroq** va **video qo‘ng‘iroq** faqat **ikkala tomon roziligi** bilan ochiladi.

#### Metadata kengaytmasi

```typescript
// chats.metadata.consent
{
  client_accepted_at?: string | null,   // murojatchi roziligi
  expert_accepted_at?: string | null,   // mutaxassis/ish beruvchi roziligi
  // derived: messaging_unlocked = !!(client_accepted_at && expert_accepted_at)
}
```

#### UX holatlari

| Holat | Mijoz ko‘radi | Mutaxassis ko‘radi |
|-------|---------------|-------------------|
| Faqat murojaat yuborilgan | “Javob kutilmoqda” banner; input **yopiq** yoki faqat 1 ta intro | “Murojaatni qabul qiling” tugmasi |
| Bir tomon qabul qilgan | “Sherik roziligini kuting” | Xuddi shu |
| **Ikki tomon roziligi** | To‘liq chat, xabar yuborish | To‘liq chat |
| + kontakt saqlangan | Qo‘ng‘iroq tugmalari ochiladi | Qo‘ng‘iroq tugmalari (kontakt ixtiyoriy expert tomonda) |

**Triggerlar:**
- Mutaxassis “Qabul xabari” / ariza qabul → `expert_accepted_at`
- Mijoz “Davom etish” / “Roziman” tugmasi (banner) → `client_accepted_at`
- Ikkalasi bor → `application_status: accepted` + `messaging_unlocked`

**Cheklovlar:**
- [x] `ChatWindow` input disabled holati rozilik yo‘q bo‘lsa
- [x] Mavjud xabarlar: intro/service xabarlar ko‘rinadi; to‘liq yozishmalar faqat unlock dan keyin (product: old messages ham yashirinmi? — tavsiya: faqat unlock dan keyingi yuborish bloklansin, intro ko‘rinadi)
- [x] Backend `send_message` socket: `messaging_unlocked` tekshiruvi listing chatlar uchun
- [x] Server-side: roziliksiz xabar rad etiladi (xavfsizlik)

### 5.2 To‘lov — mutaxassis uchun “qayta ko‘rib chiqish”

Hozir ikkita parallel yo‘l:
1. **`service_sessions`** — escrow, consult/mentor
2. **`listing_service_deals`** — `ListingDealBar`

**E’lon/murojaat to‘lov inputi (TASDIQLANGAN):**
- [x] `ListingDealBar.tsx` dagi summa input **inline-block**, kengligi matn/raqam uzunligiga mos (`width: auto`, `size` attribute yoki `ch` units)
- [x] `flex-wrap` ichida input + “MALI” yorlig‘i + “To‘lov so‘rash” tugmasi bir qatorda, to‘liq kenglik emas
- [x] CSS: `className="inline-block w-auto min-w-[4ch] max-w-[12ch] ..."` — Telegram input uslubi

**Reja:**
- [x] Mutaxassis chat header yoki bannerda **“To‘lov holati”** kartochkasi (web = mobile parity)
- [x] Holatlar: `kutilmoqda` → `escrowda` → `xizmat davom etmoqda` → `yakunlandi` / `nizo`
- [x] Mijoz tomonda: to‘lov tugmasi faqat `accepted` + expert so‘rovi borida
- [x] Expert modal (`DashboardContent` financial prep) ma’lumotlarini chat banner bilan sinxronlashtirish
- [x] Bir xil matnlar i18n (`uz` / `ru` / `en`)

### 5.3 Eski panel taklif tugmalarini yopish (TASDIQLANGAN — sessiya yakunlangandan keyin)

**Muammo:** Mutaxassis yangi sessiya/panel ochganda yoki **sessiya yakunlangandan** keyin chatdagi eski `consult_panel_invite` / `lesson_start` xabarlaridagi **“Ulanish”** tugmasi hali faol — mijoz adashib **eskirgan xonaga** kirishi mumkin.

**Yechim:**
- [x] Har bir taklif xabariga `metadata.invite_token` + `metadata.expires_at` yoki `metadata.superseded_by`
- [x] **Sessiya `completed` / `ended` bo‘lganda** — shu chatdagi barcha ochiq invite lar `metadata.status: 'expired'` qilib yangilansin
- [x] Yangi taklif yuborilganda: avvalgi ochiq takliflar `expired` qilinadi
- [x] `MessageBubble`: `status === 'expired'` bo‘lsa tugma disabled + “Muddati tugagan / yangi taklif kuting”
- [x] `RoomAccessGate`: faqat eng so‘nggi faol `sessionId` + to‘langan + **sessiya ongoing** holat uchun ruxsat; yakunlangan sessiya xonasiga URL orqali kirish **blok**
- [x] Mentor `lesson_start` uchun ham xuddi shu mantiq
- [x] Deep link `/messages?room=...` — sessiya tugagan bo‘lsa “Bu xona yopilgan” ekrani

---

## 5A. Profil va animatsiya (TASDIQLANGAN)

### 5A.1 Profil rasmini kattalashtirish (1-rasm — UserInfoPanel)

Telegram uslubi: profil panelidagi avatar bosilganda to‘liq ekran / lightbox.

- [x] `UserInfoPanel.tsx`: avatar `button` yoki `cursor-pointer`
- [x] Lightbox komponenti (mavjud media viewer qayta ishlatish mumkin) — zoom, ESC yopish
- [x] Listing intro rejimida ham avatar kattalashtiriladi (telefon baribir yashirin)

**Fayllar:** `UserInfoPanel.tsx`, ixtiyoriy `AvatarLightbox.tsx`

### 5A.2 Chat almashish carousel — sekinroq scroll

Hozir: `globals.css` → `chat-carousel-exit-left` / `enter-right` **0.42s**.

- [x] Animatsiya davomiyligini **~0.65–0.75s** ga oshirish
- [x] `cubic-bezier` yumshatish (Telegram desktop ga yaqin)
- [x] `ChatCarouselPanel.tsx` — `prefers-reduced-motion` da animatsiyasiz

**Fayllar:** `globals.css`, `ChatCarouselPanel.tsx`

### 5A.3 Listing chat — kontakt saqlash (telefonsiz) ✅ TASDIQLANGAN

**Qoida:** Listing/murojaat chatda **“Kontaktga saqlash”** ishlaydi, lekin **telefon raqam hech qachon ko‘rsatilmaydi**.

- [x] `handleAddContact` listing chatda: faqat `peerId` + ism/username yuboriladi (`POST /api/users/contacts`)
- [x] API javobida telefon qaytarilmasin; UI da “+998…” ko‘rinmasin
- [x] Saqlangach: `contacts_updated` event → qo‘ng‘iroq shartlari qayta tekshiriladi (`isContact = true`)
- [x] `UserInfoPanel` / banner: “Kontaktga saqlash” tugmasi listing rejimida ham ko‘rinadi
- [x] Kontakt saqlash **telefon ko‘rsatish emas** — faqat qo‘ng‘iroq ochish uchun ruxsat belgisi

**Fayllar:** `ChatWindowBanners.tsx`, `ChatWindow.tsx`, `UserInfoPanel.tsx`, `chat.controller.ts`

---

## 5B. Qo‘ng‘iroq ekrani — Telegram taqlidi (TASDIQLANGAN)

**Maqsad:** 1-rasm (Telegram/iMe outgoing call) ga yaqin, lekin 1:1 emas — ExpertLine ranglari bilan.

```
┌─────────────────────────────┐
│ ← Orqaga                    │  binafsha gradient fon
│                             │
│         ( avatar )          │  bosilsa → lightbox
│      UTKIR KARIMOV          │
│      So'rov...              │  yoki timer ulanganda
│                             │
│  🔊      📹      🎤      ✕   │  dinamik | video | mute | tugatish
│ dinamik  video  ovoz   tugatish
└─────────────────────────────┘
```

**Holatlar:**
| Holat | Matn | Tugmalar |
|-------|------|----------|
| Chiquvchi, kutish | “So‘rov…” + calling tone | Video disabled agar shart yo‘q |
| Kiruvchi | “Kiruvchi qo‘ng‘iroq” + ring | Qabul / Rad (alohida layout) |
| Ulangan | Timer `MM:SS` | Dinamik, video, mute, tugatish |

**Implementatsiya:**
- [x] `ChatCallOverlay.tsx` — to‘liq qayta layout
- [x] `globals.css` — `.call-screen-gradient` (purple → blue)
- [x] Avatar click → shared `AvatarLightbox`
- [x] Video tugma: `canShowVideoCall()` = rozilik + kontakt + `callType` ruxsat

**O‘chirish:** `ChatPreCallModal.tsx`, `ChatWindow` dagi barcha pre-call state

---

## 5C. Profil va mutaxassis formasi — ixcham UX (TASDIQLANGAN)

### 5C.1 Mutaxassis profil formasi (2-rasm — `ProfileExpertModal.tsx`)

**Muammo:** Katta padding, ko‘p vertikal joy, tasdiqlangan banner + stepper juda baland.

**Ixchamlashtirish:**
- [x] Modal kengligi: `max-w-lg` (hozir `max-w-*` katta bo‘lishi mumkin)
- [x] Section sarlavhalari: `text-xs uppercase` + kamroq `py`
- [x] **Tasdiqlangan** holati: stepper o‘rniga bitta qator badge (`✓ Tasdiqlangan`)
- [x] **Asosiy ma’lumotlar:** 2 ustun grid (kasb + yo‘nalish bir qator; tajriba + diploma bir qator)
- [x] **Hujjatlar:** dashed zone balandligi ~`80px` (hozir kattaroq)
- [x] **Muhim ma’lumot** sariq banner: ixcham 1–2 qator, kichik icon
- [x] Footer: `Bekor qilish` + `Yuborish` bir qator, kam padding
- [x] Inputlar: `py-2 text-sm` (hozir `py-3`/`text-base`)

### 5C.2 O‘z profili (3-rasm — `ProfileViewer.tsx`)

**Muammo:** Cover + ism + mutaxassis bloki juda baland; stat kartalar katta.

**Ixchamlashtirish:**
- [x] Cover balandligi: `h-32` → `h-24` yoki avatar markazda (Telegram mobile uslubi)
- [x] **Mutaxassis rejimi** kartasi: toggle + badge bir qator; tajriba/narx **2 ustun ixcham grid**
- [x] Telefon/username/qatorlari: `py-2.5` (hozir kattaroq)
- [x] “Profilni tahrirlash” tugmasi: `py-2.5` sticky pastda
- [x] Avatar preview (`avatarPreviewUrl`) allaqachon bor — profil va qo‘ng‘iroq ekranida qayta ishlatish
- [x] Ortiqcha margin/padding audit: `space-y-6` → `space-y-3`

**Fayllar:** `ProfileExpertModal.tsx`, `ProfileViewer.tsx`, ixtiyoriy `profile-compact.css` tokenlar

---

## 6. Ishlar bo‘limi integratsiyasi

### 6.1 E’lonlar (ish beruvchi)

| Harakat | Hozir | Reja |
|---------|-------|------|
| Ariza yuborish | Chat + intro xabar | + `application_status: pending` |
| Tez yozish | Chat, intent `chat` | Oddiy listing chat (murojaat bo‘limiga kirmasligi mumkin) |
| Ariza qabul | **Yo‘q** | **Alohida tugma** — “Arizani qabul qilish” (mutaxassis “Qabul xabari” dan farqli) → `accepted` |
| Arizalar sidebar | **Yo‘q** | §2.2 — faqat qabul qilinganlar yoki barcha pending+accepted (product qarori) |

### 6.2 Mutaxassislar

| Harakat | Hozir | Reja |
|---------|-------|------|
| Murojaat qilish | `expert_listing` chat | + `pending` status |
| Qabul xabari | Expert dashboard | → `accepted` + bo‘limda ko‘rinadi |
| Mijoz bo‘limi | **Yo‘q** | Qabul qilingandan keyin “Murojaatlarim” |

### 6.3 Chat bannerlari

- [x] `pending`: “Mutaxassis javobini kutmoqdasiz” / “Arizangiz ko‘rib chiqilmoqda”
- [x] `accepted`: xizmat/to‘lov yo‘riqnomasi
- [x] Qo‘ng‘iroq tugmasi bannerda ham eslatma: “Qo‘ng‘iroq faqat xizmat xonasida”

---

## 7. Implementatsiya bosqichlari

### Bosqich A — UI tartibi (1–2 kun)
1. `ChatList.tsx`: tablarni qidiruv input **tagiga** ko‘chirish
2. Qidiruvda tablarni yashirmaslik
3. `globals.css` / layout moslash
4. Mobile-web vizual parity tekshiruv

### Bosqich B — Status va bo‘limlar (2–3 kun)
1. Metadata `application_status` — create/update chat API
2. Qabul qilish endpoint yoki mavjud invite bilan bog‘lash
3. Sidebar: “Murojaatlar” / “Murojaatlarim” / “Arizalar” bo‘limlari (shartli render)
4. Chat ro‘yxatidan listing chatlarni `Shaxsiy` dan ajratish (ixtiyoriy)

### Bosqich C — Maxfiylik, rozilik va qo‘ng‘iroq (2–3 kun)
1. Job listing telefon maskalash (backend + frontend)
2. `consent` metadata + rozilik banner/tugmalari
3. `canShowChatCalls` — kontakt + rozilik + listing qoidalari
4. **`ChatPreCallModal` o‘chirish** — to‘g‘ridan qo‘ng‘iroq
5. **`ChatCallOverlay` Telegram taqlidi** (§5B)
6. Qo‘ng‘iroq ovozi (chiquvchi + kiruvchi)
7. Listing kontakt saqlash (telefonsiz) — §5A.3
8. Socket: `send_message` / `call_user` bloklari

### Bosqich C2 — Profil ixchamlashtirish (1 kun)
1. `ProfileExpertModal` ixcham layout (§5C.1)
2. `ProfileViewer` ixcham layout (§5C.2)
3. Avatar lightbox (shared)
4. Carousel animatsiya sekinlashtirish
5. `ListingDealBar` inline to‘lov input

### Bosqich D — To‘lov UX (2–3 kun)
1. Chat banner to‘lov holati (web)
2. ListingDealBar + service_sessions birlashtirilgan ko‘rinish
3. Expert “to‘lovni qayta ko‘rib chiqish” modali yaxshilash

### Bosqich E — Taklif tugmalari (1–2 kun)
1. Invite expire/supersede mantiq
2. MessageBubble disabled state
3. RoomAccessGate yangilash

### Bosqich F — Ish beruvchi ariza oqimi (2 kun)
1. “Arizani qabul qilish / rad etish” UI
2. Bildirishnomalar
3. Test senariylari

---

## 8. Qabul qilish mezonlari (QA)

- [x] Tablar qidiruv tagida, Telegram skrinshotiga o‘xshash
- [x] Murojaat yuborilganda bo‘lim **hali** ko‘rinmaydi (`pending`)
- [x] Qabul qilingandan keyin murojatchi va mutaxassis o‘z bo‘limlarida chatni ko‘radi
- [x] Murojatchi mutaxassis/ish beruvchi telefonini ko‘rmaydi (profil, API, qidiruv)
- [x] Listing chatda qo‘ng‘iroq tugmalari yo‘q (rozilik/kontakt bo‘lmasa)
- [x] Roziliksiz xabar yuborib bo‘lmaydi (listing chat)
- [x] Kontaktga saqlagandan keyin qo‘ng‘iroq tugmalari paydo bo‘ladi (rozilik bilan)
- [x] Pre-call modal **yo‘q** — bosish → darhol qo‘ng‘iroq ekrani
- [x] Qo‘ng‘iroq ekrani Telegram uslubida (gradient, 4 pastki tugma)
- [x] Qo‘ng‘iroq paytida ovoz (ring/backtone) eshitiladi
- [x] Profil rasmi bosganda kattalashtiriladi
- [x] Chat almashish animatsiyasi sekinroq
- [x] Sessiya tugagach eski “Ulanish” linki ishlamaydi
- [x] To‘lov inputi inline-block (so‘z kengligida)
- [x] Yangi panel taklifi yuborilganda eski “Ulanish” tugmasi ishlamaydi
- [x] To‘lov holati chatda aniq ko‘rinadi
- [x] `phone_call` xabar tarixi oddiy shaxsiy chatlarda ishlayveradi

---

## 9. Qo‘shimcha eslatmalar (boshqa ochiq ishlar)

Quyidagilar ushbu rejaga yaqin yoki keyingi sprint:

| # | Vazifa | Ustuvorlik |
|---|--------|------------|
| 1 | Qo‘ng‘iroq tarixi chatda (`phone_call`) | ✅ Qisman qilindi — listing chatda ko‘rinmasligi kerak emas, lekin qo‘ng‘iroq o‘zi yopiq |
| 2 | “Mening e’lonlarim” to‘liq boshqaruv ekrani | ✅ MyListingsPanel — status toggle, ariza chatlari |
| 3 | Job apply rad etish + sabab xabari | O‘rta |
| 4 | Web `consult_panel_invite` uchun to‘lov kartochkasi (mobile parity) | O‘rta |
| 5 | `ServicesList` va `JobsPanel` — bitta kirish nuqtasi | ✅ services→jobs redirect, JobsPanel experts tab |
| 6 | Guruh chatda mentor `lesson_start` — guruh vs shaxsiy ajratish | O‘rta |
| 7 | E2E shifrlash listing chatlarda metadata sizligi | Past |
| 8 | Admin: nizo (dispute) moderatsiyasi | Keyinroq |
| 9 | Push/bildirishnoma: yangi murojaat, qabul, to‘lov | O‘rta |
| 10 | `MessageBubble` `songPlayer` import regression | ✅ Tuzatildi |

---

## 10. Tasdiqlangan product qarorlari ✅

| # | Qaror | Izoh |
|---|--------|------|
| 1 | Murojaat bo‘limi faqat **qabul qilingandan** keyin | `pending` ko‘rinmaydi |
| 2 | **Ikki tomon roziligi** — xabar, ovoz, video | §5.4 |
| 3 | Qo‘ng‘iroq faqat mijoz **mutaxassisni kontaktga saqlaganda** | §5.1; UserInfoPanel tugmasi ham |
| 4 | Ovozli + video qo‘ng‘iroq default **yopiq** | Rozilik + kontakt shartlari bajarilganda ochiladi |
| 5 | **Pre-call modal butunlay olib tashlash** | `ChatPreCallModal.tsx` delete |
| 6 | **Qo‘ng‘iroq ovozi** bo‘lsin | Ring + calling tone |
| 7 | Sessiya tugagach **eskirgan xona linki** ishlamasin | §5.3 + RoomAccessGate |
| 8 | Profil rasmi bosganda **kattalashtirish** | §5A.1 + qo‘ng‘iroq ekrani |
| 9 | Chat almashish carousel **sekinroq** | §5A.2 |
| 10 | E’lon to‘lov inputi **inline-block** | §5.2 |
| 11 | **Qo‘ng‘iroq UI** Telegram taqlidi (gradient + 4 tugma) | §5B |
| 12 | **Mutaxassis formasi ixcham** | §5C.1 |
| 13 | **Profil viewer ixcham** | §5C.2 |
| 14 | Listing **kontakt saqlash telefonsiz** | §5A.3 |
| 15 | Ish arizasi **alohida “Qabul qilish” tugmasi** | §6.1 — mutaxassis qabul xabaridan farqli |

---

## 11. Ochiq savollar (kam qoldi)

1. **`intent: chat` (Tez yozish)** — murojaat bo‘limiga kirmaydimi?  
   - Tavsiya: kirmaydi

2. **Arxiv** — murojaat chatlari arxivlanadimi?

3. **Roziliksiz** avral yuborilgan intro xabarlar o‘qiladimi?  
   - Tavsiya: ha (sistema xabarlari); foydalanuvchi xabarlari blok

---

## 12. Fayl o‘zgarishlari xaritasi (implementatsiya uchun)

| Fayl | O‘zgarish |
|------|-----------|
| `frontend/src/components/chat/ChatList.tsx` | Tab joyi, yangi bo‘limlar, filtr |
| `frontend/src/app/messages/MessagesPageContent.tsx` | Category state, bo‘lim routing, RoomAccessGate |
| `frontend/src/lib/listing-chat.ts` | Status + consent helperlar |
| `frontend/src/lib/chat-calls.ts` | Kontakt + rozilik + listing exclusion |
| `frontend/src/lib/chat-consent.ts` | **YANGI** — `messagingUnlocked`, consent UI matnlari |
| `frontend/src/components/chat/ChatWindowHeader.tsx` | Qo‘ng‘iroq shartli ko‘rsatish |
| `frontend/src/components/chat/ChatCallOverlay.tsx` | Telegram taqlidi qo‘ng‘iroq UI (§5B) |
| `frontend/src/components/chat/ChatWindow.tsx` | Pre-call olib tashlash, kontakt saqlash, input blok |
| `frontend/src/components/chat/ChatPreCallModal.tsx` | **O‘CHIRISH** |
| `frontend/src/components/chat/profile/ProfileExpertModal.tsx` | Ixcham forma (§5C.1) |
| `frontend/src/components/chat/ProfileViewer.tsx` | Ixcham profil (§5C.2) |
| `frontend/src/components/chat/ChatWindowBanners.tsx` | Rozilik + status bannerlari |
| `frontend/src/components/chat/ListingDealBar.tsx` | Inline to‘lov input |
| `frontend/src/components/chat/MessageBubble.tsx` | Expired invite tugmasi |
| `frontend/src/components/chat/UserInfoPanel.tsx` | Avatar lightbox, qo‘ng‘iroq yashirish, privacy |
| `frontend/src/components/chat/ChatCarouselPanel.tsx` | Animatsiya klasslari |
| `frontend/src/app/globals.css` | Carousel duration sekinlashtirish |
| `frontend/src/components/jobs/JobsPanel.tsx` | Murojaat → consent/status |
| `backend/src/api/controllers/chat.controller.ts` | Metadata consent, phone mask job |
| `backend/src/services/consultPanel.service.ts` | Invite supersede + sessiya tugashi |
| `backend/src/services/consultSession.service.ts` | Sessiya end → invite expire |
| `backend/src/socket/socket.service.ts` | send_message / call_user consent check |

---

**Keyingi qadam:** Bosqich A (tablar) yoki Bosqich C (rozilik + qo‘ng‘iroq qoidalari) — ustuvorlik bo‘yicha boshlash.
