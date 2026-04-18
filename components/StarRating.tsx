import { cn } from "@/lib/utils";

const MIN_VOTES_FOR_RATING = 10;

export type StarColor = "amber" | "green" | "orange";

export interface StarRatingProps {
  /**
   * 0..1 fallback score. Used only if votesUp/votesDown aren't provided.
   * Steam's `vote_score` is a Wilson-smoothed number that pulls toward 0.5
   * for low-sample items — so when raw counts are available we compute
   * up/(up+down) ourselves instead of trusting this field.
   */
  score: number | null;
  /** Upvote / downvote counts. If both are present we compute the ratio from these. */
  votesUp?: number | null;
  votesDown?: number | null;
  /** Show the percentage label alongside the stars. Defaults true. */
  showLabel?: boolean;
  /** Visual scale. */
  size?: "xs" | "sm" | "md";
  /** amber (default) = Steam stars · green for Steam highlight · orange for site-native votes. */
  color?: StarColor;
  /** Short label shown after the percentage, eg "steam" or "site". */
  tag?: string;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<StarRatingProps["size"]>, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-base",
};

const COLOR_CLASSES: Record<StarColor, string> = {
  amber: "text-amber-400",
  green: "text-emerald-400",
  orange: "text-orange-400",
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
  color = "amber",
  tag,
  className,
}: StarRatingProps) {
  const totalVotes = (votesUp ?? 0) + (votesDown ?? 0);
  const hasEnoughVotes = totalVotes >= MIN_VOTES_FOR_RATING;

  // Prefer raw ratio over Steam's smoothed score to avoid the
  // "everything looks like 3 stars" regression to 0.5 for low-sample items.
  const rawRatio =
    votesUp != null && votesDown != null && totalVotes > 0
      ? votesUp / totalVotes
      : null;
  const effectiveScore = rawRatio ?? score;

  if (effectiveScore == null || !hasEnoughVotes) {
    return (
      <div className={cn("text-[11px] italic text-white/30", className)}>
        {totalVotes > 0
          ? `${tag ? `${tag}: ` : ""}only ${totalVotes} vote${totalVotes === 1 ? "" : "s"}`
          : tag
            ? `${tag}: unrated`
            : "unrated"}
      </div>
    );
  }

  const pct = Math.max(0, Math.min(1, effectiveScore)) * 100;
  const label = sentimentLabel(effectiveScore);

  return (
    <div
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${tag ? `${tag.toUpperCase()} · ` : ""}${label} · ${Math.round(pct)}% · ${totalVotes.toLocaleString()} rating${totalVotes === 1 ? "" : "s"}`}
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
          className={cn(
            "absolute inset-y-0 left-0 overflow-hidden",
            COLOR_CLASSES[color],
          )}
          style={{ width: `${pct}%` }}
          aria-hidden
        >
          ★★★★★
        </span>
      </div>
      {showLabel && (
        <span className="text-[11px] font-medium text-white/60">
          {Math.round(pct)}%
          {tag ? <span className="ml-1 text-white/40">{tag}</span> : null}
        </span>
      )}
    </div>
  );
}
