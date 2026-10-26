"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { buttonClass, SubmitButton } from "./button";
import { cn } from "@/lib/cn";

/**
 * Action irréversible : rien ne part sans un oui/non explicite nommant
 * précisément ce qui sera perdu.
 */
export function ConfirmAction({
  action,
  hidden,
  title,
  description,
  confirmLabel = "Supprimer",
  cancelLabel = "Annuler",
  triggerLabel,
  triggerClassName,
  triggerVariant = "ghost",
  triggerSize = "sm",
  icon,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string | number | undefined | null>;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  triggerLabel: ReactNode;
  triggerClassName?: string;
  triggerVariant?: "ghost" | "secondary" | "danger" | "primary" | "quiet";
  triggerSize?: "sm" | "md" | "lg" | "icon";
  icon?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <form action={action} className="contents">
      {hidden &&
        Object.entries(hidden).map(([key, value]) =>
          value === undefined || value === null ? null : (
            <input key={key} type="hidden" name={key} value={String(value)} />
          ),
        )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClass(triggerVariant, triggerSize, triggerClassName)}
      >
        {icon}
        {triggerLabel}
      </button>

      {open && (
        <div
          className="no-print fixed inset-0 z-[90] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            className={cn(
              "animate-fade-rise relative w-full max-w-md rounded-[var(--radius-lg)] border border-line",
              "bg-surface p-5 text-left shadow-[var(--shadow-lg)]",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-danger-border bg-danger-soft text-danger">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path
                    d="M8 5.4v3.2M8 11.2h.01M6.9 2.3 1.7 11.4a1.3 1.3 0 0 0 1.1 1.9h10.4a1.3 1.3 0 0 0 1.1-1.9L9.1 2.3a1.3 1.3 0 0 0-2.2 0Z"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
                <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelRef}
                type="button"
                onClick={() => setOpen(false)}
                className={buttonClass("secondary", "md")}
              >
                {cancelLabel}
              </button>
              <SubmitButton variant="danger" pendingLabel="Suppression…">
                {confirmLabel}
              </SubmitButton>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
