import "server-only";

/**
 * Storage abstraction. Files go straight from the browser to the provider using a short-lived
 * signed upload URL, so large videos never pass through the app server.
 *
 *  - SupabaseStorage: used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
 *  - MockStorage:     simulates uploads (progress, failures, retries) for demos and local dev.
 *
 * Add S3 / Cloudflare R2 by implementing StorageProvider with presigned PUT URLs.
 */
export type UploadTarget =
  | { mode: "put"; url: string; headers: Record<string, string> }
  | { mode: "simulate" };

export interface StorageProvider {
  name: string;
  createUploadTarget(key: string, contentType: string): Promise<UploadTarget>;
  getDownloadUrl(key: string, expiresIn?: number): Promise<string | null>;
}

class MockStorage implements StorageProvider {
  name = "mock";
  async createUploadTarget(): Promise<UploadTarget> {
    return { mode: "simulate" };
  }
  async getDownloadUrl() {
    return null;
  }
}

class SupabaseStorage implements StorageProvider {
  name = "supabase";
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
}

let provider: StorageProvider | null = null;
export function storage(): StorageProvider {
  if (provider) return provider;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
  provider = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? new SupabaseStorage(SUPABASE_URL.replace(/\/$/, ""), SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET || "visual-weddings")
    : new MockStorage();
  return provider;
}

export function storageKey(scope: string, filename: string) {
  const safe = filename.replace(/[^\w.\-]+/g, "_").slice(-120);
  return `${scope}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}-${safe}`;
}
