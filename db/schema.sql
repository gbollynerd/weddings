-- Visual Weddings — relational schema (PostgreSQL / Supabase)
-- Apply with: npm run db:migrate   (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

-- ───────────────────────── Identity & roles ─────────────────────────
create table if not exists roles (
  key          text primary key,               -- client | photographer | videographer | coordinator | admin
  name         text not null,
  permissions  text[] not null default '{}'
);

create table if not exists users (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  password_hash  text not null,
  role           text not null references roles(key),
  full_name      text not null,
  phone          text,
  avatar_url     text,
  created_at     timestamptz not null default now()
);

create table if not exists sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  user_agent  text,
  ip          text,
  created_at  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  revoked_at  timestamptz
);
create index if not exists sessions_user_idx on sessions(user_id);

create table if not exists user_settings (
  user_id          uuid primary key references users(id) on delete cascade,
  notify_email     boolean not null default true,
  notify_bookings  boolean not null default true,
  notify_messages  boolean not null default true,
  notify_payments  boolean not null default true,
  notify_sms       boolean not null default false,
  timezone         text not null default 'America/New_York',
  currency         text not null default 'USD',
  comm_preference  text not null default 'email',
  two_factor       boolean not null default false
);

-- ───────────────────────── Locations ─────────────────────────
create table if not exists markets (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  city              text not null,
  state             text not null,
  state_name        text not null,
  country           text not null default 'United States',
  region            text not null,
  price_multiplier  numeric(4,2) not null default 1.00,
  team_size         int not null default 4,
  active            boolean not null default true
);

create table if not exists venues (
  id         uuid primary key default gen_random_uuid(),
  market_id  uuid not null references markets(id) on delete cascade,
  name       text not null,
  address    text,
  kind       text,
  capacity   int
);

-- ───────────────────────── Catalog ─────────────────────────
create table if not exists services (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,       -- photo | video | both
  name         text not null,
  tagline      text,
  description  text,
  sort         int not null default 0
);

create table if not exists packages (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  service_slug     text not null references services(slug),
  name             text not null,
  tagline          text,
  base_price       int not null,           -- USD, before market multiplier
  hours            int not null,
  photographers    int not null default 0,
  videographers    int not null default 0,
  turnaround_days  int not null,
  deliverables     text[] not null default '{}',
  features         text[] not null default '{}',
  popular          boolean not null default false,
  sort             int not null default 0,
  active           boolean not null default true
);

create table if not exists addons (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  name         text not null,
  description  text,
  price        int not null,
  unit         text not null default 'flat',   -- flat | hour
  applies_to   text[] not null default '{photo,video,both}',
  sort         int not null default 0,
  active       boolean not null default true
);

-- ───────────────────────── Clients & weddings ─────────────────────────
create table if not exists clients (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references users(id) on delete cascade,
  partner_one    text not null,
  partner_two    text not null,
  created_at     timestamptz not null default now()
);

create table if not exists team_members (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null unique references users(id) on delete cascade,
  discipline          text not null check (discipline in ('photo','video')),
  bio                 text,
  home_market_id      uuid references markets(id),
  service_radius      int not null default 60,
  specialties         text[] not null default '{}',
  years_experience    int not null default 0,
  languages           text[] not null default '{English}',
  portfolio_url       text,
  instagram           text,
  website             text,
  rating              numeric(2,1) not null default 5.0,
  status              text not null default 'active',
  payout_method       text default 'Direct deposit',
  payout_last4        text,
  lat                 numeric(8,4),
  lng                 numeric(8,4),
  created_at          timestamptz not null default now()
);
create or replace view photographers as select * from team_members where discipline = 'photo';
create or replace view videographers as select * from team_members where discipline = 'video';

create table if not exists weddings (
  id                  uuid primary key default gen_random_uuid(),
  client_id           uuid references clients(id) on delete set null,
  market_id           uuid not null references markets(id),
  venue_id            uuid references venues(id),
  couple              text not null,
  wedding_date        date not null,
  start_time          time not null default '14:00',
  venue_name          text not null,
  venue_address       text,
  ceremony_location   text,
  reception_location  text,
  guest_count         int,
  wedding_type        text,
  special_requests    text,
  notes               text,
  status              text not null default 'confirmed' check (status in ('pending','confirmed','completed','cancelled')),
  created_at          timestamptz not null default now()
);
create index if not exists weddings_date_idx on weddings(wedding_date);

create table if not exists bookings (
  id              uuid primary key default gen_random_uuid(),
  booking_number  text not null unique,
  wedding_id      uuid not null references weddings(id) on delete cascade,
  client_id       uuid references clients(id) on delete set null,
  package_id      uuid not null references packages(id),
  service_slug    text not null references services(slug),
  package_price   int not null,
  addons_total    int not null default 0,
  total           int not null,
  deposit_amount  int not null,
  status          text not null default 'confirmed' check (status in ('pending','confirmed','cancelled','completed')),
  created_at      timestamptz not null default now()
);

create table if not exists booking_addons (
  booking_id  uuid not null references bookings(id) on delete cascade,
  addon_id    uuid not null references addons(id),
  quantity    int not null default 1,
  unit_price  int not null,
  primary key (booking_id, addon_id)
);

create table if not exists client_questionnaires (
  id            uuid primary key default gen_random_uuid(),
  wedding_id    uuid not null unique references weddings(id) on delete cascade,
  answers       jsonb not null default '{}',
  status        text not null default 'not_started' check (status in ('not_started','draft','submitted')),
  submitted_at  timestamptz
);

create table if not exists wedding_timeline_items (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  time        time not null,
  title       text not null,
  detail      text,
  sort        int not null default 0
);

-- Wedding team slots (assignments). Open slots power the "Open Weddings" marketplace.
create table if not exists wedding_assignments (
  id               uuid primary key default gen_random_uuid(),
  wedding_id       uuid not null references weddings(id) on delete cascade,
  role             text not null check (role in ('lead_photo','second_photo','lead_video','second_video')),
  team_member_id   uuid references team_members(id) on delete set null,
  status           text not null default 'open' check (status in ('open','pending','accepted','filled','expired','completed','cancelled')),
  compensation     int not null,
  coverage_hours   int not null,
  call_time        time,
  requirements     text[] not null default '{}',
  notes            text,
  travel_miles     int,
  expires_at       timestamptz,
  accepted_at      timestamptz,
  prep_confirmed_at timestamptz,
  requires_approval boolean not null default false,
  created_at       timestamptz not null default now()
);
create index if not exists assignments_member_idx on wedding_assignments(team_member_id);
create index if not exists assignments_status_idx on wedding_assignments(status);

create table if not exists assignment_declines (
  assignment_id   uuid not null references wedding_assignments(id) on delete cascade,
  team_member_id  uuid not null references team_members(id) on delete cascade,
  reason          text,
  created_at      timestamptz not null default now(),
  primary key (assignment_id, team_member_id)
);

-- ───────────────────────── Availability ─────────────────────────
create table if not exists availability (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references team_members(id) on delete cascade,
  date            date not null,
  status          text not null check (status in ('available','unavailable','personal')),
  note            text,
  source          text not null default 'manual',     -- manual | recurring
  unique (team_member_id, date)
);

create table if not exists availability_rules (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references team_members(id) on delete cascade,
  weekdays        int[] not null,                     -- 0=Sun … 6=Sat
  status          text not null check (status in ('available','unavailable')),
  start_date      date not null,
  end_date        date not null,
  note            text,
  created_at      timestamptz not null default now()
);

-- ───────────────────────── Messaging & notifications ─────────────────────────
create table if not exists conversations (
  id               uuid primary key default gen_random_uuid(),
  subject          text not null,
  kind             text not null default 'direct' check (kind in ('direct','wedding','support')),
  wedding_id       uuid references weddings(id) on delete set null,
  last_message_at  timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id  uuid not null references conversations(id) on delete cascade,
  user_id          uuid not null references users(id) on delete cascade,
  last_read_at     timestamptz not null default 'epoch',
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references conversations(id) on delete cascade,
  sender_id        uuid not null references users(id) on delete cascade,
  body             text not null,
  attachment_name  text,
  attachment_key   text,
  attachment_size  bigint,
  created_at       timestamptz not null default now()
);
create index if not exists messages_conv_idx on messages(conversation_id, created_at);

create table if not exists notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  type        text not null,     -- opportunity | booking | message | payment | license | upload | change
  title       text not null,
  body        text,
  link        text,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id, created_at desc);

-- ───────────────────────── Files ─────────────────────────
create table if not exists uploads (
  id                uuid primary key default gen_random_uuid(),
  wedding_id        uuid references weddings(id) on delete cascade,
  assignment_id     uuid references wedding_assignments(id) on delete set null,
  uploader_id       uuid not null references users(id) on delete cascade,
  kind              text not null check (kind in ('photo','video','document')),
  category          text not null default 'raw',     -- raw | edited | highlights | footage | ceremony | reception | deliverable
  filename          text not null,
  size_bytes        bigint not null,
  mime              text,
  duration_seconds  int,
  storage_key       text,
  status            text not null default 'uploaded' check (status in ('uploading','uploaded','processing','ready','failed')),
  error             text,
  client_visible    boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists uploads_wedding_idx on uploads(wedding_id);

create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  wedding_id  uuid not null references weddings(id) on delete cascade,
  type        text not null,     -- questionnaire | shot_list | timeline | venue_info | special_requests | contract | invoice
  title       text not null,
  content     text,
  visibility  text not null default 'all' check (visibility in ('all','team','client')),
  created_at  timestamptz not null default now()
);

create table if not exists licenses (
  id                uuid primary key default gen_random_uuid(),
  team_member_id    uuid not null references team_members(id) on delete cascade,
  doc_type          text not null check (doc_type in ('drivers_license','business_license','insurance','w9','other')),
  label             text,
  file_name         text not null,
  storage_key       text,
  status            text not null default 'pending_review' check (status in ('pending_review','verified','rejected')),
  expires_on        date,
  uploaded_at       timestamptz not null default now(),
  reviewed_by       uuid references users(id),
  reviewed_at       timestamptz,
  rejection_reason  text
);

-- ───────────────────────── Money ─────────────────────────
create table if not exists client_payments (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references bookings(id) on delete cascade,
  kind            text not null check (kind in ('deposit','balance','installment','addon')),
  amount          int not null,
  due_date        date not null,
  status          text not null default 'scheduled' check (status in ('scheduled','paid','failed','refunded')),
  paid_at         timestamptz,
  method_brand    text,
  method_last4    text,
  provider        text not null default 'mock',
  provider_ref    text,
  receipt_number  text
);

create table if not exists payouts (
  id              uuid primary key default gen_random_uuid(),
  team_member_id  uuid not null references team_members(id) on delete cascade,
  assignment_id   uuid references wedding_assignments(id) on delete set null,
  amount          int not null,
  mileage         int not null default 0,
  bonus           int not null default 0,
  status          text not null default 'pending' check (status in ('pending','processing','paid','on_hold')),
  requested_at    timestamptz,
  scheduled_for   date,
  paid_at         timestamptz,
  method          text,
  reference       text,
  hold_reason     text,
  created_at      timestamptz not null default now()
);

-- ───────────────────────── Content ─────────────────────────
create table if not exists handbook_categories (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,
  title        text not null,
  description  text,
  icon         text,
  sort         int not null default 0
);

create table if not exists handbook_articles (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references handbook_categories(id) on delete cascade,
  slug         text not null unique,
  title        text not null,
  summary      text,
  body         text not null,
  audience     text not null default 'all' check (audience in ('all','photo','video')),
  read_minutes int not null default 3,
  sort         int not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid references bookings(id) on delete set null,
  couple      text not null,
  location    text,
  rating      int not null check (rating between 1 and 5),
  body        text not null,
  featured    boolean not null default false,
  created_at  timestamptz not null default now()
);
