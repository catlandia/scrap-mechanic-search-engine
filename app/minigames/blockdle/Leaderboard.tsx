import Image from "next/image";
import { getT } from "@/lib/i18n/server";
import { UserName } from "@/components/UserName";
import { RoleBadge } from "@/components/RoleBadge";
import type { UserRole } from "@/lib/db/schema";
import type { AllTimeEntry, LeaderboardEntry } from "./actions";

export async function Leaderboard({
  today,
  allTime,
}: {
  today: LeaderboardEntry[];
  allTime: AllTimeEntry[];
}) {
  const { t } = await getT();

  return (
    <div className="mx-auto mt-8 grid max-w-4xl gap-6 lg:grid-cols-2">
      <TodayBoard t={t} entries={today} />
      <AllTimeBoard t={t} entries={allTime} />
    </div>
  );
}

type T = (key: string, vars?: Record<string, string | number>) => string;

function TodayBoard({ t, entries }: { t: T; entries: LeaderboardEntry[] }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
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
              <Rank n={i + 1} />
              <Avatar src={e.avatarUrl} />
              <NameCell
                name={e.personaName}
                role={e.role}
                steamid={e.steamid}
              />
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

function AllTimeBoard({ t, entries }: { t: T; entries: AllTimeEntry[] }) {
  return (
    <section className="rounded-lg border border-border bg-card/40 p-4">
      <header className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {t("minigames.blockdle.leaderboard.allTimeTitle")}
          </h2>
          <p className="text-xs text-foreground/50">
            {t("minigames.blockdle.leaderboard.allTimeSubtitle")}
          </p>
        </div>
        <span className="text-[11px] uppercase tracking-wider text-foreground/40">
          {t("minigames.blockdle.leaderboard.count", { n: entries.length })}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="rounded border border-dashed border-border/60 px-3 py-4 text-center text-xs text-foreground/50">
          {t("minigames.blockdle.leaderboard.allTimeEmpty")}
        </p>
      ) : (
        <ol className="divide-y divide-foreground/5">
          {entries.map((e, i) => (
            <li
              key={e.steamid}
              className="flex items-center gap-3 px-1 py-2 text-sm"
            >
              <Rank n={i + 1} />
              <Avatar src={e.avatarUrl} />
              <NameCell
                name={e.personaName}
                role={e.role}
                steamid={e.steamid}
              />
              <div className="flex shrink-0 flex-col items-end text-[11px] text-foreground/60">
                <span className="rounded bg-accent/15 px-2 py-0.5 font-medium text-accent tabular-nums">
                  {t("minigames.blockdle.leaderboard.wins", { n: e.wins })}
                </span>
                <span className="mt-0.5 tabular-nums text-foreground/40">
                  {t("minigames.blockdle.leaderboard.avg", {
                    n: e.avgGuesses.toFixed(1),
                  })}
                </span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Rank({ n }: { n: number }) {
  return (
    <span className="w-6 shrink-0 text-center font-mono text-xs tabular-nums text-foreground/50">
      {n}
    </span>
  );
}

function Avatar({ src }: { src: string | null }) {
  return src ? (
    <Image
      src={src}
      alt=""
      width={24}
      height={24}
      unoptimized
      className="h-6 w-6 shrink-0 rounded-full border border-border bg-black/20"
    />
  ) : (
    <span className="h-6 w-6 shrink-0 rounded-full border border-border bg-foreground/10" />
  );
}

function NameCell({
  name,
  role,
  steamid,
}: {
  name: string;
  role: string;
  steamid: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <UserName
        name={name}
        role={role as UserRole | null}
        steamid={steamid}
        className="truncate"
      />
      <RoleBadge role={role as UserRole | null} />
    </div>
  );
}
