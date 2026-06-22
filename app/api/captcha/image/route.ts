import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { CaptchaQuestion } from "@/lib/captcha/questions";
import { getCloudflareContext } from "@opennextjs/cloudflare";
// Small `name -> content-hashed filename` map (e.g. "01.jpg" -> "<sha256>.jpg").
// The hashed JPEGs live in /public/_captcha and are served as static assets, but
// we only ever fetch them server-side through this session-gated route so the
// image set stays unenumerable. Relative path (no `@/` alias) for the same
// build-tracing reason as the rest of the captcha code.
import manifest from "../../../../lib/captcha/_images.manifest.json";

type CaptchaSession = {
  questions?: CaptchaQuestion[];
  current?: number;
  streak?: number;
};

const IMAGE_HASHES = manifest as Record<string, string>;

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

// Serve the bytes for `imageName` (already validated as `\d+\.jpg`) without
// ever exposing a stable per-image URL to the client. On Cloudflare the bytes
// come from the ASSETS binding keyed by the unguessable content hash; under
// `next dev` (no binding) we read the original file straight off disk.
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
  const session = await getIronSession<CaptchaSession>(
    cookieStore,
    captchaSessionOptions(),
  );

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

  return serveImage(imageName, req);
}
