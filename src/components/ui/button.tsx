"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import {
  buttonClass,
  type ButtonSize as Size,
  type ButtonVariant as Variant,
} from "./button-style";

export { buttonClass };

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

/**
 * Bouton de soumission qui reflète l'état du formulaire :
 * l'utilisateur voit immédiatement que son action est prise en compte.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps & { pendingLabel?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      className={buttonClass(variant, size, className)}
      {...props}
    >
      {pending && <Spinner />}
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-3.5 w-3.5 animate-spin", className)}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path
        d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
