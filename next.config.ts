import type { NextConfig } from "next";

// Baked into the client bundle so DeployBanner can tell which deployment it
// was loaded from. Compared against the serving deployment's SHA returned by
// /api/deploy-announcement to avoid reloading before the new bundle is
// actually live. VERCEL_GIT_COMMIT_SHA is set automatically on Vercel;
// CF_BUILD_SHA is the Cloudflare equivalent we inject at build time (see
// scripts/deploy.ts). Falls back to a per-process id for local dev so the
// two sides always match and no reload fires.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ??
  process.env.CF_BUILD_SHA ??
  `dev-${process.pid}`;

// Master switch for the deploy countdown banner and, more importantly, its
// 8s-per-tab poll loop — the thing that pinned Neon's compute at 99.8% active
// and blew the compute quota in August 2026. Declared here (rather than read
// straight off process.env in the component) because an *unset* NEXT_PUBLIC_
// var is not inlined into the client bundle: it falls through to a `process`
// shim that always yields undefined, which happens to read as "off" but would
// also silently ignore someone setting it to "on". Normalising it here means
// the literal string is always baked in and the flag works in both directions.
const DEPLOY_BANNER =
  process.env.NEXT_PUBLIC_DEPLOY_BANNER === "on" ? "on" : "off";

const config: NextConfig = {
  // postgres.js opens a real TCP socket, so it must stay an external require
  // rather than being bundled and traced for browser/edge polyfills. Without
  // this the server build tries to resolve 'net'/'tls'/'fs' and fails.
  serverExternalPackages: ["postgres"],
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
    NEXT_PUBLIC_DEPLOY_BANNER: DEPLOY_BANNER,
  },
  images: {
    // Cloudflare Workers has no built-in next/image optimizer on the free
    // tier, so serve images unoptimized (pass-through). Steam already serves
    // reasonably-sized thumbnails; remotePatterns still gates which hosts
    // <Image> is allowed to load.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.steamusercontent.com" },
      { protocol: "https", hostname: "steamuserimages-a.akamaihd.net" },
      { protocol: "https", hostname: "shared.akamai.steamstatic.com" },
      { protocol: "https", hostname: "steamcdn-a.akamaihd.net" },
      { protocol: "https", hostname: "avatars.steamstatic.com" },
      { protocol: "https", hostname: "avatars.akamai.steamstatic.com" },
    ],
  },
};

export default config;
