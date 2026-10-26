"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/field";
import { IconSearch } from "@/components/icons";
import { DOCUMENT_STATUS_LABELS, type DocumentStatus } from "@/lib/enums";
import { cn } from "@/lib/cn";

export function ListFilters({
  statuses,
  placeholder = "Rechercher un numéro, un client, un objet…",
}: {
  statuses: DocumentStatus[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [search, setSearch] = useState(params.get("q") ?? "");
  const status = params.get("statut") ?? "";

  // La recherche se déclenche après une pause de frappe, pas à chaque touche.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;

    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (search) next.set("q", search);
      else next.delete("q");
      startTransition(() => {
        router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search, params, pathname, router]);

  const onStatus = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("statut", value);
    else next.delete("statut");
    startTransition(() => {
      router.replace(next.toString() ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[16rem] flex-1">
        <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={placeholder}
          className={cn("pl-9", pending && "opacity-70")}
          aria-label="Rechercher"
        />
      </div>
      <div className="w-52">
        <Select value={status} onChange={(event) => onStatus(event.target.value)} aria-label="Filtrer par statut">
          <option value="">Tous les statuts</option>
          {statuses.map((value) => (
            <option key={value} value={value}>
              {DOCUMENT_STATUS_LABELS[value]}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}
