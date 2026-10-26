import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_STATUS_TONE,
  type DocumentStatus,
} from "@/lib/enums";

export type Tone = "neutral" | "accent" | "info" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-neutral-soft text-neutral border-neutral-border",
  accent: "bg-accent-soft text-accent border-accent-border",
  info: "bg-info-soft text-info border-info-border",
  success: "bg-success-soft text-success border-success-border",
  warning: "bg-warning-soft text-warning border-warning-border",
  danger: "bg-danger-soft text-danger border-danger-border",
};

export function Badge({
  children,
  tone = "neutral",
  className,
  dot,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        TONES[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const key = status as DocumentStatus;
  const label = DOCUMENT_STATUS_LABELS[key] ?? status;
  const tone = (DOCUMENT_STATUS_TONE[key] ?? "neutral") as Tone;
  return (
    <Badge tone={tone} dot>
      {label}
    </Badge>
  );
}
