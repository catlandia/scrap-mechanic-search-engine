import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

// Downloads the captcha image set from a private GitHub repo before build.
// The images stay out of this repo so a cloner can't build a perceptual-hash
// cheat table against them — see docs/captcha.md threat model.

const IMAGES_DIR = path.resolve(process.cwd(), "lib/captcha/images");
const MANIFEST_PATH = path.resolve(
  process.cwd(),
  "lib/captcha/_images.manifest.json",
);
// Hashed copies live in /public so they're served as static assets (and kept
// out of the JS bundle). The content hash is unguessable and never exposed to
// the client — the gated route fetches them server-side — so the
// anti-enumeration threat model is preserved. See docs/captcha.md.
const PUBLIC_CAPTCHA_DIR = path.resolve(process.cwd(), "public/_captcha");
const EXPECTED_COUNT = 25;
const JPG = /^\d+\.jpg$/i;

async function countLocalImages(): Promise<number> {
  try {
    const files = await fs.readdir(IMAGES_DIR);
    return files.filter((f) => JPG.test(f)).length;
  } catch {
    return 0;
  }
}

async function main() {
  const token = process.env.CAPTCHA_IMAGES_TOKEN;
  const repo = process.env.CAPTCHA_IMAGES_REPO;
  const branch = process.env.CAPTCHA_IMAGES_BRANCH ?? "main";
  const repoPath = (process.env.CAPTCHA_IMAGES_PATH ?? "").replace(/^\/+|\/+$/g, "");

  if (!token || !repo) {
    // Dev escape hatch: if a full image set is already on disk (e.g., the
    // author copied them in manually), use them. Vercel builds won't hit
    // this branch because the repo is gitignored — the env vars must be set.
    const existing = await countLocalImages();
    if (existing >= EXPECTED_COUNT) {
      console.log(
        `[captcha] CAPTCHA_IMAGES_TOKEN not set; ${existing} local images already present — using them.`,
      );
      await writeManifestFromDisk();
      return;
    }
    console.error(
      "[captcha] CAPTCHA_IMAGES_TOKEN and CAPTCHA_IMAGES_REPO are required to fetch captcha images.",
    );
    console.error(
      "          Create a private GitHub repo, upload the 25 jpg files (01.jpg … 25.jpg),",
    );
    console.error(
      "          generate a fine-grained read-only PAT, and set both env vars in Vercel.",
    );
    console.error("          See docs/captcha.md.");
    process.exit(1);
  }

  console.log(`[captcha] Fetching images from ${repo}@${branch}…`);

  const listUrl = new URL(
    `https://api.github.com/repos/${repo}/contents/${repoPath}`,
  );
  listUrl.searchParams.set("ref", branch);
  const listRes = await fetch(listUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "scrap-mechanic-search-engine",
    },
  });
  if (!listRes.ok) {
    const body = await listRes.text().catch(() => "");
    throw new Error(
      `GitHub Contents API listing failed: ${listRes.status} ${listRes.statusText}\n${body}`,
    );
  }
  const entries = (await listRes.json()) as Array<{
    name: string;
    path: string;
    type: string;
  }>;
  const jpgs = entries.filter((e) => e.type === "file" && JPG.test(e.name));
  if (jpgs.length === 0) {
    throw new Error(
      `No \\d+.jpg files found at ${repo}:${repoPath || "(root)"} (branch ${branch}).`,
    );
  }

  await fs.mkdir(IMAGES_DIR, { recursive: true });

  let count = 0;
  for (const entry of jpgs) {
    const rawRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/${entry.path}?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.raw",
          "X-GitHub-Api-Version": "2022-11-28",
          "User-Agent": "scrap-mechanic-search-engine",
        },
      },
    );
    if (!rawRes.ok) {
      throw new Error(
        `Failed to download ${entry.path}: ${rawRes.status} ${rawRes.statusText}`,
      );
    }
    const buf = Buffer.from(await rawRes.arrayBuffer());
    await fs.writeFile(path.join(IMAGES_DIR, entry.name.toLowerCase()), buf);
    count += 1;
  }

  if (count < EXPECTED_COUNT) {
    console.warn(
      `[captcha] Only fetched ${count}/${EXPECTED_COUNT} images — check the private repo has the full set.`,
    );
  } else {
    console.log(`[captcha] Fetched ${count} images into lib/captcha/images/`);
  }

  await writeManifestFromDisk();
}

// Copy every on-disk image into /public/_captcha under an unguessable
// content-hashed filename, and write a small `name -> hashed-filename` map.
// The hashed files are served as static assets (so the 23 MB of JPEGs stay out
// of the Worker bundle), but only ever fetched server-side through the
// session-gated route — the client never sees the hashed URL, so the image set
// can't be enumerated. See docs/captcha.md.
async function writeManifestFromDisk() {
  const files = (await fs.readdir(IMAGES_DIR))
    .filter((f) => JPG.test(f))
    .sort();
  await fs.rm(PUBLIC_CAPTCHA_DIR, { recursive: true, force: true });
  await fs.mkdir(PUBLIC_CAPTCHA_DIR, { recursive: true });
  const manifest: Record<string, string> = {};
  for (const name of files) {
    const buf = await fs.readFile(path.join(IMAGES_DIR, name));
    const hashed = `${createHash("sha256").update(buf).digest("hex")}.jpg`;
    await fs.writeFile(path.join(PUBLIC_CAPTCHA_DIR, hashed), buf);
    manifest[name.toLowerCase()] = hashed;
  }
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(manifest));
  console.log(
    `[captcha] Copied ${files.length} hashed images to public/_captcha/ and wrote lib/captcha/_images.manifest.json`,
  );
}

main().catch((err) => {
  console.error("[captcha] fetch failed:", err);
  process.exit(1);
});
