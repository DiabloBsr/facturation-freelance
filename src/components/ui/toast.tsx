"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

export type ToastTone = "success" | "error" | "info";

type Toast = { id: number; message: string; tone: ToastTone };

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider.");
  return ctx;
}

const ICONS: Record<ToastTone, ReactNode> = {
  success: (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="m5 8.2 2 2 4-4.4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 4.75v4M8 11.1h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 7.25v4M8 4.9h.01" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  ),
};

const TONES: Record<ToastTone, string> = {
  success: "border-success-border bg-success-soft text-success",
  error: "border-danger-border bg-danger-soft text-danger",
  info: "border-accent-border bg-accent-soft text-accent",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const toast = useCallback((message: string, tone: ToastTone = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="no-print pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2"
        aria-live="polite"
        role="status"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={cn(
              "animate-slide-in pointer-events-auto flex items-start gap-2.5 rounded-[var(--radius)] border px-3.5 py-3 shadow-[var(--shadow-lg)] backdrop-blur",
              TONES[item.tone],
            )}
          >
            <span className="mt-px shrink-0">{ICONS[item.tone]}</span>
            <p className="min-w-0 flex-1 text-[13px] font-medium leading-snug">{item.message}</p>
            <button
              type="button"
              onClick={() => setToasts((c) => c.filter((t) => t.id !== item.id))}
              className="-mr-1 shrink-0 rounded p-0.5 opacity-60 transition-opacity hover:opacity-100"
              aria-label="Fermer"
            >
              <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                <path d="m3 3 6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Rejoue en toast le message déposé dans l'URL par une action serveur
 * (les redirections perdent l'état React), puis nettoie l'adresse.
 */
export function FlashToaster() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const shown = useRef<string | null>(null);

  const flash = params.get("flash");
  const tone = (params.get("tone") as ToastTone | null) ?? "success";

  useEffect(() => {
    if (!flash) return;
    const signature = `${pathname}::${flash}::${tone}`;
    if (shown.current === signature) return;
    shown.current = signature;

    toast(flash, tone);

    const next = new URLSearchParams(params.toString());
    next.delete("flash");
    next.delete("tone");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [flash, tone, pathname, params, router, toast]);

  return null;
}
