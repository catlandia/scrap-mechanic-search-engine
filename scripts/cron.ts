import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { runIngest } from "../lib/ingest/pipeline";
import { runRefresh, refreshStaleCreators } from "../lib/ingest/refresh";

// Standalone cron runner for GitHub Actions. Runs the ingest/refresh pipeline
// directly against Neon as a plain Node process — NOT inside the Cloudflare
// Worker — for two reasons:
//   1. Steam's Web API (IPublishedFileService/QueryFiles) returns 403 to
//      Cloudflare's egress IPs, but serves normal Node hosts fine.
//   2. The free Worker tier caps a request at 50 subrequests; a full ingest
//      (pagination + up to 200 contributor scrapes) makes far more.
// GitHub-hosted runners have neither limitation. See docs/deployment.md.
async function main() {
  const job = process.argv[2];
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  if (!process.env.STEAM_API_KEY) throw new Error("STEAM_API_KEY is not set");

  if (job === "ingest") {
    // Mirrors app/api/cron/ingest: dig up to 5 pages/kind, stopping early once
    // 5 novel items are found, then a 200-row contributor-attribution top-up.
    const result = await runIngest({ pagesPerKind: 5, minNewPerKind: 5 });
    console.log("[cron] ingest:", JSON.stringify(result));
    let contributorsRefreshed = 0;
    try {
      contributorsRefreshed = await refreshStaleCreators(200);
    } catch (err) {
      console.error("[cron] refreshStaleCreators failed (non-fatal):", err);
    }
    console.log(`[cron] contributorsRefreshed: ${contributorsRefreshed}`);
  } else if (job === "refresh") {
    const result = await runRefresh();
    console.log("[cron] refresh:", JSON.stringify(result));
  } else {
    throw new Error(`Unknown job "${job ?? ""}" — pass "ingest" or "refresh".`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[cron] failed:", err);
    process.exit(1);
  });
