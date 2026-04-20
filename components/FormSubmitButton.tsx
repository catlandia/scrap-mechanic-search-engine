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
  name,
  value,
  formAction,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  spinnerSize?: SpinnerSize;
  toastSuccess?: string;
}) {
  const status = useFormStatus();
  const toast = useToast();
  const wasActive = useRef(false);

  // A form with N submit buttons shares one useFormStatus result, so naively
  // every button would spin when any one is pressed ("1 press = 3-button
  // feedback"). Identify *this* button from the in-flight submission so only
  // the one that was clicked shows the spinner. React 19 exposes `data` (the
  // submitted FormData) and `action` (the server action reference) on the
  // status object — we match whichever of these the caller set.
  const isThisButton = (() => {
    if (!status.pending) return false;
    if (formAction && status.action === formAction) return true;
    if (name && status.data?.get(name) === String(value ?? "")) return true;
    // No discriminator — fall back to the legacy "any submit activates me"
    // behaviour so generic single-button forms still work.
    return !formAction && !name;
  })();

  useEffect(() => {
    if (isThisButton) {
      wasActive.current = true;
    } else if (wasActive.current && !status.pending && toastSuccess) {
      wasActive.current = false;
      toast.success(toastSuccess);
    }
  }, [isThisButton, status.pending, toastSuccess, toast]);

  return (
    <button
      type="submit"
      name={name}
      value={value}
      formAction={formAction}
      disabled={disabled || status.pending}
      aria-busy={isThisButton}
      className={cn(
        "inline-flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-wait",
        className,
      )}
      {...rest}
    >
      {isThisButton && <Spinner size={spinnerSize} />}
      {isThisButton && pendingLabel ? pendingLabel : children}
    </button>
  );
}
