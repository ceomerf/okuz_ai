# Authorization Matrisi (Özet)

| Modül | Endpoint Grubu | Roller | Açıklama |
| --- | --- | --- | --- |
| Auth | /auth/* | PUBLIC | register/login public, profile/logout JWT |
| Users | /api/users/* | AUTH (default) | CRUD sadece authenticated; admin işlemleri gelecekte `ADMIN` |
| Planning | /planning/* | AUTH | Tüm uçlar JWT; `planning/admin/*` sadece `ADMIN` |
| Smart Tools | /smart-tools/* | AUTH | AI maliyetli uçlar throttling altında |
| Gamification | /gamification/* | AUTH | Kullanıcıya özel |
| Analysis | /analysis/* | AUTH | Analitik uçlar kullanıcı-özel |
| Subscription | /subscription/* | AUTH (çoğu), API-KEY (process/confirm) | Dış çağrılar `X-API-Key` |
| Webhook | /webhook/* | PUBLIC + Signature | HMAC imza ile korunur |

Notlar:
- `RolesGuard` user.role ile `@Roles('ADMIN')` kontrol eder.
- Admin uçları: `planning/admin/*` aktif.
- Genişletme: Users/Subscription için admin-only yollar ayrı controller’da toplanabilir.
