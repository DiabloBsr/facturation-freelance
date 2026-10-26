"use client";

import { useMemo, useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { buttonClass, SubmitButton } from "@/components/ui/button";
import { MoneyInput, QuantityInput } from "@/components/ui/money-input";
import { IconPlus, IconTrash } from "@/components/icons";
import { computePayoutLine } from "@/lib/payout";
import { formatMoney, milliToInputValue, MILLI, type CurrencyFormat } from "@/lib/money";
import { PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from "@/lib/enums";
import { submitPayoutRequest } from "@/server/actions/payout-requests";

const UNITS = ["heure", "jour", "forfait", "mois", "unité"];

type Line = { label: string; quantity: number; unit: string; unitPrice: number };

const EMPTY_LINE: Line = { label: "", quantity: 1000, unit: "heure", unitPrice: 0 };

export function RequestForm({
  token,
  beneficiaryName,
  companyName,
  subject,
  expiresAt,
  defaultEmail,
  currency,
}: {
  token: string;
  beneficiaryName: string;
  companyName: string;
  subject: string | null;
  expiresAt: string;
  defaultEmail: string | null;
  currency: CurrencyFormat;
}) {
  const [lines, setLines] = useState<Line[]>([EMPTY_LINE]);

  const amounts = useMemo(
    () => lines.map((line) => computePayoutLine(line, currency.decimals)),
    [lines, currency.decimals],
  );
  const total = amounts.reduce((sum, amount) => sum + amount, 0);

  const patch = (index: number, changes: Partial<Line>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...changes } : l)));

  return (
    <form action={submitPayoutRequest} className="grid gap-6">
      <input type="hidden" name="token" value={token} />

      <header>
        <h1 className="text-lg font-semibold tracking-tight text-ink">
          Votre facture pour {companyName}
        </h1>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          Bonjour {beneficiaryName}, détaillez ci-dessous vos prestations. Les montants sont
          en {currency.code}. Ce lien reste valable jusqu&apos;au {expiresAt} et ne peut être
          utilisé qu&apos;une fois.
        </p>
        {subject && (
          <p className="mt-3 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2.5 text-[13px] leading-relaxed text-ink">
            {subject}
          </p>
        )}
      </header>

      {/* ------------------------------ Prestations ------------------------ */}
      <section>
        <h2 className="text-sm font-semibold tracking-tight text-ink">Prestations</h2>

        <div className="mt-3 flex flex-col gap-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="rounded-[var(--radius)] border border-line bg-surface-2 p-3"
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-2">
                  <Input
                    name="lineLabel"
                    value={line.label}
                    onChange={(event) => patch(index, { label: event.target.value })}
                    placeholder="Développement — juin 2026"
                    className="h-9 bg-surface"
                    aria-label="Désignation de la prestation"
                  />

                  <div className="grid gap-2 sm:grid-cols-[6rem_7rem_minmax(0,1fr)]">
                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                        Quantité
                      </label>
                      <QuantityInput
                        value={line.quantity}
                        onChange={(quantity) => patch(index, { quantity })}
                        className="h-9 bg-surface"
                      />
                      <input
                        type="hidden"
                        name="lineQuantity"
                        value={String(line.quantity / MILLI)}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                        Unité
                      </label>
                      <Input
                        name="lineUnit"
                        list="request-units"
                        value={line.unit}
                        onChange={(event) => patch(index, { unit: event.target.value })}
                        className="h-9 bg-surface text-[13px]"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                        Prix unitaire
                      </label>
                      <MoneyInput
                        value={line.unitPrice}
                        onChange={(unitPrice) => patch(index, { unitPrice })}
                        decimals={currency.decimals}
                        suffix={currency.symbol}
                        className="h-9 bg-surface"
                      />
                      <input
                        type="hidden"
                        name="lineUnitPrice"
                        value={milliToInputValue(line.unitPrice, currency.decimals)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex w-28 shrink-0 flex-col items-end gap-1">
                  <span className="tnum text-sm font-semibold text-ink">
                    {formatMoney(amounts[index] ?? 0, currency)}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                      className="rounded p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      aria-label="Retirer la ligne"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <datalist id="request-units">
          {UNITS.map((unit) => (
            <option key={unit} value={unit} />
          ))}
        </datalist>

        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setLines((c) => [...c, { ...EMPTY_LINE }])}
            className={buttonClass("secondary", "sm")}
          >
            <IconPlus className="h-4 w-4" />
            Ajouter une prestation
          </button>

          <div className="flex items-baseline gap-2 rounded-[var(--radius)] bg-accent-soft px-3 py-2">
            <span className="text-[13px] font-semibold text-accent">Total</span>
            <span className="tnum text-base font-semibold text-accent">
              {formatMoney(total, currency)}
            </span>
          </div>
        </div>
      </section>

      {/* ------------------------------ Paiement --------------------------- */}
      <section className="border-t border-line pt-5">
        <h2 className="text-sm font-semibold tracking-tight text-ink">Vos informations</h2>

        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Votre e-mail" htmlFor="contactEmail">
            <Input
              id="contactEmail"
              name="contactEmail"
              type="email"
              defaultValue={defaultEmail ?? ""}
              placeholder="vous@exemple.com"
            />
          </Field>

          <Field label="Comment souhaitez-vous être payé ?" htmlFor="paymentMethod">
            <Select id="paymentMethod" name="paymentMethod" defaultValue="MOBILE_MONEY">
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {PAYMENT_METHOD_LABELS[method]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Coordonnées de paiement"
            htmlFor="paymentDetails"
            hint="Numéro MVola / Orange Money, RIB ou IBAN."
            className="sm:col-span-2"
          >
            <Input id="paymentDetails" name="paymentDetails" placeholder="034 12 345 67" />
          </Field>

          <Field label="Remarque" htmlFor="notes" className="sm:col-span-2">
            <Textarea id="notes" name="notes" rows={3} />
          </Field>
        </div>
      </section>

      <div className="border-t border-line pt-5">
        <SubmitButton className="w-full" pendingLabel="Envoi…">
          Envoyer ma facture
        </SubmitButton>
        <p className="mt-2 text-center text-[11px] text-faint">
          Une fois envoyée, votre déclaration ne pourra plus être modifiée.
        </p>
      </div>
    </form>
  );
}
