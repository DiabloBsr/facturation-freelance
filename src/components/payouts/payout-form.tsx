"use client";

import { useMemo, useState } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { buttonClass, SubmitButton } from "@/components/ui/button";
import { MoneyInput, QuantityInput } from "@/components/ui/money-input";
import { IconPlus, IconTrash } from "@/components/icons";
import { computePayout } from "@/lib/payout";
import {
  formatMoney,
  milliToInputValue,
  MILLI,
  type CurrencyFormat,
} from "@/lib/money";

export type PayoutFormValues = {
  id?: string;
  beneficiaryId: string;
  documentId: string | null;
  date: string;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
  bankFees: number;
  reference: string | null;
  notes: string | null;
  lines: { label: string; quantity: number; unit: string; unitPrice: number }[];
  adjustments: { label: string; amount: number }[];
};

type Currency = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  symbolAfter: boolean;
};

const UNITS = ["heure", "jour", "forfait", "mois", "unité"];

export function PayoutForm({
  action,
  values,
  requestId,
  beneficiaries,
  documents,
  currencies,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  values: PayoutFormValues;
  /** Déclaration d'intervenant dont ce justificatif est issu, le cas échéant. */
  requestId?: string;
  beneficiaries: { id: string; name: string; kind: string }[];
  documents: { id: string; label: string }[];
  currencies: Currency[];
  submitLabel: string;
}) {
  const [lines, setLines] = useState(values.lines);
  const [adjustments, setAdjustments] = useState(values.adjustments);
  const [sourceCode, setSourceCode] = useState(values.sourceCurrency);
  const [targetCode, setTargetCode] = useState(values.targetCurrency);
  const [rateText, setRateText] = useState(String(values.exchangeRate));
  const [bankFees, setBankFees] = useState(values.bankFees);

  const format = (code: string): CurrencyFormat => {
    const found = currencies.find((c) => c.code === code);
    return found
      ? { code: found.code, symbol: found.symbol, decimals: found.decimals, symbolAfter: found.symbolAfter }
      : { code, symbol: code, decimals: 2, symbolAfter: true };
  };

  const source = format(sourceCode);
  const target = format(targetCode);

  const exchangeRate = useMemo(() => {
    const parsed = Number(rateText.replace(",", "."));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [rateText]);

  const computed = useMemo(
    () =>
      computePayout({
        lines,
        exchangeRate,
        bankFees,
        adjustments,
        sourceDecimals: source.decimals,
        targetDecimals: target.decimals,
      }),
    [lines, exchangeRate, bankFees, adjustments, source.decimals, target.decimals],
  );

  const patchLine = (index: number, changes: Partial<(typeof lines)[number]>) =>
    setLines((current) => current.map((l, i) => (i === index ? { ...l, ...changes } : l)));

  const patchAdjustment = (index: number, changes: Partial<(typeof adjustments)[number]>) =>
    setAdjustments((current) => current.map((a, i) => (i === index ? { ...a, ...changes } : a)));

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      {requestId && <input type="hidden" name="requestId" value={requestId} />}

      <div className="flex min-w-0 flex-col gap-5">
        <Card>
          <CardHeader
            title="Bénéficiaire"
            description="À qui ce reversement est destiné, et sur quelle facture il s'appuie."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Sous-traitant" required>
              <Select name="beneficiaryId" defaultValue={values.beneficiaryId} required>
                <option value="">— Sélectionner —</option>
                {beneficiaries.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Date du reversement" required>
              <Input type="date" name="date" defaultValue={values.date} required />
            </Field>

            <Field
              label="Facture d'origine"
              hint="Celle que votre client vous a réglée."
              className="sm:col-span-2"
            >
              <Select name="documentId" defaultValue={values.documentId ?? ""}>
                <option value="">— Aucune —</option>
                {documents.map((document) => (
                  <option key={document.id} value={document.id}>
                    {document.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Référence du virement" className="sm:col-span-2">
              <Input
                name="reference"
                defaultValue={values.reference ?? ""}
                placeholder="N° de virement, réf. MVola…"
              />
            </Field>
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        <Card padded={false}>
          <div className="border-b border-line px-5 py-4">
            <CardHeader
              title="Prestations à reverser"
              description={`Ce que le sous-traitant a réalisé, dans la devise de la facture (${source.code}).`}
            />
          </div>

          <div className="flex flex-col divide-y divide-[var(--border)]">
            {lines.map((line, index) => (
              <div key={index} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="tnum mt-2.5 w-4 shrink-0 text-right text-[11px] text-faint">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      name="lineLabel"
                      value={line.label}
                      onChange={(event) => patchLine(index, { label: event.target.value })}
                      placeholder="Assistance — juin 2026"
                      className="h-9"
                      aria-label="Désignation"
                    />

                    <div className="grid gap-2 sm:grid-cols-[6rem_7rem_minmax(0,1fr)]">
                      <div>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                          Quantité
                        </label>
                        <QuantityInput
                          value={line.quantity}
                          onChange={(quantity) => patchLine(index, { quantity })}
                          className="h-9"
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
                          list="payout-units"
                          value={line.unit}
                          onChange={(event) => patchLine(index, { unit: event.target.value })}
                          className="h-9 text-[13px]"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                          Prix unitaire
                        </label>
                        <MoneyInput
                          value={line.unitPrice}
                          onChange={(unitPrice) => patchLine(index, { unitPrice })}
                          decimals={source.decimals}
                          suffix={source.symbol}
                          className="h-9"
                        />
                        <input
                          type="hidden"
                          name="lineUnitPrice"
                          value={milliToInputValue(line.unitPrice, source.decimals)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex w-28 shrink-0 flex-col items-end gap-1">
                    <span className="tnum text-sm font-semibold text-ink">
                      {formatMoney(computed.lineAmounts[index] ?? 0, source)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setLines((c) => c.filter((_, i) => i !== index))}
                      className="rounded p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                      aria-label="Retirer la ligne"
                    >
                      <IconTrash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <datalist id="payout-units">
            {UNITS.map((unit) => (
              <option key={unit} value={unit} />
            ))}
          </datalist>

          <div className="border-t border-line px-5 py-3">
            <button
              type="button"
              onClick={() =>
                setLines((c) => [
                  ...c,
                  { label: "", quantity: 1000, unit: "heure", unitPrice: 0 },
                ])
              }
              className={buttonClass("secondary", "sm")}
            >
              <IconPlus className="h-4 w-4" />
              Ajouter une prestation
            </button>
          </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        <Card>
          <CardHeader
            title="Conversion et frais"
            description="Le cours est celui appliqué par votre banque à l'encaissement — pas le cours mondial du jour. Il se saisit à la main."
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Devise reçue">
              <Select
                name="sourceCurrency"
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Devise reversée">
              <Select
                name="targetCurrency"
                value={targetCode}
                onChange={(event) => setTargetCode(event.target.value)}
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={`Cours de la banque — 1 ${source.code} = ? ${target.code}`}
              required
              hint="Relevez-le sur votre avis de crédit."
            >
              <Input
                name="exchangeRate"
                value={rateText}
                onChange={(event) => setRateText(event.target.value)}
                inputMode="decimal"
                className="tnum text-right"
                placeholder="4900"
                required
              />
            </Field>

            <Field label={`Frais de banque (${target.code})`}>
              <MoneyInput
                value={bankFees}
                onChange={setBankFees}
                decimals={target.decimals}
                suffix={target.symbol}
              />
              <input
                type="hidden"
                name="bankFees"
                value={milliToInputValue(bankFees, target.decimals)}
              />
            </Field>
          </div>

          {/* Divers : positifs comme négatifs. */}
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-[13px] font-medium text-ink">Divers</p>
            <p className="mt-0.5 text-[12px] text-muted">
              Tout ce qui s&apos;ajoute ou se retranche en {target.code} : avance déjà versée,
              remboursement, arrondi. Un montant négatif retranche.
            </p>

            <div className="mt-3 flex flex-col gap-2">
              {adjustments.map((adjustment, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    name="adjustmentLabel"
                    value={adjustment.label}
                    onChange={(event) => patchAdjustment(index, { label: event.target.value })}
                    placeholder="Avance versée le 12/07"
                    className="h-9 flex-1 text-[13px]"
                    aria-label="Libellé du divers"
                  />
                  <div className="w-40">
                    <MoneyInput
                      value={adjustment.amount}
                      onChange={(amount) => patchAdjustment(index, { amount })}
                      decimals={target.decimals}
                      suffix={target.symbol}
                      className="h-9"
                    />
                  </div>
                  <input
                    type="hidden"
                    name="adjustmentAmount"
                    value={milliToInputValue(adjustment.amount, target.decimals)}
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustments((c) => c.filter((_, i) => i !== index))}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                    aria-label="Retirer ce divers"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setAdjustments((c) => [...c, { label: "", amount: 0 }])}
                className={buttonClass("secondary", "sm", "w-fit")}
              >
                <IconPlus className="h-4 w-4" />
                Ajouter un divers
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title="Note" />
          <div className="mt-3">
            <Textarea name="notes" defaultValue={values.notes ?? ""} rows={3} />
          </div>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col gap-5 lg:sticky lg:top-6 lg:self-start">
        <Card>
          <CardHeader title="Décompte" />

          <dl className="mt-4 space-y-2 text-[13px]">
            <Row
              label={`Total des prestations`}
              value={formatMoney(computed.totalSource, source)}
              strong
            />
            <Row
              label={`× cours ${exchangeRate > 0 ? exchangeRate : "—"}`}
              value=""
              tone="muted"
            />
            <div className="border-t border-line pt-2">
              <Row
                label="Montant converti"
                value={formatMoney(computed.totalConverted, target)}
                strong
              />
            </div>

            {computed.totalFees !== 0 && (
              <Row
                label="Frais de banque"
                value={`− ${formatMoney(computed.totalFees, target)}`}
                tone="muted"
              />
            )}

            {adjustments.map((adjustment, index) => (
              <Row
                key={index}
                label={adjustment.label || "Divers"}
                value={`${adjustment.amount < 0 ? "" : "+ "}${formatMoney(adjustment.amount, target)}`}
                tone="muted"
              />
            ))}

            <div className="mt-1 flex items-center justify-between gap-2 rounded-[var(--radius)] bg-accent-soft px-3 py-2.5">
              <span className="text-[13px] font-semibold text-accent">Net à reverser</span>
              <span className="tnum text-base font-semibold text-accent">
                {formatMoney(computed.netPayable, target)}
              </span>
            </div>
          </dl>

          {exchangeRate === 0 && (
            <p className="mt-3 text-[12px] leading-relaxed text-warning">
              Saisissez le cours de la banque pour obtenir le montant converti.
            </p>
          )}

          <div className="mt-4 border-t border-line pt-4">
            <SubmitButton className="w-full" pendingLabel="Enregistrement…">
              {submitLabel}
            </SubmitButton>
          </div>
        </Card>
      </div>
    </form>
  );
}

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "muted";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={tone === "muted" ? "text-muted" : "text-ink"}>{label}</dt>
      <dd className={`tnum ${tone === "muted" ? "text-muted" : "text-ink"} ${strong ? "font-semibold" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
