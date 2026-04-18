import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import { readFile } from "fs/promises";
import { join } from "path";
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

export async function GET() {
  const cookieStore = await cookies();
  const session = await getIronSession<CaptchaSession>(cookieStore, captchaSessionOptions());

  const { questions, current = 0 } = session;
  if (!questions?.length) {
    return new Response("No active challenge", { status: 404 });
  }

  const imageName = questions[current].image;
  // Defence in depth: only accept `\d+\.jpg` — keeps a compromised session
  // from escaping the images dir via traversal.
  if (!/^\d+\.jpg$/.test(imageName)) {
    return new Response("Invalid image", { status: 400 });
  }
  const filePath = join(process.cwd(), "lib", "captcha", "images", imageName);

  try {
    const buffer = await readFile(filePath);
    return new Response(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}
