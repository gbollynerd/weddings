// Pure pricing helpers shared by the booking UI and the server.

export const DEPOSIT_RATE = 0.3;

export function marketPrice(base: number, multiplier: number) {
  return Math.round((base * multiplier) / 50) * 50;
}

export type AddonLine = { slug: string; name: string; price: number; unit: string; quantity: number };

export function quote(opts: { packageBase: number; multiplier: number; addons: AddonLine[] }) {
  const packagePrice = marketPrice(opts.packageBase, opts.multiplier);
  const addonsTotal = opts.addons.reduce((s, a) => s + marketPrice(a.price, opts.multiplier) * Math.max(1, a.quantity), 0);
  const total = packagePrice + addonsTotal;
  const deposit = Math.round((total * DEPOSIT_RATE) / 10) * 10;
  return { packagePrice, addonsTotal, total, deposit, balance: total - deposit };
}

/** Team compensation for a slot. */
export function compensationFor(role: string, hours: number) {
  const hourly: Record<string, number> = { lead_photo: 115, second_photo: 60, lead_video: 125, second_video: 70 };
  return Math.round(((hourly[role] ?? 80) * hours) / 25) * 25;
}

export const ROLE_LABEL: Record<string, string> = {
  lead_photo: "Lead Photographer",
  second_photo: "Second Photographer",
  lead_video: "Lead Videographer",
  second_video: "Second Videographer",
};

export function money(n: number, opts: { cents?: boolean } = {}) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}
