import type { Metadata } from "next";
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
  // `key` forces the client component to reset its transient state when
  // the user flips modes via URL, so daily guesses can't leak into endless
  // or vice-versa mid-click.
  return <BlockdleGame key={mode} mode={mode} />;
}
