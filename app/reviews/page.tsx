import type { Metadata } from "next";
import Link from "next/link";
import {
  getPublishedReviews,
  type GameReviewRow,
} from "@/lib/reviews/actions";
import { steamHeaderUrl } from "@/lib/reviews/steam-header";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Game reviews",
  description:
    "Sandbox-game reviews from the Scrap Mechanic Search Engine — recommendations and verdicts on physics, building, and survival games worth your time.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const reviews = await getPublishedReviews();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-widest text-accent">Reviews</p>
        <h1 className="text-3xl font-bold">Game reviews</h1>
        <p className="text-sm text-foreground/60">
          A page for us to review sandbox games. Newest first.
        </p>
      </header>

      {reviews.length === 0 ? (
        <div className="rounded-md border border-border bg-card/60 px-5 py-8 text-center text-sm text-foreground/60">
          No reviews yet — check back soon.
        </div>
      ) : (
        <ol className="grid gap-5 sm:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ol>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: GameReviewRow }) {
  const thumb = review.thumbnailUrl ?? steamHeaderUrl(review.steamAppId);
  const date = review.publishedAt
    ? new Date(review.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <li className="overflow-hidden rounded-lg border border-border bg-card/60 transition hover:border-accent/40">
      <Link href={`/reviews/${review.slug}`} className="block">
        {thumb && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={thumb}
            alt=""
            className="aspect-[460/215] w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="space-y-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold leading-tight text-foreground">
              {review.title}
            </h2>
            {review.score !== null && <ScoreBadge score={review.score} />}
          </div>
          {date && (
            <time className="block text-xs text-foreground/50">{date}</time>
          )}
          {review.body && (
            <p className="line-clamp-3 text-sm text-foreground/70">
              {extractFirstParagraph(review.body)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}

export function ScoreBadge({ score }: { score: number }) {
  const display = (score / 10).toFixed(score % 10 === 0 ? 0 : 1);
  const tone =
    score >= 80
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : score >= 60
        ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
        : "border-red-500/40 bg-red-500/10 text-red-300";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold tabular-nums",
        tone,
      )}
    >
      {display}/10
    </span>
  );
}

function extractFirstParagraph(body: string): string {
  const stripped = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/^#+\s.*$/gm, "")
    .replace(/[*_`>#\-]/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  const para = stripped.split(/\n\s*\n/).find((p) => p.trim().length > 0);
  return (para ?? stripped).trim().slice(0, 240);
}
