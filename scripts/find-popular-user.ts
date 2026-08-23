import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: false });
loadEnv({ path: ".env", override: false });

import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const sql = postgres(url, { ssl: "require", max: 1, prepare: false });

  const rows = await sql`
    select steamid,
           short_id,
           persona_name,
           role,
           site_joined_at,
           last_seen_at
    from users
    where hard_banned = false
    order by site_joined_at desc
    limit 10
  `;

  console.log("Newest signed-in users:\n");
  console.log("rank | #id  | persona              | role           | joined              | last seen");
  console.log("-".repeat(110));
  rows.forEach((r: any, i: number) => {
    const persona = (r.persona_name ?? "(no name)").padEnd(20).slice(0, 20);
    const role = (r.role ?? "user").padEnd(14).slice(0, 14);
    const joined = r.site_joined_at ? new Date(r.site_joined_at).toISOString().replace("T", " ").slice(0, 19) : "-";
    const seen = r.last_seen_at ? new Date(r.last_seen_at).toISOString().replace("T", " ").slice(0, 19) : "-";
    const shortId = String(r.short_id).padStart(4);
    console.log(
      `${String(i + 1).padStart(4)} | ${shortId} | ${persona} | ${role} | ${joined} | ${seen}  steamid=${r.steamid}`
    );
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
