import "server-only";

/**
 * Payment provider abstraction. The mock provider behaves like Stripe's test mode so the full booking
 * flow works without credentials. To go live, implement `PaymentProvider` with Stripe PaymentIntents
 * (card details are then collected by Stripe Elements and never reach this server).
 */
export type CardInput = { number: string; exp: string; cvc: string; name: string; zip: string };
export type ChargeResult = { ok: true; reference: string; brand: string; last4: string } | { ok: false; code: string; message: string };

export interface PaymentProvider {
  name: string;
  charge(amountUsd: number, card: CardInput, description: string): Promise<ChargeResult>;
}

export function luhn(num: string) {
  const d = num.replace(/\D/g, "");
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return d.length >= 13 && sum % 10 === 0;
}
export function cardBrand(num: string) {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^3[47]/.test(d)) return "Amex";
  if (/^6(011|5)/.test(d)) return "Discover";
  return "Card";
}

class MockPaymentProvider implements PaymentProvider {
  name = "mock";
  async charge(amount: number, card: CardInput): Promise<ChargeResult> {
    await new Promise((r) => setTimeout(r, 900));
    const num = card.number.replace(/\D/g, "");
    if (!luhn(num)) return { ok: false, code: "invalid_number", message: "Your card number is invalid." };
    const [mm, yy] = card.exp.split("/").map((x) => Number(x.trim()));
    const exp = new Date(2000 + yy, mm, 0, 23, 59);
    if (!mm || mm > 12 || exp < new Date()) return { ok: false, code: "expired_card", message: "Your card has expired." };
    if (!/^\d{3,4}$/.test(card.cvc)) return { ok: false, code: "invalid_cvc", message: "Your card's security code is invalid." };
    if (num === "4000000000000002") return { ok: false, code: "card_declined", message: "Your card was declined. Try a different card." };
    if (num === "4000000000009995") return { ok: false, code: "insufficient_funds", message: "Your card has insufficient funds." };
    if (amount <= 0) return { ok: false, code: "amount", message: "Invalid amount." };
    return { ok: true, reference: "mock_pi_" + Math.random().toString(36).slice(2, 12), brand: cardBrand(num), last4: num.slice(-4) };
  }
}

export const payments: PaymentProvider = new MockPaymentProvider();
