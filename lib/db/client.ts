import { cache } from "react";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

/**
 * Postgres client.
 *
 * Moved off Neon on 2026-08-22. Neon's free tier meters *compute time*, and a
 * public site queried around the clock keeps the compute from ever reaching
 * its autosuspend — the quota blew and every query returned HTTP 402 for nine
 * days, which is what took Steam sign-in down with it. Supabase's free tier
 * has no equivalent compute-hour meter, so that failure mode does not exist.
 *
 * ── Why the Worker connects through Hyperdrive ─────────────────────────────
 * Cloudflare Workers cannot hold a raw Postgres socket across requests, and
 * every fresh connection to Supabase costs a full TCP+TLS handshake over the
 * public internet — which the runtime bills as a subrequest. The free plan
 * allows 50 subrequests per invocation, so query-heavy pages (a creation page,
 * a profile page) exhausted the budget and died with "Too many subrequests by
 * single Worker invocation" while lighter pages merely crawled at 3s+.
 *
 * Hyperdrive keeps the pool *outside* the Worker: the isolate connects to a
 * warm local endpoint instead of dialling eu-central-2 itself. Measured in
 * production, the same query path went from ~3,100ms to ~23ms.
 *
 * `HYPERDRIVE` is read straight off the Cloudflare context global rather than
 * by importing `@opennextjs/cloudflare`, so that CLI scripts run under plain
 * `tsx` — which have no Worker context — do not have to load that package at
 * all. They fall through to DATABASE_URL, as does `next dev`.
 *
 * ── Why the client is still per-request ────────────────────────────────────
 * Hyperdrive removes the handshake cost but not the rule that a socket dies
 * with its request. React's `cache()` gives every getDb() call inside one
 * render the same client, and the next request builds a fresh one. CLI scripts
 * have no request scope, so they keep a process-wide singleton.
 */

/** Set by the OpenNext worker entrypoint; absent under `tsx` and `next dev`. */
const CLOUDFLARE_CONTEXT = Symbol.for("__cloudflare-context__");

type HyperdriveBinding = { connectionString?: string };

function hyperdriveConnectionString(): string | null {
  const ctx = (
    globalThis as unknown as Record<
      symbol,
      { env?: { HYPERDRIVE?: HyperdriveBinding } } | undefined
    >
  )[CLOUDFLARE_CONTEXT];
  return ctx?.env?.HYPERDRIVE?.connectionString ?? null;
}

function buildDb() {
  const viaHyperdrive = hyperdriveConnectionString();
  const url = viaHyperdrive ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database connection available: the HYPERDRIVE binding is absent and " +
        "DATABASE_URL is not set. Copy .env.example to .env.local and fill in " +
        "your Postgres connection string.",
    );
  }

  const client = postgres(url, {
    // Supabase's pooler runs PgBouncer in transaction mode, which cannot hold
    // server-side prepared statements across a pooled connection. Hyperdrive
    // pools too, so this stays off on both paths.
    prepare: false,
    // One socket per request. Concurrent queries queue on it rather than
    // opening a second connection, since each new connection costs a
    // subrequest against the free plan's budget of 50.
    max: 1,
    idle_timeout: 10,
    connect_timeout: 15,
    // Hyperdrive terminates TLS to the origin itself and hands the Worker a
    // local, already-trusted endpoint — offering it a TLS handshake fails.
    // A direct connection to Supabase still requires one.
    ssl: viaHyperdrive ? false : "require",
  });

  return drizzle(client, { schema });
}

/** Memoised per request by React; a no-op outside a request scope. */
const getRequestDb = cache(buildDb);

let singleton: ReturnType<typeof buildDb> | null = null;

export function getDb() {
  // NEXT_RUNTIME is set inside the Next server runtimes and unset in plain
  // tsx scripts, which is exactly the line we want to branch on.
  if (process.env.NEXT_RUNTIME) return getRequestDb();
  if (!singleton) singleton = buildDb();
  return singleton;
}

export { schema };
