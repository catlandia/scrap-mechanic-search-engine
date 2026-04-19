import Link from "next/link";
import { getAuthorCreations, getAuthorProfile } from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { CreationGrid } from "@/components/CreationCard";

const PREVIEW_LIMIT = 24;

// Workshop creations authored (or co-authored) by this steamid. Distinct
// from SubmittedItems — that one tracks who pressed Submit on the site,
// this one tracks who actually made the item on Steam.
export async function ProfileCreations({ steamid }: { steamid: string }) {
  const [profile, items, ratingMode] = await Promise.all([
    getAuthorProfile(steamid),
    getAuthorCreations(steamid, { limit: PREVIEW_LIMIT, offset: 0 }),
    getRatingMode(),
  ]);

  if (!profile || items.length === 0) return null;

  const hasMore = profile.count > PREVIEW_LIMIT;

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/60 px-4 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs uppercase tracking-widest text-foreground/40">
          Creations ({profile.count})
        </h2>
        {hasMore && (
          <Link
            href={`/author/${steamid}`}
            className="text-xs text-accent hover:underline"
          >
            View all →
          </Link>
        )}
      </div>
      <CreationGrid items={items} ratingMode={ratingMode} />
    </section>
  );
}

export default ProfileCreations;
