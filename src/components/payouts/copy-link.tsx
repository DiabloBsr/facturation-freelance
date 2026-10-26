"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { IconCheck, IconCopy } from "@/components/icons";

/**
 * Affiche le lien privé d'une demande, une seule fois.
 * Le jeton n'étant stocké que haché, il n'est plus affichable ensuite : il
 * faut alors régénérer le lien.
 */
export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Presse-papiers refusé (http, permission) : le lien reste sélectionnable.
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[var(--radius)] border border-accent bg-accent-soft p-4">
      <p className="text-[13px] font-semibold text-accent">
        Lien à transmettre à l&apos;intervenant
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-accent">
        Il n&apos;est affiché qu&apos;une fois. Copiez-le maintenant : ensuite, il faudra en
        générer un nouveau.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="h-9 min-w-0 flex-1 rounded-[var(--radius)] border border-line bg-surface px-3 text-[12px] text-ink"
          aria-label="Lien de la demande"
        />
        <Button type="button" size="sm" onClick={copy}>
          {copied ? <IconCheck className="h-4 w-4" /> : <IconCopy className="h-4 w-4" />}
          {copied ? "Copié" : "Copier"}
        </Button>
      </div>
    </div>
  );
}
