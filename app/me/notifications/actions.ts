"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/lib/db/queries";

// Marks every unread notification (across all tiers the user has access
// to) as read. Backs the "Mark all as read" button on /me/notifications.
// The server-component page already auto-marks the *active* tier on
// visit, but a moderator/creator with multiple tiers had to click into
// each tab to clear the bell counter — this clears all of them at once.
export async function markEverythingAsRead() {
  const user = await getCurrentUser();
  if (!user) return;
  // No tier argument => match every unread row for this user.
  await markAllNotificationsRead(user.steamid);
  revalidatePath("/me/notifications");
  // Re-render the layout too so the bell counters update without a full
  // navigation. The bell is a server-component fragment; revalidating
  // just the notifications path doesn't refresh it.
  revalidatePath("/", "layout");
}
