import "server-only";

import { dropbox, type DropboxClient } from "./dropbox";

/**
 * Storage abstraction. Files go straight from the browser to the provider, so large videos never
 * pass through the app server. The app stays the interface; the provider only holds the files.
 *
 *  - DropboxStorage:  used when DROPBOX_APP_KEY + DROPBOX_APP_SECRET + DROPBOX_REFRESH_TOKEN are set.
 *                     Files land in the company Dropbox in a readable folder per wedding.
 *  - SupabaseStorage: used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *  - MockStorage:     simulates uploads (progress, failures, retries) for demos and local dev.
 */
export type UploadTarget =
  | { mode: "put"; url: string; headers: Record<string, string> }
  /** Dropbox temporary upload link (files ≤ 140 MB): one POST, no token in the browser. */
  | { mode: "post"; url: string; headers: Record<string, string> }
  /** Dropbox chunked upload session for big files, with a short-lived write-only token. */
  | { mode: "dropbox-session"; token: string; path: string; chunkSize: number; expiresAt: number }
  | { mode: "simulate" };

export interface StorageProvider {
  name: string;
  /** Human label for the upload screen. */
  label: string;
  /** True when keys should be readable folder paths (Dropbox) rather than opaque ids. */
  readablePaths: boolean;
  createUploadTarget(key: string, contentType: string, size?: number): Promise<UploadTarget>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string | null>;
  /** Confirms the file really arrived (and is the right size). Providers without a cheap check return ok. */
  verify(key: string, size: number): Promise<{ ok: boolean; error?: string }>;
  exists(key: string): Promise<boolean>;
  /** Moves a file (e.g. after re-tagging); returns the new key. */
  move(from: string, to: string): Promise<string>;
}

/** Dropbox's single-request upload limit is 150 MB; stay safely under it. */
export const DROPBOX_SIMPLE_LIMIT = 140 * 1024 * 1024;
export const DROPBOX_CHUNK = 32 * 1024 * 1024;

class DropboxStorage implements StorageProvider {
  name = "dropbox";
  label = "Visual Weddings Dropbox";
  readablePaths = true;
  constructor(private db: DropboxClient) {}
  async createUploadTarget(key: string, contentType: string, size = 0): Promise<UploadTarget> {
    if (size <= DROPBOX_SIMPLE_LIMIT) {
      const url = await this.db.temporaryUploadLink(key);
      return { mode: "post", url, headers: { "Content-Type": "application/octet-stream" } };
    }
    const { token, expiresAt } = await this.db.accessToken("files.content.write");
    return { mode: "dropbox-session", token, path: key, chunkSize: DROPBOX_CHUNK, expiresAt };
  }
  async getDownloadUrl(key: string) {
    try { return await this.db.temporaryLink(key); } catch { return null; }
  }
  async verify(key: string, size: number) {
    const m = await this.db.metadata(key);
    if (!m || m[".tag"] !== "file") return { ok: false, error: "The file didn't reach Dropbox — please retry." };
    if (typeof m.size === "number" && m.size !== size) return { ok: false, error: `Dropbox has ${m.size} bytes but the file is ${size} bytes — please retry.` };
    return { ok: true };
  }
  exists(key: string) { return this.db.exists(key); }
  move(from: string, to: string) { return this.db.move(from, to); }
}

class MockStorage implements StorageProvider {
  name = "mock";
  label = "Demo storage — transfers are simulated";
  readablePaths = false;
  async createUploadTarget(): Promise<UploadTarget> {
    return { mode: "simulate" };
  }
  async getDownloadUrl() {
    return null;
  }
  async verify() { return { ok: true }; }
  async exists() { return false; }
  async move(_from: string, to: string) { return to; }
}

class SupabaseStorage implements StorageProvider {
  name = "supabase";
  label = "Supabase Storage (private bucket)";
  readablePaths = false;
  constructor(private url: string, private key: string, private bucket: string) {}
  private headers() {
    return { Authorization: `Bearer ${this.key}`, apikey: this.key, "Content-Type": "application/json" };
  }
  async ensureBucket() {
    await fetch(`${this.url}/storage/v1/bucket`, { method: "POST", headers: this.headers(), body: JSON.stringify({ id: this.bucket, name: this.bucket, public: false }) }).catch(() => {});
  }
  async createUploadTarget(key: string, contentType: string): Promise<UploadTarget> {
    let res = await fetch(`${this.url}/storage/v1/object/upload/sign/${this.bucket}/${key}`, { method: "POST", headers: this.headers() });
    if (res.status === 404 || res.status === 400) {
      await this.ensureBucket();
      res = await fetch(`${this.url}/storage/v1/object/upload/sign/${this.bucket}/${key}`, { method: "POST", headers: this.headers() });
    }
    if (!res.ok) throw new Error(`Storage error ${res.status}`);
    const { url } = (await res.json()) as { url: string };
    return { mode: "put", url: `${this.url}/storage/v1${url}`, headers: { "Content-Type": contentType || "application/octet-stream", "x-upsert": "true" } };
  }
  async getDownloadUrl(key: string, expiresIn = 3600) {
    const res = await fetch(`${this.url}/storage/v1/object/sign/${this.bucket}/${key}`, { method: "POST", headers: this.headers(), body: JSON.stringify({ expiresIn }) });
    if (!res.ok) return null;
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${this.url}/storage/v1${signedURL}`;
  }
  async verify() { return { ok: true }; }
  async exists() { return false; }
  async move(from: string) { return from; }
}

let provider: StorageProvider | null = null;
export function storage(): StorageProvider {
  if (provider) return provider;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
  const dbx = dropbox();
  provider = dbx ? new DropboxStorage(dbx)
    : SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseStorage(SUPABASE_URL.replace(/\/$/, ""), SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET || "visual-weddings")
    : new MockStorage();
  return provider;
}

export function storageKey(scope: string, filename: string) {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-120);
  return `${scope}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
