import type { NextConfig } from "next";

const config: NextConfig = {
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
  // Captcha character images live outside `public/` so they have no direct URL.
  // Vercel's output tracer needs to be told to bundle them with the proxy
  // route that serves them.
  outputFileTracingIncludes: {
    "/api/captcha/image": ["./lib/captcha/images/**/*.jpg"],
  },
};

export default config;
