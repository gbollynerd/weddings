import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict, parseISO, differenceInCalendarDays } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Display timezone. Server (UTC) and browser render identically, avoiding hydration drift. */
export const APP_TZ = "America/New_York";
export function toDate(d: string | Date): Date {
  if (typeof d === "string" && d.length === 10) return parseISO(d + "T12:00:00");
  return new TZDate(new Date(d).getTime(), APP_TZ);
}
export const fmtDate = (d: string | Date, f = "MMM d, yyyy") => format(toDate(d), f);
export const fmtLong = (d: string | Date) => format(toDate(d), "EEEE, MMMM d, yyyy");
export const fmtTime = (t: string | null | undefined) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${ampm}`;
};
/** Relative time. Sub-minute values collapse to "just now" so server and browser renders agree (no hydration drift). */
export const ago = (d: string | Date) => {
  const x = toDate(d);
  if (Math.abs(Date.now() - x.getTime()) < 60_000) return "just now";
  return formatDistanceToNowStrict(x, { addSuffix: true, roundingMethod: "floor" });
};
export const daysUntil = (d: string | Date) => differenceInCalendarDays(toDate(d), new Date());
export function chatTime(d: string | Date) {
  const x = toDate(d);
  const now = new TZDate(Date.now(), APP_TZ);
  const diff = differenceInCalendarDays(now, x);
  if (diff === 0) return format(x, "h:mm a");
  if (diff === 1) return "Yesterday";
  if (diff < 7) return format(x, "EEE");
  return format(x, "MMM d");
}
export function bytes(n: number) {
  if (!n) return "0 B";
  const u = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i >= 2 ? 1 : 0)} ${u[i]}`;
}
export function duration(sec?: number | null) {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
export const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
