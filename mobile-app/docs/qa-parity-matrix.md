## Auth QA Parity Matrix

| Scenario | Expected | Status |
|---|---|---|
| Login button disabled when phone empty | Disabled | Done |
| Login button disabled when password empty | Disabled | Done |
| Login button disabled when phone < 9 digits | Disabled | Done |
| Login button shows `Kiritilmoqda...` while loading | Loading | Done |
| Login 401 shows parity message | Error mapped | Done |
| Login 403 shows parity message | Error mapped | Done |
| Register button disabled while loading | Disabled | Done |
| Register button shows `Yaratilmoqda...` while loading | Loading | Done |
| Register success shows `Yo'naltirilmoqda...` | Success transition | Done |
| Register success redirects to Login | Navigation parity | Done |
