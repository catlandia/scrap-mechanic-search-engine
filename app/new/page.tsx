import Link from "next/link";
import { CreationGrid } from "@/components/CreationCard";
import { getNewestApproved } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

type SearchParams = Promise<{ page?: string }>;

export default async function NewestPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const pageIndex = Math.max(0, Number(params.page ?? "1") - 1);
  const items = await getNewestApproved(PAGE_SIZE + 1, pageIndex * PAGE_SIZE);
  const hasNext = items.length > PAGE_SIZE;
  const displayed = items.slice(0, PAGE_SIZE);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-3xl font-bold">Newest additions</h1>
          <p className="text-sm text-white/60">
            Creations most recently approved, across every workshop kind.
          </p>
        </div>
      </header>

      <CreationGrid items={displayed} />

      <nav className="flex items-center justify-between pt-4 text-sm text-white/60">
        {pageIndex > 0 ? (
          <Link
            href={`/new?page=${pageIndex}`}
            className="rounded border border-border px-3 py-1 hover:text-white"
          >
            ← Newer
          </Link>
        ) : (
          <span />
        )}
        <span>Page {pageIndex + 1}</span>
        {hasNext ? (
          <Link
            href={`/new?page=${pageIndex + 2}`}
            className="rounded border border-border px-3 py-1 hover:text-white"
          >
            Older →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
