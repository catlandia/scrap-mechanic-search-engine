import Link from "next/link";
import { addCreation } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ added?: string; status?: string; error?: string }>;

export default async function AddPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Add a creation</h1>
        <p className="text-sm text-foreground/60">
          Pull in a Steam Workshop item by URL or published-file ID, bypassing the
          follow-count filter. Use this for small gems the cron wouldn&apos;t grab
          on its own.
        </p>
      </header>

      {sp.added && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm">
          Added{" "}
          <Link
            href={`/creation/${sp.added}`}
            className="text-emerald-300 hover:underline"
            target="_blank"
          >
            #{sp.added}
          </Link>{" "}
          with status{" "}
          <span className="font-medium text-emerald-200">
            {sp.status ?? "pending"}
          </span>
          .
          {sp.status === "pending" && (
            <>
              {" "}
              Review it in{" "}
              <Link href="/admin/triage" className="text-emerald-300 hover:underline">
                triage
              </Link>
              .
            </>
          )}
        </div>
      )}

      {sp.error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <div className="font-medium">Couldn&apos;t add that item.</div>
          <div className="mt-1 text-red-100/80">{sp.error}</div>
        </div>
      )}

      <form
        action={addCreation}
        className="space-y-4 rounded-lg border border-border bg-card p-5"
      >
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/70">
            Steam Workshop URL or published-file ID
          </span>
          <input
            name="input"
            required
            autoFocus
            placeholder="https://steamcommunity.com/sharedfiles/filedetails/?id=..."
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </label>

        <label className="flex items-start gap-2 text-sm">
          <input
            name="approve"
            type="checkbox"
            defaultChecked
            className="mt-0.5 accent-accent"
          />
          <span>
            <span className="font-medium text-foreground">
              Approve immediately
            </span>
            <span className="block text-xs text-foreground/50">
              Item skips the triage queue and appears on the public site right away.
              Auto-tags are confirmed as-is. Uncheck to send it to triage instead.
            </span>
          </span>
        </label>

        <FormSubmitButton
          pendingLabel="Fetching from Steam…"
          spinnerSize="sm"
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-black hover:bg-accent-strong"
        >
          Add to site
        </FormSubmitButton>
      </form>

      <div className="rounded-md border border-border bg-card/40 p-4 text-xs text-foreground/60">
        <div className="font-medium text-foreground/70">Accepted forms</div>
        <ul className="mt-2 space-y-1 font-mono">
          <li>https://steamcommunity.com/sharedfiles/filedetails/?id=3706129300</li>
          <li>https://steamcommunity.com/workshop/filedetails/?id=3706129300</li>
          <li>3706129300</li>
        </ul>
        <p className="mt-3 text-foreground/50">
          Re-adding an existing item with &quot;Approve immediately&quot; will
          override any earlier rejection and confirm its existing tags.
        </p>
      </div>
    </div>
  );
}
