import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const db = drizzle(neon(url));
  console.log("Applying migrations…");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Done.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Free-tier storage (Neon) quota exhausted: no DDL can run anyway.
    // Skip rather than fail the build so fixes can still ship into prod;
    // pending migrations will apply on the next deploy after the quota
    // resets. Drizzle is idempotent so this is safe.
    if (/HTTP status 402/i.test(msg) || /compute time quota/i.test(msg)) {
      console.warn(
        "[migrate] Neon storage quota is exhausted — skipping migrations. " +
          "They will be retried on the next deploy after the quota resets. " +
          "The build will continue.",
      );
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
