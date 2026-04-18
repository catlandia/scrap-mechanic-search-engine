import { redirect } from "next/navigation";
import { CreationGrid } from "@/components/CreationCard";
import { getCurrentUser } from "@/lib/auth/session";
import { getUserFavourites } from "@/lib/db/queries";
import { getRatingMode } from "@/lib/prefs.server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = Promise<{ page?: string }>;

export default async function FavouritesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/me/favourites");

  const sp = await searchParams;
  const pageIndex = Math.max(0, Number(sp.page ?? "1") - 1);
  const items = await getUserFavourites(user.steamid, PAGE_SIZE + 1, pageIndex * PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);
  const ratingMode = await getRatingMode();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-widest text-accent">Your collection</p>
        <h1 className="text-3xl font-bold">Favourites</h1>
        <p className="text-sm text-white/60">
          Creations you&apos;ve hearted. Newest favourites first.
        </p>
      </header>

      {displayed.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-white/60">
          No favourites yet. Click the heart on any creation to add it here.
        </div>
      ) : (
        <CreationGrid items={displayed} ratingMode={ratingMode} />
      )}

      <nav className="flex items-center justify-between pt-2 text-sm text-white/60">
        {pageIndex > 0 ? (
          <a
            href={`/me/favourites?page=${pageIndex}`}
            className="rounded border border-border px-3 py-1 hover:text-white"
          >
            ← Newer
          </a>
        ) : (
          <span />
        )}
        <span>Page {pageIndex + 1}</span>
        {hasNext ? (
          <a
            href={`/me/favourites?page=${pageIndex + 2}`}
            className="rounded border border-border px-3 py-1 hover:text-white"
          >
            Older →
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
