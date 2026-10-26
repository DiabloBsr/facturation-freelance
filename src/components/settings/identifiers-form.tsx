"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { buttonClass, SubmitButton } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@/components/icons";
import { IDENTIFIER_PRESETS } from "@/lib/enums";

type Row = { label: string; value: string; showOnPdf: boolean };

/**
 * Liste libre d'identifiants légaux : NIF et STAT à Madagascar, SIRET et
 * n° de TVA en France, etc. Chaque ligne peut être masquée du PDF sans être
 * supprimée.
 */
export function IdentifiersForm({
  action,
  identifiers,
}: {
  action: (formData: FormData) => void | Promise<void>;
  identifiers: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(
    identifiers.length > 0
      ? identifiers
      : [
          { label: "NIF", value: "", showOnPdf: true },
          { label: "STAT", value: "", showOnPdf: true },
          { label: "RCS", value: "", showOnPdf: true },
        ],
  );

  const patch = (index: number, changes: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  return (
    <form action={action}>
      <Card>
        <CardHeader
          title="Identifiants légaux"
          description="NIF, STAT, RCS, numéro de TVA… Ils sont imprimés sur chaque document. Laissez une valeur vide pour la masquer temporairement."
        />

        <div className="mt-4 flex flex-col gap-2">
          <div className="hidden grid-cols-[10rem_minmax(0,1fr)_6.5rem_2.5rem] gap-2 px-1 sm:grid">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Intitulé
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Numéro
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-faint">
              Sur le PDF
            </span>
            <span />
          </div>

          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_6.5rem_2.5rem] sm:items-center"
            >
              <Input
                name="identifierLabel"
                value={row.label}
                onChange={(event) => patch(index, { label: event.target.value })}
                list="company-identifier-presets"
                placeholder="NIF"
                aria-label="Intitulé de l'identifiant"
              />
              <Input
                name="identifierValue"
                value={row.value}
                onChange={(event) => patch(index, { value: event.target.value })}
                placeholder="Numéro"
                aria-label="Valeur de l'identifiant"
                className="font-mono text-[13px]"
              />
              <label className="flex items-center gap-2 text-[12px] text-muted">
                <input
                  type="checkbox"
                  checked={row.showOnPdf}
                  onChange={(event) => patch(index, { showOnPdf: event.target.checked })}
                  className="h-4 w-4 accent-[var(--accent)]"
                />
                Afficher
              </label>
              <input
                type="hidden"
                name="identifierShow"
                value={row.showOnPdf ? "1" : "0"}
              />
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label="Retirer cet identifiant"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <datalist id="company-identifier-presets">
          {IDENTIFIER_PRESETS.map((preset) => (
            <option key={preset.label} value={preset.label}>
              {preset.hint}
            </option>
          ))}
        </datalist>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() =>
              setRows((current) => [...current, { label: "", value: "", showOnPdf: true }])
            }
            className={buttonClass("secondary", "sm")}
          >
            <IconPlus className="h-4 w-4" />
            Ajouter un identifiant
          </button>
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer les identifiants</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
