/** Shared form checks, used in the browser for instant feedback and again on the server. */

/** Practical email check: one @, no spaces, a dot in the domain and a 2+ letter ending. */
export const EMAIL_RE = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-z]{2,}$/i;

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Enter your email address";
  if (v.length > 254 || !EMAIL_RE.test(v)) return "Enter a valid email address, like name@example.com";
  return null;
}

const DOMAIN_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com", "gmai.com": "gmail.com", "gmal.com": "gmail.com", "gamil.com": "gmail.com", "gmail.co": "gmail.com", "gmail.con": "gmail.com", "gnail.com": "gmail.com",
  "hotmial.com": "hotmail.com", "hotmai.com": "hotmail.com", "hotmail.co": "hotmail.com",
  "yahooo.com": "yahoo.com", "yaho.com": "yahoo.com", "yahoo.co": "yahoo.com",
  "outlok.com": "outlook.com", "outllok.com": "outlook.com", "outlook.co": "outlook.com",
  "icloud.co": "icloud.com", "iclod.com": "icloud.com", "icoud.com": "icloud.com",
};
/** "sarah@gmial.com" → "sarah@gmail.com" (common typos only), otherwise null. */
export function emailSuggestion(value: string): string | null {
  const v = value.trim().toLowerCase();
  const at = v.lastIndexOf("@");
  if (at < 1) return null;
  const fix = DOMAIN_FIXES[v.slice(at + 1)];
  return fix ? `${v.slice(0, at)}@${fix}` : null;
}

export function confirmError(password: string, confirm: string): string | null {
  if (!confirm) return "Re-enter your password";
  return password === confirm ? null : "Passwords don't match";
}
