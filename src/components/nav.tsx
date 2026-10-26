"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/galerie/logo-mark";
import {
  IconAgency,
  IconBell,
  IconChart,
  IconClients,
  IconClock,
  IconDashboard,
  IconHandover,
  IconInvoice,
  IconMission,
  IconPayment,
  IconQuote,
  IconRepeat,
  IconSettings,
  IconSparkle,
  IconUsers,
} from "./icons";

type Item = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type Section = { title: string; items: Item[] };

const SECTIONS: Section[] = [
  {
    title: "Pilotage",
    items: [{ href: "/", label: "Tableau de bord", icon: IconDashboard }],
  },
  {
    title: "Ventes",
    items: [
      { href: "/devis", label: "Devis", icon: IconQuote },
      { href: "/factures", label: "Factures", icon: IconInvoice },
      { href: "/avoirs", label: "Avoirs", icon: IconChart },
      { href: "/recurrences", label: "Abonnements", icon: IconRepeat },
    ],
  },
  {
    title: "Suivi",
    items: [
      { href: "/encaissements", label: "Encaissements", icon: IconPayment },
      { href: "/relances", label: "Relances", icon: IconBell },
      { href: "/temps", label: "Temps / CRA", icon: IconClock },
    ],
  },
  {
    title: "Sous-traitance",
    items: [
      { href: "/sous-traitance", label: "Reversements", icon: IconHandover },
      { href: "/sous-traitants", label: "Sous-traitants", icon: IconUsers },
    ],
  },
  {
    title: "Répertoire",
    items: [
      { href: "/clients", label: "Clients", icon: IconClients },
      { href: "/agences", label: "Agences", icon: IconAgency },
      { href: "/missions", label: "Missions", icon: IconMission },
    ],
  },
  {
    title: "Configuration",
    items: [
      { href: "/parametres", label: "Mon entreprise", icon: IconSettings },
      { href: "/galerie", label: "Galerie des modèles", icon: IconSparkle },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
      {SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-1">
          <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-faint">
            {section.title}
          </p>
          {section.items.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2 text-[13px] font-medium",
                  "transition-colors duration-150",
                  active
                    ? "bg-accent-soft text-accent"
                    : "text-muted hover:bg-surface-hover hover:text-ink",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent transition-opacity duration-150",
                    active ? "opacity-100" : "opacity-0",
                  )}
                />
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0 transition-colors",
                    active ? "text-accent" : "text-faint group-hover:text-muted",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Wordmark({
  companyName,
  logoMark,
  accent,
}: {
  companyName: string;
  logoMark: string | null;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[9px]">
        {/* La marque choisie dans la galerie, à défaut une pastille sobre. */}
        {logoMark ? (
          <LogoMark id={logoMark} accent={accent} size={32} instance="nav" />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-accent text-accent-contrast shadow-[var(--shadow-xs)]">
            <svg viewBox="0 0 20 20" fill="none" className="h-[18px] w-[18px]" aria-hidden="true">
              <path
                d="M5.5 3.2h9a1 1 0 0 1 1 1v12.3l-2.4-1.4-2.1 1.4-2.1-1.4-2.4 1.4V4.2a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M8 7h4M8 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold tracking-tight text-ink">
          {companyName}
        </span>
        <span className="block text-[11px] text-faint">Facturation</span>
      </span>
    </div>
  );
}

export function Sidebar({
  companyName,
  logoMark,
  accent,
}: {
  companyName: string;
  logoMark: string | null;
  accent: string;
}) {
  const [open, setOpen] = useState(false);
  const wordmark = (
    <Wordmark companyName={companyName} logoMark={logoMark} accent={accent} />
  );

  return (
    <>
      {/* Barre mobile */}
      <div className="no-print flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-line bg-surface text-muted"
          aria-label="Ouvrir le menu"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <span className="truncate text-[13px] font-semibold text-ink">{companyName}</span>
        <span className="w-9" />
      </div>

      {open && (
        <div className="no-print fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="animate-slide-in absolute left-0 top-0 flex h-full w-72 flex-col border-r border-line bg-surface shadow-[var(--shadow-lg)]">
            {wordmark}
            <NavLinks onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Colonne fixe (grand écran) */}
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
        {wordmark}
        <NavLinks />
      </aside>
    </>
  );
}
