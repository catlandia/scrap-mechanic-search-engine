"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  GENERATORS,
  UPGRADES,
  SAVE_KEY,
  CLICKER_ICON,
  OFFLINE_CAP_HOURS,
  OFFLINE_RATE,
  type SaveState,
  type Upgrade,
  freshSave,
  coerceSave,
  unitCost,
  bulkCost,
  maxAffordable,
  totalSps,
  perClick,
  formatScrap,
  formatRate,
  iconUrl,
} from "./data";

/** Real SM item icon with an emoji fallback if the PNG isn't served. */
function Icon({
  uuid,
  emoji,
  className,
  size,
}: {
  uuid: string;
  emoji: string;
  className?: string;
  size: number;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span aria-hidden style={{ fontSize: size * 0.8, lineHeight: 1 }}>
        {emoji}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={iconUrl(uuid)}
      alt=""
      aria-hidden
      width={size}
      height={size}
      draggable={false}
      onError={() => setFailed(true)}
      className={className}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}

const TICK_MS = 100; // 10 fps — smooth enough for a counter, cheap on the CPU
const SAVE_MS = 5000;

type BuyAmount = 1 | 10 | 100 | "max";

type Particle = { id: number; x: number; y: number; text: string };

export default function ClickerGame() {
  const [save, setSave] = useState<SaveState | null>(null);
  const [buyAmount, setBuyAmount] = useState<BuyAmount>(1);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [offlineGain, setOfflineGain] = useState<number | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // Refs the tick + save loops read without re-subscribing every render.
  const saveRef = useRef<SaveState | null>(null);
  const spsRef = useRef(0);
  const particleId = useRef(0);

  // --- Load (and offline earnings) on mount -------------------------------
  useEffect(() => {
    const now = Date.now();
    let loaded: SaveState | null = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) loaded = coerceSave(JSON.parse(raw), now);
    } catch {
      // Corrupt save — start fresh rather than crash.
    }
    if (!loaded) {
      setSave(freshSave(now));
      return;
    }
    // Offline earnings: pay out half-rate for the elapsed time, capped.
    const upgradesSet = new Set(loaded.upgrades);
    const sps = totalSps(loaded.owned, upgradesSet);
    const elapsedSec = Math.max(0, (now - loaded.lastSeen) / 1000);
    const cappedSec = Math.min(elapsedSec, OFFLINE_CAP_HOURS * 3600);
    const gain = sps * cappedSec * OFFLINE_RATE;
    if (gain >= 1) {
      loaded.scrap += gain;
      loaded.totalEarned += gain;
      setOfflineGain(gain);
    }
    loaded.lastSeen = now;
    setSave(loaded);
  }, []);

  // --- Derived values ------------------------------------------------------
  const upgradesSet = useMemo(
    () => new Set(save?.upgrades ?? []),
    [save?.upgrades],
  );
  const sps = useMemo(
    () => (save ? totalSps(save.owned, upgradesSet) : 0),
    [save, upgradesSet],
  );
  const clickValue = useMemo(
    () => perClick(sps, upgradesSet),
    [sps, upgradesSet],
  );

  const ready = save !== null;

  useEffect(() => {
    saveRef.current = save;
  }, [save]);
  useEffect(() => {
    spsRef.current = sps;
  }, [sps]);

  // --- Production tick -----------------------------------------------------
  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(() => {
      const gain = (spsRef.current * TICK_MS) / 1000;
      if (gain <= 0) return;
      setSave((s) =>
        s
          ? { ...s, scrap: s.scrap + gain, totalEarned: s.totalEarned + gain }
          : s,
      );
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [ready]); // start once loaded

  // --- Persistence ---------------------------------------------------------
  const persist = useCallback(() => {
    const s = saveRef.current;
    if (!s) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
    } catch {
      // Storage full / blocked — nothing we can do, the game still runs.
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    const interval = window.setInterval(persist, SAVE_MS);
    const onHide = () => persist();
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onHide);
      persist();
    };
  }, [ready, persist]);

  // --- Actions -------------------------------------------------------------
  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    const value = clickValue;
    setSave((s) =>
      s
        ? { ...s, scrap: s.scrap + value, totalEarned: s.totalEarned + value, clicks: s.clicks + 1 }
        : s,
    );
    const rect = e.currentTarget.getBoundingClientRect();
    const id = particleId.current++;
    const p: Particle = {
      id,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      text: `+${formatScrap(value)}`,
    };
    setParticles((ps) => [...ps.slice(-11), p]);
    window.setTimeout(() => {
      setParticles((ps) => ps.filter((q) => q.id !== id));
    }, 900);
  }

  function resolveCount(g: (typeof GENERATORS)[number], owned: number, scrap: number): number {
    if (buyAmount === "max") return maxAffordable(g, owned, scrap);
    return buyAmount;
  }

  function buyGenerator(genId: string) {
    setSave((s) => {
      if (!s) return s;
      const g = GENERATORS.find((x) => x.id === genId);
      if (!g) return s;
      const owned = s.owned[genId] ?? 0;
      const count = resolveCount(g, owned, s.scrap);
      if (count <= 0) return s;
      const cost = bulkCost(g, owned, count);
      if (cost > s.scrap) return s;
      return {
        ...s,
        scrap: s.scrap - cost,
        owned: { ...s.owned, [genId]: owned + count },
      };
    });
  }

  function buyUpgrade(u: Upgrade) {
    setSave((s) => {
      if (!s || s.upgrades.includes(u.id) || u.cost > s.scrap) return s;
      return { ...s, scrap: s.scrap - u.cost, upgrades: [...s.upgrades, u.id] };
    });
  }

  function doReset() {
    setSave(freshSave(Date.now()));
    setConfirmReset(false);
    setOfflineGain(null);
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }

  // --- Render --------------------------------------------------------------
  if (!save) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-foreground/50">
        <p className="animate-pulse">Loading the scrapyard…</p>
      </div>
    );
  }

  const scrap = save.scrap;

  // Upgrades the player can currently see: unlocked (by owned count / clicks)
  // and not yet purchased. Cheapest first so the next goal sits up top.
  const visibleUpgrades = UPGRADES.filter((u) => {
    if (save.upgrades.includes(u.id)) return false;
    if (u.kind === "generator") return (save.owned[u.target] ?? 0) >= u.requireOwned;
    return save.clicks >= u.requireClicks;
  }).sort((a, b) => a.cost - b.cost);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link href="/minigames" className="text-xs text-foreground/60 hover:text-accent">
            ← Minigames
          </Link>
          <h1 className="text-2xl font-bold">Scrap Clicker</h1>
          <p className="text-sm text-foreground/60">
            Tap to harvest scrap, then let the machines do it for you.
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-foreground/60">Wipe your save?</span>
            <button
              type="button"
              onClick={doReset}
              className="rounded-md border border-red-500/50 px-3 py-1 text-red-300 hover:bg-red-500/10"
            >
              Yes, reset
            </button>
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="rounded-md border border-border px-3 py-1 text-foreground/60 hover:border-accent hover:text-accent"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="rounded-md border border-border px-3 py-1 text-xs text-foreground/60 hover:border-accent hover:text-accent"
          >
            Reset save
          </button>
        )}
      </header>

      {offlineGain != null && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm"
        >
          <span>
            While you were away, your machines salvaged{" "}
            <strong className="text-accent">{formatScrap(offlineGain)}</strong> scrap.
          </span>
          <button
            type="button"
            onClick={() => setOfflineGain(null)}
            aria-label="Dismiss"
            className="rounded-full px-2 text-foreground/50 hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      {/* Counter + clicker */}
      <section className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card/60 p-6">
        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums text-accent">
            {formatScrap(scrap)}
            <span className="ml-2 text-base font-medium text-foreground/50">scrap</span>
          </div>
          <div className="text-sm text-foreground/50">
            {formatRate(sps)}/sec · {formatScrap(clickValue)}/click
          </div>
        </div>
        <button
          type="button"
          onClick={handleClick}
          className="relative flex select-none items-center justify-center overflow-visible rounded-full border border-accent/40 bg-accent/10 p-10 shadow-inner transition-transform active:scale-95 hover:bg-accent/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label={`Harvest scrap (${CLICKER_ICON.label})`}
        >
          <Icon uuid={CLICKER_ICON.uuid} emoji={CLICKER_ICON.emoji} size={112} />
          {particles.map((p) => (
            <span
              key={p.id}
              className="smse-scrap-float pointer-events-none absolute text-lg font-bold text-accent"
              style={{ left: p.x, top: p.y }}
              aria-hidden
            >
              {p.text}
            </span>
          ))}
        </button>
        <p className="text-xs text-foreground/40">Lifetime scrap: {formatScrap(save.totalEarned)}</p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Generators */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
              Machines
            </h2>
            <div className="flex items-center gap-1 text-xs" role="group" aria-label="Buy amount">
              {([1, 10, 100, "max"] as BuyAmount[]).map((amt) => (
                <button
                  key={String(amt)}
                  type="button"
                  onClick={() => setBuyAmount(amt)}
                  className={`rounded px-2 py-0.5 font-medium ${
                    buyAmount === amt
                      ? "bg-accent/20 text-accent"
                      : "text-foreground/50 hover:text-accent"
                  }`}
                >
                  {amt === "max" ? "Max" : `×${amt}`}
                </button>
              ))}
            </div>
          </div>
          <ul className="space-y-2">
            {GENERATORS.map((g, i) => {
              const owned = save.owned[g.id] ?? 0;
              // Hide generators far beyond reach to keep the list focused: a
              // generator shows once you can afford ~half its first unit, or
              // already own one, or the previous tier is owned.
              const prevOwned = i === 0 || (save.owned[GENERATORS[i - 1].id] ?? 0) > 0;
              const revealed = owned > 0 || prevOwned || save.totalEarned >= g.baseCost * 0.5;
              if (!revealed) return null;
              const count = buyAmount === "max" ? maxAffordable(g, owned, scrap) : buyAmount;
              const cost = count > 0 ? bulkCost(g, owned, count) : unitCost(g, owned);
              const canBuy = count > 0 && cost <= scrap;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => buyGenerator(g.id)}
                    disabled={!canBuy}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                      canBuy
                        ? "border-border bg-card hover:border-accent hover:bg-card/80"
                        : "border-border/50 bg-card/40 opacity-60"
                    }`}
                  >
                    <Icon uuid={g.iconUuid} emoji={g.emoji} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-semibold text-foreground">{g.name}</span>
                        <span className="text-xs tabular-nums text-foreground/50">×{owned}</span>
                      </span>
                      <span className="block truncate text-xs text-foreground/50">{g.blurb}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className="block font-medium tabular-nums text-accent">
                        {formatScrap(cost)}
                      </span>
                      {buyAmount !== 1 && (
                        <span className="block text-[10px] text-foreground/40">
                          {count > 0 ? `buy ${count}` : "—"}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Upgrades */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-foreground/50">
            Upgrades
          </h2>
          {visibleUpgrades.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border/60 p-4 text-sm text-foreground/40">
              No upgrades available yet. Buy more machines and keep clicking to unlock them.
            </p>
          ) : (
            <ul className="space-y-2">
              {visibleUpgrades.map((u) => {
                const canBuy = u.cost <= scrap;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => buyUpgrade(u)}
                      disabled={!canBuy}
                      className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                        canBuy
                          ? "border-accent/40 bg-accent/5 hover:border-accent hover:bg-accent/10"
                          : "border-border/50 bg-card/40 opacity-60"
                      }`}
                    >
                      <Icon uuid={u.iconUuid} emoji={u.emoji} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-foreground">{u.name}</span>
                        <span className="block text-xs text-foreground/50">{u.desc}</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-accent">
                        {formatScrap(u.cost)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-center text-xs text-foreground/30">
        Your progress saves automatically in this browser. No account, no servers — just scrap.
      </p>
    </div>
  );
}
