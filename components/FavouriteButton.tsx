"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleFavourite } from "@/lib/community/actions";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

export function FavouriteButton({
  creationId,
  initialFavourited,
  signedIn,
}: {
  creationId: string;
  initialFavourited: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [favourited, setFavourited] = useState(initialFavourited);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!signedIn) {
      router.push(`/auth/steam/login?next=/creation/${creationId}`);
      return;
    }
    const prev = favourited;
    setFavourited(!prev);
    startTransition(async () => {
      try {
        const result = await toggleFavourite(creationId);
        setFavourited(result.favourited);
        toast.success(
          result.favourited ? "Added to your favourites." : "Removed from favourites.",
        );
      } catch (err) {
        setFavourited(prev);
        toast.error(
          err instanceof Error ? err.message : "Couldn't update favourite.",
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50",
        favourited
          ? "border-rose-400/60 bg-rose-500/20 text-rose-200 hover:bg-rose-500/25"
          : "border-border bg-card text-foreground/70 hover:border-rose-400/60 hover:text-rose-200",
      )}
      title={signedIn ? "Favourite this creation" : "Sign in to favourite"}
    >
      {isPending ? (
        <Spinner size="xs" />
      ) : (
        <span aria-hidden>{favourited ? "♥" : "♡"}</span>
      )}
      {favourited ? "Favourited" : "Favourite"}
    </button>
  );
}
