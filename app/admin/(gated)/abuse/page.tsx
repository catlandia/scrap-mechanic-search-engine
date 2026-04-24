import Link from "next/link";
import { triggerFakeReboot } from "@/app/admin/actions";
import { FormSubmitButton } from "@/components/FormSubmitButton";
import { getCurrentUser } from "@/lib/auth/session";
import { effectiveRole, isCreator } from "@/lib/auth/roles";

export const dynamic = "force-dynamic";

export default async function AbusePage() {
  const user = await getCurrentUser();
  if (!user || !isCreator(effectiveRole(user))) {
    return (
      <div className="mx-auto max-w-2xl rounded-lg border border-purple-500/40 bg-purple-500/10 p-6 text-sm">
        <div className="text-lg font-semibold text-purple-200">
          Creator only.
        </div>
        <p className="mt-2 text-purple-100/80">
          This one&apos;s a private sandbox. Moderators see{" "}
          <Link href="/admin/triage" className="underline">
            Triage
          </Link>{" "}
          and{" "}
          <Link href="/admin/queue" className="underline">
            Queue
          </Link>{" "}
          instead.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin abuse</h1>
        <p className="text-sm text-foreground/60">
          Creator-only playground for throwaway commands. Nothing in here is
          serious; nothing in here is audited. Prank rows only reach visitors
          who have Fun Mode turned on in /settings — anyone with Fun Mode off
          sees nothing. If it&apos;s visible to opted-in visitors, use it
          sparingly.
        </p>
      </header>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <h2 className="text-base font-semibold">Fake reboot</h2>
            <p className="text-sm text-foreground/60">
              Drops the sticky red countdown banner onto every live visitor for
              60 seconds with both SFX — then at zero swaps the message to
              <span className="mx-1 font-mono text-foreground/80">
                just kidding :^)
              </span>
              and self-hides 10 seconds later. No git push, no build, nothing
              reloads. Purely to watch people panic.
            </p>
          </div>
          <form action={triggerFakeReboot}>
            <FormSubmitButton
              pendingLabel="Arming…"
              spinnerSize="sm"
              toastSuccess="Fake reboot armed. 60s countdown is live for every visitor."
              className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-500"
            >
              Trigger fake reboot
            </FormSubmitButton>
          </form>
        </div>
      </section>
    </div>
  );
}
