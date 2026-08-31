# The Claw Lab

A production-oriented Next.js + TypeScript + Supabase booking app for The Claw Lab.

## Stack
- Next.js App Router + TypeScript
- Supabase Postgres, Auth and Storage
- Vercel-ready
- Mobile-first CSS with 16px minimum mobile gutters

## Important
The project is real application code, but your Supabase project, admin account, QR images, exact Jotform removal/promo policy text, and production environment variables are intentionally configurable. No payment gateway is used.

## Local setup
1. `npm install`
2. Create a Supabase project.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Create an Auth user for the owner, then insert that user's UUID into `public.admins` (see SQL comments).
5. Create `.env.local` from `.env.example`.
6. `npm run dev`

## Storage
The SQL creates private buckets:
- `nail-inspiration`
- `payment-proofs`
- `review-photos`

Storage policies are included. The app uses server-side signed URLs for private files.

## Vercel
Set the same environment variables in Vercel and deploy the repository. Set `NEXT_PUBLIC_SITE_URL` to the production URL.

## First configuration
Open `/admin/settings` after signing in and add:
- GCash account details + QR
- QR PH QR + processing fee
- business policies / terms
- contact/location copy

Then edit services, variations, promos and availability.

## Customer flow
Home -> /book -> review -> request -> owner approval -> payment -> proof upload -> owner verification -> confirmed -> completed -> review.

A booking request is never treated as confirmed merely because it was submitted. Payment proof also requires explicit owner verification.

## Security
The service-role key is only read by server code. Private customer files are not exposed as public URLs. Customer status/payment/review links use high-entropy access tokens.

## Production checklist
- Configure Supabase Auth email/password or your preferred admin provider.
- Add the owner UUID to `admins`.
- Replace placeholder service prices/durations.
- Enter exact policies from your existing Jotform.
- Upload live QR images.
- Review RLS policies in Supabase.
- Set a real custom domain in Vercel.

## Deployment order (important)

**Build target:** Node 24.x, pinned in `package.json`; dependencies are pinned to exact versions to reduce Vercel drift.


1. Push this project to GitHub.
2. Import it into Vercel.
3. Add these Vercel environment variables **before the first production request**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL`
4. Deploy.
5. In Supabase SQL Editor, run `supabase/schema.sql`.
6. Create the owner Auth user and add the matching UUID to `public.admins`.
7. Configure services, policies, QR images and availability in `/admin`.

The server-data pages are explicitly dynamic so Vercel does not need a live Supabase connection during static build/prerender.
