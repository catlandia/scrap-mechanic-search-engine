// One-shot helper: insert a published changelog entry. Use when Claude /
// the Creator wants to post directly without going through /admin/changelog
// in a browser. Authored row is identical to what the admin form produces:
// authorUserId = CREATOR_STEAMID, publishedAt = now() so it goes live
// immediately and bumps the "What's new" unread pill on the next page
// load for every signed-in user.
//
// Edit the TIER / TITLE / BODY constants below, then:
//   npx tsx scripts/post-changelog.ts
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { changelogEntries } from "../lib/db/schema";

// --------------------- entry to post --------------------------------
const TIER: "update" | "patch" = "patch";
const TITLE = "Fixed: pages occasionally failing to load";
const BODY = `Some visitors were running into an intermittent error where pages — the homepage, Newest, search, and individual creation pages — would randomly fail to load and show an error screen instead. That's fixed: the site now renders well within its free-hosting limits, so loads are reliable again. Link previews (the share cards you see when posting a creation on Discord or Reddit) are untouched. Thanks for bearing with the hiccup.`;
// --------------------------------------------------------------------

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const author = process.env.CREATOR_STEAMID;
  if (!author) throw new Error("CREATOR_STEAMID is not set");

  const db = drizzle(neon(url));
  const [row] = await db
    .insert(changelogEntries)
    .values({
      tier: TIER,
      title: TITLE,
      body: BODY,
      authorUserId: author,
      publishedAt: new Date(),
    })
    .returning({ id: changelogEntries.id });
  console.log(`Posted changelog entry #${row?.id} (${TIER}): ${TITLE}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
