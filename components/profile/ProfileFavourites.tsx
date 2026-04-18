import { getUserFavourites } from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";
import { CreationGrid } from "@/components/CreationCard";

export async function ProfileFavourites({ steamid }: { steamid: string }) {
  const [items, ratingMode] = await Promise.all([
    getUserFavourites(steamid, 24, 0),
    getRatingMode(),
  ]);

  if (items.length === 0) return null;

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/60 px-4 py-5">
      <h2 className="text-xs uppercase tracking-widest text-white/40">
        Favourites
      </h2>
      <CreationGrid items={items} ratingMode={ratingMode} />
    </section>
  );
}

export default ProfileFavourites;
