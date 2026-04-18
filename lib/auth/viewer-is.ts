import type { User } from "@/lib/db/schema";
import { effectiveRole, isModerator } from "@/lib/auth/roles";

export function canSeeModInfo(
  viewer: User | null,
  targetSteamid: string,
): boolean {
  if (!viewer) return false;
  if (viewer.steamid === targetSteamid) return true;
  return isModerator(effectiveRole(viewer));
}
