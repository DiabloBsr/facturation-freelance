import type { ReactNode, ThHTMLAttributes, TdHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

/** Conteneur qui garde le défilement horizontal à l'intérieur du tableau. */
export function TableWrap({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-[var(--radius-lg)] border border-line bg-surface shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <table className={cn("w-full min-w-full border-collapse text-sm", className)}>{children}</table>;
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-line bg-surface-2 text-left">
      {children}
    </thead>
  );
}

export function TH({
  children,
  className,
  align = "left",
  ...props
}: ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted whitespace-nowrap",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TR({
  children,
  className,
  interactive,
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}) {
  return (
    <tr
      className={cn(
        "border-b border-line last:border-0",
        interactive && "transition-colors duration-150 hover:bg-surface-hover",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  align = "left",
  ...props
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle text-ink",
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
      {...props}
    >
      {children}
    </td>
  );
}

/** Ligne « aucun résultat » qui conserve la structure du tableau. */
export function TableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}
