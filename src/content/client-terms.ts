/**
 * Terms couples accept when they book. Shown in the booking wizard (before paying) and at /terms/*.
 * The numbers mirror the app: 30% deposit (or 20% on a payment plan), balance due 30 days before,
 * free date changes up to 90 days before (FREE_DATE_CHANGE_DAYS), bookings at least 14 days out.
 * NOTE: a practical starting point, not legal advice — have a lawyer licensed in your state review it.
 */
export type ClientTerm = { slug: string; title: string; summary: string; updated: string; body: string };

export const SERVICE_AGREEMENT: ClientTerm = {
  slug: "service-agreement",
  title: "Service agreement",
  summary: "What we'll provide, what we need from you, payments, delivery and how your photos and films can be used.",
  updated: "October 8, 2026",
  body: `This agreement is between Visual Weddings ("we", "us") and the couple making the booking ("you"). By paying your deposit or first payment, you agree to it, our [cancellation policy](/terms/cancellation-policy), and the details shown in your booking confirmation.

## 1. Your booking
- We provide the photography, videography and/or content creation in the package and add-ons you chose, for the date, venue and hours of coverage in your confirmation.
- We assign a vetted local team (photographers, videographers and content creators) to your wedding. We choose the team; you can tell your coordinator about any preferences and we'll do our best to match them.
- If a team member can't attend because of illness or an emergency, we'll replace them with someone of similar experience at no cost to you.

## 2. Payments
- **Deposit or first payment:** 30% of the total (or 20% on a payment plan) is due when you book and secures your date.
- **Remaining balance:** due 30 days before your wedding, or on the schedule shown in your booking if you chose a payment plan. Bookings made within 30 days of the wedding are paid in full when you book.
- If a payment is more than 7 days late, we'll contact you; if it's still unpaid after another 7 days, we may cancel the booking under our cancellation policy.
- Changes you request later (package, add-ons, hours) adjust your remaining balance. Your coordinator confirms the new total before anything changes.

## 3. What we need from you
- Complete your wedding questionnaire (timeline, family list, must-have shots) at least **21 days** before the wedding.
- Tell us about venue rules, photography or drone restrictions, and any changes to the timeline as soon as you know them.
- Provide a meal and a short break for each team member covering more than 6 hours, and safe access to the venue.
- We can't be responsible for moments we miss because of venue restrictions, weather, the timeline running late, or guests blocking the view, but we'll always do our best.

## 4. Coverage and overtime
- Coverage starts at the time in your timeline. If the day runs late and you'd like us to stay, extra time is charged at the package's hourly rate, agreed with the team lead on the day where possible.

## 5. Delivery
- Galleries and films are delivered online by the dates in your package (for example, photos in 4–6 weeks, films in 6–8 weeks). Express delivery is available as an add-on.
- We edit in our house style. Each package includes one round of reasonable film revisions requested within 14 days of delivery.
- We keep your final gallery and film online for at least 12 months. Please download your own copies.

## 6. Use of photos and films
- You get a personal-use licence to print, share and post your photos and films. Please credit **@visualweddings** when you post.
- We own the copyright and may use a selection in our portfolio and marketing. If you'd rather we didn't, tell your coordinator in writing before the wedding and we'll keep your images private.
- You agree not to sell or commercially license the images without our permission.

## 7. Liability
- In the very unlikely event that we can't deliver some or all of the coverage because of something within our control, our liability is limited to a refund of the amounts you paid for the affected services.
- If we can't attend because of events outside anyone's control (severe weather, natural disaster, government restrictions), we'll first offer to move your booking to a new date; if that isn't possible, we'll refund payments for services we didn't provide.

## 8. General
- This agreement, your booking confirmation and our cancellation policy are the whole agreement. If any part can't be enforced, the rest still applies.
- Questions? Message your coordinator from your dashboard.`,
};

export const CANCELLATION_POLICY: ClientTerm = {
  slug: "cancellation-policy",
  title: "Cancellation policy",
  summary: "What happens if you cancel or need to move your date.",
  updated: "October 8, 2026",
  body: `We hold your date and turn other couples away from the moment you book, and our team plans their season around your wedding. This policy explains what's refundable if plans change.

## Changing your date
- **More than 90 days before your wedding:** move to a new date once at no charge, subject to availability. Your payments move with you.
- **Within 90 days:** we'll still try to move you. A change fee may apply depending on the new date and team availability; your coordinator will confirm before anything changes.
- Request a date change from your dashboard. Nothing changes until your coordinator approves it.

## Cancelling
| When you cancel | What's refunded |
|---|---|
| Within 7 days of booking (and more than 30 days before the wedding) | Everything you've paid |
| More than 90 days before the wedding | Everything except your deposit (30% of the total) |
| 31–90 days before the wedding | 50% of the total is kept; anything you've paid above that is refunded |
| 30 days or fewer before the wedding | Nothing — the full total is due |

- Cancel in writing by messaging your coordinator from your dashboard. The date we receive your message is the cancellation date.
- Refunds go back to the original payment method within 10 business days.

## If we have to cancel
If we ever have to cancel and can't provide a replacement team, we'll refund everything you've paid.

## Events outside anyone's control
If your wedding can't go ahead because of severe weather, a natural disaster or government restrictions, we'll move your booking to a new date within 18 months at no charge. If you'd rather cancel, the table above applies.`,
};

export const CLIENT_TERMS = [SERVICE_AGREEMENT, CANCELLATION_POLICY];
