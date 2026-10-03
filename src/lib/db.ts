import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

declare global {
  // eslint-disable-next-line no-var
  var __vwSql: Sql | undefined;
}

/** How long a single query may run before we abandon it and reconnect. */
const QUERY_TIMEOUT_MS = 12_000;

function create(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env.local.");
  const isLocal = /localhost|127\.0\.0\.1/.test(url);
  return postgres(url, {
    ssl: isLocal ? false : "require",
    max: isLocal ? 10 : 5,
    // Supabase's transaction pooler (Supavisor, :6543) can stall when several queries are
    // pipelined on one connection, so send one query at a time per connection.
    ...({ max_pipeline: isLocal ? 100 : 1 } as object), // supported at runtime, missing from the type definitions
    // Serverless functions are frozen between requests, which can leave sockets
    // silently dead. Keep connections short-lived and fail fast instead of hanging.
    idle_timeout: isLocal ? 20 : 5,
    max_lifetime: isLocal ? 60 * 30 : 60,
    connect_timeout: 10,
    keep_alive: 15,
    prepare: false, // required for Supabase transaction pooler (port 6543)
    transform: { undefined: null },
    types: { bigint: postgres.BigInt },
  });
}

let current: Sql = globalThis.__vwSql ?? create();
if (process.env.NODE_ENV !== "production") globalThis.__vwSql = current;

function resetPool(stale: Sql) {
  if (current !== stale) return; // already replaced by another request
  current = create();
  if (process.env.NODE_ENV !== "production") globalThis.__vwSql = current;
  stale.end({ timeout: 5 }).catch(() => {}); // let in-flight queries on the old pool finish
}

/* ── Serverless connection lifecycle ──────────────────────────────────────────────
 * Vercel suspends function instances between requests. A pooled socket that sits idle
 * through a suspension can come back silently dead, and the next query on it hangs.
 * (Vercel's attachDatabasePool() solves this for `pg`, but doesn't support postgres.js.)
 * So once the instance goes quiet, we close the pool — and ask Vercel to keep the
 * instance alive (waitUntil) until that's done. The next request opens fresh connections.
 */
const CLOSE_IDLE = process.env.VW_CLOSE_IDLE ? process.env.VW_CLOSE_IDLE === "1" : !!process.env.VERCEL;
const IDLE_CLOSE_MS = 250;
let inflight = 0;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

function waitUntil(p: Promise<unknown>) {
  const ctx = (globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[Symbol.for("@vercel/request-context")];
  try { ctx?.get?.()?.waitUntil?.(p); } catch {}
}
function begin() {
  inflight++;
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
}
function finish() {
  inflight = Math.max(0, inflight - 1);
  if (!CLOSE_IDLE || inflight > 0) return;
  if (idleTimer) clearTimeout(idleTimer);
  let release!: () => void;
  const kept = new Promise<void>((r) => (release = r));
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (inflight === 0) {
      const old = current;
      current = create();
      old.end({ timeout: 1 }).catch(() => {}).finally(release);
    } else release();
  }, IDLE_CLOSE_MS);
  waitUntil(kept);
}

/**
 * `sql` behaves exactly like a postgres.js instance, but every awaited top-level
 * query is bounded by QUERY_TIMEOUT_MS. On timeout the query is cancelled, the pool
 * is replaced and the query is retried once on a fresh connection.
 */
export const sql = new Proxy(function () {} as unknown as Sql, {
  apply(_t, _this, args: unknown[]) {
    const pool = current;
    const q = (pool as unknown as (...a: unknown[]) => postgres.PendingQuery<postgres.Row[]>)(...args);
    // Fragments (sql`...` nested inside another query, sql(array) helpers) are never awaited,
    // so only patch `then` — nesting keeps working untouched.
    if (!q || typeof (q as { then?: unknown }).then !== "function") return q;
    const originalThen = q.then.bind(q);
    let settled: Promise<unknown> | null = null;
    const run = (): Promise<unknown> => {
      if (settled) return settled;
      begin();
      settled = new Promise((resolve, reject) => {
        let done = false;
        const timer = setTimeout(() => {
          if (done) return;
          done = true;
          try { (q as { cancel?: () => void }).cancel?.(); } catch {}
          resetPool(pool);
          // one retry on a fresh pool
          (current as unknown as (...a: unknown[]) => Promise<unknown>)(...args).then(resolve, reject);
        }, QUERY_TIMEOUT_MS);
        originalThen(
          (v: unknown) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } },
          (e: unknown) => {
            if (done) return;
            done = true; clearTimeout(timer);
            const code = (e as { code?: string })?.code;
            if (code === "CONNECTION_CLOSED" || code === "CONNECTION_ENDED" || code === "CONNECTION_DESTROYED" || code === "CONNECT_TIMEOUT" || code === "ECONNRESET") {
              resetPool(pool);
              (current as unknown as (...a: unknown[]) => Promise<unknown>)(...args).then(resolve, reject);
            } else reject(e);
          },
        );
      });
      settled.then(finish, finish);
      return settled;
    };
    (q as { then: unknown }).then = (onF?: (v: unknown) => unknown, onR?: (e: unknown) => unknown) => run().then(onF, onR);
    (q as { catch: unknown }).catch = (onR?: (e: unknown) => unknown) => run().catch(onR);
    (q as { finally: unknown }).finally = (f?: () => void) => run().finally(f);
    return q;
  },
  get(_t, prop) {
    if (prop === "begin") {
      return async (...a: unknown[]) => {
        begin();
        try { return await (current.begin as (...x: unknown[]) => Promise<unknown>)(...a); } finally { finish(); }
      };
    }
    const v = (current as unknown as Record<string | symbol, unknown>)[prop];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(current) : v;
  },
}) as Sql;

/** postgres returns numerics as strings; this helper normalises rows. */
export function num(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return typeof v === "number" ? v : Number(v);
}
