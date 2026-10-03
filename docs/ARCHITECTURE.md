# Visual Weddings — Research & Architecture

## 1. Research summary

**Client booking reference (Original Weddings).** Navigation: Photography, Videography, Pricing, Reviews, Team, Blog, Contact, Locations, Careers, with a persistent "Check availability & pricing" CTA. The landing page leads with a video hero, trust stats, press badges, three photo styles, a 3-step process (check availability → choose package → enjoy), benefit blocks, reviews and a lead magnet. Pricing is gated behind a location step: a single form asks for the nearest city (≈35 US metros) and an email before showing prices; there's no travel fee within each city's area.
*What we kept:* location-first pricing, metro-based markets, the 3–4 step story, a persistent booking CTA. *What we changed:* no email gate — Visual Weddings shows live availability and real prices immediately, and the whole booking (package, add-ons, details, account, payment) happens in one guided flow with a running price summary.

**Team portal reference (Sound Originals on Knack).** Flat top-tab navigation: Dashboard, Messages, My Availability, Open Weddings, Payments, Team Handbook, Photo Uploads, Video Uploads, Licenses, Account Settings. Patterns observed: an "important" policy banner (copyright, 48-hour upload policy, mileage, time-sync instructions) and an emergency line on the dashboard; Open Weddings split by role (lead photo / lead video) with a request button and a "no travel paid" reminder; availability entered one date at a time with default cities; payments split into "awaiting payment request" vs "requested", plus payroll/contract and insurance upload; uploads list per-assignment upload codes for an external transfer service; licenses list past assignments for portfolio-use licensing; messages are a single form tied to a project.
*What we kept:* the section set, upload/payment policies, emergency line, role-based open weddings, request-payment step. *What we changed:* a SaaS dashboard (BankDash-style layout) with an actionable overview, a real calendar (month/week/list, multi-select, recurring rules, conflict protection), threaded messaging with read receipts, in-app uploads with progress/retry, payout lifecycle (pending → processing → paid / on hold), and compliance documents with expiry tracking.

**Handbook reference (Orca Creatives).** Seven categories: ongoing responsibilities, photo wedding day, photo uploads, video wedding day, video uploads, payments, post-production — practical how-to pages (calendar updates, assignment review, client-communication limits, arrival times, lead vs second, posing, settings, time-sync, 48-hour upload, mileage, payment timing).
*Our handbook* (`src/content/handbook.ts`) is original content in 17 categories / 24 articles, audience-tagged (all/photo/video), searchable, with prev/next navigation and feedback.

**Design reference (BankDash UI kit).** White sidebar with left active indicator, light canvas (#F5F7FA), rounded white cards, page title + search pill + round icon buttons in the top bar, colourful circular stat icons, bar charts and "recent transactions"-style lists. We kept the layout grammar and re-skinned it in the **Midnight & Blush** palette (midnight #1B2140, blush #D99A92, porcelain #FBF8F7) with Inter for UI and Fraunces for editorial headings.

## 2. Routes

| Area | Routes |
| --- | --- |
| Public | `/` · `/book` (7-step wizard) · `/book/confirmation/[number]` · `/login` · `/signup` |
| Client | `/client` · `/client/questionnaire` · `/client/payments` · `/client/messages` · `/client/documents` · `/client/notifications` · `/client/settings` |
| Team | `/team` · `/team/open` · `/team/weddings` · `/team/weddings/[id]` · `/team/availability` · `/team/messages` · `/team/uploads` · `/team/uploads/video` · `/team/payments` · `/team/licenses` · `/team/handbook` · `/team/handbook/[slug]` · `/team/profile` · `/team/settings` · `/team/notifications` |
| Coordinator | `/admin` (license review, assignment approvals, payouts, bookings, open slots, team) · `/admin/messages` · `/admin/notifications` · `/admin/settings` |
| API | `/api/search` (⌘K palette) |

## 3. Roles & permissions (`src/lib/permissions.ts`)

- **client** — book, pay, view own wedding, message team, view deliverables.
- **photographer / videographer** — manage availability, accept opportunities (own discipline only), view assigned weddings, upload, view payouts, submit licenses, edit profile.
- **coordinator** — manage weddings and bookings, assign/approve team, review licenses, manage payouts, edit handbook.
- **admin** — everything.

Every layout calls `requireUser(roles)`; every server action re-checks the session and ownership (e.g. a photographer can only open weddings they're assigned to; team members see couple names, planner and VIP notes but never client email, phone or payment data).

## 4. Data model (`db/schema.sql`)

roles · users · sessions · user_settings · markets (locations) · venues · services · packages · addons · clients · team_members (+ `photographers` / `videographers` views) · weddings · bookings · booking_addons · client_questionnaires · wedding_timeline_items · wedding_assignments (wedding teams / open slots) · assignment_declines · availability · availability_rules · conversations · conversation_participants · messages · notifications · uploads · documents · licenses · client_payments · payouts · handbook_categories · handbook_articles · reviews.

Key flows tie these together: a **booking** creates the wedding, payments schedule, questionnaire, default timeline, documents, a coordinator thread and **open `wedding_assignments`** for each role in the package — which immediately appear in the team's **Open Weddings** marketplace and notify local team members. Accepting a slot locks the row, checks for date conflicts and calendar blocks, marks the date booked and joins the team to the wedding thread.

## 5. Integrations

- **Payments** — `PaymentProvider` interface; the mock validates Luhn/expiry/CVC and supports decline test cards. Swap in Stripe PaymentIntents + Elements so card data never touches the server.
- **Storage** — `StorageProvider` issues signed upload URLs (browser → storage directly, so large videos bypass the app server). Supabase Storage is implemented; S3/R2 follow the same interface. Without credentials uploads are simulated with realistic progress and failures.
- **Auth** — email/password with bcrypt, signed session cookie backed by a revocable `sessions` table (powers "Login sessions" in Settings). OAuth can be added as another way to call `createSession`.
