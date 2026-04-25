import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getReviewBySlug, steamHeaderUrl } from "@/lib/reviews/actions";
import { Markdown } from "@/components/Markdown";
import { ScoreBadge } from "../page";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);
  if (!review) return { title: "Review not found" };
  const description = review.body
    ? review.body.replace(/[*_`>#\-]/g, " ").slice(0, 200)
    : `Review of ${review.title}.`;
  return {
    title: `${review.title} — review`,
    description,
    alternates: { canonical: `/reviews/${review.slug}` },
  };
}

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const review = await getReviewBySlug(slug);
  if (!review) notFound();

  const thumb = review.thumbnailUrl ?? steamHeaderUrl(review.steamAppId);
  const storeUrl = review.steamAppId
    ? `https://store.steampowered.com/app/${review.steamAppId}/`
    : null;
  const date = review.publishedAt
    ? new Date(review.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <nav className="text-sm">
        <Link href="/reviews" className="text-accent hover:underline">
          ← All reviews
        </Link>
      </nav>

      <header className="space-y-4">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="aspect-[460/215] w-full rounded-lg border border-border object-cover"
          />
        )}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            {review.score !== null && <ScoreBadge score={review.score} />}
            {date && (
              <time
                className="text-xs text-foreground/50"
                dateTime={review.publishedAt?.toISOString()}
              >
                {date}
              </time>
            )}
            {review.authorName && (
              <span className="text-xs text-foreground/50">
                by {review.authorName}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{review.title}</h1>
          {storeUrl && (
            <a
              href={storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
            >
              View on Steam ↗
            </a>
          )}
        </div>
      </header>

      {(review.pros.length > 0 || review.cons.length > 0) && (
        <section className="grid gap-4 sm:grid-cols-2">
          {review.pros.length > 0 && (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
                Pros
              </h2>
              <ul className="space-y-1 text-sm text-foreground/85">
                {review.pros.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-emerald-400">+</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.cons.length > 0 && (
            <div className="rounded-md border border-red-500/30 bg-red-500/5 px-4 py-3">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-300">
                Cons
              </h2>
              <ul className="space-y-1 text-sm text-foreground/85">
                {review.cons.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span aria-hidden className="text-red-400">−</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {review.body ? (
        <Markdown>{review.body}</Markdown>
      ) : (
        <p className="text-sm italic text-foreground/50">No write-up yet.</p>
      )}
    </article>
  );
}
