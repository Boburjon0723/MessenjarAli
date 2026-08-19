# Stitch prompt — ExpertLine mutaxassis panellari (UI/UX)

**Maqsad:** 4 ta mutaxassis roli uchun panel ekranlarini Stitch’da chizish — implementatsiya uchun vizual manba.  
**Platforma:** Web desktop (1440×900), keyin responsive 768px  
**Til:** UI matnlari o‘zbekcha (lotin)  
**Mavjud kod:** `SpecialistDashboard.tsx`, `DashboardContent.tsx`, `expert-roles.ts`

---

## Umumiy Stitch prompt (barcha panellar uchun — birinchi yuboring)

```
Design a dark-mode expert service dashboard for "ExpertLine" — a Telegram-style professional messaging and marketplace app (Uzbekistan market). Desktop web 1440px wide.

DESIGN SYSTEM (match existing ExpertLine chat — do NOT use light/indigo theme):
- Background: #0d0d0f, panels #212121, elevated cards #2a2a2a
- Primary accent: #8774e1 (Telegram purple)
- Success/escrow: emerald #10b981
- Warning: amber #f59e0b
- Error/end call: #ef4444
- Text primary: #ffffff, secondary: #aaaaaa, muted: #707579
- Border: rgba(255,255,255,0.08), radius 12–24px
- Font: system-ui / Inter, compact density (NOT spacious SaaS)
- Icons: Lucide-style outline, 20–24px

LAYOUT SHELL (all 4 expert roles share this):
- Full-height workspace inside messages app (no browser chrome)
- Top bar (56px): back arrow + panel title + role subtitle + session timer pill (00:00) + primary CTA
- 3-column layout:
  LEFT (280px, collapsible): clients/groups list OR search
  CENTER (flex): LiveKit video stage + floating control bar (mic, cam, screen, whiteboard, record, end)
  RIGHT (300px, collapsible): materials/documents upload list
- Bottom strip on center: session notes textarea (compact, 2 lines) + in-room chat messages (small)
- Compact spacing: section headers 11px uppercase tracking, row height 44–48px, avoid large empty padding

BUSINESS RULES (show in UI copy/badges):
- Client phone numbers NEVER shown — only name, avatar, username, listing snapshot
- Payment states: Kutilmoqda → Escrowda (MALI) → Faol sessiya → Yakunlandi
- "Qabul xabari" sends chat invite link — old invites show "Muddati tugagan" disabled state
- No pre-call modal — expert starts session from panel only
- Mutual consent required before full chat unlock (show locked banner when pending)

Deliver: one master frame "Expert Panel Shell" with component variants annotated. Dark, professional, Telegram-adjacent but not a clone.
```

---

## Prompt 1 — Ustoz / Mentor paneli (`panel_header_mentor`)

```
ExpertLine — MENTOR / TEACHER panel (Ustoz paneli)

Role: Live group lessons with students. Expert is "O'qituvchi (Mentor)".

TOP BAR:
- Title: "Ustoz paneli"
- Subtitle: "Jonli dars va guruhlar"
- Group selector dropdown: "Faol dars guruhi" — list of created groups with schedule time
- Primary button (purple): "Darsni boshlash" → becomes green badge "Boshlangan" when live
- Session timer: "Dars vaqti 00:00"

LEFT COLUMN — tabs: "Ishtirokchilar" | "Tarix"
- Attendees list: avatar, name, hand-raised icon, mic muted badge, kick button (subtle)
- Empty: "Talabalar qo'shilishini kuting..."
- History tab: past lessons with date, duration, recording thumbnail

CENTER:
- Large video grid (1 mentor + up to 8 students tiles)
- Floating bottom control bar: Mic, Camera, Screen share, Whiteboard, Record, End lesson (red)
- Above controls: live quiz banner when active ("Viktorina: Matematika — 12/15 javob")

RIGHT COLUMN — "Materiallar va viktorinalar":
- Upload zone (compact dashed, 72px height)
- File list: PDF, video icons, delete
- "Viktorina yaratish" secondary button
- Collapse chevron

MODALS (draw as separate frames):
1. "Darsni boshlash" — pick group, confirm notify group chat
2. Live quiz builder — compact form

Tone: classroom energy but dark UI. Uzbek labels. Compact — no wasted vertical space.
```

---

## Prompt 2 — Huquqshunos paneli (`panel_header_legal`)

```
ExpertLine — LEGAL CONSULTANT panel (Huquqshunos paneli)

Role: One-to-one legal advice. Privacy-critical. Documents-heavy.

TOP BAR:
- Title: "Huquqshunos paneli"
- Subtitle: "Huquqiy maslahat · mijozlar va hujjatlar"
- Active client chip: selected private chat name (NO phone number)
- Primary: "Sessiyani boshlash"
- Timer: "Sessiya vaqti 00:00"
- Compliance notice dismissible banner (amber): legal disclaimer 2 lines max

LEFT COLUMN (resizable width handle):
- Tabs: "Mijozlar" | "Qidiruv"
- Mijozlar list: ONLY chats from expert listing (murojaat). Each row:
  - Avatar, name, status pill: Kutilmoqda | Qabul qilingan | To'lov kutilmoqda | Faol
  - Actions inline: "Qabul xabari" (purple outline), "To'lov so'rash" (amber)
  - NO phone, NO +998
- Selected row highlighted #8774e1/15
- Empty: "Hali murojaat yo'q — Ishlar bo'limidagi e'lon orqali keladi"

CENTER:
- 1:1 video (large) or avatar placeholder before connect
- Controls: Mic, Cam, Screen, End session
- Escrow status bar under video: "💰 150 000 MALI kafillikda" | "To'lov tasdiqlanmagan"

RIGHT COLUMN — "Materiallar va hujjatlar":
- Upload PDF/DOC compact list
- Wider panel (320px) for legal docs

MODAL — "Qabul xabari" / financial prep:
- Client name (no phone)
- Locked balance, listing price, session status
- Buttons: "Qabul xabari yuborish" | "To'lovni so'rash" | Bekor

Dark, trustworthy, minimal distraction. Uzbek text.
```

---

## Prompt 3 — Psixolog paneli (`panel_header_psychology`)

```
ExpertLine — PSYCHOLOGIST panel (Sessiya paneli)

Role: Safe, calm 1:1 psychological consultation. Similar layout to legal but softer emotional tone.

TOP BAR:
- Title: "Sessiya paneli"
- Subtitle: "Mijozlar bilan psixologik uchrashuv"
- Soft green accent #6cf8bb for session active state (secondary to purple)
- Primary: "Sessiyani boshlash"
- Timer: "Sessiya vaqti 00:00"

LEFT — Mijozlar (same structure as legal):
- Status pills use calm colors: pending=gray, accepted=purple, active=soft green
- "Qabul xabari" prominent
- Privacy badge on each row: "Tel yashirin"

CENTER:
- Warm dark gradient subtle behind video (not harsh)
- Large centered video 1:1
- Minimal controls — no whiteboard, no quiz
- Session chat below video (compact bubbles)

RIGHT — "Yuklangan hujjatlar" (optional worksheets, NOT required):
- Lighter upload area
- Empty state: "Hujjat shart emas"

COMPLIANCE banner (dismissible):
- Crisis line reminder: "112 / favqulodda yordam" — 1 line, red subtle border

Calm, safe, private. Uzbek. Compact rows.
```

---

## Prompt 4 — Maslahatchi / Konsultant paneli (`panel_header_consult)

```
ExpertLine — GENERAL CONSULTANT panel (Konsultatsiya paneli)

Role: Career coach, doctor-adjacent consult, business advice — 1:1 online meeting.

TOP BAR:
- Title: "Konsultatsiya paneli"
- Subtitle: "Mijozlar bilan onlayn uchrashuv"
- Primary: "Sessiyani boshlash"
- Secondary: link to active chat

LEFT — Mijozlar | Qidiruv (DDG web search helper for expert research):
- Mijozlar: all private chats with clients
- Each client: payment badge (MALI escrow amount inline, compact)
- "Yakunlash" destructive action at bottom of client detail (not in list)

CENTER:
- Video 1:1 + screen share
- Payment reminder strip if escrow initiated: inline-block amount input width fits number + "MALI" label

RIGHT — Materials (optional uploads)

DIFFERENCE from legal: slightly less formal, no legal disclaimer block; payment/escrow UI more visible.

Include empty states for: no clients, no active session, session ended (link expired message).
```

---

## Prompt 5 — Umumiy komponentlar (Stitch component library)

```
ExpertLine expert panel — SHARED UI COMPONENTS (dark theme)

Create a component sheet with:

1. CLIENT ROW (compact 48px):
   - 36px avatar, name truncate, status pill, 1–2 icon actions
   - Variants: pending, accepted, payment_waiting, active, completed
   - Never show phone number field

2. ESCROW / PAYMENT CARD (inline compact):
   - Purple header "To'lov holati"
   - States: Kutilmoqda | Kafillikda: 120 MALI | Yakunlandi
   - Expert: inline amount input (auto width ~6 chars) + "To'lov so'rash" emerald button
   - Client: "To'lash" primary button

3. SESSION CONTROL BAR (floating, bottom center):
   - 44px circular buttons: mic, cam, screen, board (mentor only), record, end (red 52px)
   - Active state glow #8774e1

4. CONSENT / LOCK BANNER (chat integration):
   - "Ikki tomon roziligi kutilmoqda" — input disabled ghost
   - "Kontaktga saqlangandan keyin qo'ng'iroq ochiladi"

5. EXPIRED INVITE CHIP (in chat message):
   - Gray pill "Ulanish — muddati tugagan" disabled button

6. PANEL TOP BAR variants for 4 roles (icon + color accent dot):
   - Mentor: book icon
   - Legal: scale icon
   - Psychology: leaf/heart icon
   - Consult: video icon

7. COMPACT EXPERT PROFILE FORM (reference for consistency):
   - Modal max-width 480px, 2-column grid fields, small section headers
   - Approved state: single line badge not tall stepper

All components on #212121 background. 8px grid. Uzbek labels.
```

---

## Prompt 6 — Mobile expert panel (768px)

```
ExpertLine expert panel — MOBILE 390×844

Same 4 roles but stacked:
- Top: title + timer + primary CTA
- Swipeable tabs: Mijozlar | Video | Hujjatlar
- Video full width when tab active
- Client list full screen when tab active
- Bottom sheet for "Qabul xabari" modal
- FAB for "Sessiyani boshlash" when session not started

Dark #212121, purple #8774e1. Compact. Uzbek.
```

---

## Prompt 7 — Expert onboarding + panel entry (flow)

```
ExpertLine — flow wireframe (3 frames):

Frame A: Messages app → hamburger → "Xizmat paneli" menu item (only if is_expert verified)
Frame B: Panel mode auto-detected badge: "Siz: Huquqshunos rejimi" with switch disabled hint
Frame C: First visit empty panel with checklist:
  ☐ Profil tasdiqlangan
  ☐ Birinchi murojaatni kuting (link to Ishlar → Mutaxassislar)
  ☐ To'lov / MALI hamyon ulangan

Style: dark ExpertLine, compact checklist card, purple CTA "Panelni ochish"
```

---

## Stitch’ga yuborish tartibi

| # | Prompt | Natija |
|---|--------|--------|
| 1 | Umumiy (shell) | Layout grid + tokens |
| 2 | Mentor | Guruh dars paneli |
| 3 | Legal | Huquqshunos |
| 4 | Psychology | Psixolog |
| 5 | Consult | Maslahatchi |
| 6 | Komponentlar | UI kit |
| 7 | Mobile | Responsive |
| 8 | Onboarding | Kirish oqimi |

Har bir javobdan keyin: *"Keep ExpertLine dark tokens (#212121, #8774e1). Make 15% more compact than previous frame. Uzbek labels."*

---

## Implementatsiya bog‘lanishi

| Stitch frame | Kod fayli |
|--------------|-----------|
| Shell + mentor | `DashboardContent.tsx` (mentor branch) |
| Legal/psych/consult left panel | `consultSideTab`, `consultClientChats` |
| Qabul xabari modal | `consultAcceptModal` in DashboardContent |
| Escrow card | `ListingDealBar.tsx` + consult accept modal |
| Video center | `SpecialistDashboard.tsx` LiveKitRoom |

---

## Qochish kerak (anti-patterns)

- ❌ Yorug‘ indigo/white SaaS tema (bozor Stitch loyihasidan farqli)
- ❌ Telefon raqam input yoki ko‘rsatish
- ❌ Katta bo‘sh padding (hozirgi shikoyat)
- ❌ Pre-call modal
- ❌ Chat ichida to‘g‘ridan-to‘g‘ri qo‘ng‘iroq tugmasi (faqat panel orqali xizmat)
- ❌ Bir xil layout 4 rol uchun — mentor guruhli, qolganlari 1:1

---

**Keyingi qadam:** Umumiy promptni Stitch’ga yuboring → shell tasdiqlang → 4 rol promptlarini ketma-ket generate qiling.
