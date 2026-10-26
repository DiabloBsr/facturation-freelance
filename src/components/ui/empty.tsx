import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line bg-surface-2 px-6 py-14 text-center",
        className,
      )}
    >
      {icon && (
        <span className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-[var(--shadow-xs)]">
          {icon}
        </span>
      )}
      <div className="max-w-md">
        <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
        {description && (
          <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</p>
        )}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  );
}
