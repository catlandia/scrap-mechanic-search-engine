import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { UserName } from "@/components/UserName";
import { RoleBadge } from "@/components/RoleBadge";
import type { UserRole } from "@/lib/db/schema";
import type { LeaderboardEntry } from "./actions";

export async function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const { t } = await getT();

  return (
    <section className="mx-auto mt-8 max-w-2xl rounded-lg border border-border bg-card/40 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {t("minigames.blockdle.leaderboard.title")}
          </h2>
          <p className="text-xs text-foreground/50">
            {t("minigames.blockdle.leaderboard.subtitle")}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-foreground/40">
          {t("minigames.blockdle.leaderboard.count", { n: entries.length })}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-border/60 px-3 py-4 text-center text-xs text-foreground/50">
          {t("minigames.blockdle.leaderboard.empty")}
        </p>
      ) : (
        <ol className="divide-y divide-foreground/5">
          {entries.map((e, i) => (
            <li
              key={e.steamid}
              className="flex items-center gap-3 px-1 py-2 text-sm"
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-foreground/50">
                {i + 1}
              </span>
              {e.avatarUrl ? (
                <Image
                  src={e.avatarUrl}
                  alt=""
                  width={24}
                  height={24}
                  unoptimized
                  className="h-6 w-6 shrink-0 rounded-full border border-border bg-black/20"
                />
              ) : (
                <span className="h-6 w-6 shrink-0 rounded-full border border-border bg-foreground/10" />
              )}
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <UserName
                  name={e.personaName}
                  role={e.role as UserRole | null}
                  steamid={e.steamid}
                  className="truncate"
                />
                <RoleBadge role={e.role as UserRole | null} />
              </div>
              <span className="shrink-0 rounded bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-200 tabular-nums">
                {t("minigames.blockdle.leaderboard.guesses", {
                  n: e.guessesUsed,
                })}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
