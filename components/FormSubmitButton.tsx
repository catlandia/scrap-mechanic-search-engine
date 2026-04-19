"use client";

import { useFormStatus } from "react-dom";
import { Spinner, type SpinnerSize } from "@/components/Spinner";
import { cn } from "@/lib/utils";

// A submit button that consumes the surrounding <form action=…> pending
// state via useFormStatus. Keeps admin-panel forms consistent with the
// useTransition-based buttons elsewhere — a small spinner replaces a
// leading icon (or sits alongside the label) while the server action
// runs, and the button disables itself to block double-submits.
export function FormSubmitButton({
  children,
  pendingLabel,
  className,
  spinnerSize = "xs",
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  spinnerSize?: SpinnerSize;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(
        "inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait",
        className,
      )}
      {...rest}
    >
      {pending && <Spinner size={spinnerSize} />}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
