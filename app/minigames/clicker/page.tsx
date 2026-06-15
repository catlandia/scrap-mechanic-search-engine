import type { Metadata } from "next";
import ClickerGame from "./ClickerGame";

export const metadata: Metadata = {
  title: "Scrap Clicker — Scrap Mechanic Search Engine",
  description:
    "A tiny Scrap Mechanic-themed idle clicker with real in-game item icons. Tap the bearing to harvest scrap, buy sensors, pumps, engines, totebots and craftbots to automate it, and grab upgrades. Saves in your browser — no account needed.",
  alternates: { canonical: "/minigames/clicker" },
};

// Pure client-side game (all state lives in localStorage), so there's nothing
// dynamic to render server-side and no DB to hit. The shell is fully static.
export default function ClickerPage() {
  return <ClickerGame />;
}
