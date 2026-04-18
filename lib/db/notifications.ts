import { getDb } from "./client";
import { notifications } from "./schema";

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
}) {
  try {
    const db = getDb();
    await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    });
  } catch {
    // Notifications are best-effort — never let a failed insert break a user action.
  }
}
