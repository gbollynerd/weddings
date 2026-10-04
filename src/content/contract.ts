/**
 * Starting contractor agreement. Coordinators can edit it in Admin → Contract terms; every edit is a new
 * version and signed copies are frozen, so changes only affect future signatures.
 * NOTE: this is a practical starting point, not legal advice — have a lawyer licensed in your state review it.
 */
export const CONTRACT_PLACEHOLDERS: [string, string][] = [
  ["company", "Your company name"],
  ["contractor_name", "Team member's full name"],
  ["contractor_email", "Team member's email"],
  ["discipline", "photographer / videographer"],
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
- Bring professional equipment suitable for the role, including a backup camera body, cameras that record to two cards where possible, spare batteries and enough storage for the full day.
- Follow the timeline, shot list and instructions shared in the Company's platform and from the lead or coordinator on site.
- Be courteous and professional with the couple, their guests and venue staff. No alcohol or recreational drugs before or during the event.
- Follow venue rules and local laws, including any drone regulations.

## 4. Delivering the work
The Contractor will upload all original files from the wedding to the Company's platform within 48 hours after the wedding, keep a backup copy until the Company confirms the upload is complete, and then delete or return any remaining copies when the Company asks. Files must not be edited, culled or shared before they are uploaded unless the Company asks.

## 5. Ownership and use of the work
All photographs, footage and audio created under this Agreement are works made for hire for the Company. To the extent they are not, the Contractor assigns all rights in them to the Company. The Contractor may use a reasonable selection in their personal portfolio only after the couple has received their final gallery or film, with credit to the Company, and never for commercial licensing.

## 6. Clients and confidentiality
The couple are the Company's clients. The Contractor will not offer the couple, their family or guests their own services, share personal pricing, or take payment from them, for 24 months after the wedding. The Contractor will keep the couple's personal details, the wedding plans, and the Company's pricing and business information confidential, and will not post about the wedding on social media until the couple's gallery or film has been delivered.

## 7. Pay
The Company will pay the compensation above after the wedding, once all files are uploaded and the Contractor requests payment through the platform. Pay may be adjusted by a written change notice from the Company if the couple changes the hours of coverage. Pay may be held while a complaint about missing files, missed call times or conduct is reviewed.

## 8. Cancellations and replacements
The Contractor must request any cancellation through the Company's platform with a reason and remains responsible for the wedding until a coordinator releases them. Cancellations requested within 14 days of the wedding are recorded on the Contractor's file and may affect future assignments, except in a genuine emergency. The Contractor may not send someone else in their place without the Company's written approval. If the Company or the couple cancels or moves the wedding, the Company will tell the Contractor as soon as possible and this Agreement ends for that date.

## 9. Insurance and compliance
The Contractor will keep a valid driver's license and general liability insurance throughout the assignment and keep the documents in their profile up to date. The Contractor is responsible for their own equipment and for any loss or damage they cause through their own negligence.

## 10. General
This Agreement, the Team Handbook and any written change notices are the whole agreement for this wedding. If any part is unenforceable, the rest still applies. Typing their full name and confirming below is the Contractor's electronic signature and has the same effect as a handwritten signature.`,
};
