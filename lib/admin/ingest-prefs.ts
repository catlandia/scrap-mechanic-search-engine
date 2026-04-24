import { cookies } from "next/headers";
import { ALL_KINDS, type IngestOrder } from "@/lib/ingest/pipeline";
import type { SteamKind } from "@/lib/steam/client";

// Upper ceiling the admin form can request. High enough that the pipeline
// can keep paging past a saturated trending top until minNewPerKind is
// actually satisfied; minNewPerKind remains the real stop condition.
export const MAX_MANUAL_PAGES_PER_KIND = 50;
export const MANUAL_INGEST_PREFS_COOKIE = "smse_ingest_prefs";

export interface ManualIngestPrefs {
  pagesPerKind: number | null;
  order: IngestOrder;
  kinds: SteamKind[] | null;
}

const DEFAULT_PREFS: ManualIngestPrefs = {
  pagesPerKind: null,
  order: "trend",
  kinds: null,
};

export function parseManualIngestPrefs(raw: string | undefined): ManualIngestPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<ManualIngestPrefs>;
    const order: IngestOrder = parsed.order === "new" ? "new" : "trend";
    const pagesPerKind =
      typeof parsed.pagesPerKind === "number" &&
      Number.isInteger(parsed.pagesPerKind) &&
      parsed.pagesPerKind > 0 &&
      parsed.pagesPerKind <= MAX_MANUAL_PAGES_PER_KIND
        ? parsed.pagesPerKind
        : null;
    const kinds = Array.isArray(parsed.kinds)
      ? parsed.kinds.filter((k): k is SteamKind =>
          (ALL_KINDS as string[]).includes(String(k)),
        )
      : null;
    return {
      pagesPerKind,
      order,
      kinds: kinds && kinds.length > 0 ? kinds : null,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function getManualIngestPrefs(): Promise<ManualIngestPrefs> {
  const store = await cookies();
  return parseManualIngestPrefs(store.get(MANUAL_INGEST_PREFS_COOKIE)?.value);
}
