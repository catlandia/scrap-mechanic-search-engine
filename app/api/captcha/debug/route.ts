import { readdir } from "fs/promises";
import { join } from "path";

// Temporary diagnostic — remove once confirmed working.
export async function GET() {
  const cwd = process.cwd();
  const imagesDir = join(cwd, "lib", "captcha", "images");
  let files: string[] = [];
  let fsError: string | null = null;
  try {
    files = await readdir(imagesDir);
  } catch (e) {
    fsError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  let manifestKeys: string[] = [];
  let manifestCount = 0;
  let manifestError: string | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const manifest = require("@/lib/captcha/_images.generated.json") as Record<string, string>;
    manifestCount = Object.keys(manifest).length;
    manifestKeys = Object.keys(manifest).slice(0, 5);
  } catch (e) {
    manifestError = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }

  return Response.json({
    cwd,
    fs: { imagesDir, fileCount: files.length, files: files.slice(0, 5), error: fsError },
    manifest: { count: manifestCount, sampleKeys: manifestKeys, error: manifestError },
  });
}
