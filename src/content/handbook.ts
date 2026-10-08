// Visual Weddings Team Handbook — original sample content.
// Seeded into handbook_categories / handbook_articles so coordinators can edit it later.

export type HandbookArticleSeed = {
  slug: string;
  title: string;
  summary: string;
  audience?: "all" | "photo" | "video" | "content";
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
    slug: "required-standards",
    title: "Required Standards & Agreements",
    description: "The shooting standard, footage tagging, backups and your legal responsibilities. You accept these before taking weddings.",
    icon: "ShieldCheck",
    articles: [
      {
        slug: "shooting-standard",
        title: "The shooting standard (every camera, every wedding)",
        summary: "Same frame rate, same picture profile, synced timecode and dedicated audio — so footage from every shooter cuts together.",
        minutes: 5,
        body: `Our films are assembled from several shooters' cameras, and more and more of the first assembly is automated. That only works if every file follows the same standard. **This is required, not a suggestion** — footage that doesn't follow it costs hours in the edit and may delay your payment.

## Video — every camera body
| Setting | Standard |
|---|---|
| Resolution | 4K UHD (3840 × 2160) |
| Frame rate | **23.976 fps** for everything at normal speed |
| Slow motion | **59.94 fps** (conformed to 23.976 in the edit) — only for movement: entrances, dances, send-off |
| Shutter | 1/50 at 23.976; 1/125 at 59.94. Use ND outdoors instead of raising the shutter |
| Picture profile | Our house log profile for your brand (below). Never bake in a LUT or a creative look |
| White balance | **Manual Kelvin**, set per location — never auto. Match the other shooters when you share a room |
| Codec | Highest 10-bit 4:2:2 option your camera has (e.g. XAVC S-I, All-I, ProRes 422) |

**House log profiles:** Sony S-Log3 / S-Gamut3.Cine · Canon C-Log3 / Cinema Gamut · Panasonic V-Log · Fujifilm F-Log2 · Nikon N-Log · Blackmagic Film Gen 5. Exposure: expose to the right (+1 to +1.7 stops on log), protect skin highlights.

## Timecode — all cameras and recorders
- Run **time-of-day timecode** on every camera and audio recorder.
- If you have sync boxes (Tentacle, Deity, etc.), jam-sync them at call time and again after lunch.
- No sync box? Set every camera and recorder clock to network time (time.gov) at call time, **and** record a visible slate clap in front of all running cameras and recorders at the start of the ceremony and the speeches.
- Photographers: follow the [time-sync procedure](/team/handbook/time-sync) — the same clock is used to line photos up with the film.

## Audio — dedicated, never camera-only
1. **Lav on the partner waiting at the altar** (usually the groom) — recording locally, 32-bit float if your recorder supports it.
2. **Lav on the officiant.**
3. **Recorder on the DJ / soundboard feed** (or on the lectern) for speeches and the first dance.
4. On-camera scratch audio **always on** — it's how the edit syncs everything.
5. 48 kHz, 24-bit (or 32-bit float). Monitor with headphones during vows and speeches.

## Content creators
- Phone or camera set to **4K, 30 fps** (60 fps for slow-motion moments), **vertical 9:16** unless the coordinator asks for horizontal.
- Lock exposure and focus on faces; turn on HDR video only if every clip from the day uses it.
- Phone clock on network time — it's how your clips line up with the film and photos.
- Record the vows, first kiss and first dance on video even if you also take photos of them.

## Photography
- RAW only, **dual card slots recording to both cards** (backup/mirror mode, not overflow).
- Camera clocks synced at call time (see time-sync).
- Don't cull or delete in camera.

## Before you leave the venue
Check that every card has recorded to both slots, and that audio files exist for the ceremony and the speeches. If anything failed, tell your coordinator that night.`,
      },
      {
        slug: "tagging-footage",
        title: "Tagging your footage and adding markers",
        summary: "Tag every upload with the moment and the camera it came from, and mark key beats inside long clips.",
        minutes: 3,
        body: `Editors (and our editing pipeline) find footage by **moment** and **camera**, not by file name. Tagging takes seconds when you upload and saves the editor hours.

## When you upload
1. Open **Uploads** and pick the wedding.
2. In **Tag this batch**, choose the **moment** (Getting ready, Ceremony, Toasts & speeches, First dance…) and the **camera or recorder** (A-cam, B-cam, Drone, Audio · lav on officiant…).
3. Add the files for that moment and camera. Then change the tags and add the next batch.
4. Video can't be uploaded without a moment. Photographers and content creators can tag a full card as **Whole day / mixed** — we sort by capture time, which is why the time-sync is required.

There's one **Uploads** page for everyone. Pick the wedding and the page asks for what your role on that wedding needs: photos for photographers, video and audio for videographers, clips, phone photos and finished reels for content creators.

Files go into the company Dropbox in matching folders, e.g. \`Weddings / 2026-10-10 Ade & Tolu / Video / Toasts & speeches / Daniel Kim · B-cam\`.

## Markers inside a clip
For long clips — the full ceremony or the speeches — add markers so the editor can jump straight to the beats:
- In the uploaded files list, click **Add** in the *Markers* column.
- Type the time inside the clip (\`12:31\` or \`1:02:45\`) and choose what happens: *Vows, Ring exchange, Kiss, Speech starts, Great reaction, Problem (audio/focus)…*
- Mark problems too. A note like "lav rustle 3:10–3:40" saves a lot of searching.

## In-camera markers
If your camera can drop shot marks or flags (Sony Shot Mark, Canon/Panasonic clip marks, a slate clap on the recorder), use them on the day and tick **I dropped in-camera markers** when you upload. The editor reads them from the file.

## Wrong tag?
Change it any time from the *Moment* column — the file moves to the right Dropbox folder automatically.`,
      },
      {
        slug: "backups-and-delivery",
        title: "Backups: dual cards and three copies in two places",
        summary: "A wedding can't be reshot. How to protect files from the moment you press record until delivery is confirmed.",
        minutes: 3,
        body: `Losing a wedding's files is the one mistake we can't fix. These rules are part of your agreement for every wedding.

## On the day
- **Record to two cards at once** in every camera that supports it (mirror/backup mode, not overflow or RAW+JPEG split).
- Audio recorders: record a safety track or a second recorder for vows and speeches.
- Never format a card at the venue. Full cards go into a labelled, zipped card wallet that stays on your body — not in a car or a bag left under a table.

## The same night: three copies in two places
1. **Copy 1:** the original cards (don't format them yet).
2. **Copy 2:** an external drive or your computer.
3. **Copy 3:** a different physical place — a second drive kept at another address, or a cloud backup.

Start your upload to Visual Weddings within 24 hours and finish within 48. Once a file shows **Uploaded**, it has been checked: it landed in the company Dropbox at full size.

## How long to keep your copies
Keep **all copies until your coordinator confirms delivery is complete** (you'll get a notification). After that, delete or return every copy when we ask — the files belong to the couple's wedding and to Visual Weddings, not to your archive.

## If something goes wrong
Corrupt card, failed upload, lost drive: message your coordinator **immediately**. Don't try recovery software that writes to the card — leave it untouched; we'll arrange professional recovery.`,
      },
      {
        slug: "contract-insurance-liability",
        title: "Your agreement, insurance and liability",
        summary: "Who owns the footage, the insurance you must carry, and responsibility for damage to equipment or property.",
        minutes: 4,
        body: `You sign an Independent Contractor Agreement for every wedding (when you accept a wedding or an offer). Here is what it means in plain English. The agreement itself is what counts — read it before you sign.

## The footage belongs to Visual Weddings
Everything you shoot, record or edit for a Visual Weddings wedding is a **work made for hire** for Visual Weddings. You assign any rights you might have to the company. You may show a reasonable selection in your personal portfolio only after the couple has received their gallery or film, with credit to Visual Weddings, and never for stock or commercial licensing.

## Insurance you must carry
- **General liability insurance** of at least **$1,000,000 per occurrence** for your wedding work. Many venues require it and may ask for Visual Weddings to be named as an additional insured — we'll tell you when.
- **Equipment insurance** for your own gear. We strongly recommend it; if you don't carry it, the risk of loss is yours alone.
- Keep your certificate up to date under **Licenses**. Expired insurance means you can't be staffed.

## You're responsible for your equipment and for damage you cause
- **Your equipment is your responsibility.** Loss, theft or damage to your cameras, lenses, drones, lights, cards, vehicles or other property — at the venue, in transit or anywhere else — is not covered by Visual Weddings.
- **Damage you cause is your responsibility.** If you, your equipment (tripods, light stands, cables, drones) or anyone working with you damages venue property, a guest's property or injures someone, you are responsible for it and your insurance should respond. You agree to cover Visual Weddings for claims that come from your negligence or from breaking the agreement.
- Tape down cables, sandbag light stands, keep bags out of walkways, and follow venue rules and drone laws.

## Footage, backups and standards
The agreement also commits you to the [shooting standard](/team/handbook/shooting-standard), [tagging](/team/handbook/tagging-footage) and [backup rules](/team/handbook/backups-and-delivery), and to uploading within 48 hours.

> This page summarises the agreement; it isn't legal or insurance advice. If you're unsure what coverage you need, ask your insurance broker.`,
      },
    ],
  },
  {
    slug: "content-creator-guidelines",
    title: "Content Creator Guidelines",
    description: "Phone-first reels, behind-the-scenes and same-day teasers.",
    icon: "Smartphone",
    articles: [
      {
        slug: "content-creator-guide",
        title: "Content creator guide",
        summary: "What couples book a content creator for, and how to deliver it.",
        audience: "content",
        minutes: 4,
        body: `Couples add a content creator to get **social-ready content fast**: vertical reels, behind-the-scenes moments and a same-day teaser they can post that night. You work alongside the photographer and videographer — never in their way.

## What to deliver
- **Same-day teaser:** a 15–30 second vertical reel delivered to your coordinator before the end of the reception.
- **Raw clips & phone photos:** everything you shot, uploaded within 48 hours.
- **2–3 finished reels** within 7 days, using the couple's style notes from the questionnaire.

## On the day
- Shoot vertical 9:16, 4K, 30 fps (60 fps for slow motion). Phone clock on network time.
- Stay out of the photographer's and videographer's lines during the processional, vows and first dance — ask the leads where to stand.
- Capture what the other teams don't: getting-ready energy, guest reactions, details in motion, the dance floor from inside.
- Bring a gimbal or stabiliser, two charged power banks and enough free storage for the whole day.

## Posting and privacy
- Everything you shoot belongs to Visual Weddings and the couple. **Never post to your own accounts** before the couple has posted, and only with credit to Visual Weddings.
- Don't film guests who ask not to be filmed, and keep children's faces out of public posts unless the couple approves.
- Use licensed or platform-provided music only.

## Uploading
Open **Uploads**, pick the wedding, and tag each batch with the moment and device. Use *Raw clips & photos* for everything you shot and *Finished reels* for edits. Add markers to long clips the editor should look at first.`,
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
        body: `Full details: [the shooting standard](/team/handbook/shooting-standard).

- **Resolution:** 4K UHD at **23.976 fps**. 59.94 fps only for slow-motion moments.
- **Picture profile:** our house log profile for your brand; manual Kelvin white balance; never bake in a LUT.
- **Shutter:** 1/50 at 23.976 (1/125 at 59.94) with ND outdoors.
- **Timecode:** time-of-day on every camera and recorder, jam-synced or clock-synced at call time, plus a slate clap.
- **Audio:** lav on the partner waiting at the altar **and** on the officiant, plus a recorder on the DJ/board feed. Scratch audio always on.
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
- Record to **both card slots** (mirror mode) and keep three copies in two places until delivery is confirmed — see [backup rules](/team/handbook/backups-and-delivery).
- The app files your uploads into the right Dropbox folder for you, so you don't need to rename folders.`,
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
- Follow [the shooting standard](/team/handbook/shooting-standard) and [tag every upload](/team/handbook/tagging-footage) with its moment and camera — the app builds the Dropbox folders for you.`,
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
        body: `1. Open **Uploads** and pick the wedding. What you can upload follows your role on that wedding.
2. Photographers: choose the folder — *RAW*, *Edited* or *Highlights*. Content creators: *Raw clips & photos* or *Finished reels*.
3. In **Tag this batch**, choose the moment and the camera or recorder ([how tagging works](/team/handbook/tagging-footage)). Video needs a moment before you can add files.
4. Drag files in or click **Select files**. You can add hundreds at once; large videos upload in pieces and resume on their own after a dropped connection.
5. Keep the tab open until every file shows **Uploaded** — that means it was checked and is safe in the company Dropbox. Video files then show **Processing**.
6. Add markers to long clips, then keep your backups until your coordinator confirms delivery ([backup rules](/team/handbook/backups-and-delivery)).`,
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
