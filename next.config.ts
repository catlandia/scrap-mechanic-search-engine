import type { NextConfig } from "next";

// Baked into the client bundle so DeployBanner can tell which deployment it
// was loaded from. Compared against the serving deployment's SHA returned
// by /api/deploy-announcement to avoid reloading before Vercel has actually
// swapped traffic to the new bundle. Vercel exposes VERCEL_GIT_COMMIT_SHA
// automatically on all deployments; falls back to a per-process id for
// local dev so the two sides always match and no reload fires.
const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ?? `dev-${process.pid}`;

const config: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
  images: {
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
