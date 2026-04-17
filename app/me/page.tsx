import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function MeRedirect() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/steam/login?next=/me");
  redirect(`/profile/${user.steamid}`);
}
