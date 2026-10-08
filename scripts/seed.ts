/* Seeds Visual Weddings with realistic, fictional demo data.
   Dates are relative to the day you run the seed so the dashboards always look current. */
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { loadEnv } from "./env";
import { MARKETS, VENUES, SERVICES, PACKAGES, ADDONS, AVATAR, unsplash } from "../src/content/catalog";
import { HANDBOOK } from "../src/content/handbook";
import { compensationFor, marketPrice, DEPOSIT_RATE } from "../src/lib/pricing";

loadEnv();
const url = process.env.DATABASE_URL!;
const sql = postgres(url, { ssl: /localhost|127\.0\.0\.1/.test(url) ? false : "require", prepare: false, onnotice: () => {} });

const DEMO_PASSWORD = "demo1234";
const today = new Date();
today.setHours(12, 0, 0, 0);
const day = (offset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const ts = (offsetDays: number, hour = 10, min = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, min, 0, 0);
  return d.toISOString();
};
const pick = <T,>(arr: readonly T[], i: number) => arr[i % arr.length];

async function main() {
  console.log("Seeding Visual Weddings demo data…");
  await sql`truncate roles, users, markets, services, addons, handbook_categories, reviews restart identity cascade`;

  // ── Roles
  const roles = [
    ["client", "Client", ["booking:create", "wedding:view_own", "payment:make", "message:send", "deliverable:view"]],
    ["freelancer", "Freelancer", ["availability:manage", "opportunity:accept", "wedding:view_assigned", "upload:create", "payout:view", "license:submit", "message:send", "profile:edit"]],
    ["coordinator", "Coordinator", ["wedding:manage", "team:assign", "booking:manage", "license:review", "message:send", "handbook:edit"]],
    ["admin", "Administrator", ["*"]],
  ] as const;
  for (const [key, name, perms] of roles) await sql`insert into roles (key, name, permissions) values (${key}, ${name}, ${perms as unknown as string[]})`;

  // ── Markets & venues
  const marketId: Record<string, string> = {};
  for (const [slug, city, state, stateName, region, mult, team] of MARKETS) {
    const [m] = await sql`insert into markets (slug, city, state, state_name, region, price_multiplier, team_size)
      values (${slug}, ${city}, ${state}, ${stateName}, ${region}, ${mult}, ${team}) returning id`;
    marketId[slug] = m.id;
  }
  const venueId: Record<string, string> = {};
  for (const [slug, list] of Object.entries(VENUES)) {
    for (const [name, address, kind, cap] of list) {
      const [v] = await sql`insert into venues (market_id, name, address, kind, capacity) values (${marketId[slug]}, ${name}, ${address}, ${kind}, ${cap}) returning id`;
      venueId[name] = v.id;
    }
  }

  // ── Catalog
  for (const s of SERVICES) await sql`insert into services ${sql(s as any)}`;
  const pkgId: Record<string, string> = {};
  const pkgBySlug = Object.fromEntries(PACKAGES.map((p) => [p.slug, p]));
  for (const [i, p] of PACKAGES.entries()) {
    const [r] = await sql`insert into packages (slug, service_slug, name, tagline, base_price, hours, photographers, videographers, turnaround_days, deliverables, features, popular, sort)
      values (${p.slug}, ${p.service}, ${p.name}, ${p.tagline}, ${p.price}, ${p.hours}, ${p.photographers}, ${p.videographers}, ${p.turnaround}, ${p.deliverables}, ${p.features}, ${!!p.popular}, ${i}) returning id`;
    pkgId[p.slug] = r.id;
  }
  const addonId: Record<string, string> = {};
  for (const [i, a] of ADDONS.entries()) {
    const [r] = await sql`insert into addons (slug, name, description, price, unit, applies_to, sort)
      values (${a.slug}, ${a.name}, ${a.description}, ${a.price}, ${a.unit}, ${a.applies as unknown as string[]}, ${i}) returning id`;
    addonId[a.slug] = r.id;
  }

  // ── Users
  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  async function user(email: string, role: string, full_name: string, phone: string | null, avatar?: string) {
    const [u] = await sql`insert into users (email, password_hash, role, full_name, phone, avatar_url)
      values (${email}, ${hash}, ${role}, ${full_name}, ${phone}, ${avatar ? unsplash(avatar, 200, 200) : null}) returning id`;
    await sql`insert into user_settings (user_id) values (${u.id})`;
    return u.id as string;
  }

  const coordinator = await user("grace@visualweddings.test", "coordinator", "Grace Thompson", "(704) 555-0142", AVATAR.w2);
  const admin = await user("admin@visualweddings.test", "admin", "Alex Rivera", "(704) 555-0100");

  type TM = { email: string; name: string; skills: ("photo" | "video" | "content")[]; market: string; avatar?: string; years: number; specialties: string[]; bio: string; langs?: string[]; rating: number };
  const team: TM[] = [
    { email: "marcus@visualweddings.test", name: "Marcus Johnson", skills: ["photo", "content"], market: "charlotte-nc", avatar: AVATAR.m2, years: 8, rating: 4.9,
      specialties: ["Documentary", "Golden-hour portraits", "Large receptions"], langs: ["English", "Spanish"],
      bio: "Documentary-first wedding photographer based in Charlotte. I love quiet in-between moments and big, joyful dance floors." },
    { email: "daniel@visualweddings.test", name: "Daniel Williams", skills: ["video"], market: "raleigh-durham-nc", avatar: AVATAR.m1, years: 6, rating: 4.8,
      specialties: ["Cinematic films", "Drone (Part 107)", "Audio"], bio: "Filmmaker focused on clean audio and honest storytelling. FAA Part 107 certified." },
    { email: "michael@visualweddings.test", name: "Michael Carter", skills: ["photo"], market: "greensboro-nc", avatar: AVATAR.m3, years: 11, rating: 4.9,
      specialties: ["Classic portraits", "Family formals", "Church ceremonies"], bio: "Eleven seasons and counting. Calm, organised and great with big families." },
    { email: "aisha@visualweddings.test", name: "Aisha Bello", skills: ["photo"], market: "atlanta-ga", avatar: AVATAR.w3, years: 7, rating: 5.0,
      specialties: ["Editorial", "Cultural ceremonies", "Flash at night"], langs: ["English", "Yoruba"], bio: "Editorial eye, warm heart. Specialist in multi-day and cultural celebrations." },
    { email: "priya@visualweddings.test", name: "Priya Nair", skills: ["video"], market: "charlotte-nc", avatar: AVATAR.w1, years: 5, rating: 4.8,
      specialties: ["Highlight films", "Social teasers"], langs: ["English", "Hindi"], bio: "I cut films that feel like your favourite song." },
    { email: "jordan@visualweddings.test", name: "Jordan Lee", skills: ["photo"], market: "raleigh-durham-nc", years: 4, rating: 4.7, specialties: ["Candid", "Outdoor"], bio: "Candid storyteller who loves barn and garden weddings." },
    { email: "sofia@visualweddings.test", name: "Sofia Martinez", skills: ["photo"], market: "charlotte-nc", years: 3, rating: 4.8, specialties: ["Second shooting", "Details"], langs: ["English", "Spanish"], bio: "Detail-obsessed second shooter and rising lead." },
    { email: "kwame@visualweddings.test", name: "Kwame Mensah", skills: ["video"], market: "atlanta-ga", years: 9, rating: 4.9, specialties: ["Feature films", "Multi-cam ceremonies"], bio: "Documentary filmmaker; multi-camera ceremony specialist." },
    { email: "elena@visualweddings.test", name: "Elena Rossi", skills: ["photo"], market: "washington-dc", years: 10, rating: 4.9, specialties: ["Black tie", "Architecture"], langs: ["English", "Italian"], bio: "Fine-art approach for formal city weddings." },
    { email: "jade@visualweddings.test", name: "Jade Thompson", skills: ["content"], market: "charlotte-nc", years: 3, rating: 4.9, specialties: ["Vertical reels", "Same-day teasers", "Behind the scenes"], bio: "Wedding content creator: phone-first reels and same-day teasers couples can post that night." },
    { email: "tyler@visualweddings.test", name: "Tyler Brooks", skills: ["video", "content"], market: "greensboro-nc", years: 3, rating: 4.6, specialties: ["Gimbal work", "Reels"], bio: "Energetic shooter for dance-floor heavy weddings." },
  ];
  const tm: Record<string, { id: string; user: string }> = {};
  for (const t of team) {
    const uid = await user(t.email, "freelancer", t.name, `(${700 + team.indexOf(t)}) 555-01${10 + team.indexOf(t)}`, t.avatar);
    const [r] = await sql`insert into team_members (user_id, skills, discipline, bio, home_market_id, service_radius, specialties, years_experience, languages, portfolio_url, instagram, website, rating, payout_last4)
      values (${uid}, ${t.skills}, ${t.skills.find((x) => x !== "content") ?? null}, ${t.bio}, ${marketId[t.market]}, ${t.market === "charlotte-nc" ? 90 : 60}, ${t.specialties}, ${t.years}, ${t.langs ?? ["English"]},
              ${"https://portfolio.example.com/" + t.email.split("@")[0]}, ${"@" + t.email.split("@")[0] + ".films"}, null, ${t.rating}, ${String(4000 + team.indexOf(t) * 137).slice(-4)}) returning id`;
    tm[t.email.split("@")[0]] = { id: r.id, user: uid };
  }
  // A photographer who applied through /join and is waiting for review
  {
    const uid = await user("nina@visualweddings.test", "freelancer", "Nina Okafor", "(704) 555-0188");
    await sql`insert into team_members (user_id, skills, discipline, bio, home_market_id, years_experience, portfolio_url, instagram, equipment, home_address, status, applied_at, specialties)
      values (${uid}, ${["photo", "content"]}, 'photo', ${"Documentary wedding photographer — 40+ weddings as a second shooter and 12 as a lead. I love candid family moments and dance floors."},
              ${marketId["charlotte-nc"]}, 4, 'https://portfolio.example.com/nina', '@nina.okafor.photo', 'Canon R6 II ×2, 24-70 f/2.8, 70-200 f/2.8, 35 f/1.4, Godox flashes',
              '1200 East Blvd, Charlotte, NC 28203', 'applicant', now() - interval '2 days', ${["Documentary", "Candid"]})`;
  }

  // ── Weddings
  type W = {
    key: string; couple: [string, string]; email: string; offset: number; market: string; venue: string; pkg: string; addons?: string[];
    status?: "confirmed" | "completed" | "cancelled"; guests: number; type: string; start?: string;
    slots: { role: string; who?: string; status: string; expiresIn?: number; miles?: number; req?: string[]; notes?: string }[];
  };
  const W_: W[] = [
    { key: "sarah", couple: ["Sarah Mitchell", "James Porter"], email: "sarah@visualweddings.test", offset: 15, market: "charlotte-nc", venue: "Willow Creek Estate", pkg: "photo-signature", addons: ["additional-hour", "content-creator"], guests: 160, type: "Garden ceremony & reception", start: "14:00",
      slots: [{ role: "lead_photo", who: "marcus", status: "accepted" }, { role: "second_photo", who: "sofia", status: "accepted" }, { role: "lead_content", who: "jade", status: "accepted", req: ["Recent phone that shoots 4K", "Gimbal or stabiliser", "Black attire"] }] },
    { key: "olivia", couple: ["Olivia Grant", "Marcus Reed"], email: "olivia@example.test", offset: 29, market: "raleigh-durham-nc", venue: "Magnolia Barn", pkg: "duo-signature", addons: ["content-creator"], guests: 190, type: "Rustic barn", start: "15:00",
      slots: [{ role: "lead_photo", who: "jordan", status: "accepted" }, { role: "lead_video", who: "daniel", status: "accepted" },
        { role: "lead_content", status: "open", expiresIn: 14, req: ["Recent phone that shoots 4K", "Gimbal or stabiliser", "Social-first portfolio", "Black attire"], notes: "Couple wants a same-day teaser for their reception slideshow." }, { role: "second_photo", status: "open", expiresIn: 12, miles: 158, req: ["2+ seasons second shooting", "Two bodies, dual slots"], notes: "Barn venue — bring flash for the reception." }] },
    { key: "emily", couple: ["Emily Chen", "David Okafor"], email: "emily@example.test", offset: 36, market: "charlotte-nc", venue: "The Ivory Atrium", pkg: "duo-legacy", addons: ["drone-coverage"], guests: 240, type: "Black-tie ballroom", start: "16:00",
      slots: [{ role: "lead_photo", who: "marcus", status: "accepted" }, { role: "second_photo", who: "sofia", status: "accepted" }, { role: "lead_video", who: "priya", status: "accepted" }, { role: "second_video", who: "daniel", status: "accepted", miles: 310 }] },
    { key: "hannah", couple: ["Hannah Brooks", "Christopher Lane"], email: "hannah@example.test", offset: 21, market: "greensboro-nc", venue: "Sycamore Grove", pkg: "photo-signature", guests: 130, type: "Garden", start: "15:30",
      slots: [{ role: "lead_photo", status: "open", expiresIn: 6, miles: 184, req: ["Lead experience (20+ weddings)", "70–200 f/2.8"], notes: "Outdoor ceremony with a rain plan in the barn." }, { role: "second_photo", who: "michael", status: "accepted" }] },
    { key: "maya", couple: ["Maya Patel", "Jordan Hughes"], email: "maya@example.test", offset: 35, market: "raleigh-durham-nc", venue: "The Glasshouse at Oak City", pkg: "duo-essentials", guests: 120, type: "Modern conservatory", start: "17:00",
      slots: [{ role: "lead_photo", status: "open", expiresIn: 14, miles: 166, req: ["Experience with mixed lighting"] }, { role: "lead_video", status: "open", expiresIn: 14, miles: 166, req: ["Lav + recorder for vows"] }] },
    { key: "chloe", couple: ["Chloe Adams", "Samuel Wright"], email: "chloe@example.test", offset: 42, market: "charlotte-nc", venue: "Lakeview Pavilion", pkg: "duo-signature", guests: 175, type: "Lakeside", start: "16:30",
      slots: [{ role: "lead_photo", who: "michael", status: "accepted" }, { role: "second_photo", status: "open", expiresIn: 20, miles: 38, req: ["Second-shooter experience"] }, { role: "lead_video", status: "open", expiresIn: 20, miles: 38, req: ["Gimbal", "Drone optional"] }] },
    { key: "ava", couple: ["Ava Robinson", "Noah Bennett"], email: "ava@example.test", offset: 49, market: "atlanta-ga", venue: "Stonebridge Manor", pkg: "duo-signature", guests: 210, type: "Manor estate", start: "15:00",
      slots: [{ role: "lead_photo", who: "aisha", status: "accepted" }, { role: "second_photo", status: "filled" }, { role: "lead_video", who: "kwame", status: "accepted" }] },
    { key: "zoe", couple: ["Zoe Carter", "Liam Foster"], email: "zoe@example.test", offset: 10, market: "washington-dc", venue: "Capitol Terrace", pkg: "photo-heirloom", guests: 150, type: "Rooftop", start: "17:30",
      slots: [{ role: "lead_photo", who: "elena", status: "accepted" }, { role: "second_photo", status: "expired", expiresIn: -2, miles: 395 }] },
    { key: "nia", couple: ["Nia Washington", "Malik Johnson"], email: "nia@example.test", offset: 56, market: "charlotte-nc", venue: "Founders Hall Loft", pkg: "photo-signature", guests: 140, type: "Urban loft", start: "14:30",
      slots: [{ role: "lead_photo", who: "marcus", status: "pending", miles: 12 }, { role: "second_photo", status: "open", expiresIn: 25, miles: 12 }] },
    { key: "isabella", couple: ["Isabella Moreno", "Mateo Silva"], email: "isabella@example.test", offset: 63, market: "greensboro-nc", venue: "The Revival Room", pkg: "duo-essentials", guests: 110, type: "Historic venue", start: "16:00",
      slots: [{ role: "lead_photo", who: "michael", status: "accepted" }, { role: "lead_video", who: "tyler", status: "accepted" }] },
    { key: "grace2", couple: ["Ella Simmons", "Owen Price"], email: "ella@example.test", offset: 70, market: "nashville-tn", venue: "Cumberland River Hall", pkg: "video-feature", guests: 200, type: "Riverfront", start: "16:00",
      slots: [{ role: "lead_video", status: "open", expiresIn: 30, miles: 390, req: ["Travel — hotel stipend provided"] }, { role: "second_video", status: "open", expiresIn: 30, miles: 390 }] },
    { key: "lily", couple: ["Lily Turner", "Ethan Cole"], email: "lily@example.test", offset: 77, market: "charleston-sc", venue: "Ashley Oaks Plantation House", pkg: "photo-heirloom", guests: 180, type: "Historic estate", start: "16:30",
      slots: [{ role: "lead_photo", status: "open", expiresIn: 35, miles: 208, req: ["Lead experience", "Comfortable in heat"] }, { role: "second_photo", status: "open", expiresIn: 35, miles: 208 }] },
    { key: "brianna", couple: ["Brianna Hall", "Cole Ramirez"], email: "brianna@example.test", offset: 84, market: "charlotte-nc", venue: "Willow Creek Estate", pkg: "photo-essentials", status: "cancelled", guests: 90, type: "Garden",
      slots: [{ role: "lead_photo", who: "marcus", status: "cancelled" }] },
    // Completed
    { key: "rachel", couple: ["Rachel Kim", "Benjamin Ross"], email: "rachel@example.test", offset: -6, market: "charlotte-nc", venue: "The Ivory Atrium", pkg: "duo-signature", addons: ["content-creator"], status: "completed", guests: 200, type: "Ballroom", start: "15:00",
      slots: [{ role: "lead_photo", who: "marcus", status: "completed" }, { role: "second_photo", who: "sofia", status: "completed" }, { role: "lead_video", who: "daniel", status: "completed" }, { role: "lead_content", who: "jade", status: "completed" }] },
    { key: "lauren", couple: ["Lauren Hayes", "Joshua Bell"], email: "lauren@example.test", offset: -20, market: "raleigh-durham-nc", venue: "Heritage Tobacco Warehouse", pkg: "duo-signature", status: "completed", guests: 230, type: "Industrial",
      slots: [{ role: "lead_photo", who: "jordan", status: "completed" }, { role: "second_photo", who: "marcus", status: "completed", miles: 170 }, { role: "lead_video", who: "daniel", status: "completed" }] },
    { key: "megan", couple: ["Megan Ward", "Andrew Kim"], email: "megan@example.test", offset: -34, market: "charlotte-nc", venue: "Lakeview Pavilion", pkg: "photo-heirloom", status: "completed", guests: 150, type: "Lakeside",
      slots: [{ role: "lead_photo", who: "marcus", status: "completed" }, { role: "second_photo", who: "sofia", status: "completed" }] },
    { key: "jessica", couple: ["Jessica Long", "Ryan Patel"], email: "jessica@example.test", offset: -55, market: "greensboro-nc", venue: "Sycamore Grove", pkg: "photo-signature", status: "completed", guests: 120, type: "Garden",
      slots: [{ role: "lead_photo", who: "marcus", status: "completed", miles: 184 }, { role: "second_photo", who: "michael", status: "completed" }] },
    { key: "ashley", couple: ["Ashley Green", "Kevin Moore"], email: "ashley@example.test", offset: -83, market: "charlotte-nc", venue: "Founders Hall Loft", pkg: "duo-essentials", status: "completed", guests: 100, type: "Urban loft",
      slots: [{ role: "lead_photo", who: "marcus", status: "completed" }, { role: "lead_video", who: "priya", status: "completed" }] },
  ];

  const weddingIds: Record<string, string> = {};
  const assignmentIds: Record<string, string> = {};
  const clientUsers: Record<string, string> = {};
  let bookingSeq = 4180;

  for (const w of W_) {
    const pkg = pkgBySlug[w.pkg];
    const mult = MARKETS.find((m) => m[0] === w.market)![5];
    const [first1] = w.couple[0].split(" ");
    const [first2] = w.couple[1].split(" ");
    const couple = `${first1} & ${first2}`;
    const uid = await user(w.email, "client", w.couple[0], "(704) 555-01" + String(30 + W_.indexOf(w)).padStart(2, "0"));
    clientUsers[w.key] = uid;
    const [client] = await sql`insert into clients (user_id, partner_one, partner_two) values (${uid}, ${w.couple[0]}, ${w.couple[1]}) returning id`;
    const venue = VENUES[w.market]?.find((v) => v[0] === w.venue);
    const [wed] = await sql`insert into weddings (client_id, market_id, venue_id, couple, wedding_date, start_time, venue_name, venue_address, ceremony_location, reception_location, guest_count, wedding_type, special_requests, notes, status)
      values (${client.id}, ${marketId[w.market]}, ${venueId[w.venue] ?? null}, ${couple}, ${day(w.offset)}, ${w.start ?? "15:00"}, ${w.venue}, ${venue?.[1] ?? null},
        ${w.venue + " — " + (w.type.includes("Garden") || w.type.includes("Lake") ? "lawn" : "main hall")}, ${w.venue + " — reception hall"}, ${w.guests}, ${w.type},
        ${w.key === "sarah" ? "James's grandmother uses a wheelchair — please plan family formals at ground level. Sarah would love a photo with her late father's watch." : w.key === "emily" ? "Tea ceremony at 2:30 PM before the main ceremony. Please capture both families' traditions." : null},
        ${w.key === "sarah" ? "Unplugged ceremony. Sparkler exit at 10:45 PM — coverage ends at 11 PM." : null},
        ${w.status ?? "confirmed"}) returning id`;
    weddingIds[w.key] = wed.id;

    // Booking & payments
    const packagePrice = marketPrice(pkg.price, mult);
    const addonLines = (w.addons ?? []).map((a) => ({ a, price: marketPrice(ADDONS.find((x) => x.slug === a)!.price, mult) }));
    const addonsTotal = addonLines.reduce((s, l) => s + l.price, 0);
    const total = packagePrice + addonsTotal;
    const deposit = Math.round((total * DEPOSIT_RATE) / 10) * 10;
    const bookingNumber = `VW-${new Date().getFullYear()}-${bookingSeq++}`;
    const [bk] = await sql`insert into bookings (booking_number, wedding_id, client_id, package_id, service_slug, package_price, addons_total, total, deposit_amount, status, created_at)
      values (${bookingNumber}, ${wed.id}, ${client.id}, ${pkgId[w.pkg]}, ${pkg.service}, ${packagePrice}, ${addonsTotal}, ${total}, ${deposit},
              ${w.status === "cancelled" ? "cancelled" : w.status === "completed" ? "completed" : "confirmed"}, ${ts(w.offset - 200)}) returning id`;
    for (const l of addonLines) await sql`insert into booking_addons (booking_id, addon_id, unit_price) values (${bk.id}, ${addonId[l.a]}, ${l.price})`;
    const card = pick(["Visa", "Mastercard", "Amex"], W_.indexOf(w));
    const last4 = String(4242 + W_.indexOf(w) * 11).slice(-4);
    await sql`insert into client_payments (booking_id, kind, amount, due_date, status, paid_at, method_brand, method_last4, provider_ref, receipt_number)
      values (${bk.id}, 'deposit', ${deposit}, ${day(w.offset - 200)}, 'paid', ${ts(w.offset - 200)}, ${card}, ${last4}, ${"mock_pi_" + bk.id.slice(0, 8)}, ${"R-" + bookingNumber.slice(-4) + "-1"})`;
    const balance = total - deposit;
    const balanceDue = day(w.offset - 30);
    const balancePaid = w.offset - 30 < 0 && w.status !== "cancelled";
    if (w.key === "sarah") {
      // Split balance into two installments; first paid.
      const half = Math.round(balance / 2);
      await sql`insert into client_payments (booking_id, kind, amount, due_date, status, paid_at, method_brand, method_last4, provider_ref, receipt_number)
        values (${bk.id}, 'installment', ${half}, ${day(-45)}, 'paid', ${ts(-45)}, ${card}, ${last4}, ${"mock_pi_inst_" + bk.id.slice(0, 6)}, ${"R-" + bookingNumber.slice(-4) + "-2"})`;
      await sql`insert into client_payments (booking_id, kind, amount, due_date, status) values (${bk.id}, 'balance', ${balance - half}, ${day(1)}, 'scheduled')`;
    } else if (w.status === "cancelled") {
      await sql`insert into client_payments (booking_id, kind, amount, due_date, status) values (${bk.id}, 'balance', ${balance}, ${balanceDue}, 'refunded')`;
    } else {
      await sql`insert into client_payments (booking_id, kind, amount, due_date, status, paid_at, method_brand, method_last4, receipt_number)
        values (${bk.id}, 'balance', ${balance}, ${balanceDue}, ${balancePaid ? "paid" : "scheduled"}, ${balancePaid ? ts(w.offset - 30) : null},
                ${balancePaid ? card : null}, ${balancePaid ? last4 : null}, ${balancePaid ? "R-" + bookingNumber.slice(-4) + "-2" : null})`;
    }

    // Questionnaire
    const qStatus = w.offset < 0 || ["sarah", "emily", "olivia"].includes(w.key) ? "submitted" : w.key === "nia" ? "draft" : "not_started";
    await sql`insert into client_questionnaires (wedding_id, answers, status, submitted_at) values (${wed.id}, ${sql.json(qStatus === "not_started" ? {} : {
      getting_ready: `${w.couple[0].split(" ")[0]}: bridal suite, 11:30 AM · ${w.couple[1].split(" ")[0]}: groom's lounge, 12:30 PM`,
      first_look: w.key === "sarah" ? "Yes — by the willow tree at 1:30 PM" : "No first look",
      family_formals: "Couple + both sets of parents; immediate families; grandparents; full wedding party",
      vip: w.key === "sarah" ? "Grandma Rose (wheelchair), Uncle Tom (officiant)" : "Grandparents",
      planner: "Kendra Lewis, Bloom & Co. Events — (704) 555-0177",
      must_have: "Sparkler exit, ring shot with grandmother's ring box",
      music: "String quartet for ceremony, DJ Marco for reception",
    })}, ${qStatus}, ${qStatus === "submitted" ? ts(Math.min(w.offset - 21, -3)) : null})`;

    // Timeline
    const [h, m] = (w.start ?? "15:00").split(":").map(Number);
    const at = (dh: number, dm = 0) => {
      const mins = h * 60 + m + dh * 60 + dm;
      return `${String(Math.floor(mins / 60) % 24).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    };
    const tl: [string, string, string][] = [
      [at(0), "Team arrival & details", "Rings, invitation suite, attire, florals"],
      [at(0, 30), "Getting ready", "Both partners — second shooter covers partner two"],
      [at(1, 30), "First look & couple portraits", "Garden path, 30 minutes"],
      [at(2), "Ceremony", "Unplugged · 30 minutes"],
      [at(2, 45), "Family formals", "Use questionnaire list — largest groups first"],
      [at(3, 15), "Cocktail hour & golden-hour portraits", ""],
      [at(4), "Reception entrances & first dance", ""],
      [at(4, 45), "Toasts & dinner", "Best man, maid of honour, father of the bride"],
      [at(6), "Cake & open dancing", ""],
      [at(pkg.hours + (w.addons?.includes("additional-hour") ? 1 : 0)), "Coverage ends", w.key === "sarah" ? "Sparkler exit at 10:45 PM" : ""],
    ];
    for (const [i, [t, title, detail]] of tl.entries())
      await sql`insert into wedding_timeline_items (wedding_id, time, title, detail, sort) values (${wed.id}, ${t}, ${title}, ${detail || null}, ${i})`;

    // Documents
    await sql`insert into documents (wedding_id, type, title, content, visibility) values
      (${wed.id}, 'shot_list', 'Shot list', ${"- Ring shot with heirloom ring box\n- Grandparents with the couple\n- Both families together after ceremony\n- Wide of the room before guests enter\n- Sparkler exit (10 PM)"}, 'all'),
      (${wed.id}, 'venue_info', 'Venue information', ${`**${w.venue}**\n\n${venue?.[1] ?? ""}\n\n- Parking: vendor lot behind the main building\n- Load-in: side door, ask for the venue coordinator\n- Rain plan: covered terrace / indoor hall\n- Vendor meal provided at 7:00 PM`}, 'team'),
      (${wed.id}, 'contract', 'Service agreement', ${"Signed service agreement for booking " + bookingNumber}, 'client')`;

    // Assignments
    for (const s of w.slots) {
      const hours = pkg.hours + (w.addons?.includes("additional-hour") ? 1 : 0);
      const role = s.role;
      const [a] = await sql`insert into wedding_assignments (wedding_id, role, team_member_id, status, compensation, coverage_hours, call_time, requirements, notes, travel_miles, expires_at, accepted_at, requires_approval, prep_confirmed_at)
        values (${wed.id}, ${role}, ${s.who ? tm[s.who].id : null}, ${s.status}, ${compensationFor(role, hours) + (s.miles && s.miles > 100 ? 75 : 0)}, ${hours},
                ${role.startsWith("second") ? at(0, 30) : at(0)}, ${s.req ?? ["Black attire", "Two camera bodies"]}, ${s.notes ?? null}, ${s.miles ?? null},
                ${s.expiresIn !== undefined ? ts(s.expiresIn, 23, 59) : null}, ${s.who && s.status !== "pending" ? ts(Math.min(w.offset - 60, -10)) : null}, ${(s.miles ?? 0) > 300 || s.status === "pending"}, ${w.offset < 0 || ["isabella","ava","olivia"].includes(w.key) ? ts(-3) : null}) returning id`;
      assignmentIds[`${w.key}:${role}`] = a.id;
    }
  }

  // Decline one opportunity for Marcus so the "declined" filter has data
  await sql`insert into assignment_declines (assignment_id, team_member_id, reason) values (${assignmentIds["lily:second_photo"]}, ${tm.marcus.id}, 'Prefer lead roles for travel weddings')`;

  // ── Availability (next 120 days) for every team member
  for (const [key, t] of Object.entries(tm)) {
    for (let d = 1; d <= 120; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      const dow = date.getDay();
      if (dow === 6 || dow === 5 || (dow === 0 && d % 3 === 0)) {
        const status = key === "marcus" && dow === 5 && d >= 20 && d <= 26 ? "personal" : key === "marcus" && d >= 90 && d <= 96 ? "unavailable" : "available";
        await sql`insert into availability (team_member_id, date, status, note, source) values (${t.id}, ${date.toISOString().slice(0, 10)}, ${status},
          ${status === "personal" ? "Sister's birthday" : status === "unavailable" ? "Family vacation" : null}, ${dow === 6 ? "recurring" : "manual"}) on conflict do nothing`;
      }
    }
    await sql`insert into availability_rules (team_member_id, weekdays, status, start_date, end_date, note) values (${t.id}, ${[6]}, 'available', ${day(0)}, ${day(120)}, 'Saturdays all season')`;
  }

  // ── Licenses
  const lic = async (who: string, type: string, status: string, file: string, uploaded: number, expires: number | null, reason?: string) =>
    sql`insert into licenses (team_member_id, doc_type, file_name, status, uploaded_at, expires_on, reviewed_by, reviewed_at, rejection_reason)
        values (${tm[who].id}, ${type}, ${file}, ${status}, ${ts(uploaded)}, ${expires === null ? null : day(expires)}, ${status === "pending_review" ? null : coordinator}, ${status === "pending_review" ? null : ts(uploaded + 1)}, ${reason ?? null})`;
  await lic("marcus", "drivers_license", "verified", "NC-drivers-license.pdf", -300, 1100);
  await lic("marcus", "insurance", "verified", "COI-2026-Johnson-Photo.pdf", -340, 19);
  await lic("marcus", "business_license", "pending_review", "Charlotte-business-license.pdf", -2, 365);
  await lic("daniel", "drivers_license", "verified", "drivers-license.jpg", -200, 800);
  await lic("daniel", "insurance", "verified", "insurance-2025.pdf", -380, -5);
  await lic("daniel", "other", "verified", "FAA-Part-107.pdf", -200, 500);
  await lic("daniel", "w9", "rejected", "w9-unsigned.pdf", -12, null, "The form is unsigned — please sign page 1 and re-upload.");
  for (const k of ["michael", "aisha", "priya", "jordan", "sofia", "kwame", "elena", "tyler"]) {
    await lic(k, "drivers_license", "verified", "license.pdf", -150, 900);
    await lic(k, "insurance", k === "jordan" ? "pending_review" : "verified", "coi.pdf", -100, 260);
  }

  // ── Payouts
  const payout = async (who: string, akey: string, amount: number, status: string, opts: { mileage?: number; bonus?: number; paid?: number; requested?: number; sched?: number; hold?: string } = {}) =>
    sql`insert into payouts (team_member_id, assignment_id, amount, mileage, bonus, status, requested_at, scheduled_for, paid_at, method, reference, hold_reason)
        values (${tm[who].id}, ${assignmentIds[akey]}, ${amount}, ${opts.mileage ?? 0}, ${opts.bonus ?? 0}, ${status},
                ${opts.requested !== undefined ? ts(opts.requested) : null}, ${opts.sched !== undefined ? day(opts.sched) : null},
                ${opts.paid !== undefined ? ts(opts.paid, 9) : null}, 'Direct deposit', ${status === "paid" ? "ACH-" + Math.floor(100000 + Math.random() * 899999) : null}, ${opts.hold ?? null})`;
  await payout("marcus", "lauren:second_photo", 480, "processing", { mileage: 95, bonus: 50, requested: -18, sched: 4 });
  await payout("marcus", "megan:lead_photo", 1150, "paid", { bonus: 50, requested: -32, paid: -24 });
  await payout("marcus", "jessica:lead_photo", 920, "on_hold", { mileage: 105, requested: -52, hold: "Time-sync frame missing from Camera B — reply in Messages to resolve." });
  await payout("marcus", "ashley:lead_photo", 690, "paid", { bonus: 50, requested: -81, paid: -73 });
  await payout("daniel", "rachel:lead_video", 1000, "pending", { requested: -4 });
  await payout("daniel", "lauren:lead_video", 1000, "paid", { bonus: 50, requested: -18, paid: -10 });
  await payout("sofia", "megan:second_photo", 600, "paid", { paid: -24, requested: -32 });
  await payout("priya", "ashley:lead_video", 750, "paid", { paid: -73, requested: -81 });
  // Earlier-season history for Marcus so charts have shape
  const hist = [[-120, 1100], [-148, 980], [-176, 1240], [-205, 860], [-233, 1180], [-262, 760], [-290, 1050]] as const;
  for (const [off, amt] of hist)
    await sql`insert into payouts (team_member_id, amount, bonus, status, requested_at, paid_at, method, reference, created_at)
      values (${tm.marcus.id}, ${amt}, 50, 'paid', ${ts(off + 2)}, ${ts(off + 9)}, 'Direct deposit', ${"ACH-" + (300000 + -off)}, ${ts(off)})`;

  // ── Uploads
  const up = async (wkey: string, akey: string, who: string, kind: string, cat: string, file: string, size: number, status: string, opts: { dur?: number; err?: string; ago?: number; visible?: boolean } = {}) =>
    sql`insert into uploads (wedding_id, assignment_id, uploader_id, kind, category, filename, size_bytes, mime, duration_seconds, storage_key, status, error, client_visible, created_at)
        values (${weddingIds[wkey]}, ${assignmentIds[akey] ?? null}, ${who}, ${kind}, ${cat}, ${file}, ${Math.round(size)}, ${kind === "video" ? "video/mp4" : kind === "photo" ? "image/x-canon-cr3" : "application/pdf"},
                ${opts.dur ?? null}, ${status === "failed" ? null : `mock/${wkey}/${file}`}, ${status}, ${opts.err ?? null}, ${opts.visible ?? false}, ${ts(opts.ago ?? -5, 14)})`;
  const MB = 1024 * 1024;
  for (let i = 1; i <= 8; i++) await up("rachel", "rachel:lead_photo", tm.marcus.user, "photo", "raw", `RK-BR_A_${String(i * 37).padStart(4, "0")}.CR3`, 28 * MB + i * 913_000, "uploaded", { ago: -5 });
  await up("rachel", "rachel:lead_photo", tm.marcus.user, "photo", "raw", "RK-BR_A_0412.CR3", 29 * MB, "failed", { err: "Connection reset while uploading", ago: -5 });
  await up("rachel", "rachel:lead_photo", tm.marcus.user, "photo", "raw", "TIMESYNC_A.CR3", 27 * MB, "uploaded", { ago: -5 });
  await up("megan", "megan:lead_photo", tm.marcus.user, "photo", "edited", "Megan-Andrew_Highlights_01-60.zip", 640 * MB, "uploaded", { ago: -30 });
  await up("rachel", "rachel:lead_video", tm.daniel.user, "video", "ceremony", "A-CAM_Ceremony_Wide.MP4", 18.4 * 1024 * MB, "ready", { dur: 2410, ago: -5 });
  await up("rachel", "rachel:lead_video", tm.daniel.user, "video", "reception", "B-CAM_Toasts.MP4", 9.7 * 1024 * MB, "processing", { dur: 1530, ago: -4 });
  await up("rachel", "rachel:lead_video", tm.daniel.user, "video", "footage", "GIMBAL_Portraits_001.MP4", 4.1 * 1024 * MB, "ready", { dur: 612, ago: -5 });
  await up("rachel", "rachel:lead_video", tm.daniel.user, "video", "audio", "LAV_Officiant_Ceremony.WAV", 412 * MB, "uploaded", { dur: 2380, ago: -5 });
  // Footage tags (moment + camera) and a few markers, as the upload screen records them
  for (const [file, moment, source] of [["A-CAM_Ceremony_Wide.MP4", "ceremony", "a_cam"], ["B-CAM_Toasts.MP4", "toasts", "b_cam"], ["GIMBAL_Portraits_001.MP4", "portraits", "a_cam"], ["LAV_Officiant_Ceremony.WAV", "ceremony", "audio_officiant"]])
    await sql`update uploads set moment = ${moment}, source = ${source}, category = ${source.startsWith("audio_") ? "audio" : "footage"}, camera_markers = ${file.startsWith("A-CAM")} where filename = ${file}`;
  await sql`update uploads set moment = 'mixed', source = 'body_1' where kind = 'photo' and wedding_id = ${weddingIds.rachel}`;
  const [cer] = await sql`select id from uploads where filename = 'A-CAM_Ceremony_Wide.MP4'`;
  for (const [at, beat, note] of [[95, "processional", null], [742, "vows", "Both read their own vows"], [1105, "rings", null], [1190, "kiss", null], [1260, "recessional", null]] as const)
    await sql`insert into upload_markers (upload_id, at_seconds, beat, note, created_by) values (${cer.id}, ${at}, ${beat}, ${note}, ${tm.daniel.user})`;
  // Marcus has accepted the team standards; Daniel hasn't yet (shows the reminder)
  await sql`insert into standards_acknowledgments (team_member_id, version, signer_name, signed_at, ip) values (${tm.marcus.id}, 1, 'Marcus Johnson', ${ts(-3)}, 'seed')`;
  await up("rachel", "rachel:lead_video", tm.daniel.user, "video", "footage", "DRONE_Venue.MP4", 2.2 * 1024 * MB, "failed", { dur: 304, err: "Upload timed out after 3 attempts", ago: -4 });
  await up("lauren", "lauren:lead_video", tm.daniel.user, "video", "footage", "Lauren-Josh_Highlight_FINAL.mp4", 1.3 * 1024 * MB, "ready", { dur: 356, ago: -15 });
  // Client-visible deliverables
  await up("megan", "megan:lead_photo", coordinator, "document", "deliverable", "Megan-Andrew_Gallery_Link.pdf", 220_000, "ready", { ago: -10, visible: true });

  // ── Conversations & messages
  async function convo(subject: string, kind: string, wkey: string | null, people: string[], msgs: [string, string, number, number?][], unreadFor: string[] = []) {
    const last = msgs.at(-1)!;
    const [c] = await sql`insert into conversations (subject, kind, wedding_id, last_message_at, created_at) values (${subject}, ${kind}, ${wkey ? weddingIds[wkey] : null}, ${ts(last[2], last[3] ?? 10)}, ${ts(msgs[0][2])}) returning id`;
    for (const p of people)
      await sql`insert into conversation_participants (conversation_id, user_id, last_read_at) values (${c.id}, ${p}, ${unreadFor.includes(p) ? ts(msgs[0][2] - 1) : ts(last[2], 23, 30)})`;
    for (const [sender, body, off, hr] of msgs)
      await sql`insert into messages (conversation_id, sender_id, body, created_at) values (${c.id}, ${sender}, ${body}, ${ts(off, hr ?? 10, (body.length * 7) % 60)})`;
    return c.id;
  }
  const M = tm.marcus.user, D = tm.daniel.user, G = coordinator, S = clientUsers.sarah, SO = tm.sofia.user, P = tm.priya.user;
  await convo("Sarah & James — final timeline", "wedding", "sarah", [G, M, SO], [
    [G, "Hi Marcus and Sofia! Sarah & James just submitted their questionnaire. Timeline and shot list are on the wedding page.", -6, 9],
    [M, "Thanks Grace. The first look at 1:30 works — light should be soft by the willow tree at that time.", -6, 11],
    [SO, "I'll cover James getting ready at 2:30. Is the groom's lounge in the main house?", -5, 10],
    [G, "Yes — ground floor, east wing. Also note Grandma Rose uses a wheelchair, so family formals on the lawn path, not the steps.", -5, 12],
    [G, "One more thing: they've added an extra hour, so coverage now ends at 11 PM with the sparkler exit. Updated in the timeline.", -1, 16],
  ], [M]);
  await convo("Sarah & James — your wedding team", "wedding", "sarah", [G, S, M], [
    [G, "Welcome Sarah! This thread connects you with your lead photographer Marcus. I'll stay on it to help with anything.", -40, 10],
    [S, "So excited!! Marcus, we loved the lake portraits in your profile.", -40, 13],
    [M, "Thank you Sarah! Looking forward to it. If you have any must-have shots, add them in your questionnaire and I'll make sure we get them.", -39, 9],
    [S, "Just submitted it. The watch photo means a lot to me — thank you for planning around it.", -7, 18],
  ], [S]);
  await convo("Emily & David — tea ceremony coverage", "wedding", "emily", [G, M, P, D], [
    [G, "Team, Emily & David have a tea ceremony at 2:30 before the main ceremony. Marcus + Priya on that; Daniel arrives at 3:30.", -3, 10],
    [P, "Got it. Should I mic the officiant or the tea ceremony host?", -3, 12],
    [G, "Both if you can — Daniel can bring an extra lav.", -2, 9],
    [D, "I'll bring two lavs and the Zoom recorder. Driving in the night before.", -2, 15],
  ], [M]);
  await convo("Payments — Jessica & Ryan payout on hold", "support", "jessica", [G, M], [
    [G, "Hi Marcus — your payout for Jessica & Ryan is on hold because Camera B's time-sync frame is missing. Can you re-upload it?", -8, 10],
    [M, "I'll check my card backups tonight and upload it to the wedding folder.", -8, 14],
  ]);
  await convo("Welcome to the fall season!", "direct", null, [G, M], [
    [G, "Fall is our busiest stretch — please keep your October and November weekends current in Availability. Thank you for everything!", -14, 9],
  ]);
  await convo("Rachel & Ben — drone footage", "wedding", "rachel", [G, D], [
    [G, "Daniel, the drone clip shows as failed in uploads. Can you retry when you get a chance?", -3, 11],
    [D, "Yes — hotel Wi-Fi dropped. Retrying from the studio this afternoon.", -3, 12],
  ], [D]);

  // ── Notifications
  const note = async (uid: string, type: string, title: string, body: string, link: string, off: number, read: boolean) =>
    sql`insert into notifications (user_id, type, title, body, link, read_at, created_at) values (${uid}, ${type}, ${title}, ${body}, ${link}, ${read ? ts(off + 0.1) : null}, ${ts(off, 9 + ((title.length * 3) % 9))})`;
  await note(M, "opportunity", "New wedding available", "Chloe & Samuel · Lakeview Pavilion needs a second photographer.", "/team/open", -1, false);
  await note(M, "message", "New message from Grace Thompson", "They've added an extra hour, so coverage now ends at 11 PM…", "/team/messages", -1, false);
  await note(M, "change", "Wedding updated", "Sarah & James — coverage extended by 1 hour.", "/team/weddings", -1, false);
  await note(M, "license", "Insurance expiring soon", "Your liability insurance expires in 19 days. Upload a renewed certificate.", "/team/licenses", -2, false);
  await note(M, "payment", "Payment processing", "Your payout for Lauren & Joshua is processing and will land Friday.", "/team/payments", -4, true);
  await note(M, "upload", "Upload completed", "9 of 10 RAW files for Rachel & Benjamin uploaded. 1 failed.", "/team/uploads", -5, true);
  await note(M, "booking", "Wedding accepted", "You're confirmed as lead photographer for Emily & David.", "/team/weddings", -12, true);
  await note(M, "payment", "Payment received", "$1,200 for Megan & Andrew was deposited.", "/team/payments", -24, true);
  await note(D, "upload", "Upload failed", "DRONE_Venue.MP4 failed — retry from Uploads.", "/team/uploads", -4, false);
  await note(D, "license", "Insurance expired", "Your certificate of insurance has expired. Upload a renewal to stay eligible.", "/team/licenses", -5, false);
  await note(D, "license", "W-9 rejected", "The form is unsigned — please sign page 1 and re-upload.", "/team/licenses", -10, false);
  await note(S, "payment", "Balance payment due tomorrow", "Your final balance is due tomorrow. You can pay from your dashboard.", "/client/payments", 0, false);
  await note(S, "message", "Marcus replied", "If you have any must-have shots, add them in your questionnaire…", "/client/messages", -39, true);
  await note(G, "license", "License pending review", "Marcus Johnson submitted a business license.", "/admin", -2, false);

  // ── Handbook
  for (const [ci, c] of HANDBOOK.entries()) {
    const [cat] = await sql`insert into handbook_categories (slug, title, description, icon, sort) values (${c.slug}, ${c.title}, ${c.description}, ${c.icon}, ${ci}) returning id`;
    for (const [ai, a] of c.articles.entries())
      await sql`insert into handbook_articles (category_id, slug, title, summary, body, audience, read_minutes, sort, updated_at)
        values (${cat.id}, ${a.slug}, ${a.title}, ${a.summary}, ${a.body}, ${a.audience ?? "all"}, ${a.minutes ?? 3}, ${ai}, ${ts(-(ci * 3 + ai + 4))})`;
  }

  // ── Illustrative reviews (sample content for the demo — replace with real reviews before launch)
  const reviews = [
    ["Megan & Andrew", "Charlotte, NC", "Our coordinator answered every question within hours and Marcus made our families feel completely at ease. The gallery arrived early and every single photo felt like us."],
    ["Lauren & Joshua", "Raleigh-Durham, NC", "We booked photo and video together and it showed — the two crews moved like one team. The highlight film made our grandparents cry."],
    ["Ashley & Kevin", "Charlotte, NC", "Booking took ten minutes. The day itself was relaxed, and the photos are honest and beautiful without being over-edited."],
    ["Jessica & Ryan", "Greensboro, NC", "Rain moved our ceremony inside last minute and the team didn't miss a beat. The candlelit shots are our favourites."],
    ["Rachel & Benjamin", "Charlotte, NC", "The 48-hour sneak peek was such a treat. Clear pricing, no surprises, and a team that genuinely cared."],
    ["Priya & Sam", "Atlanta, GA", "They captured both of our cultural ceremonies with such respect and attention to detail."],
  ];
  for (const [i, [couple, loc, body]] of reviews.entries())
    await sql`insert into reviews (couple, location, rating, body, featured, created_at) values (${couple}, ${loc}, 5, ${body}, ${i < 6}, ${ts(-10 - i * 20)})`;

  console.log("✓ Seed complete");
  console.log(`  Photographer: marcus@visualweddings.test / ${DEMO_PASSWORD}`);
  console.log(`  Videographer: daniel@visualweddings.test / ${DEMO_PASSWORD}`);
  console.log(`  Client:       sarah@visualweddings.test / ${DEMO_PASSWORD}`);
  console.log(`  Coordinator:  grace@visualweddings.test / ${DEMO_PASSWORD}`);
  void admin;
  await sql.end();
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
