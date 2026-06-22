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

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
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
