# Implementation notes

Implemented in this project:
- Next.js App Router + TypeScript
- Supabase Postgres/Auth/Storage integration
- Customer booking flow with a separate review step
- Multi-service selection with editable variations
- Booking reference + private access token
- Pending -> approved -> payment submitted -> confirmed -> completed/rejected/cancelled state flow
- Manual GCash / QR PH payment proof flow (no payment gateway)
- Private inspiration/payment/review photo storage
- Admin authentication and protected admin area
- Booking approval and payment verification controls
- Flexible semester availability model plus open/block date overrides
- Admin service, promo, payment/settings and review areas
- Responsive CSS with mobile-safe gutters, box-sizing, max-width controls and no intentional horizontal overflow
- September promo seeded as requested

Still intentionally configurable before production:
- Exact service prices/durations/variations
- Exact removal and promo behavior from the original Jotform
- Exact Terms & Conditions/policies from the original Jotform (the pasted brief did not contain their full wording)
- Live QR image assets
- Owner/admin Supabase Auth account
- Production domain/environment variables

Important: QR settings currently accept image URLs in the admin settings UI; if you want direct QR-file upload inside the admin UI, that is an additional UI/API step rather than something this build should falsely claim is already complete.
