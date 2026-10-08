import "server-only";

/**
 * Minimal Dropbox API client for the company footage account.
 *
 * Auth: a long-lived refresh token (from `npx tsx scripts/dropbox-auth.ts`) is exchanged for
 * short-lived (4h) access tokens. The full-scope token never leaves the server. For large browser
 * uploads we mint a separate token narrowed to `files.content.write`, so whoever holds it can add
 * files but can't list or download anyone's footage.
 *
 * Env: DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, optional DROPBOX_ROOT (default "/Weddings").
 */
const API = "https://api.dropboxapi.com/2";
const TOKEN_URL = "https://api.dropboxapi.com/oauth2/token";

export type DropboxConfig = { appKey: string; appSecret: string; refreshToken: string; root: string };

export function dropboxConfig(env: Record<string, string | undefined> = process.env): DropboxConfig | null {
  const { DROPBOX_APP_KEY, DROPBOX_APP_SECRET, DROPBOX_REFRESH_TOKEN, DROPBOX_ROOT } = env;
  if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET || !DROPBOX_REFRESH_TOKEN) return null;
  const root = "/" + (DROPBOX_ROOT ?? "Weddings").replace(/^\/+|\/+$/g, "");
  return { appKey: DROPBOX_APP_KEY, appSecret: DROPBOX_APP_SECRET, refreshToken: DROPBOX_REFRESH_TOKEN, root: root === "/" ? "" : root };
}

export class DropboxError extends Error {
  constructor(message: string, public status: number, public tag: string | null, public body: unknown) { super(message); }
}

export { headerJson } from "./dropbox-upload";

/** Makes a single folder/file name safe for Dropbox and readable for editors. */
export function safeName(s: string, max = 80) {
  const cleaned = s.normalize("NFC").replace(/\s*\/\s*/g, " - ").replace(/[\\:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim().replace(/[. ]+$/, "");
  return (cleaned || "untitled").slice(0, max).trim();
}

type Fetch = typeof fetch;
type Cached = { token: string; expires: number };

export class DropboxClient {
  private cache = new Map<string, Cached>();
  constructor(public cfg: DropboxConfig, private fetcher: Fetch = (...a) => fetch(...a)) {}

  /** Short-lived access token. `scope` narrows it (Dropbox allows a subset of the app's scopes on refresh). */
  async accessToken(scope?: string): Promise<{ token: string; expiresAt: number }> {
    const key = scope ?? "*";
    const hit = this.cache.get(key);
    if (hit && hit.expires - Date.now() > 10 * 60_000) return { token: hit.token, expiresAt: hit.expires };
    const body = new URLSearchParams({ grant_type: "refresh_token", refresh_token: this.cfg.refreshToken, client_id: this.cfg.appKey, client_secret: this.cfg.appSecret });
    if (scope) body.set("scope", scope);
    const res = await this.fetcher(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string; error?: string };
    if (!res.ok || !json.access_token) throw new DropboxError(`Dropbox sign-in failed: ${json.error_description ?? json.error ?? res.status}`, res.status, json.error ?? null, json);
    const expires = Date.now() + (json.expires_in ?? 14400) * 1000;
    this.cache.set(key, { token: json.access_token, expires });
    return { token: json.access_token, expiresAt: expires };
  }

  /** RPC-style call (JSON in, JSON out). */
  async rpc<T>(endpoint: string, arg: unknown): Promise<T> {
    const { token } = await this.accessToken();
    const res = await this.fetcher(`${API}/${endpoint}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(arg) });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* plain-text error */ }
    if (!res.ok) {
      const summary = (json as { error_summary?: string } | null)?.error_summary ?? text.slice(0, 200);
      const tag = summary?.split("/")[0] ?? null;
      throw new DropboxError(`Dropbox ${endpoint} failed: ${summary || res.status}`, res.status, tag, json);
    }
    return json as T;
  }

  /** One-shot upload URL for files ≤150 MB; valid 4 hours, no token needed by the browser. */
  async temporaryUploadLink(path: string) {
    const r = await this.rpc<{ link: string }>("files/get_temporary_upload_link", {
      commit_info: { path, mode: "add", autorename: false, mute: true, strict_conflict: false }, duration: 14400,
    });
    return r.link;
  }

  /** Metadata for a path, or null when it doesn't exist. */
  async metadata(path: string): Promise<{ ".tag": string; path_display: string; size?: number } | null> {
    try {
      return await this.rpc("files/get_metadata", { path });
    } catch (e) {
      if (e instanceof DropboxError && e.status === 409 && /not_found/.test(String((e.body as { error_summary?: string })?.error_summary ?? ""))) return null;
      throw e;
    }
  }

  async exists(path: string) { return (await this.metadata(path)) !== null; }

  async temporaryLink(path: string) {
    const r = await this.rpc<{ link: string }>("files/get_temporary_link", { path });
    return r.link;
  }

  async move(from: string, to: string) {
    const r = await this.rpc<{ metadata: { path_display: string } }>("files/move_v2", { from_path: from, to_path: to, autorename: true, allow_ownership_transfer: false });
    return r.metadata.path_display;
  }
}

let client: DropboxClient | null | undefined;
export function dropbox(): DropboxClient | null {
  if (client !== undefined) return client;
  const cfg = dropboxConfig();
  client = cfg ? new DropboxClient(cfg) : null;
  return client;
}
