"use client";

import { useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { buttonClass, SubmitButton } from "@/components/ui/button";
import { IconPlus, IconTrash } from "@/components/icons";
import { bpToInputValue } from "@/lib/money";

type Row = { id: string; label: string; rate: string; isDefault: boolean };

export function VatRatesForm({
  action,
  rates,
}: {
  action: (formData: FormData) => void | Promise<void>;
  rates: { id: string; label: string; rate: number; isDefault: boolean }[];
}) {
  const [rows, setRows] = useState<Row[]>(
    rates.map((rate) => ({
      id: rate.id,
      label: rate.label,
      rate: bpToInputValue(rate.rate),
      isDefault: rate.isDefault,
    })),
  );

  const patch = (index: number, changes: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...changes } : row)));

  const defaultId = rows.find((row) => row.isDefault)?.id ?? "";

  return (
    <form action={action}>
      <Card>
        <CardHeader
          title="Taux de TVA disponibles"
          description="Les taux proposés dans l'éditeur de lignes. À Madagascar, la TVA est de 20 % ; le taux 0 % couvre l'exonération."
        />

        <input type="hidden" name="defaultVatId" value={defaultId} />

        <div className="mt-4 flex flex-col gap-2">
          {rows.map((row, index) => (
            <div
              key={index}
              className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_6rem_7rem_2.5rem] sm:items-center"
            >
              <input type="hidden" name="vatId" value={row.id} />
              <Input
                name="vatLabel"
                value={row.label}
                onChange={(event) => patch(index, { label: event.target.value })}
                placeholder="Intitulé"
                aria-label="Intitulé du taux"
              />
              <div className="relative">
                <Input
                  name="vatRate"
                  value={row.rate}
                  onChange={(event) => patch(index, { rate: event.target.value })}
                  inputMode="decimal"
                  className="tnum pr-7 text-right"
                  aria-label="Taux en pourcentage"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
                  %
                </span>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-muted">
                <input
                  type="radio"
                  name="defaultRadio"
                  checked={row.isDefault}
                  onChange={() =>
                    setRows((current) =>
                      current.map((item, i) => ({ ...item, isDefault: i === index })),
                    )
                  }
                  className="h-3.5 w-3.5 accent-[var(--accent)]"
                />
                Par défaut
              </label>
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                className="flex h-10 w-10 items-center justify-center rounded-[var(--radius)] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                aria-label="Retirer ce taux"
              >
                <IconTrash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() =>
              setRows((current) => [
                ...current,
                { id: "", label: "", rate: "0", isDefault: false },
              ])
            }
            className={buttonClass("secondary", "sm")}
          >
            <IconPlus className="h-4 w-4" />
            Ajouter un taux
          </button>
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer les taux</SubmitButton>
        </div>
      </Card>
    </form>
  );
}
