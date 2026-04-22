// Serve block icons by uuid. No session check — icons are not a cheat
// vector (player already chose to reveal that uuid by guessing; correctness
// is judged server-side in the action). Long-cache because uuid → PNG is
// stable per deploy. Relative import for the same tracing reason noted in
// the Scrapcha image route (alias doesn't round-trip through the build).
import manifest from "../../../../../../lib/blockdle/_icons.generated.json";

const ICONS = manifest as Record<string, string>;

// Accept compact + hyphenated uuids just in case.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  const { uuid } = await params;
  if (!UUID_RE.test(uuid)) {
    return new Response("Invalid uuid", { status: 400 });
  }
  const base64 = ICONS[uuid.toLowerCase()] ?? ICONS[uuid];
  if (!base64) {
    return new Response("Not found", { status: 404 });
  }
  const buffer = Buffer.from(base64, "base64");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
