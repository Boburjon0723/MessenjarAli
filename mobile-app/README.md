# ExpertLine Mobile (Expo)

Web frontend auth oqimi bilan funksional parity uchun mobil ilova.

## Run

1. `cd mobile-app`
2. `npm install`
3. `.env.example` ni `.env` ga nusxa qiling
4. `npm run start`

## Auth parity

- Login/Register validatsiya qoidalari web bilan bir xil
- API endpointlar web bilan bir xil (`/api/auth/login`, `/api/auth/register`)
- Tugma holatlari: `disabled`, `loading`, `success`
- Error mapping: `401`, `403`, generic/network fallback

Checklist: `docs/auth-parity-checklist.md`
