import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { CaptchaQuestion } from "@/app/verify/actions";

type CaptchaSession = {
  questions?: CaptchaQuestion[];
  current?: number;
  streak?: number;
};

function captchaSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET missing");
  return {
    cookieName: "smse_captcha",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 30,
    },
  };
}

// The manifest is generated at build time by scripts/fetch-captcha-images.ts
// and is gitignored. Require it at runtime so typechecks still pass on a
// fresh clone that hasn't run the build yet; the catch serves a clear error
// instead of crashing.
function loadManifest(): Record<string, string> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@/lib/captcha/_images.generated.json") as Record<string, string>;
  } catch {
    return {};
  }
}

let cachedManifest: Record<string, string> | null = null;
function getManifest(): Record<string, string> {
  if (!cachedManifest) cachedManifest = loadManifest();
  return cachedManifest;
}

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<CaptchaSession>(cookieStore, captchaSessionOptions());

  const { questions, current = 0 } = session;
  if (!questions?.length) {
    return new Response("No active challenge", { status: 404 });
  }

  const imageName = questions[current].image;
  // Defence in depth: only accept `\d+\.jpg` — keeps a compromised session
  // from escaping the manifest via weird keys.
  if (!/^\d+\.jpg$/.test(imageName)) {
    return new Response("Invalid image", { status: 400 });
  }

  const manifest = getManifest();
  const base64 = manifest[imageName];
  if (!base64) {
    return new Response("Image not found", { status: 404 });
  }
  const buffer = Buffer.from(base64, "base64");
  return new Response(buffer, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
