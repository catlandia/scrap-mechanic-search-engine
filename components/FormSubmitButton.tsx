"use client";

import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { Spinner, type SpinnerSize } from "@/components/Spinner";
import { useToast } from "@/components/Toast";
import { cn } from "@/lib/utils";

// A submit button that consumes the surrounding <form action=…> pending
// state via useFormStatus. Keeps admin-panel forms consistent with the
// useTransition-based buttons elsewhere — a small spinner replaces a
// leading icon (or sits alongside the label) while the server action
// runs, and the button disables itself to block double-submits.
//
// Pass `toastSuccess` to fire a success toast when the server action
// completes (pending flips back to false after having been true). Server
// actions here are fire-and-revalidate — they throw on failure, which
// Next surfaces as its own error screen; completion = success.
export function FormSubmitButton({
  children,
  pendingLabel,
  className,
  spinnerSize = "xs",
  disabled,
  toastSuccess,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  spinnerSize?: SpinnerSize;
  toastSuccess?: string;
}) {
  const { pending } = useFormStatus();
  const toast = useToast();
  const wasPending = useRef(false);

  useEffect(() => {
    if (pending) {
      wasPending.current = true;
    } else if (wasPending.current && toastSuccess) {
      wasPending.current = false;
      toast.success(toastSuccess);
    }
  }, [pending, toastSuccess, toast]);

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
