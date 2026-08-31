-- The Claw Lab database
create extension if not exists pgcrypto;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  display_name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 60,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.service_variations (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services(id) on delete cascade,
  name text not null,
  price_delta numeric(10,2) not null default 0,
  duration_delta_minutes integer not null default 0,
  active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  discount_type text not null default 'fixed',
  discount_value numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_code text unique not null,
  access_token text unique not null,
  customer_name text not null,
  mobile_number text not null,
  social_handle text,
  preferred_date date not null,
  preferred_time time not null,
  removal text,
  promo_id uuid references public.promos(id) on delete set null,
  promo_name text,
  notes text,
  terms_accepted boolean not null default false,
  status text not null default 'draft' check(status in ('draft','pending','approved','payment_submitted','confirmed','completed','rejected','cancelled')),
  estimated_total numeric(10,2) not null default 0,
  down_payment numeric(10,2) not null default 0,
  inspiration_count integer not null default 0,
  confirmation_notes text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  approved_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz
);

create table if not exists public.booking_services (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  variation_id uuid references public.service_variations(id) on delete set null,
  service_name text not null,
  variation_name text,
  price numeric(10,2) not null default 0,
  duration_minutes integer not null default 0
);

create table if not exists public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  label text,
  day_of_week integer not null check(day_of_week between 0 and 6),
  is_available boolean not null default false,
  start_time time,
  end_time time,
  semester_name text,
  active boolean not null default true
);

create table if not exists public.availability_overrides (
  id uuid primary key default gen_random_uuid(),
  override_date date not null,
  start_time time not null,
  end_time time not null,
  kind text not null check(kind in ('open','block')),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.blocked_times (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  method text not null,
  amount numeric(10,2) not null,
  status text not null default 'submitted' check(status in ('submitted','verified','rejected')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.booking_files (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  bucket text not null,
  path text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  display_name text not null,
  rating integer not null check(rating between 1 and 5),
  review_text text not null,
  public_consent boolean not null default false,
  photo_path text,
  status text not null default 'pending' check(status in ('pending','approved','hidden')),
  featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);

insert into public.services(name,description,price,duration_minutes,sort_order) values
('Gel Manicure','Clean, polished gel manicure.',0,60,1),
('Soft Gel Extensions','Soft gel extensions with your chosen length.',0,120,2),
('Soft BIAB','Structured soft builder gel.',0,100,3),
('Hard Gel Extensions','Hard gel extensions for a durable set.',0,150,4),
('Hard Builder Gel','Structured hard builder gel.',0,120,5),
('Nail Art','Add your chosen level of nail art.',0,30,6)
on conflict do nothing;

-- Example variations; exact menu can be edited.
insert into public.service_variations(service_id,name,price_delta,duration_delta_minutes,sort_order)
select id,'Short',0,0,1 from public.services where name='Soft Gel Extensions';
insert into public.service_variations(service_id,name,price_delta,duration_delta_minutes,sort_order)
select id,'Medium',0,15,2 from public.services where name='Soft Gel Extensions';
insert into public.service_variations(service_id,name,price_delta,duration_delta_minutes,sort_order)
select id,'Long',0,30,3 from public.services where name='Soft Gel Extensions';
insert into public.service_variations(service_id,name,price_delta,duration_delta_minutes,sort_order)
select id,'Extra Long',0,45,4 from public.services where name='Soft Gel Extensions';

insert into public.site_settings(key,value) values
('gcash_name',''),
('gcash_number',''),
('gcash_qr',''),
('qrph_qr',''),
('qrph_fee','5'),
('removal_options','None\nGel\nSoft Gel\nHard Gel\nOther'),
('terms','ENTER YOUR EXACT JOTFORM POLICIES HERE BEFORE LAUNCH. Include down payment, rescheduling, lateness, cancellation, removal, warranty, home-based studio rules, payment rules, and photo/portfolio consent.'),
('studio_location','Novaliches, Quezon City, Philippines')
on conflict(key) do nothing;

-- Private storage buckets.
insert into storage.buckets(id,name,public) values
('nail-inspiration','nail-inspiration',false),
('payment-proofs','payment-proofs',false),
('review-photos','review-photos',false)
on conflict(id) do nothing;

-- RLS.
alter table public.admins enable row level security;
alter table public.services enable row level security;
alter table public.service_variations enable row level security;
alter table public.promos enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_services enable row level security;
alter table public.availability_rules enable row level security;
alter table public.availability_overrides enable row level security;
alter table public.blocked_times enable row level security;
alter table public.payments enable row level security;
alter table public.booking_files enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.reviews enable row level security;
alter table public.site_settings enable row level security;

-- Public read policies for customer-facing configuration and approved reviews.
create policy "public services read" on public.services for select using (active=true);
create policy "public variations read" on public.service_variations for select using (active=true);
create policy "public promos read" on public.promos for select using (active=true);
create policy "public settings read" on public.site_settings for select using (key in ('terms','removal_options','promo_options','gcash_name','gcash_number','gcash_qr','qrph_qr','qrph_fee','studio_location'));
create policy "public approved reviews read" on public.reviews for select using (status='approved');
-- Admin reads/writes happen through the server service role after an explicit admins check.
-- Customer booking/payment/review writes happen through server routes using the service role.
-- The service-role key is NEVER shipped to the browser.

-- Storage: private by default. Server routes use the service role for uploads and signed access.
