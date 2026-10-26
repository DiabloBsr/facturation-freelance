import { cn } from "@/lib/cn";

/**
 * Classes des boutons, isolées du composant.
 *
 * `button.tsx` est un module client ; en extrayant le calcul des classes ici,
 * les composants serveur peuvent styler un lien comme un bouton sans importer
 * de code client.
 */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "quiet";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const BASE =
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
  "transition-[background-color,border-color,color,box-shadow,transform] duration-150 " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50 " +
  "rounded-[var(--radius)] select-none";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-contrast border border-accent shadow-[var(--shadow-xs)] hover:bg-accent-hover hover:border-accent-hover",
  secondary:
    "bg-surface text-ink border border-line shadow-[var(--shadow-xs)] hover:bg-surface-hover hover:border-line-strong",
  ghost: "bg-transparent text-muted border border-transparent hover:bg-surface-hover hover:text-ink",
  danger:
    "bg-danger-soft text-danger border border-danger-border hover:bg-danger hover:text-white hover:border-danger",
  quiet:
    "bg-accent-soft text-accent border border-accent-border hover:bg-accent hover:text-accent-contrast",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
  icon: "h-9 w-9 p-0 text-sm",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], extra);
}
