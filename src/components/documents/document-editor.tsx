"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Button, buttonClass, Spinner } from "@/components/ui/button";
import { MoneyInput, QuantityInput, RateInput } from "@/components/ui/money-input";
import { useToast } from "@/components/ui/toast";
import {
  IconBack,
  IconCopy,
  IconPlus,
  IconTrash,
} from "@/components/icons";
import { cn } from "@/lib/cn";
import { computeDocument } from "@/lib/compute";
import {
  DISCOUNT_TYPES,
  DISCOUNT_TYPE_LABELS,
  DOCUMENT_TYPE_LABELS,
  LINE_KINDS,
  LINE_KIND_LABELS,
  LINE_UNITS,
  VAT_MODES,
  VAT_MODE_LABELS,
  isBillableLine,
  type DiscountType,
  type DocumentType,
  type LineKind,
  type VatMode,
} from "@/lib/enums";
import { formatMoney, formatRate, type CurrencyFormat } from "@/lib/money";
import { emptyLine, type DocumentPayload, type LinePayload } from "@/lib/document-payload";
import { TEMPLATES } from "@/lib/templates";
import { saveDocument } from "@/server/actions/documents";

export type EditorParty = {
  id: string;
  name: string;
  kind: string;
  currency: string;
  vatRate: number | null;
  paymentTermsDays: number | null;
  withholdingRate: number;
  contacts: { id: string; label: string }[];
};

export type EditorMission = {
  id: string;
  title: string;
  clientId: string;
  agencyId: string | null;
  billTo: string;
  currency: string;
  vatRate: number | null;
  purchaseOrder: string | null;
};

export type EditorCurrency = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  symbolAfter: boolean;
  rateToBase: number;
};

export type EditorDeposit = {
  id: string;
  number: string | null;
  subject: string | null;
  issueDate: string;
  total: number;
  currency: string;
  billToId: string;
};

/** Déclaration envoyée par un intervenant, prête à être versée dans le document. */
export type EditorPayoutRequest = {
  id: string;
  beneficiaryName: string;
  currency: string;
  total: number;
  lines: { label: string; quantity: number; unit: string; unitPrice: number }[];
};

/**
 * Ligne de l'éditeur : la ligne enregistrable, plus la trace de la déclaration
 * d'intervenant dont elle provient.
 *
 * `originRequestId` ne fait pas partie du schéma du document — zod l'écarte à
 * l'enregistrement. Il ne vit que le temps de l'édition, et c'est lui qui dit
 * quelles déclarations sont encore présentes à l'écran : retirer les lignes
 * d'une déclaration la rend aussitôt sélectionnable à nouveau.
 */
type EditorLine = LinePayload & { originRequestId?: string };

type EditorDocument = Omit<DocumentPayload, "lines"> & { lines: EditorLine[] };

export function DocumentEditor({
  initial,
  parties,
  missions,
  currencies,
  vatRates,
  bankAccounts,
  deposits,
  payoutRequests = [],
  numberPreview,
  isNew,
}: {
  initial: DocumentPayload;
  parties: EditorParty[];
  missions: EditorMission[];
  currencies: EditorCurrency[];
  vatRates: { id: string; label: string; rate: number }[];
  bankAccounts: { id: string; label: string; kind: string }[];
  deposits: EditorDeposit[];
  payoutRequests?: EditorPayoutRequest[];
  numberPreview: string;
  isNew: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [doc, setDoc] = useState<EditorDocument>(initial);
  const [requestToImport, setRequestToImport] = useState("");

  const currency: CurrencyFormat = useMemo(() => {
    const found = currencies.find((c) => c.code === doc.currency);
    return found
      ? {
          code: found.code,
          symbol: found.symbol,
          decimals: found.decimals,
          symbolAfter: found.symbolAfter,
        }
      : { code: doc.currency, symbol: doc.currency, decimals: 2, symbolAfter: true };
  }, [currencies, doc.currency]);

  // Seuls les acomptes du même tiers et de la même devise sont déductibles.
  const availableDeposits = useMemo(
    () =>
      deposits.filter(
        (deposit) => deposit.billToId === doc.billToId && deposit.currency === doc.currency,
      ),
    [deposits, doc.billToId, doc.currency],
  );

  const selectedDeposits = useMemo(
    () => availableDeposits.filter((deposit) => doc.depositIds.includes(deposit.id)),
    [availableDeposits, doc.depositIds],
  );

  const computed = useMemo(
    () =>
      computeDocument({
        lines: doc.lines,
        vatMode: doc.vatMode,
        discountType: doc.discountType,
        discountValue: doc.discountValue,
        withholdingRate: doc.withholdingRate,
        totalDeposits: selectedDeposits.reduce((sum, deposit) => sum + deposit.total, 0),
        decimals: currency.decimals,
      }),
    [doc, selectedDeposits, currency.decimals],
  );

  const patch = (changes: Partial<DocumentPayload>) =>
    setDoc((current) => ({ ...current, ...changes }));

  const patchLine = (index: number, changes: Partial<LinePayload>) =>
    setDoc((current) => ({
      ...current,
      lines: current.lines.map((line, i) => (i === index ? { ...line, ...changes } : line)),
    }));

  const addLine = () =>
    setDoc((current) => ({
      ...current,
      lines: [
        ...current.lines,
        emptyLine(current.lines.at(-1)?.vatRate ?? vatRates[0]?.rate ?? 0),
      ],
    }));

  const removeLine = (index: number) =>
    setDoc((current) => ({
      ...current,
      lines: current.lines.filter((_, i) => i !== index),
    }));

  const duplicateLine = (index: number) =>
    setDoc((current) => {
      const copy = [...current.lines];
      copy.splice(index + 1, 0, { ...current.lines[index], id: undefined });
      return { ...current, lines: copy };
    });

  const moveLine = (index: number, direction: -1 | 1) =>
    setDoc((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.lines.length) return current;
      const copy = [...current.lines];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return { ...current, lines: copy };
    });

  // Déclarations d'intervenants versables ici : celles de la devise du
  // document. Additionner deux devises fausserait tous les totaux.
  // Les déjà reprises restent listées, mais grisées : la liste ne bouge pas
  // sous la souris, et on voit d'un coup d'œil ce qui a déjà été versé.
  const requestsInCurrency = useMemo(
    () => payoutRequests.filter((request) => request.currency === doc.currency),
    [payoutRequests, doc.currency],
  );

  // Déclarations dont au moins une ligne figure encore dans le document. Se
  // déduit des lignes elles-mêmes : supprimer les lignes issues d'une
  // déclaration la remet automatiquement à disposition, sans rien à défaire.
  const importedRequestIds = useMemo(
    () =>
      new Set(
        doc.lines
          .map((line) => line.originRequestId)
          .filter((id): id is string => Boolean(id)),
      ),
    [doc.lines],
  );

  const isImported = (id: string) => importedRequestIds.has(id);

  /**
   * Verse les prestations déclarées à la suite des lignes du document.
   * Les prix sont repris tels quels — c'est ce que l'intervenant facture ; la
   * marge se fixe ensuite ligne à ligne, comme sur n'importe quelle prestation.
   */
  const importRequest = (request: EditorPayoutRequest) =>
    setDoc((current) => {
      // Garde-fou : une déclaration ne peut être versée qu'une fois, quoi qu'il
      // arrive côté interface (double clic, retour en arrière).
      if (current.lines.some((line) => line.originRequestId === request.id)) return current;

      const vatRate = current.lines.at(-1)?.vatRate ?? vatRates[0]?.rate ?? 0;
      return {
        ...current,
        lines: [
          // Une ligne encore vierge n'a pas à survivre à l'import.
          ...current.lines.filter((line) => line.label.trim() !== "" || line.unitPrice !== 0),
          ...request.lines.map((line) => ({
            ...emptyLine(vatRate),
            label: line.label,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            originRequestId: request.id,
          })),
        ],
      };
    });

  /** Sélectionner un tiers reprend ses conditions par défaut. */
  const onBillToChange = (partyId: string) => {
    const party = parties.find((p) => p.id === partyId);
    patch({
      billToId: partyId,
      contactId: null,
      ...(party
        ? {
            currency: party.currency,
            exchangeRate:
              currencies.find((c) => c.code === party.currency)?.rateToBase ?? doc.exchangeRate,
            paymentTermsDays: party.paymentTermsDays ?? doc.paymentTermsDays,
            withholdingRate: party.withholdingRate || doc.withholdingRate,
          }
        : {}),
    });
  };

  const onMissionChange = (missionId: string) => {
    if (!missionId) {
      patch({ missionId: null });
      return;
    }
    const mission = missions.find((m) => m.id === missionId);
    if (!mission) return;

    const billToId =
      mission.billTo === "AGENCY" && mission.agencyId ? mission.agencyId : mission.clientId;

    patch({
      missionId,
      billToId,
      endClientId: mission.billTo === "AGENCY" && mission.agencyId ? mission.clientId : null,
      currency: mission.currency,
      exchangeRate:
        currencies.find((c) => c.code === mission.currency)?.rateToBase ?? doc.exchangeRate,
      purchaseOrder: mission.purchaseOrder ?? doc.purchaseOrder,
      subject: doc.subject ?? mission.title,
    });
  };

  const onCurrencyChange = (code: string) => {
    const found = currencies.find((c) => c.code === code);
    patch({ currency: code, exchangeRate: found?.rateToBase ?? 1 });
  };

  const contacts = parties.find((p) => p.id === doc.billToId)?.contacts ?? [];
  const clients = parties.filter((p) => p.kind === "CLIENT");
  const agencies = parties.filter((p) => p.kind === "AGENCY");

  const onSave = () => {
    startTransition(async () => {
      // Seules les déclarations dont les lignes ont survécu jusqu'ici sont
      // rattachées au document : ce sont les lignes qui font foi, pas l'import.
      const result = await saveDocument({
        ...doc,
        payoutRequestIds: [...importedRequestIds],
      });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      toast(isNew ? "Document créé." : "Modifications enregistrées.");
      router.push(`/documents/${result.id}`);
      router.refresh();
    });
  };

  const typeLabel = DOCUMENT_TYPE_LABELS[doc.type as DocumentType];

  return (
    <div className="pb-16">
      {/* Barre d'action collante */}
      <div className="no-print sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={doc.id ? `/documents/${doc.id}` : "/factures"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line text-muted transition-colors hover:bg-surface-hover hover:text-ink"
              aria-label="Retour"
            >
              <IconBack className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">
                {isNew ? `Nouveau ${typeLabel.toLowerCase()}` : `${typeLabel} ${numberPreview}`}
              </h1>
              <p className="text-[11px] text-faint">
                {doc.id
                  ? "Modification"
                  : `Numéro attribué à la validation : ${numberPreview}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="tnum hidden text-[13px] text-muted sm:block">
              Total{" "}
              <strong className="font-semibold text-ink">
                {formatMoney(computed.total, currency)}
              </strong>
            </span>
            <Button onClick={onSave} disabled={pending}>
              {pending && <Spinner />}
              {pending ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-8">
        {/* ------------------------------------------------------------- */}
        {/* Colonne principale                                            */}
        {/* ------------------------------------------------------------- */}
        <div className="flex min-w-0 flex-col gap-5">
          <Card>
            <CardHeader
              title="Destinataire"
              description="La facture part chez le client final ou chez l'agence qui vous mandate."
            />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Facturer à" required htmlFor="billTo">
                <Select
                  id="billTo"
                  value={doc.billToId}
                  onChange={(event) => onBillToChange(event.target.value)}
                >
                  <option value="">— Sélectionner —</option>
                  {agencies.length > 0 && (
                    <optgroup label="Agences">
                      {agencies.map((party) => (
                        <option key={party.id} value={party.id}>
                          {party.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Clients">
                    {clients.map((party) => (
                      <option key={party.id} value={party.id}>
                        {party.name}
                      </option>
                    ))}
                  </optgroup>
                </Select>
              </Field>

              <Field
                label="Client final"
                hint="À renseigner quand vous facturez via une agence."
                htmlFor="endClient"
              >
                <Select
                  id="endClient"
                  value={doc.endClientId ?? ""}
                  onChange={(event) => patch({ endClientId: event.target.value || null })}
                >
                  <option value="">— Aucun —</option>
                  {clients.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Contact" htmlFor="contact">
                <Select
                  id="contact"
                  value={doc.contactId ?? ""}
                  onChange={(event) => patch({ contactId: event.target.value || null })}
                  disabled={contacts.length === 0}
                >
                  <option value="">
                    {contacts.length === 0 ? "Aucun contact enregistré" : "— Aucun —"}
                  </option>
                  {contacts.map((contact) => (
                    <option key={contact.id} value={contact.id}>
                      {contact.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Mission" htmlFor="mission">
                <Select
                  id="mission"
                  value={doc.missionId ?? ""}
                  onChange={(event) => onMissionChange(event.target.value)}
                >
                  <option value="">— Aucune —</option>
                  {missions.map((mission) => (
                    <option key={mission.id} value={mission.id}>
                      {mission.title}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Objet" className="sm:col-span-2" htmlFor="subject">
                <Input
                  id="subject"
                  value={doc.subject ?? ""}
                  onChange={(event) => patch({ subject: event.target.value || null })}
                  placeholder="Développement de la plateforme — juillet 2026"
                />
              </Field>
            </div>
          </Card>

          <Card>
            <CardHeader title="Dates et conditions" />
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Field label="Date d'émission" required htmlFor="issueDate">
                <Input
                  id="issueDate"
                  type="date"
                  value={doc.issueDate}
                  onChange={(event) => patch({ issueDate: event.target.value })}
                />
              </Field>

              {doc.type === "QUOTE" ? (
                <Field label="Valable jusqu'au" htmlFor="validUntil">
                  <Input
                    id="validUntil"
                    type="date"
                    value={doc.validUntil ?? ""}
                    onChange={(event) => patch({ validUntil: event.target.value || null })}
                  />
                </Field>
              ) : (
                <Field
                  label="Échéance"
                  hint="Vide = émission + délai de paiement."
                  htmlFor="dueDate"
                >
                  <Input
                    id="dueDate"
                    type="date"
                    value={doc.dueDate ?? ""}
                    onChange={(event) => patch({ dueDate: event.target.value || null })}
                  />
                </Field>
              )}

              <Field label="Délai de paiement" htmlFor="terms">
                <div className="relative">
                  <Input
                    id="terms"
                    type="number"
                    min={0}
                    max={365}
                    className="tnum pr-14 text-right"
                    value={doc.paymentTermsDays}
                    onChange={(event) =>
                      patch({ paymentTermsDays: Number(event.target.value) || 0 })
                    }
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
                    jours
                  </span>
                </div>
              </Field>

              <Field label="Date de la prestation" htmlFor="serviceDate">
                <Input
                  id="serviceDate"
                  type="date"
                  value={doc.serviceDate ?? ""}
                  onChange={(event) => patch({ serviceDate: event.target.value || null })}
                />
              </Field>

              <Field label="Devise" htmlFor="currency">
                <Select
                  id="currency"
                  value={doc.currency}
                  onChange={(event) => onCurrencyChange(event.target.value)}
                >
                  {currencies.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Bon de commande" htmlFor="po">
                <Input
                  id="po"
                  value={doc.purchaseOrder ?? ""}
                  onChange={(event) => patch({ purchaseOrder: event.target.value || null })}
                  placeholder="Référence du client"
                />
              </Field>
            </div>
          </Card>

          {/* --------------------------- Lignes --------------------------- */}
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
              <CardHeader
                title="Prestations"
                description={`${doc.lines.filter((l) => isBillableLine(l.kind)).length} ligne(s) facturable(s)`}
              />
              <div className="w-56">
                <Select
                  value={doc.vatMode}
                  onChange={(event) => patch({ vatMode: event.target.value as VatMode })}
                  aria-label="Mode de TVA"
                >
                  {VAT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {VAT_MODE_LABELS[mode]}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-[var(--border)]">
              {doc.lines.map((line, index) => {
                const billable = isBillableLine(line.kind);
                const totals = computed.lines[index];

                return (
                  <div key={index} className="group px-5 py-4 transition-colors hover:bg-surface-2">
                    <div className="flex items-start gap-3">
                      <span className="tnum mt-2.5 w-5 shrink-0 text-right text-[11px] font-medium text-faint">
                        {index + 1}
                      </span>

                      <div className="min-w-0 flex-1 space-y-3">
                        <div className="grid gap-2 sm:grid-cols-[9rem_minmax(0,1fr)]">
                          <Select
                            value={line.kind}
                            onChange={(event) =>
                              patchLine(index, { kind: event.target.value as LineKind })
                            }
                            aria-label="Type de ligne"
                            className="h-9 text-[13px]"
                          >
                            {LINE_KINDS.map((kind) => (
                              <option key={kind} value={kind}>
                                {LINE_KIND_LABELS[kind]}
                              </option>
                            ))}
                          </Select>

                          <Input
                            value={line.label}
                            onChange={(event) => patchLine(index, { label: event.target.value })}
                            placeholder={
                              line.kind === "SECTION"
                                ? "Titre de la section"
                                : "Désignation de la prestation"
                            }
                            className={cn(
                              "h-9",
                              line.kind === "SECTION" && "font-semibold",
                            )}
                            aria-label="Désignation"
                          />
                        </div>

                        {line.kind !== "SECTION" && (
                          <Textarea
                            value={line.description ?? ""}
                            onChange={(event) =>
                              patchLine(index, { description: event.target.value || null })
                            }
                            placeholder="Description détaillée (facultatif)"
                            className="min-h-0 resize-y py-2 text-[13px]"
                            rows={2}
                          />
                        )}

                        {billable && (
                          <div className="grid gap-2 sm:grid-cols-[5.5rem_7rem_minmax(0,1fr)_7rem_6rem]">
                            <div>
                              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                                Qté
                              </label>
                              <QuantityInput
                                value={line.quantity}
                                onChange={(quantity) => patchLine(index, { quantity })}
                                className="h-9"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                                Unité
                              </label>
                              <Input
                                list="line-units"
                                value={line.unit}
                                onChange={(event) => patchLine(index, { unit: event.target.value })}
                                className="h-9 text-[13px]"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                                Prix unitaire {doc.vatMode === "INCLUSIVE" ? "TTC" : "HT"}
                              </label>
                              <MoneyInput
                                value={line.unitPrice}
                                onChange={(unitPrice) => patchLine(index, { unitPrice })}
                                decimals={currency.decimals}
                                suffix={currency.symbol}
                                className="h-9"
                              />
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                                Remise
                              </label>
                              <div className="flex gap-1">
                                <Select
                                  value={line.discountType}
                                  onChange={(event) =>
                                    patchLine(index, {
                                      discountType: event.target.value as DiscountType,
                                      discountValue: 0,
                                    })
                                  }
                                  className="h-9 w-[4.5rem] px-2 text-[13px]"
                                  aria-label="Type de remise"
                                >
                                  <option value="NONE">—</option>
                                  <option value="PERCENT">%</option>
                                  <option value="AMOUNT">{currency.symbol}</option>
                                </Select>
                                {line.discountType === "PERCENT" && (
                                  <RateInput
                                    value={line.discountValue}
                                    onChange={(discountValue) =>
                                      patchLine(index, { discountValue })
                                    }
                                    className="h-9"
                                  />
                                )}
                                {line.discountType === "AMOUNT" && (
                                  <MoneyInput
                                    value={line.discountValue}
                                    onChange={(discountValue) =>
                                      patchLine(index, { discountValue })
                                    }
                                    decimals={currency.decimals}
                                    className="h-9"
                                  />
                                )}
                              </div>
                            </div>

                            <div>
                              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-faint">
                                TVA
                              </label>
                              <Select
                                value={String(line.vatRate)}
                                onChange={(event) =>
                                  patchLine(index, { vatRate: Number(event.target.value) })
                                }
                                disabled={doc.vatMode === "NONE"}
                                className="h-9 px-2 text-[13px]"
                                aria-label="Taux de TVA"
                              >
                                {vatRates.map((rate) => (
                                  <option key={rate.id} value={rate.rate}>
                                    {formatRate(rate.rate)}
                                  </option>
                                ))}
                                {!vatRates.some((r) => r.rate === line.vatRate) && (
                                  <option value={line.vatRate}>{formatRate(line.vatRate)}</option>
                                )}
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex w-32 shrink-0 flex-col items-end gap-1">
                        {billable && (
                          <>
                            <span className="tnum text-sm font-semibold text-ink">
                              {formatMoney(totals?.net ?? 0, currency)}
                            </span>
                            {(totals?.discount ?? 0) > 0 && (
                              <span className="tnum text-[11px] text-muted line-through">
                                {formatMoney(totals.base, currency)}
                              </span>
                            )}
                          </>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={() => moveLine(index, -1)}
                            disabled={index === 0}
                            className="rounded p-1 text-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
                            aria-label="Monter la ligne"
                          >
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                              <path d="m2.5 7.5 3.5-3.5 3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLine(index, 1)}
                            disabled={index === doc.lines.length - 1}
                            className="rounded p-1 text-faint transition-colors hover:bg-surface-hover hover:text-ink disabled:opacity-30"
                            aria-label="Descendre la ligne"
                          >
                            <svg viewBox="0 0 12 12" fill="none" className="h-3 w-3" aria-hidden="true">
                              <path d="m2.5 4.5 3.5 3.5 3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => duplicateLine(index)}
                            className="rounded p-1 text-faint transition-colors hover:bg-surface-hover hover:text-ink"
                            aria-label="Dupliquer la ligne"
                          >
                            <IconCopy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="rounded p-1 text-faint transition-colors hover:bg-danger-soft hover:text-danger"
                            aria-label="Supprimer la ligne"
                          >
                            <IconTrash className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <datalist id="line-units">
              {LINE_UNITS.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>

            <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3">
              <button type="button" onClick={addLine} className={buttonClass("secondary", "sm")}>
                <IconPlus className="h-4 w-4" />
                Ajouter une ligne
              </button>

              {/* Facture d'un intervenant : ses lignes se versent ici telles
                  qu'il les a déclarées, et les totaux se recalculent aussitôt. */}
              {payoutRequests.length > 0 &&
                (requestsInCurrency.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="w-72">
                      <Select
                        value={requestToImport}
                        onChange={(event) => setRequestToImport(event.target.value)}
                        className="h-8 text-[13px]"
                        aria-label="Facture d'un intervenant à importer"
                      >
                        <option value="">— Facture d&apos;un intervenant —</option>
                        {requestsInCurrency.map((request) => (
                          <option
                            key={request.id}
                            value={request.id}
                            disabled={isImported(request.id)}
                          >
                            {request.beneficiaryName} — {formatMoney(request.total, currency)}
                            {isImported(request.id) ? " · déjà importée" : ""}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <button
                      type="button"
                      disabled={!requestToImport || isImported(requestToImport)}
                      onClick={() => {
                        const found = requestsInCurrency.find((r) => r.id === requestToImport);
                        if (!found || isImported(found.id)) return;
                        importRequest(found);
                        setRequestToImport("");
                        toast(
                          `${found.lines.length} ligne(s) reprises de ${found.beneficiaryName}.`,
                        );
                      }}
                      className={buttonClass("secondary", "sm")}
                    >
                      <IconPlus className="h-4 w-4" />
                      Importer
                    </button>
                  </div>
                ) : (
                  <p className="text-[12px] text-muted">
                    {payoutRequests.length} facture(s) d&apos;intervenant en attente, mais dans
                    une autre devise que {doc.currency}.
                  </p>
                ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Mentions du document" />
            <div className="mt-4 grid gap-4">
              <Field label="Note au client" hint="Affichée sous le tableau des prestations.">
                <Textarea
                  value={doc.notes ?? ""}
                  onChange={(event) => patch({ notes: event.target.value || null })}
                  rows={3}
                />
              </Field>
              <Field label="Conditions de règlement">
                <Textarea
                  value={doc.terms ?? ""}
                  onChange={(event) => patch({ terms: event.target.value || null })}
                  rows={3}
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Pied de page">
                  <Input
                    value={doc.footer ?? ""}
                    onChange={(event) => patch({ footer: event.target.value || null })}
                  />
                </Field>
                <Field label="Note interne" hint="Jamais imprimée sur le PDF.">
                  <Input
                    value={doc.internalNotes ?? ""}
                    onChange={(event) => patch({ internalNotes: event.target.value || null })}
                  />
                </Field>
              </div>
            </div>
          </Card>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Colonne latérale                                              */}
        {/* ------------------------------------------------------------- */}
        <div className="flex flex-col gap-5 lg:sticky lg:top-[4.5rem] lg:self-start">
          <Card>
            <CardHeader title="Totaux" />
            <dl className="mt-4 space-y-2 text-[13px]">
              <Row label="Sous-total" value={formatMoney(computed.subtotal, currency)} />

              {computed.lineDiscounts > 0 && (
                <Row
                  label="Remises de ligne"
                  value={`− ${formatMoney(computed.lineDiscounts, currency)}`}
                  tone="muted"
                />
              )}

              <div className="flex items-center justify-between gap-2 py-1">
                <span className="text-muted">Remise globale</span>
                <div className="flex items-center gap-1">
                  <Select
                    value={doc.discountType}
                    onChange={(event) =>
                      patch({
                        discountType: event.target.value as DiscountType,
                        discountValue: 0,
                      })
                    }
                    className="h-8 w-24 px-2 text-[12px]"
                    aria-label="Type de remise globale"
                  >
                    {DISCOUNT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {DISCOUNT_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </Select>
                  {doc.discountType === "PERCENT" && (
                    <RateInput
                      value={doc.discountValue}
                      onChange={(discountValue) => patch({ discountValue })}
                      className="h-8 w-20"
                    />
                  )}
                  {doc.discountType === "AMOUNT" && (
                    <MoneyInput
                      value={doc.discountValue}
                      onChange={(discountValue) => patch({ discountValue })}
                      decimals={currency.decimals}
                      className="h-8 w-24"
                    />
                  )}
                </div>
              </div>

              <div className="border-t border-line pt-2">
                <Row
                  label="Total hors taxes"
                  value={formatMoney(computed.totalNet, currency)}
                  strong
                />
              </div>

              {computed.vatBreakdown.map((row) => (
                <Row
                  key={row.rate}
                  label={`TVA ${formatRate(row.rate)}`}
                  value={formatMoney(row.vat, currency)}
                  tone="muted"
                />
              ))}

              <Row
                label="Total TTC"
                value={formatMoney(computed.totalGross, currency)}
                strong
              />

              {doc.withholdingRate > 0 && (
                <Row
                  label={doc.withholdingLabel || "Retenue à la source"}
                  value={`− ${formatMoney(computed.totalWithheld, currency)}`}
                  tone="muted"
                />
              )}

              {computed.totalDeposits > 0 && (
                <Row
                  label="Acomptes déjà facturés"
                  value={`− ${formatMoney(computed.totalDeposits, currency)}`}
                  tone="muted"
                />
              )}

              <div className="mt-1 flex items-center justify-between gap-2 rounded-[var(--radius)] bg-accent-soft px-3 py-2.5">
                <span className="text-[13px] font-semibold text-accent">Net à payer</span>
                <span className="tnum text-base font-semibold text-accent">
                  {formatMoney(computed.total, currency)}
                </span>
              </div>
            </dl>

            <div className="mt-4 grid gap-3 border-t border-line pt-4">
              <Field label="Retenue à la source">
                <div className="grid grid-cols-[minmax(0,1fr)_5.5rem] gap-2">
                  <Input
                    value={doc.withholdingLabel ?? ""}
                    onChange={(event) =>
                      patch({ withholdingLabel: event.target.value || null })
                    }
                    placeholder="Libellé (ex. IRSA)"
                    className="h-9 text-[13px]"
                  />
                  <RateInput
                    value={doc.withholdingRate}
                    onChange={(withholdingRate) => patch({ withholdingRate })}
                    className="h-9"
                  />
                </div>
              </Field>
            </div>
          </Card>

          {doc.type === "INVOICE" && availableDeposits.length > 0 && (
            <Card>
              <CardHeader
                title="Acomptes à déduire"
                description="Les acomptes cochés sont soustraits du net à payer."
              />
              <div className="mt-3 flex flex-col gap-1">
                {deposits.map((deposit) => (
                  <Checkbox
                    key={deposit.id}
                    checked={doc.depositIds.includes(deposit.id)}
                    onChange={(event) =>
                      patch({
                        depositIds: event.target.checked
                          ? [...doc.depositIds, deposit.id]
                          : doc.depositIds.filter((id) => id !== deposit.id),
                      })
                    }
                    label={deposit.number ?? "Acompte (brouillon)"}
                    hint={`${deposit.subject ?? "Acompte"} — ${formatMoney(
                      deposit.total,
                      currency,
                    )}`}
                  />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Apparence" />
            <div className="mt-4 grid gap-4">
              <Field label="Modèle de document">
                <Select
                  value={doc.template}
                  onChange={(event) => patch({ template: event.target.value })}
                >
                  {TEMPLATES.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Couleur d'accent" hint="Vide = couleur définie dans les réglages.">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={doc.accentColor ?? "#1F4D7A"}
                    onChange={(event) => patch({ accentColor: event.target.value })}
                    className="h-9 w-12 cursor-pointer rounded-[var(--radius)] border border-line bg-surface p-1"
                    aria-label="Couleur d'accent"
                  />
                  <Input
                    value={doc.accentColor ?? ""}
                    onChange={(event) => patch({ accentColor: event.target.value || null })}
                    placeholder="#1F4D7A"
                    className="h-9 flex-1 font-mono text-[13px]"
                  />
                </div>
              </Field>

              <Field label="Coordonnées de paiement affichées">
                <Select
                  value={doc.bankAccountId ?? ""}
                  onChange={(event) => patch({ bankAccountId: event.target.value || null })}
                >
                  <option value="">— Aucune —</option>
                  {bankAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Checkbox
                checked={doc.showAmountInWords}
                onChange={(event) => patch({ showAmountInWords: event.target.checked })}
                label="Montant en toutes lettres"
                hint="« Arrêtée la présente facture à la somme de… »"
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
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
    <div className="flex items-center justify-between gap-2">
      <dt className={cn(tone === "muted" ? "text-muted" : "text-ink", strong && "font-semibold")}>
        {label}
      </dt>
      <dd
        className={cn(
          "tnum",
          tone === "muted" ? "text-muted" : "text-ink",
          strong && "font-semibold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
