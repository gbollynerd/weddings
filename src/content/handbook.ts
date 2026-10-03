// Visual Weddings Team Handbook — original sample content.
// Seeded into handbook_categories / handbook_articles so coordinators can edit it later.

export type HandbookArticleSeed = {
  slug: string;
  title: string;
  summary: string;
  audience?: "all" | "photo" | "video";
  minutes?: number;
  body: string;
};
export type HandbookCategorySeed = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  articles: HandbookArticleSeed[];
};

export const HANDBOOK: HandbookCategorySeed[] = [
  {
    slug: "getting-started",
    title: "Getting Started",
    description: "Your first week on the Visual Weddings team.",
    icon: "Rocket",
    articles: [
      {
        slug: "welcome-to-the-team",
        title: "Welcome to the team — read this first",
        summary: "How Visual Weddings works, who does what, and what to set up before your first assignment.",
        minutes: 4,
        body: `Welcome! Visual Weddings pairs couples with a vetted local team of photographers and videographers. Couples book with us; we build the wedding team, handle every client conversation, and deliver the final gallery and film. You focus on the craft.

## How work reaches you
1. **You publish your availability.** Coordinators only staff people who are marked available on the date.
2. **Coordinators assign you, or you claim an Open Wedding.** Either way the wedding appears under *My Weddings*.
3. **You prepare, shoot, and upload within 48 hours.**
4. **Payment is released** once uploads pass a quick quality check.

## Before your first assignment
- Complete your **Profile** (headshot, bio, specialties) — couples see a short version of it.
- Upload your **driver's license, liability insurance and W-9** under *Licenses*.
- Add your **payout details** in *Settings → Payment information*.
- Mark at least the next 8 weekends in **Availability**.

> **Tip:** Most first-season team members are staffed as second shooters before leading. Say yes to seconds — it is the fastest route to lead work.`,
      },
      {
        slug: "how-the-dashboard-works",
        title: "Finding your way around the dashboard",
        summary: "A quick tour of each section and when you'll use it.",
        minutes: 3,
        body: `## The sections you'll use most
- **Overview** — your next wedding, anything that needs action, and recent messages.
- **My Weddings** — every assignment, with timeline, documents, shot list and uploads.
- **Open Weddings** — weddings that still need a team member. First qualified person to accept gets it.
- **Availability** — the calendar coordinators staff from. Keep it current.
- **Messages** — the only channel for coordinator and team communication.
- **Uploads** — send RAW photos and video footage for each wedding.
- **Payments** — what you've earned, what's pending and when it lands.

## Status colours
- **Blue / Midnight** — confirmed or booked.
- **Amber** — needs attention or pending.
- **Green** — complete, paid or verified.
- **Rose** — overdue, expired or failed.`,
      },
      {
        slug: "onboarding-checklist",
        title: "Onboarding checklist",
        summary: "Everything we need before you can be staffed.",
        minutes: 2,
        body: `Work through this list during your first week. Your profile completion meter on the Profile page tracks most of it.

- [ ] Signed contractor agreement (sent by email)
- [ ] Profile photo and bio
- [ ] Specialties and service radius
- [ ] Driver's license uploaded
- [ ] Certificate of liability insurance (minimum $1M per occurrence)
- [ ] W-9 submitted
- [ ] Payout method added
- [ ] Availability set for the next 60 days
- [ ] Read *Wedding Day Workflow* and *Upload & Delivery*
- [ ] Shadow call or test shoot with a coordinator`,
      },
    ],
  },
  {
    slug: "standards",
    title: "Visual Weddings Standards",
    description: "The quality bar every gallery and film must meet.",
    icon: "BadgeCheck",
    articles: [
      {
        slug: "our-standards",
        title: "The Visual Weddings standard",
        summary: "What 'great' looks like for us — consistent, natural, and emotionally honest.",
        minutes: 4,
        body: `Couples choose us because every team delivers a consistent result. Our house style is **clean, true-to-colour and story-driven**: real moments first, flattering direction second, effects never.

## Non-negotiables
- **Focus and exposure** must be correct straight out of camera on key moments.
- **Every key moment is covered from two angles** when a second shooter is booked.
- **No missed formals.** The family list from the questionnaire is a contract.
- **Skin tones stay natural.** Don't push heavy presets on RAW files.

## What we review
Our editors spot-check every upload: sharpness on the processional, ring exchange and first kiss; clean family formals; and variety (wide, medium, detail) in each part of the day.`,
      },
      {
        slug: "professional-conduct",
        title: "Professional conduct & representing us",
        summary: "You are the face of Visual Weddings on the day.",
        minutes: 3,
        body: `On the wedding day you represent Visual Weddings, not your own studio.

- Introduce yourself as *"your Visual Weddings photographer"*.
- Do **not** hand out personal business cards or promote your own brand.
- No alcohol on assignment — even if offered.
- Phones away except for timeline checks and time-sync.
- Be kind and patient with family, planners and other vendors. Collaborate, don't compete.

If anything goes wrong, stay calm, solve what you can, and message your coordinator as soon as you safely can.`,
      },
    ],
  },
  {
    slug: "photographer-guidelines",
    title: "Photographer Guidelines",
    description: "Roles, coverage expectations and posing for stills.",
    icon: "Camera",
    articles: [
      {
        slug: "lead-vs-second",
        title: "Lead vs. second photographer",
        summary: "Who owns which part of the day.",
        audience: "photo",
        minutes: 4,
        body: `## Lead photographer
- Owns the timeline and the family formals list.
- Covers the couple: getting-ready portraits, first look, vows, couple portraits.
- Is the single point of contact with the planner for photo needs.

## Second photographer
- Covers the *other* side: the partner getting ready, guests, details, alternate angles.
- During the ceremony: wide from the back plus reactions from the side aisle.
- During formals: wrangles family groups using the list so the lead can shoot.

**Seconds never wander off.** If the lead needs you, you're within sight.`,
      },
      {
        slug: "posing-and-portraits",
        title: "Posing & portraits",
        summary: "Our approach: light direction, natural interaction.",
        audience: "photo",
        minutes: 5,
        body: `Our portraits feel effortless because the direction is gentle and specific.

## Couple portraits (20–30 min)
1. Start with a walking shot to loosen everyone up.
2. Move to close, connected poses: foreheads together, a whisper, a laugh.
3. Get one full-length, one waist-up and one tight shot in every location.
4. Finish with a "hero" frame — wide, environmental, with negative space.

## Family formals
- Work from the questionnaire list in order, largest groups first.
- Use a consistent spot with even shade or open light.
- Take **at least three frames per group** and check for closed eyes.

## Wedding party
Aim for one formal lined-up shot, one candid "fun" frame and a few small-group shots.`,
      },
      {
        slug: "camera-settings",
        title: "Exposure & camera settings",
        summary: "Recommended starting points for typical wedding light.",
        audience: "photo",
        minutes: 3,
        body: `These are starting points, not rules.

| Situation | Shutter | Aperture | ISO |
|---|---|---|---|
| Processional | 1/500 | f/2.8 | Auto |
| Ceremony (indoor) | 1/250 | f/2.0 | up to 6400 |
| Formals | 1/250 | f/5.6 | 100–800 |
| Reception dancing | 1/160 + flash | f/2.8 | 1600 |

- Shoot **RAW** only, dual card slots mirrored.
- Never go below 1/160 for moving subjects.
- Back-button focus is recommended for the ceremony.`,
      },
    ],
  },
  {
    slug: "videographer-guidelines",
    title: "Videographer Guidelines",
    description: "Coverage, audio and working alongside photographers.",
    icon: "Video",
    articles: [
      {
        slug: "video-cheat-sheet",
        title: "Videographer cheat sheet",
        summary: "One-page summary of settings, must-have shots and audio.",
        audience: "video",
        minutes: 3,
        body: `- **Resolution:** 4K, 23.976 or 25 fps to match the editor's timeline. 60 fps for slow-motion moments.
- **Picture profile:** a flat log profile is preferred; never bake in a LUT.
- **Shutter:** follow the 180° rule (1/50 at 25 fps) with ND outdoors.
- **Audio:** lav on the officiant or the partner waiting at the altar, plus a recorder on the podium/DJ feed.
- **Must-have shots:** processional, vows, ring exchange, kiss, recessional, first dance, toasts in full.`,
      },
      {
        slug: "audio-recording",
        title: "Audio recording",
        summary: "Clean vows and toasts make the film.",
        audience: "video",
        minutes: 3,
        body: `Bad audio is the most common reason a film is delayed.

1. Put a lavalier on the officiant **and** the partner waiting at the front.
2. Use a backup recorder on the lectern or the DJ/soundboard feed.
3. Record a 10-second slate clap at the start of each recorder to sync later.
4. Monitor levels with headphones during vows; peak around −12 dB.
5. For toasts, connect to the DJ board *and* keep an on-camera mic as backup.`,
      },
      {
        slug: "working-with-photographers",
        title: "Working with the photographer",
        summary: "Two crews, one wedding — how to stay out of each other's frames.",
        audience: "video",
        minutes: 2,
        body: `Introduce yourself to the lead photographer on arrival and agree on positions for the ceremony.

- Photographers own the centre aisle for the processional; video takes the side and the back.
- During portraits, ask for 3–5 minutes at the end of each location for motion shots.
- During toasts, video owns the front of the speaker; photo moves to the side.`,
      },
    ],
  },
  {
    slug: "wedding-day-workflow",
    title: "Wedding Day Workflow",
    description: "From the night before to the moment you leave.",
    icon: "CalendarClock",
    articles: [
      {
        slug: "the-night-before",
        title: "The night before",
        summary: "Checklist to run the evening before every wedding.",
        minutes: 2,
        body: `- Re-read the wedding detail page: timeline, shot list, venue notes and special requests.
- Charge every battery; format cards **in camera**.
- Pack backups: second body, spare cards, flash, batteries.
- Check the route and parking notes; plan to arrive 15 minutes before call time.
- Confirm in Messages if anything in the timeline looks unrealistic.`,
      },
      {
        slug: "time-sync",
        title: "Time-sync procedure",
        summary: "Required for every body you shoot with.",
        minutes: 2,
        body: `Editors merge files from multiple cameras by capture time, so clocks must match.

1. Before the first frame, set each camera clock to the official time (time.gov or your phone's network time).
2. Photograph that clock screen with **each** camera body.
3. Include that frame in your upload and name it \`TIMESYNC\`.

Uploads without a time-sync frame may be paid at the standard rate rather than the bonus rate.`,
      },
      {
        slug: "run-of-day",
        title: "Run of day",
        summary: "A typical 8-hour coverage plan.",
        minutes: 3,
        body: `| Time | What happens | Notes |
|---|---|---|
| −2:00 | Arrival & details | Rings, invitation suite, dress, shoes |
| −1:30 | Getting ready | Both partners if a second is booked |
| −0:45 | First look / portraits | Optional, follows the questionnaire |
| 0:00 | Ceremony | Two angles minimum |
| +0:30 | Family formals | Use the list, largest groups first |
| +1:00 | Couple portraits | 20–30 minutes |
| +1:30 | Reception entrances | |
| +2:30 | Toasts & first dance | |
| +4:00 | Party & exit | Coverage ends per package |`,
      },
    ],
  },
  {
    slug: "client-communication",
    title: "Client Communication",
    description: "What you can and can't discuss directly with couples.",
    icon: "MessagesSquare",
    articles: [
      {
        slug: "communication-policy",
        title: "Communication policy",
        summary: "Coordinators own the client relationship.",
        minutes: 3,
        body: `Couples hear from one voice: their Visual Weddings coordinator. This keeps expectations consistent and protects you from scope creep.

## You can
- Reply to wedding-thread messages your coordinator includes you in.
- Introduce yourself and chat warmly on the wedding day.
- Answer simple day-of questions ("Where should we stand?").

## Please don't
- Share personal phone numbers, emails or social handles.
- Promise extra coverage, delivery dates or edits.
- Discuss pricing, packages or other vendors' work.

If a couple asks for something outside the package, smile and say *"Let me check with your coordinator — they'll take care of it."*`,
      },
    ],
  },
  {
    slug: "equipment",
    title: "Equipment Requirements",
    description: "Minimum kit for every assignment.",
    icon: "Package",
    articles: [
      {
        slug: "minimum-kit",
        title: "Minimum kit",
        summary: "What you must bring — no exceptions.",
        minutes: 3,
        body: `## Photographers
- Two professional full-frame bodies with **dual card slots**
- A fast standard zoom (24–70 f/2.8) or equivalent primes
- A portrait lens (85mm f/1.8 or faster)
- A 70–200 f/2.8 for ceremony (lead only)
- Two speedlights with diffusers, plenty of batteries

## Videographers
- Two 4K-capable bodies, one on a gimbal
- Tripod and monopod
- Two wireless lavaliers + one external recorder
- ND filters for outdoor work
- Drone only if booked and you are FAA Part 107 certified

## Everyone
- At least 4× the cards you expect to fill
- Phone with the dashboard open for the timeline`,
      },
    ],
  },
  {
    slug: "photography-guidelines",
    title: "Photography Guidelines",
    description: "File formats, culling and what to deliver.",
    icon: "Aperture",
    articles: [
      {
        slug: "file-formats",
        title: "File formats & naming",
        summary: "Deliver complete RAWs in the expected structure.",
        audience: "photo",
        minutes: 2,
        body: `- Shoot **RAW** (CR3, NEF, ARW, RAF are all fine). JPEG-only uploads are rejected.
- Do **not** cull or delete in camera. Upload everything; editors cull.
- Folder name: \`YYYY-MM-DD_Couple_ROLE\` — for example \`2026-10-18_Sarah-James_LEAD\`.
- Keep a backup of your cards until the gallery has been delivered.`,
      },
    ],
  },
  {
    slug: "video-guidelines",
    title: "Video Guidelines",
    description: "Footage standards, deliverables and drone use.",
    icon: "Clapperboard",
    articles: [
      {
        slug: "footage-standards",
        title: "Footage standards & deliverables",
        summary: "What editors need from you to cut a beautiful film.",
        audience: "video",
        minutes: 3,
        body: `- Hold every shot for **at least 8 seconds**.
- Capture the ceremony and toasts **uninterrupted** from a locked-off camera.
- Deliver every clip and every audio file — never trim on set.
- Folder name: \`YYYY-MM-DD_Couple_VIDEO\`, with sub-folders \`A-CAM\`, \`B-CAM\`, \`AUDIO\`, \`DRONE\`.`,
      },
      {
        slug: "drone-faq",
        title: "Drone FAQ",
        summary: "When and how we fly.",
        audience: "video",
        minutes: 2,
        body: `**Who can fly?** Only team members with a current FAA Part 107 certificate on file under *Licenses*.

**When?** Only when the package or an add-on includes drone coverage *and* the venue approves.

**Never fly** over guests, near airports without authorisation, or in wind above 20 mph.`,
      },
    ],
  },
  {
    slug: "upload-delivery",
    title: "Upload & Delivery Process",
    description: "The 48-hour upload policy and how to send files.",
    icon: "UploadCloud",
    articles: [
      {
        slug: "48-hour-policy",
        title: "The 48-hour upload policy",
        summary: "Start uploading the day after, finish within 48 hours.",
        minutes: 2,
        body: `Start your upload as soon as you can after the wedding, and finish **within 48 hours**.

- Watch progress in *Uploads*. Failed files show a **Retry** button.
- If your connection is slow, message your coordinator **before** the 48 hours are up.
- Late uploads without notice can reduce your payment for that wedding.`,
      },
      {
        slug: "how-to-upload",
        title: "How to upload",
        summary: "Step-by-step for photo and video uploads.",
        minutes: 3,
        body: `1. Open **Uploads** and pick the wedding.
2. Choose the category — *RAW*, *Edited*, *Highlights* for photo; *Footage*, *Ceremony*, *Reception* for video.
3. Drag files in or click **Select files**. You can add hundreds at once.
4. Keep the tab open until every file shows **Uploaded**. Video files then show **Processing** while we generate previews.
5. When finished, the wedding moves to *Delivered* and your payment request opens automatically.`,
      },
    ],
  },
  {
    slug: "dress-code",
    title: "Dress Code",
    description: "Look like part of the event, not a guest.",
    icon: "Shirt",
    articles: [
      {
        slug: "what-to-wear",
        title: "What to wear",
        summary: "Dark, simple and comfortable.",
        minutes: 2,
        body: `- **Black or dark navy**, head to toe. Simple, no logos.
- Trousers, dark chinos or a midi/maxi skirt or dress; a blazer is a plus.
- Clean, dark, quiet shoes you can stand in for 10 hours.
- No jeans, shorts, sneakers with bright soles, or hats.
- For black-tie weddings your coordinator will note "formal" on the wedding page.`,
      },
    ],
  },
  {
    slug: "arrival-departure",
    title: "Arrival & Departure",
    description: "When to arrive, where to check in, when you can leave.",
    icon: "Clock",
    articles: [
      {
        slug: "arrival-times",
        title: "Arrival & departure times",
        summary: "Call time means ready to shoot.",
        minutes: 2,
        body: `- Arrive **15 minutes before** the call time on your wedding page.
- Check in with the planner or venue coordinator, then message *"On site"* in the wedding thread.
- Coverage ends at the time shown on the timeline. If a couple asks you to stay longer, message the coordinator — overtime must be approved and is paid at your hourly rate.
- Never leave before the scheduled end, even if the reception winds down early, without coordinator approval.`,
      },
    ],
  },
  {
    slug: "emergency-procedures",
    title: "Emergency Procedures",
    description: "Running late, sick, or something broke? Start here.",
    icon: "Siren",
    articles: [
      {
        slug: "emergencies",
        title: "Emergencies & the on-call line",
        summary: "What to do when something goes wrong on a wedding day.",
        minutes: 3,
        body: `## Call the on-call coordinator line immediately if
- You will be **more than 10 minutes late**.
- You are sick or injured and cannot shoot.
- Your gear fails and you have no backup.
- There is a safety issue at the venue.

The on-call line (shown on your Overview page) is for **wedding-day emergencies only** — routine questions go through Messages.

## If you cannot attend
Tell us as early as possible. We keep a standby list for every weekend; the more notice we have, the more likely the couple never notices.`,
      },
    ],
  },
  {
    slug: "payment-information",
    title: "Payment Information",
    description: "How and when you get paid.",
    icon: "Wallet",
    articles: [
      {
        slug: "when-you-get-paid",
        title: "When you get paid",
        summary: "Payment timing after you upload.",
        minutes: 2,
        body: `1. You complete your upload.
2. Our editors run a quick quality check (usually 2–4 business days).
3. Your payout moves from **Pending** → **Processing** → **Paid**.
4. Payouts run every Friday by direct deposit.

You can see every payout and its status on the **Payments** page and open any row for the full breakdown.`,
      },
      {
        slug: "rates-mileage-bonuses",
        title: "Rates, mileage & bonuses",
        summary: "How your payout amount is calculated.",
        minutes: 3,
        body: `Your rate is shown on every Open Wedding card **before** you accept.

- **Base rate** — set by role (lead/second) and coverage hours.
- **Mileage** — paid for round trips above 100 miles from your home base.
- **On-time bonus** — added when your upload is complete within 48 hours and includes the time-sync frame.
- **Overtime** — approved extra hours at your hourly rate.

## Why a payout might be on hold
- Upload incomplete or missing the time-sync frame
- Quality concerns that need a conversation
- Missing W-9 or payout details`,
      },
    ],
  },
  {
    slug: "faq",
    title: "Frequently Asked Questions",
    description: "Quick answers to common questions.",
    icon: "CircleHelp",
    articles: [
      {
        slug: "team-faq",
        title: "Team FAQ",
        summary: "Answers to what new team members ask most.",
        minutes: 4,
        body: `**Can I post photos from a Visual Weddings wedding?**
Not without a written image license. Request one from your coordinator; most are approved after the couple's gallery is delivered.

**Can I cancel after accepting a wedding?**
Accepted weddings are a commitment. In a genuine emergency, contact your coordinator immediately.

**Do I edit the photos?**
No — upload complete RAW files. Our editing team handles culling, colour and delivery.

**How do Open Weddings work?**
They are weddings that still need a team member. Make sure the date is marked available, then click **Accept**. Some require coordinator approval and show as *Pending* until confirmed.

**Who do I ask about payments?**
Send a message with the subject "Payments" — and check *Payment Information* first.`,
      },
    ],
  },
  {
    slug: "resources",
    title: "Resources",
    description: "Templates, shot lists and useful links.",
    icon: "FolderOpen",
    articles: [
      {
        slug: "shot-list-template",
        title: "Standard shot list",
        summary: "The baseline list every wedding starts from.",
        minutes: 3,
        body: `## Details
Rings, invitation suite, shoes, florals, dress/suit hanging, venue exterior and interior.

## Getting ready
Hair and makeup finishing touches, dress/suit on, parents' reactions, letters or gifts.

## Ceremony
Guests arriving, processional (every person), partner's reaction, vows, rings, kiss, recessional.

## Formals
Couple with each set of parents, immediate family, grandparents, wedding party.

## Reception
Room before guests, entrances, first dance, parent dances, toasts with reactions, cake, open dancing, exit.`,
      },
    ],
  },
  {
    slug: "support",
    title: "Contact & Support",
    description: "Who to contact and how quickly you'll hear back.",
    icon: "LifeBuoy",
    articles: [
      {
        slug: "contact-support",
        title: "Contacting the team",
        summary: "Response times and the right channel for each question.",
        minutes: 2,
        body: `| Need | Channel | Response |
|---|---|---|
| Wedding-day emergency | On-call line | Immediate |
| Assignment questions | Messages → your coordinator | Same business day |
| Payments | Messages → subject "Payments" | 1–2 business days |
| Technical problems with the dashboard | Messages → "Support" | 1 business day |

Coordinators work Monday–Friday, 9am–6pm ET, plus on-call coverage every Saturday and Sunday.`,
      },
    ],
  },
];
