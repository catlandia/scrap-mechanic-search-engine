import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { CaptchaQuestion } from "@/lib/captcha/questions";
// Same base64 manifest as the login gate — image pool is shared; only the
// session cookie differs. Relative path for the same tracing reason noted
// in the sibling route (alias doesn't round-trip through webpack rewrite).
import manifest from "../../../../../lib/captcha/_images.generated.json";

type GameSession = {
  questions?: CaptchaQuestion[];
  current?: number;
};

function gameSessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) throw new Error("SESSION_SECRET missing");
  return {
    cookieName: "smse_scrapcha_game",
    password,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 24,
    },
  };
}

const CAPTCHA_IMAGES = manifest as Record<string, string>;

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<GameSession>(cookieStore, gameSessionOptions());

  const { questions, current = 0 } = session;
  if (!questions?.length) {
    return new Response("No active round", { status: 404 });
  }

  const imageName = questions[current].image;
  if (!/^\d+\.jpg$/.test(imageName)) {
    return new Response("Invalid image", { status: 400 });
  }

  const base64 = CAPTCHA_IMAGES[imageName];
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
