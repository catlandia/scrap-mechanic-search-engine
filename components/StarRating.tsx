import { cn } from "@/lib/utils";

const MIN_VOTES_FOR_RATING = 5;

export interface StarRatingProps {
  /** 0..1, Steam's vote score */
  score: number | null;
  /** Upvote / downvote counts used to gate rendering behind a minimum sample size. */
  votesUp?: number | null;
  votesDown?: number | null;
  /** Show the percentage label alongside the stars. Defaults true. */
  showLabel?: boolean;
  /** Visual scale. */
  size?: "xs" | "sm" | "md";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
};

export function sentimentLabel(score: number): string {
  const pct = score * 100;
  if (pct >= 95) return "Overwhelmingly Positive";
  if (pct >= 80) return "Very Positive";
  if (pct >= 70) return "Mostly Positive";
  if (pct >= 40) return "Mixed";
  if (pct >= 20) return "Mostly Negative";
  if (pct >= 10) return "Very Negative";
  return "Overwhelmingly Negative";
}

export function StarRating({
  score,
  votesUp,
  votesDown,
  showLabel = true,
  size = "sm",
  className,
}: StarRatingProps) {
  const totalVotes = (votesUp ?? 0) + (votesDown ?? 0);
  const hasEnoughVotes = totalVotes >= MIN_VOTES_FOR_RATING;

  if (score == null || !hasEnoughVotes) {
    return (
      <div className={cn("text-[11px] italic text-white/30", className)}>
        {totalVotes > 0 ? `only ${totalVotes} vote${totalVotes === 1 ? "" : "s"}` : "unrated"}
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, score)) * 100;
  const label = sentimentLabel(score);

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${label} · ${Math.round(pct)}% · ${totalVotes.toLocaleString()} rating${totalVotes === 1 ? "" : "s"}`}
    >
      <div
        className={cn(
          "relative inline-block select-none whitespace-nowrap font-mono leading-none tracking-widest",
          SIZE_CLASSES[size],
        )}
        aria-label={`${label}, ${Math.round(pct)} percent positive`}
      >
        <span className="text-white/15">★★★★★</span>
        <span
          className="absolute inset-y-0 left-0 overflow-hidden text-amber-400"
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          ★★★★★
        </span>
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-white/60">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
