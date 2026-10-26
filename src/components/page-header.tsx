import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconBack } from "./icons";

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel,
  eyebrow,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
  eyebrow?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {backHref && (
        <Link
          href={backHref}
          className="inline-flex w-fit items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-ink"
        >
          <IconBack className="h-4 w-4" />
          {backLabel ?? "Retour"}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[22px] font-semibold leading-tight tracking-tight text-ink">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Enveloppe commune des pages : largeur, gouttières, rythme vertical. */
export function PageShell({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8",
        wide ? "max-w-[1400px]" : "max-w-6xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
