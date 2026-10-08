/**
 * Starting contractor agreement. Coordinators can edit it in Admin → Contract terms; every edit is a new
 * version and signed copies are frozen, so changes only affect future signatures.
 * NOTE: this is a practical starting point, not legal advice — have a lawyer licensed in your state review it.
 */
export const CONTRACT_PLACEHOLDERS: [string, string][] = [
  ["company", "Your company name"],
  ["contractor_name", "Team member's full name"],
  ["contractor_email", "Team member's email"],
  ["discipline", "photographer / videographer / content creator (from the slot)"],
  ["role", "Role on this wedding, e.g. Lead photographer"],
  ["couple", "The couple's names"],
  ["wedding_date", "Wedding date"],
  ["venue", "Ceremony (and reception) venue"],
  ["city", "Market, e.g. Charlotte, NC"],
  ["call_time", "Call time"],
  ["coverage_hours", "Hours of coverage"],
  ["compensation", "Agreed pay for this wedding"],
  ["mileage", "Mileage terms for this wedding"],
];

export const DEFAULT_CONTRACT = {
  title: "Independent Contractor Agreement",
  body: `This Independent Contractor Agreement (the "Agreement") is between {{company}} (the "Company") and {{contractor_name}} ({{contractor_email}}) (the "Contractor") for one wedding, described below. By signing, the Contractor agrees to follow these terms and the Company's Team Handbook, which is part of this Agreement.

## 1. The assignment
- Role: {{role}}
- Couple: {{couple}}
- Date: {{wedding_date}}
- Location: {{venue}} ({{city}})
- Call time: {{call_time}}, with {{coverage_hours}} hours of coverage
- Compensation: {{compensation}}
- Travel: {{mileage}}

This Agreement takes effect only when a Company coordinator approves the Contractor for this wedding. Until then the Contractor's acceptance is a request and the Company may assign the wedding to someone else.

## 2. Independent contractor
The Contractor is an independent contractor, not an employee, partner or agent of the Company. The Contractor is responsible for their own taxes, insurance, equipment and business expenses, and will provide a completed W-9 before payment. Nothing in this Agreement guarantees future work.

## 3. Standards on the day
- Arrive at the call time, ready to work, in plain black attire unless the coordinator says otherwise.
- Bring professional equipment suitable for the role, including a backup camera body, spare batteries and enough storage for the full day.
- Follow the Company's shooting standard in the Team Handbook: for video, 4K at 23.976 fps (59.94 fps only for slow motion), the Company's house log profile and manual white balance, time-of-day timecode on every camera and recorder synchronised at call time, and dedicated audio (a lavalier microphone on the partner waiting at the altar and on the officiant, plus a recorder on the DJ or sound-board feed); for photography, RAW files and camera clocks synchronised at call time.
- Follow the timeline, shot list and instructions shared in the Company's platform and from the lead or coordinator on site.
- Be courteous and professional with the couple, their guests and venue staff. No alcohol or recreational drugs before or during the event.
- Follow venue rules and local laws, including any drone regulations.

## 4. Backups and delivering the work
- Record to two memory cards at the same time in every camera that supports it, and keep cards in the Contractor's personal custody until they are copied.
- By the end of the wedding day, keep at least three copies of all files in at least two separate physical locations (for example the original cards, a drive, and a second drive or cloud backup kept elsewhere).
- Upload all original files to the Company's platform within 48 hours after the wedding, tagging each upload with the part of the day and the camera or recorder it came from, and adding markers where the Handbook asks for them.
- Keep every copy until the Company confirms delivery is complete, then delete or return all remaining copies when the Company asks. Files must not be edited, culled or shared before they are uploaded unless the Company asks.
- Tell the Company immediately if any file is lost, corrupted or can't be uploaded, and don't attempt recovery that could overwrite the original card.

## 5. Ownership and use of the work
All photographs, footage and audio created under this Agreement are works made for hire for the Company. To the extent they are not, the Contractor assigns all rights in them to the Company. The Contractor may use a reasonable selection in their personal portfolio only after the couple has received their final gallery or film, with credit to the Company, and never for commercial licensing.

## 6. Clients and confidentiality
The couple are the Company's clients. The Contractor will not offer the couple, their family or guests their own services, share personal pricing, or take payment from them, for 24 months after the wedding. The Contractor will keep the couple's personal details, the wedding plans, and the Company's pricing and business information confidential, and will not post about the wedding on social media until the couple's gallery or film has been delivered.

## 7. Pay
The Company will pay the compensation above after the wedding, once all files are uploaded and the Contractor requests payment through the platform. Pay may be adjusted by a written change notice from the Company if the couple changes the hours of coverage. Pay may be held while a complaint about missing files, missed call times or conduct is reviewed.

## 8. Cancellations and replacements
The Contractor must request any cancellation through the Company's platform with a reason and remains responsible for the wedding until a coordinator releases them. Cancellations requested within 14 days of the wedding are recorded on the Contractor's file and may affect future assignments, except in a genuine emergency. The Contractor may not send someone else in their place without the Company's written approval. If the Company or the couple cancels or moves the wedding, the Company will tell the Contractor as soon as possible and this Agreement ends for that date.

## 9. Insurance and compliance
The Contractor will, at their own cost, keep throughout the assignment: a valid driver's license; general liability insurance of at least $1,000,000 per occurrence covering their wedding work; and any additional coverage a venue requires, including naming the Company (and the venue, if asked) as an additional insured. The Contractor is encouraged to insure their own equipment. The Contractor will keep current copies of these documents in their profile and will not work a wedding while any required document is expired.

## 10. Equipment, damage and liability
- The Contractor is solely responsible for their own equipment, vehicles and other property, including loss, theft or damage at the venue, in transit or anywhere else. The Company does not insure or reimburse the Contractor's property.
- The Contractor is responsible for any damage to venue property, the property of the couple, guests or vendors, and for any injury, caused by the Contractor, their equipment (such as tripods, light stands, cables or drones) or anyone working with them, and will pay for or have their insurance cover that damage.
- The Contractor will indemnify and hold harmless the Company from claims, losses and costs (including reasonable legal fees) arising from the Contractor's negligence, wilful misconduct or breach of this Agreement.
- The Contractor will follow venue rules and safety instructions and secure their equipment so it does not create a hazard.

## 11. General
This Agreement, the Team Handbook and any written change notices are the whole agreement for this wedding. If any part is unenforceable, the rest still applies. Typing their full name and confirming below is the Contractor's electronic signature and has the same effect as a handwritten signature.`,
};

/** SHA-256 of the original built-in agreement (version 1) — if the live template is still that text, it is replaced outright. */
export const LEGACY_CONTRACT_SHA = "7a4daa250377d6e7334cde361a863623a2e8ba4d118cc71bf2e558d79adabea9";

/** Appended instead when a coordinator had already edited the agreement, so their wording is kept. */
export const STANDARDS_ADDENDUM = `## Addendum — shooting standard, backups, insurance and liability
These terms are added to the Agreement above. Where they conflict with it, these terms apply.

**A. Shooting standard.** The Contractor will follow the Company's shooting standard in the Team Handbook: for video, 4K at 23.976 fps (59.94 fps only for slow motion), the Company's house log profile and manual white balance, time-of-day timecode on every camera and recorder synchronised at call time, and dedicated audio (a lavalier microphone on the partner waiting at the altar and on the officiant, plus a recorder on the DJ or sound-board feed); for photography, RAW files and camera clocks synchronised at call time.

**B. Backups and delivery.** The Contractor will record to two memory cards at the same time in every camera that supports it; by the end of the wedding day keep at least three copies of all files in at least two separate physical locations; upload all original files within 48 hours, tagged with the part of the day and the camera or recorder they came from; keep every copy until the Company confirms delivery is complete, then delete or return them when asked; and tell the Company immediately if any file is lost or corrupted.

**C. Ownership.** All photographs, footage and audio created under this Agreement are works made for hire for the Company; to the extent they are not, the Contractor assigns all rights in them to the Company.

**D. Insurance.** The Contractor will keep, at their own cost, general liability insurance of at least $1,000,000 per occurrence covering their wedding work and any additional coverage a venue requires, including naming the Company as an additional insured when asked, and will keep current copies in their profile.

**E. Equipment, damage and liability.** The Contractor is solely responsible for their own equipment, vehicles and property, including loss, theft or damage anywhere. The Contractor is responsible for damage to venue property, to the property of the couple, guests or vendors, and for any injury caused by the Contractor, their equipment or anyone working with them, and will indemnify and hold harmless the Company from claims, losses and costs (including reasonable legal fees) arising from the Contractor's negligence, wilful misconduct or breach of this Agreement.`;
