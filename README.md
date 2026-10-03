# Visual Weddings

A wedding photography & videography booking platform with three connected experiences:

- **Public site + booking flow** — premium landing page, live availability check, packages, add-ons, wedding details, account creation, test-mode payment and confirmation.
- **Client dashboard** — countdown, planning progress, booking details, payments (pay balance, receipts), questionnaire, team, timeline, messages, documents & gallery.
- **Team dashboard (photographers & videographers)** — overview, open-weddings marketplace, my weddings + detail pages, availability calendar, messaging, photo/video uploads, payments, licenses, handbook, profile, settings, notifications.
- **Coordinator operations** — license review, assignment approvals, payout processing, bookings and open slots.

Built with **Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · PostgreSQL (Supabase)**.

## Demo accounts (password `demo1234`)

| Role | Email |
| --- | --- |
| Photographer | marcus@visualweddings.test |
| Videographer | daniel@visualweddings.test |
| Client | sarah@visualweddings.test |
| Coordinator | grace@visualweddings.test |

Test cards: `4242 4242 4242 4242` succeeds · `4000 0000 0000 0002` is declined · `4000 0000 0000 9995` insufficient funds.

## Run locally

```bash
npm install
cp .env.example .env.local   # set DATABASE_URL (local Postgres or Supabase pooler URL) and AUTH_SECRET
npm run db:reset             # create schema + load demo data (destructive)
npm run dev                  # http://localhost:3000
```

## Deploy (Vercel + Supabase)

The build command `npm run vercel-build` runs `scripts/setup-db.ts` first: it creates the schema and loads demo data **only if the database is empty**, then runs `next build`. Set `RESEED=1` once to reload demo data.

Environment variables (set them in Vercel → Settings → Environment Variables; values there override `.env.production`):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase **transaction pooler** URL (port 6543). URL-encode special characters in the password (`@` → `%40`). |
| `AUTH_SECRET` | Long random string used to sign session cookies. |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Optional. Enables real file storage (Supabase Storage). Without them uploads are simulated. |

## Project structure

```
db/schema.sql            relational schema (25 tables + views)
db/rls.sql               enables RLS so Supabase's public REST API can't touch app tables
scripts/                 migrate, seed, setup-db (Vercel build hook)
src/app/                 routes: / · /book · /login · /signup · /client/* · /team/* · /admin/*
src/components/ui        design system (buttons, cards, badges, forms, modals, drawers, tabs, toasts…)
src/components/*         shell, messages, uploads, settings, notifications
src/lib/auth.ts          sessions (signed JWT cookie + revocable sessions table), role guards
src/lib/permissions.ts   role → permission map
src/lib/services/*       data layer (team, messages, uploads, catalog, client, notifications…)
src/lib/actions/*        server actions (validated with zod, permission-checked)
src/lib/storage.ts       storage abstraction (Supabase Storage or mock; add S3/R2 by implementing the interface)
src/lib/payments.ts      payment abstraction (mock provider that behaves like Stripe test mode)
src/content/             catalog seed data and the Team Handbook content
```

See `docs/ARCHITECTURE.md` for research notes, information architecture, roles and the data model.
