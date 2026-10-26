import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-sm)]",
        padded && "p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("flex flex-wrap items-start justify-between gap-3", className)}
    >
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>
        {description && (
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

/** Tuile de statistique du tableau de bord. */
export function StatCard({
  label,
  value,
  sub,
  tone = "neutral",
  icon,
}: {
  label: ReactNode;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  icon?: ReactNode;
}) {
  const TONES: Record<string, string> = {
    neutral: "text-ink",
    accent: "text-accent",
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
  };
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-shadow duration-200 hover:shadow-[var(--shadow-md)]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <p className={cn("tnum mt-2 text-2xl font-semibold tracking-tight", TONES[tone])}>
        {value}
      </p>
      {sub && <p className="mt-1 text-xs leading-snug text-muted">{sub}</p>}
    </div>
  );
}
