import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

const CONTROL =
  "w-full rounded-[var(--radius)] border border-line bg-surface px-3 text-sm text-ink " +
  "placeholder:text-faint transition-[border-color,box-shadow] duration-150 " +
  "hover:border-line-strong disabled:cursor-not-allowed disabled:bg-surface-2 disabled:text-muted";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(CONTROL, "h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(CONTROL, "min-h-24 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(CONTROL, "h-10 appearance-none pr-9", className)} {...props}>
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[13px] font-medium text-ink flex items-center gap-1"
        >
          {label}
          {required && <span className="text-danger">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs leading-snug text-muted">{hint}</p>}
      {error && <p className="text-xs leading-snug text-danger">{error}</p>}
    </div>
  );
}

/** Case à cocher alignée avec son libellé et sa description. */
export function Checkbox({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label
      className={cn(
        "group flex cursor-pointer items-start gap-2.5 rounded-[var(--radius)] py-1",
        className,
      )}
    >
      <input
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-[4px] border border-line-strong accent-[var(--accent)]"
        {...props}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-tight text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>}
      </span>
    </label>
  );
}

/** Interrupteur pour les préférences binaires immédiates. */
export function Switch({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode; hint?: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-center justify-between gap-4", className)}>
      <span className="min-w-0">
        {label && <span className="block text-[13px] font-medium text-ink">{label}</span>}
        {hint && <span className="mt-0.5 block text-xs leading-snug text-muted">{hint}</span>}
      </span>
      <span className="relative inline-flex shrink-0">
        <input type="checkbox" className="peer sr-only" {...props} />
        <span
          aria-hidden="true"
          className="h-5 w-9 rounded-full border border-line-strong bg-surface-2 transition-colors duration-200 peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:shadow-[0_0_0_3px_var(--ring)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0.5 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow-[var(--shadow-xs)] transition-transform duration-200 peer-checked:translate-x-4"
        />
      </span>
    </label>
  );
}

/** Bloc de champs avec titre, utilisé par les longs formulaires de réglages. */
export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("flex flex-col gap-4", className)}>
      {(title || description) && (
        <header className="flex flex-col gap-1">
          {title && <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>}
          {description && <p className="text-xs leading-relaxed text-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}
