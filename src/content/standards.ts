/**
 * The standards every freelancer (photographer, videographer or content creator) accepts before taking weddings.
 * Bump STANDARDS_VERSION when these change materially — everyone is asked to accept again.
 */
export const STANDARDS_VERSION = 1;

export const STANDARDS: { title: string; href: string; points: string[] }[] = [
  {
    title: "Shooting standard",
    href: "/team/handbook/shooting-standard",
    points: [
      "Video: 4K at 23.976 fps (59.94 fps only for slow motion), our house log profile, manual Kelvin white balance.",
      "Time-of-day timecode on every camera and recorder, synced at call time, plus a slate clap.",
      "Dedicated audio: lav on the partner at the altar and on the officiant, plus a DJ/board recorder.",
      "Photo: RAW only, camera clocks synced at call time.",
      "Content: vertical 4K, phone clock on network time, never posted to your own accounts first.",
    ],
  },
  {
    title: "Tagging footage",
    href: "/team/handbook/tagging-footage",
    points: [
      "Tag every upload with the moment it covers and the camera or recorder it came from.",
      "Add markers for key beats in long clips (vows, speeches, problems) and use in-camera markers where you can.",
    ],
  },
  {
    title: "Backups",
    href: "/team/handbook/backups-and-delivery",
    points: [
      "Record to two cards at once in every camera that supports it.",
      "Three copies of every file in two separate places by the end of the night.",
      "Upload within 48 hours; keep every copy until your coordinator confirms delivery.",
    ],
  },
  {
    title: "Agreement, insurance & liability",
    href: "/team/handbook/contract-insurance-liability",
    points: [
      "Everything you shoot is work made for hire — it belongs to Visual Weddings.",
      "Carry general liability insurance (at least $1M per occurrence) and keep the certificate current.",
      "You're responsible for your own equipment, and for damage you, your gear or your assistants cause at the event or venue.",
    ],
  },
];
