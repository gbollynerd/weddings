"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getSession, requireUser } from "@/lib/auth";
import { checkAvailability } from "@/lib/services/catalog";
import { payments, type CardInput } from "@/lib/payments";
import { notify } from "@/lib/services/notifications";
import { quote, compensationFor, marketPrice } from "@/lib/pricing";
import { after } from "next/server";
import { geocodeWedding } from "@/lib/services/geo";
import type { ActionResult } from "./types";

export async function checkAvailabilityAction(market: string, date: string, service: "photo" | "video" | "both") {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { level: "unknown" as const, remaining: 0, suggestions: [] as string[] };
  return checkAvailability(market, date, service);
}

export async function whoAmI() {
  const s = await getSession();
  if (!s) return null;
  const [c] = s.role === "client" ? await sql`select partner_one, partner_two from clients where user_id = ${s.id}` : [null];
  return { role: s.role, name: s.full_name, email: s.email, phone: s.phone, partnerOne: c?.partner_one ?? s.full_name, partnerTwo: c?.partner_two ?? "" };
}

const Draft = z.object({
  market: z.string().min(2),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  venue: z.string().trim().min(2, "Enter your venue"),
  venueAddress: z.string().trim().optional().default(""),
  service: z.enum(["photo", "video", "both"]),
  pkg: z.string().min(2),
  addons: z.record(z.string(), z.number().int().min(0).max(6)).default({}),
  details: z.object({
    partnerOne: z.string().trim().min(2), partnerTwo: z.string().trim().min(2), email: z.string().email(), phone: z.string().trim().min(7, "Enter a phone number"),
    ceremony: z.string().trim().min(2, "Where is the ceremony?"), reception: z.string().trim().optional().default(""), guests: z.coerce.number().int().min(2).max(2000),
    weddingType: z.string().trim().min(2), startTime: z.string().regex(/^\d{2}:\d{2}$/), requests: z.string().max(2000).optional().default(""), notes: z.string().max(2000).optional().default(""),
  }),
  plan: z.enum(["deposit", "full", "installments"]),
});
export type BookingDraft = z.input<typeof Draft>;

export async function createBookingAction(input: BookingDraft, card: CardInput): Promise<ActionResult<{ bookingNumber: string }>> {
  const user = await requireUser(["client"]);
  const parsed = Draft.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Some booking details are missing." };
  const d = parsed.data;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const wDate = new Date(d.date + "T12:00:00");
  if (wDate.getTime() - today.getTime() < 14 * 86400000) return { ok: false, message: "Weddings must be booked at least 14 days in advance." };

  const [market] = await sql`select id, slug, city, state, price_multiplier from markets where slug = ${d.market} and active`;
  if (!market) return { ok: false, message: "We don't serve that location yet." };
  const [pkg] = await sql`select * from packages where slug = ${d.pkg} and active`;
  if (!pkg || pkg.service_slug !== d.service) return { ok: false, message: "That package isn't available for the selected service." };
  const addonRows = Object.keys(d.addons).length ? await sql`select id, slug, name, price, unit, applies_to from addons where slug in ${sql(Object.keys(d.addons))} and active` : [];
  const lines = addonRows.filter((a) => d.addons[a.slug] > 0 && (a.applies_to as string[]).includes(d.service)).map((a) => ({ id: a.id as string, slug: a.slug as string, name: a.name as string, price: a.price as number, unit: a.unit as string, quantity: a.unit === "hour" ? d.addons[a.slug] : 1 }));
  const q = quote({ packageBase: pkg.base_price, multiplier: Number(market.price_multiplier), addons: lines });

  const avail = await checkAvailability(d.market, d.date, d.service);
  if (avail.level === "full") return { ok: false, message: "Sorry — that date just filled up. Please choose another date." };

  const chargeNow = d.plan === "full" ? q.total : d.plan === "installments" ? Math.round(q.total * 0.2 / 10) * 10 : q.deposit;
  const charge = await payments.charge(chargeNow, card, `Visual Weddings booking — ${market.city}`);
  if (!charge.ok) return { ok: false, message: charge.message, fieldErrors: { card: charge.message } };

  const year = wDate.getFullYear();
  const bookingNumber = await sql.begin(async (tx) => {
    let [client] = await tx`select id from clients where user_id = ${user.id}`;
    if (!client) [client] = await tx`insert into clients (user_id, partner_one, partner_two) values (${user.id}, ${d.details.partnerOne}, ${d.details.partnerTwo}) returning id`;
    else await tx`update clients set partner_one = ${d.details.partnerOne}, partner_two = ${d.details.partnerTwo} where id = ${client.id}`;
    await tx`update users set phone = coalesce(phone, ${d.details.phone}) where id = ${user.id}`;
    const [venue] = await tx`select id, address from venues where market_id = ${market.id} and lower(name) = lower(${d.venue})`;
    const couple = `${d.details.partnerOne.split(" ")[0]} & ${d.details.partnerTwo.split(" ")[0]}`;
    const extraHours = lines.find((l) => l.slug === "additional-hour")?.quantity ?? 0;
    const hours = pkg.hours + extraHours + (lines.some((l) => l.slug === "reception-coverage") ? 2 : 0);
    const [w] = await tx`insert into weddings (client_id, market_id, venue_id, couple, wedding_date, start_time, venue_name, venue_address, ceremony_location, reception_location, guest_count, wedding_type, special_requests, notes, status)
      values (${client.id}, ${market.id}, ${venue?.id ?? null}, ${couple}, ${d.date}, ${d.details.startTime}, ${d.venue}, ${d.venueAddress || venue?.address || null},
              ${d.details.ceremony}, ${d.details.reception || d.details.ceremony}, ${d.details.guests}, ${d.details.weddingType}, ${d.details.requests || null}, ${d.details.notes || null}, 'confirmed') returning id`;
    const [{ n }] = await tx`select count(*)::int + 4300 as n from bookings`;
    const number = `VW-${year}-${n}`;
    const [b] = await tx`insert into bookings (booking_number, wedding_id, client_id, package_id, service_slug, package_price, addons_total, total, deposit_amount, status)
      values (${number}, ${w.id}, ${client.id}, ${pkg.id}, ${d.service}, ${q.packagePrice}, ${q.addonsTotal}, ${q.total}, ${chargeNow}, 'confirmed') returning id`;
    for (const l of lines) await tx`insert into booking_addons (booking_id, addon_id, quantity, unit_price) values (${b.id}, ${l.id}, ${l.quantity}, ${marketPrice(l.price, Number(market.price_multiplier))})`;

    // Payments: what was charged now + the schedule for the rest
    await tx`insert into client_payments (booking_id, kind, amount, due_date, status, paid_at, method_brand, method_last4, provider, provider_ref, receipt_number)
      values (${b.id}, ${d.plan === "full" ? "balance" : "deposit"}, ${chargeNow}, current_date, 'paid', now(), ${charge.brand}, ${charge.last4}, ${payments.name}, ${charge.reference}, ${"R-" + n + "-1"})`;
    const remaining = q.total - chargeNow;
    if (remaining > 0) {
      const due = new Date(wDate); due.setDate(due.getDate() - 30);
      if (d.plan === "installments") {
        const parts = 3, each = Math.floor(remaining / parts / 10) * 10;
        for (let i = 0; i < parts; i++) {
          const dd = new Date(); dd.setMonth(dd.getMonth() + i + 1);
          const dueDate = dd < due ? dd : due;
          await tx`insert into client_payments (booking_id, kind, amount, due_date, status) values (${b.id}, 'installment', ${i === parts - 1 ? remaining - each * (parts - 1) : each}, ${dueDate.toISOString().slice(0, 10)}, 'scheduled')`;
        }
      } else {
        await tx`insert into client_payments (booking_id, kind, amount, due_date, status) values (${b.id}, 'balance', ${remaining}, ${(due < new Date() ? new Date() : due).toISOString().slice(0, 10)}, 'scheduled')`;
      }
    }
    await tx`insert into client_questionnaires (wedding_id, status) values (${w.id}, 'not_started')`;
    // Default timeline
    const [h, m] = d.details.startTime.split(":").map(Number);
    const at = (dh: number, dm = 0) => { const t = h * 60 + m + dh * 60 + dm; return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`; };
    const tl: [string, string][] = [[at(0), "Team arrival & details"], [at(0, 30), "Getting ready"], [at(1, 30), "Portraits"], [at(2), "Ceremony"], [at(2, 45), "Family formals"], [at(4), "Reception & first dance"], [at(4, 45), "Toasts & dinner"], [at(hours), "Coverage ends"]];
    for (const [i, [t, title]] of tl.entries()) await tx`insert into wedding_timeline_items (wedding_id, time, title, sort) values (${w.id}, ${t}, ${title}, ${i})`;
    await tx`insert into documents (wedding_id, type, title, content, visibility) values
      (${w.id}, 'contract', 'Service agreement', ${`Service agreement for booking ${number}. ${pkg.name} package, ${hours} hours of coverage on ${d.date}.`}, 'client'),
      (${w.id}, 'invoice', ${"Invoice " + number}, ${`Total ${q.total}. Paid today ${chargeNow}.`}, 'client'),
      (${w.id}, 'venue_info', 'Venue information', ${`**${d.venue}**\n\n${d.venueAddress || venue?.address || ""}`}, 'team')`;
    if (d.details.requests) await tx`insert into documents (wedding_id, type, title, content, visibility) values (${w.id}, 'special_requests', 'Special requests', ${d.details.requests}, 'all')`;

    // Open team slots → appear in the Open Weddings marketplace
    const slots: string[] = [];
    if (pkg.photographers >= 1) slots.push("lead_photo");
    if (pkg.photographers >= 2 || lines.some((l) => l.slug === "second-photographer")) slots.push("second_photo");
    if (pkg.videographers >= 1 || lines.some((l) => l.slug === "highlight-video")) slots.push("lead_video");
    if (pkg.videographers >= 2) slots.push("second_video");
    const expires = new Date(wDate); expires.setDate(expires.getDate() - 10);
    for (const role of slots)
      await tx`insert into wedding_assignments (wedding_id, role, status, compensation, coverage_hours, call_time, requirements, expires_at)
        values (${w.id}, ${role}, 'open', ${compensationFor(role, hours)}, ${hours}, ${role.startsWith("second") ? at(0, 30) : at(0)},
                ${role.startsWith("lead") ? ["Lead experience", "Two camera bodies", "Black attire"] : ["Second-shooter experience", "Black attire"]}, ${expires.toISOString()})`;

    // Wedding thread with the coordinator
    const [coord] = await tx`select id, full_name from users where role = 'coordinator' order by created_at limit 1`;
    const [c] = await tx`insert into conversations (subject, kind, wedding_id) values (${couple + " — your wedding team"}, 'wedding', ${w.id}) returning id`;
    await tx`insert into conversation_participants (conversation_id, user_id, last_read_at) values (${c.id}, ${user.id}, 'epoch')`;
    if (coord) {
      await tx`insert into conversation_participants (conversation_id, user_id, last_read_at) values (${c.id}, ${coord.id}, now())`;
      await tx`insert into messages (conversation_id, sender_id, body) values (${c.id}, ${coord.id}, ${`Hi ${d.details.partnerOne.split(" ")[0]}! I'm ${coord.full_name.split(" ")[0]}, your Visual Weddings coordinator. Congratulations — your date is officially booked. Next step: fill in your wedding questionnaire so we can match the perfect team. I'm here for anything you need.`})`;
    }
    return { number, weddingId: w.id as string, couple, coordId: coord?.id as string | undefined, slots };
  });

  await notify(user.id, "booking", "Booking confirmed", `${bookingNumber.number} · ${pkg.name} on ${d.date}. Welcome to Visual Weddings!`, "/client");
  await notify(user.id, "payment", "Payment received", `We received your payment of $${chargeNow.toLocaleString()}.`, "/client/payments");
  if (bookingNumber.coordId) await notify(bookingNumber.coordId, "booking", `New booking: ${bookingNumber.couple}`, `${pkg.name} · ${market.city} · ${d.date}`, "/admin");
  // Let team members in that market know there's a new opportunity
  const disciplines = [...new Set(bookingNumber.slots.map((s) => (s.endsWith("photo") ? "photo" : "video")))];
  const locals = await sql`select user_id from team_members where home_market_id = ${market.id} and status = 'active' and discipline in ${sql(disciplines)}`;
  // Place the venue on the map for team distances (in the background so checkout stays fast)
  after(() => geocodeWedding(bookingNumber.weddingId).catch(() => {}));
  for (const l of locals) await notify(l.user_id, "opportunity", "New wedding available", `${market.city}, ${market.state} · ${d.date} needs ${bookingNumber.slots.length} team member${bookingNumber.slots.length > 1 ? "s" : ""}.`, "/team/open");
  revalidatePath("/", "layout");
  return { ok: true, data: { bookingNumber: bookingNumber.number } };
}
