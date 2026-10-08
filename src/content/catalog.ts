// Catalog seed data: markets, services, packages and add-ons. Prices are USD before the market multiplier.

export const MARKETS = [
  // [slug, city, state, stateName, region, multiplier, teamSize]
  ["charlotte-nc", "Charlotte", "NC", "North Carolina", "Southeast", 1.0, 9],
  ["raleigh-durham-nc", "Raleigh-Durham", "NC", "North Carolina", "Southeast", 1.0, 7],
  ["greensboro-nc", "Greensboro", "NC", "North Carolina", "Southeast", 0.95, 5],
  ["asheville-nc", "Asheville", "NC", "North Carolina", "Southeast", 1.05, 4],
  ["wilmington-nc", "Wilmington", "NC", "North Carolina", "Southeast", 1.0, 3],
  ["charleston-sc", "Charleston", "SC", "South Carolina", "Southeast", 1.1, 5],
  ["atlanta-ga", "Atlanta", "GA", "Georgia", "Southeast", 1.05, 8],
  ["nashville-tn", "Nashville", "TN", "Tennessee", "Southeast", 1.05, 6],
  ["huntsville-al", "Huntsville", "AL", "Alabama", "Southeast", 0.95, 3],
  ["birmingham-al", "Birmingham", "AL", "Alabama", "Southeast", 0.95, 3],
  ["richmond-va", "Richmond", "VA", "Virginia", "Mid-Atlantic", 1.0, 4],
  ["washington-dc", "Washington", "DC", "District of Columbia", "Mid-Atlantic", 1.15, 7],
  ["baltimore-md", "Baltimore", "MD", "Maryland", "Mid-Atlantic", 1.05, 4],
  ["philadelphia-pa", "Philadelphia", "PA", "Pennsylvania", "Northeast", 1.1, 5],
  ["new-york-ny", "New York", "NY", "New York", "Northeast", 1.25, 10],
  ["boston-ma", "Boston", "MA", "Massachusetts", "Northeast", 1.15, 6],
  ["chicago-il", "Chicago", "IL", "Illinois", "Midwest", 1.1, 7],
  ["minneapolis-mn", "Minneapolis", "MN", "Minnesota", "Midwest", 1.0, 4],
  ["austin-tx", "Austin", "TX", "Texas", "South", 1.05, 6],
  ["dallas-tx", "Dallas", "TX", "Texas", "South", 1.05, 6],
  ["houston-tx", "Houston", "TX", "Texas", "South", 1.0, 6],
  ["miami-fl", "Miami", "FL", "Florida", "Southeast", 1.15, 6],
  ["orlando-fl", "Orlando", "FL", "Florida", "Southeast", 1.0, 5],
  ["tampa-fl", "Tampa", "FL", "Florida", "Southeast", 1.0, 5],
  ["denver-co", "Denver", "CO", "Colorado", "Mountain", 1.1, 5],
  ["phoenix-az", "Phoenix", "AZ", "Arizona", "Southwest", 1.0, 4],
  ["los-angeles-ca", "Los Angeles", "CA", "California", "West", 1.2, 9],
  ["san-francisco-ca", "San Francisco", "CA", "California", "West", 1.25, 7],
  ["san-diego-ca", "San Diego", "CA", "California", "West", 1.15, 5],
  ["seattle-wa", "Seattle", "WA", "Washington", "West", 1.1, 5],
] as const;

export const VENUES: Record<string, [string, string, string, number][]> = {
  // market slug → [name, address, kind, capacity]
  "charlotte-nc": [
    ["The Ivory Atrium", "401 S Tryon St, Charlotte, NC", "Ballroom", 250],
    ["Willow Creek Estate", "8800 Willow Creek Rd, Charlotte, NC", "Estate & gardens", 180],
    ["Founders Hall Loft", "100 N Tryon St, Charlotte, NC", "Urban loft", 150],
    ["Lakeview Pavilion", "2201 Lake Shore Dr, Cornelius, NC", "Lakeside pavilion", 200],
  ],
  "raleigh-durham-nc": [
    ["The Glasshouse at Oak City", "220 W Martin St, Raleigh, NC", "Glass conservatory", 160],
    ["Magnolia Barn", "4100 Barn Rd, Durham, NC", "Barn", 220],
    ["Heritage Tobacco Warehouse", "305 Main St, Durham, NC", "Industrial", 300],
  ],
  "greensboro-nc": [
    ["Sycamore Grove", "1500 Grove Ln, Greensboro, NC", "Garden", 160],
    ["The Revival Room", "220 Elm St, Greensboro, NC", "Historic venue", 140],
  ],
  "atlanta-ga": [
    ["The Peachtree Conservatory", "1200 Peachtree St, Atlanta, GA", "Conservatory", 240],
    ["Stonebridge Manor", "450 Old Mill Rd, Roswell, GA", "Manor", 200],
  ],
  "washington-dc": [
    ["Capitol Terrace", "50 Massachusetts Ave NE, Washington, DC", "Rooftop terrace", 180],
    ["Georgetown Rowhouse Gallery", "3100 M St NW, Washington, DC", "Gallery", 120],
  ],
  "nashville-tn": [["Cumberland River Hall", "700 1st Ave N, Nashville, TN", "Riverfront hall", 260]],
  "charleston-sc": [["Ashley Oaks Plantation House", "3500 Ashley River Rd, Charleston, SC", "Historic estate", 200]],
  "new-york-ny": [["The Hudson Skyroom", "500 W 34th St, New York, NY", "Rooftop", 220]],
};

export const SERVICES = [
  { slug: "photo", name: "Photography", tagline: "Every moment, beautifully composed.", description: "Documentary-led wedding photography with natural colour and gently directed portraits.", sort: 1 },
  { slug: "video", name: "Videography", tagline: "Your day, told as a film.", description: "Cinematic highlight and feature films with clean, broadcast-quality audio.", sort: 2 },
  { slug: "both", name: "Photo + Video", tagline: "One team, the complete story.", description: "A coordinated photo and film crew who plan together and deliver together — our most popular choice.", sort: 3 },
] as const;

type Pkg = {
  slug: string; service: "photo" | "video" | "both"; name: string; tagline: string; price: number; hours: number;
  photographers: number; videographers: number; turnaround: number; deliverables: string[]; features: string[]; popular?: boolean;
};

export const PACKAGES: Pkg[] = [
  { slug: "photo-essentials", service: "photo", name: "Essentials", tagline: "Ceremony to first dance", price: 2400, hours: 6, photographers: 1, videographers: 0, turnaround: 42,
    deliverables: ["400+ edited images", "Private online gallery", "Print release"], features: ["1 lead photographer", "6 hours of coverage", "Pre-wedding planning call", "Gallery in 6 weeks"] },
  { slug: "photo-signature", service: "photo", name: "Signature", tagline: "Getting ready to grand exit", price: 3400, hours: 8, photographers: 2, videographers: 0, turnaround: 35, popular: true,
    deliverables: ["700+ edited images", "Private online gallery", "48-hour sneak peek", "Print release"], features: ["Lead + second photographer", "8 hours of coverage", "Engagement session", "Gallery in 5 weeks"] },
  { slug: "photo-heirloom", service: "photo", name: "Heirloom", tagline: "The full weekend story", price: 4800, hours: 10, photographers: 2, videographers: 0, turnaround: 28,
    deliverables: ["900+ edited images", "10×10 heirloom album", "48-hour sneak peek", "Print release"], features: ["Lead + second photographer", "10 hours of coverage", "Engagement session", "Rehearsal coverage (1 hr)", "Gallery in 4 weeks"] },

  { slug: "video-highlight", service: "video", name: "Highlight", tagline: "A beautiful short film", price: 2600, hours: 6, photographers: 0, videographers: 1, turnaround: 56,
    deliverables: ["4–6 minute highlight film", "1-minute social teaser", "Licensed music"], features: ["1 lead videographer", "6 hours of coverage", "Ceremony audio capture", "Film in 8 weeks"] },
  { slug: "video-feature", service: "video", name: "Feature", tagline: "Highlights plus the full story", price: 3800, hours: 8, photographers: 0, videographers: 2, turnaround: 49, popular: true,
    deliverables: ["5–7 minute highlight film", "15–20 minute feature film", "Full ceremony edit", "1-minute social teaser"], features: ["Lead + second videographer", "8 hours of coverage", "Multi-camera ceremony", "Film in 7 weeks"] },
  { slug: "video-cinematic", service: "video", name: "Cinematic", tagline: "Documentary-grade storytelling", price: 5200, hours: 10, photographers: 0, videographers: 2, turnaround: 42,
    deliverables: ["6–8 minute highlight film", "25–30 minute feature film", "Full ceremony & toasts", "Drone aerials", "Raw footage archive"], features: ["Lead + second videographer", "10 hours of coverage", "Drone coverage", "Film in 6 weeks"] },

  { slug: "duo-essentials", service: "both", name: "Duo Essentials", tagline: "Photo and film, simply done", price: 4600, hours: 6, photographers: 1, videographers: 1, turnaround: 49,
    deliverables: ["400+ edited images", "4–6 minute highlight film", "Online gallery"], features: ["1 photographer + 1 videographer", "6 hours of coverage", "Shared planning call", "Gallery 6 wks · Film 7 wks"] },
  { slug: "duo-signature", service: "both", name: "Duo Signature", tagline: "Our most-loved combination", price: 6400, hours: 8, photographers: 2, videographers: 1, turnaround: 42, popular: true,
    deliverables: ["700+ edited images", "5–7 minute highlight film", "Full ceremony edit", "48-hour sneak peek"], features: ["2 photographers + 1 videographer", "8 hours of coverage", "Engagement session", "Gallery 5 wks · Film 7 wks"] },
  { slug: "duo-legacy", service: "both", name: "Duo Legacy", tagline: "Everything, beautifully covered", price: 8900, hours: 10, photographers: 2, videographers: 2, turnaround: 35,
    deliverables: ["900+ edited images", "Highlight + feature film", "Heirloom album", "Drone aerials", "Raw footage archive"], features: ["2 photographers + 2 videographers", "10 hours of coverage", "Engagement session", "Gallery 4 wks · Film 6 wks"] },
];

export const ADDONS = [
  { slug: "engagement-session", name: "Engagement session", description: "A relaxed 90-minute session at a location you love.", price: 450, unit: "flat", applies: ["photo", "both"] },
  { slug: "second-photographer", name: "Second photographer", description: "An extra angle on every key moment.", price: 600, unit: "flat", applies: ["photo", "both"] },
  { slug: "additional-hour", name: "Additional hour", description: "Extend coverage for the whole team.", price: 350, unit: "hour", applies: ["photo", "video", "both"] },
  { slug: "drone-coverage", name: "Drone coverage", description: "FAA-certified aerials of your venue and ceremony.", price: 500, unit: "flat", applies: ["video", "both"] },
  { slug: "highlight-video", name: "Highlight video", description: "A 3-minute highlight film from a solo videographer.", price: 1200, unit: "flat", applies: ["photo"] },
  { slug: "content-creator", name: "Content creator", description: "A dedicated creator for phone-shot reels, behind-the-scenes and a same-day teaser for your socials.", price: 900, unit: "flat", applies: ["photo", "video", "both"] },
  { slug: "full-ceremony-video", name: "Full ceremony video", description: "Multi-camera edit of the entire ceremony with clean audio.", price: 650, unit: "flat", applies: ["video", "both"] },
  { slug: "reception-coverage", name: "Extended reception coverage", description: "Two more hours of party, exit and late-night moments.", price: 700, unit: "flat", applies: ["photo", "video", "both"] },
  { slug: "heirloom-album", name: "Heirloom album", description: "A 10×10 lay-flat linen album, 30 spreads.", price: 900, unit: "flat", applies: ["photo", "both"] },
  { slug: "rehearsal-dinner", name: "Rehearsal dinner", description: "Two hours of coverage the night before.", price: 800, unit: "flat", applies: ["photo", "video", "both"] },
  { slug: "express-delivery", name: "Express delivery", description: "Receive your gallery or film in half the time.", price: 400, unit: "flat", applies: ["photo", "video", "both"] },
] as const;

export const IMG = {
  hero: "photo-1519741497674-611481863552",
  rings: "photo-1606800052052-a08af7148866",
  hands: "photo-1465495976277-4387d4b0b4c6",
  chairs: "photo-1522673607200-164d1b6ce486",
  confetti: "photo-1583939003579-730e3918a45a",
  bouquet: "photo-1525258946800-98cfd641d0de",
  lakeside: "photo-1591604466107-ec97de577aff",
  veilBW: "photo-1460978812857-470ed1c77af0",
  mountain: "photo-1532712938310-34cb3982ef74",
  beach: "photo-1537633552985-df8429e8048b",
  sign: "photo-1507504031003-b417219a0fde",
  bouquetHold: "photo-1494955870715-979ca4f13bf0",
  tables: "photo-1519225421980-715cb0215aed",
  arch: "photo-1529636798458-92182e662485",
  handsHeld: "photo-1520854221256-17451cc331bf",
  aisle: "photo-1469371670807-013ccf25f16a",
  ringsFloral: "photo-1515934751635-c81c6bc9a2d8",
  ringHand: "photo-1545232979-8bf68ee9b1af",
} as const;

export const AVATAR = {
  w1: "photo-1438761681033-6461ffad8d80",
  m1: "photo-1500648767791-00dcc994a43e",
  m2: "photo-1507003211169-0a1dd7228f2d",
  w2: "photo-1494790108377-be9c29b29330",
  m3: "photo-1472099645785-5658abf4ff4e",
  w3: "photo-1544005313-94ddf0286df2",
} as const;

export const unsplash = (id: string, w = 1200, h?: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ""}&q=75`;
