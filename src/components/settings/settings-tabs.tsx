"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/parametres", label: "Identité & identifiants" },
  { href: "/parametres/paiements", label: "Coordonnées de paiement" },
  { href: "/parametres/facturation", label: "Règles de facturation" },
  { href: "/parametres/modeles", label: "Modèles & mentions" },
  { href: "/parametres/devises", label: "Devises" },
  { href: "/parametres/numerotation", label: "Numérotation" },
  { href: "/parametres/securite", label: "Sécurité" },
];

export function SettingsTabs() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto border-b border-line pb-px">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative whitespace-nowrap rounded-t-[var(--radius)] px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-150",
              active ? "text-accent" : "text-muted hover:bg-surface-hover hover:text-ink",
            )}
          >
            {tab.label}
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent transition-opacity duration-150",
                active ? "opacity-100" : "opacity-0",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
