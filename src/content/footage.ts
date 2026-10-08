/**
 * Shared vocabulary for tagging footage. Used by the upload screen, the coordinator's footage view,
 * the Dropbox folder layout and (later) the editing pipeline — so keep values stable; labels can change.
 */
export type Moment = { value: string; label: string; hint?: string };

export const MOMENTS: Moment[] = [
  { value: "getting_ready", label: "Getting ready" },
  { value: "details", label: "Details & venue", hint: "Rings, dress, decor, venue exteriors" },
  { value: "first_look", label: "First look" },
  { value: "traditional", label: "Traditional ceremony", hint: "Engagement / introductions / cultural rites" },
  { value: "ceremony", label: "Ceremony", hint: "Processional → recessional; add markers for vows, rings, kiss" },
  { value: "family", label: "Family photos" },
  { value: "portraits", label: "Couple portraits" },
  { value: "cocktail", label: "Cocktail hour" },
  { value: "entrances", label: "Grand entrance" },
  { value: "first_dance", label: "First dance" },
  { value: "parent_dances", label: "Parent dances" },
  { value: "toasts", label: "Toasts & speeches" },
  { value: "cake", label: "Cake cutting" },
  { value: "money_spray", label: "Money spray" },
  { value: "party", label: "Dance floor" },
  { value: "send_off", label: "Send-off" },
  { value: "broll", label: "B-roll" },
  { value: "other", label: "Other" },
];
/** Photographers often dump a whole card at once, so photos may be tagged "whole day" and sorted by capture time later. */
export const MIXED: Moment = { value: "mixed", label: "Whole day / mixed" };
export const MOMENT_LABEL: Record<string, string> = Object.fromEntries([...MOMENTS, MIXED].map((m) => [m.value, m.label]));
export const momentLabel = (v: string | null | undefined) => (v ? MOMENT_LABEL[v] ?? v : "Untagged");
export const isMoment = (v: string, allowMixed: boolean) => MOMENTS.some((m) => m.value === v) || (allowMixed && v === MIXED.value);

/** Markers inside a clip can also point at these finer beats. */
export const MARKER_BEATS: Moment[] = [
  { value: "processional", label: "Processional" },
  { value: "vows", label: "Vows" },
  { value: "rings", label: "Ring exchange" },
  { value: "kiss", label: "Kiss" },
  { value: "recessional", label: "Recessional" },
  { value: "reaction", label: "Great reaction" },
  { value: "speech_start", label: "Speech starts" },
  { value: "highlight", label: "Highlight-worthy" },
  { value: "problem", label: "Problem (audio/focus)" },
];
export const BEAT_LABEL: Record<string, string> = Object.fromEntries([...MARKER_BEATS, ...MOMENTS].map((m) => [m.value, m.label]));

/** Which camera / recorder a file came from. Audio sources file under the "audio" category. */
export const SOURCES = {
  video: [
    { value: "a_cam", label: "A-cam" },
    { value: "b_cam", label: "B-cam" },
    { value: "c_cam", label: "C-cam" },
    { value: "drone", label: "Drone" },
    { value: "audio_partner", label: "Audio · lav on partner at altar" },
    { value: "audio_officiant", label: "Audio · lav on officiant" },
    { value: "audio_dj", label: "Audio · DJ / board recorder" },
    { value: "audio_other", label: "Audio · other recorder" },
  ],
  photo: [
    { value: "body_1", label: "Main body" },
    { value: "body_2", label: "Second body" },
  ],
  content: [
    { value: "phone_1", label: "Main phone" },
    { value: "phone_2", label: "Second phone" },
    { value: "content_camera", label: "Camera" },
    { value: "action_cam", label: "Action cam" },
  ],
} as const;
export const SOURCE_LABEL: Record<string, string> = Object.fromEntries([...SOURCES.video, ...SOURCES.photo, ...SOURCES.content].map((s) => [s.value, s.label]));
export const isAudioSource = (s: string | null | undefined) => !!s && s.startsWith("audio_");
export const isSource = (kind: "photo" | "video" | "content" | "document", v: string) => kind !== "document" && SOURCES[kind].some((s) => s.value === v);

/** Parses "1:02:03", "02:03", "2:03.5" or plain seconds into whole seconds. */
export function parseTimecode(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return Math.floor(Number(s));
  const m = s.match(/^(?:(\d{1,2}):)?(\d{1,2}):(\d{1,2})(?:[.;:](\d{1,2}))?$/);
  if (!m) return null;
  const [h, mi, se] = [Number(m[1] ?? 0), Number(m[2]), Number(m[3])];
  if (mi > 59 || se > 59) return null;
  return h * 3600 + mi * 60 + se;
}
export function formatTimecode(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
