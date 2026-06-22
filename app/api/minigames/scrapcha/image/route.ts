import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { CaptchaQuestion } from "@/lib/captcha/questions";
import { getCloudflareContext } from "@opennextjs/cloudflare";
// Shares the captcha image pool; see app/api/captcha/image/route.ts for how the
// hashed static assets + gated proxy keep the set unenumerable. Only the
// session cookie differs.
import manifest from "../../../../../lib/captcha/_images.manifest.json";

type GameSession = {
  questions?: CaptchaQuestion[];
  current?: number;
};

const IMAGE_HASHES = manifest as Record<string, string>;

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

async function serveImage(imageName: string, req: Request): Promise<Response> {
  const hashed = IMAGE_HASHES[imageName];
  try {
    const { env } = getCloudflareContext();
    const assets = (env as { ASSETS?: { fetch: (input: URL) => Promise<Response> } })
      .ASSETS;
    if (assets && hashed) {
      const res = await assets.fetch(new URL(`/_captcha/${hashed}`, req.url));
      if (res.ok) {
        return new Response(res.body, {
          headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
        });
      }
    }
  } catch {
    // Not running on Cloudflare (local dev) — fall through to a disk read.
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const buf = await readFile(join(process.cwd(), "lib/captcha/images", imageName));
    return new Response(new Uint8Array(buf), {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Image not found", { status: 404 });
  }
}

export async function GET(req: Request) {
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

  return serveImage(imageName, req);
}
