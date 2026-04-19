import { readdir } from "fs/promises";
import { join } from "path";

// Temporary diagnostic — remove once captcha images are confirmed working in prod.
export async function GET() {
  const cwd = process.cwd();
  const imagesDir = join(cwd, "lib", "captcha", "images");
  let files: string[] = [];
  let error: string | null = null;
  try {
    files = await readdir(imagesDir);
  } catch (e) {
    error = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return Response.json({
    cwd,
    imagesDir,
    fileCount: files.length,
    files: files.slice(0, 30),
    error,
  });
}
