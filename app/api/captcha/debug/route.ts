import manifest from "../../../../lib/captcha/_images.generated.json";

// Temporary diagnostic — remove once confirmed working.
export async function GET() {
  const m = manifest as Record<string, string>;
  const keys = Object.keys(m);
  return Response.json({
    manifestCount: keys.length,
    sampleKeys: keys.slice(0, 5),
  });
}
