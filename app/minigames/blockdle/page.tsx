import Link from "next/link";
import type { Metadata } from "next";
import { BLOCKS } from "@/lib/blockdle/blocks.generated";
import { BlockdleGame } from "./BlockdleGame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Blockdle — Scrap Mechanic Search Engine",
  description: "Guess today's Scrap Mechanic block from its stats. Six tries.",
  alternates: { canonical: "/minigames/blockdle" },
  robots: { index: true, follow: true },
};

type SearchParams = Promise<{ mode?: string }>;

export default async function BlockdlePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const mode = sp.mode === "endless" ? "endless" : "daily";

  // Graceful empty-state when the build-time data pipeline hasn't been
  // wired up yet (empty BLOCKS → every game action would throw). Shows a
  // placeholder instead of a 500 so the rest of the site stays healthy.
  if (BLOCKS.length === 0) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 rounded-lg border border-border bg-card/60 p-6 text-sm">
        <Link
          href="/minigames"
          className="text-xs text-foreground/60 hover:text-accent"
        >
          ← Back to minigames
        </Link>
        <h1 className="text-2xl font-bold">Blockdle</h1>
        <p className="text-foreground/70">
          The block catalogue hasn&apos;t been provisioned on this deployment
          yet. Once the block data + icons are uploaded to the private
          <code className="mx-1 rounded bg-foreground/5 px-1">blockdle-data</code>
          repo and the <code className="rounded bg-foreground/5 px-1">BLOCKDLE_DATA_*</code>
          {" "}environment variables are set, the game will light up on the
          next deploy.
        </p>
        <p className="text-xs text-foreground/50">
          See <code>docs/blockdle.md</code> for setup.
        </p>
      </div>
    );
  }

  // `key` forces the client component to reset its transient state when
  // the user flips modes via URL, so daily guesses can't leak into endless
  // or vice-versa mid-click.
  return <BlockdleGame key={mode} mode={mode} />;
}
