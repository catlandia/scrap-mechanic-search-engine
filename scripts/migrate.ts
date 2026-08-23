import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");

  const client = postgres(url, { max: 1, prepare: false, ssl: "require", connect_timeout: 20 });
  const db = drizzle(client);
  console.log("Applying migrations…");
  try {
    await migrate(db, { migrationsFolder: "./drizzle" });
    console.log("Done.");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Free-tier database quota exhausted: no DDL can run anyway.
    // Skip rather than fail the build so fixes can still ship into prod;
    // pending migrations will apply on the next deploy after the quota
    // resets. Drizzle is idempotent so this is safe.
    if (/HTTP status 402/i.test(msg) || /compute time quota/i.test(msg)) {
      console.warn(
        "[migrate] Database quota is exhausted — skipping migrations. " +
          "They will be retried on the next deploy after the quota resets. " +
          "The build will continue.",
      );
      return;
    }
    throw err;
  } finally {
    // postgres.js holds the socket open, so without this the script finishes
    // its work and then hangs forever instead of exiting. neon-http was
    // stateless HTTP and needed no teardown.
    await client.end({ timeout: 5 });
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
