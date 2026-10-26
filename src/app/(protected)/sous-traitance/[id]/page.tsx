import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/button";
import { buttonClass } from "@/components/ui/button-style";
import { ConfirmAction } from "@/components/ui/confirm";
import { IconCheck, IconDownload, IconTrash } from "@/components/icons";
import { PayoutForm, type PayoutFormValues } from "@/components/payouts/payout-form";
import { formatDate, formatDateTime, toDateInput } from "@/lib/dates";
import { formatMoney, formatQuantity, FALLBACK_CURRENCY } from "@/lib/money";
import { PAYOUT_STATUS_LABELS, type PayoutStatus } from "@/lib/enums";
import { getPayout, listBeneficiaries, listSourceDocuments } from "@/server/payouts";
import { getCurrencyMap } from "@/server/settings";
import {
  deletePayout,
  issuePayout,
  markPayoutPaid,
  updatePayout,
} from "@/server/actions/payouts";

export default async function JustificatifPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [payout, beneficiaries, documents, currencies] = await Promise.all([
    getPayout(id),
    listBeneficiaries(),
    listSourceDocuments(),
    getCurrencyMap(),
  ]);

  if (!payout) notFound();

  const source = currencies.get(payout.sourceCurrency) ?? FALLBACK_CURRENCY;
  const target = currencies.get(payout.targetCurrency) ?? FALLBACK_CURRENCY;

  const values: PayoutFormValues = {
    id: payout.id,
    beneficiaryId: payout.beneficiaryId,
    documentId: payout.documentId,
    date: toDateInput(payout.date),
    sourceCurrency: payout.sourceCurrency,
    targetCurrency: payout.targetCurrency,
    exchangeRate: payout.exchangeRate,
    bankFees: payout.bankFees,
    reference: payout.reference,
    notes: payout.notes,
    lines: payout.lines.map((line) => ({
      label: line.label,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
    })),
    adjustments: payout.adjustments.map((adjustment) => ({
      label: adjustment.label,
      amount: adjustment.amount,
    })),
  };

  const activeCurrencies = [...currencies.values()].map((currency) => ({
    code: currency.code,
    name: currency.code,
    symbol: currency.symbol,
    decimals: currency.decimals,
    symbolAfter: currency.symbolAfter,
  }));

  return (
    <PageShell wide>
      <PageHeader
        backHref="/sous-traitance"
        backLabel="Retour à la sous-traitance"
        eyebrow="Justificatif de reversement"
        title={
          <span className="flex flex-wrap items-center gap-3">
            {payout.number ?? "Brouillon"}
            <Badge tone={payout.status === "PAID" ? "success" : "warning"} dot>
              {PAYOUT_STATUS_LABELS[payout.status as PayoutStatus] ?? payout.status}
            </Badge>
          </span>
        }
        description={`${payout.beneficiary.name} — ${formatDate(payout.date)}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/payouts/${payout.id}/pdf?dl=1`}
              className={buttonClass("secondary", "sm")}
            >
              <IconDownload className="h-4 w-4" />
              Le justificatif en PDF
            </a>

            {!payout.number && (
              <form action={issuePayout}>
                <input type="hidden" name="id" value={payout.id} />
                <SubmitButton size="sm" pendingLabel="Validation…">
                  <IconCheck className="h-4 w-4" />
                  Valider et numéroter
                </SubmitButton>
              </form>
            )}

            {payout.status !== "PAID" && (
              <form action={markPayoutPaid}>
                <input type="hidden" name="id" value={payout.id} />
                <SubmitButton variant="quiet" size="sm" pendingLabel="…">
                  Marquer reversé
                </SubmitButton>
              </form>
            )}

            <ConfirmAction
              action={deletePayout}
              hidden={{ id: payout.id }}
              triggerLabel="Supprimer"
              triggerVariant="ghost"
              icon={<IconTrash className="h-4 w-4" />}
              title={`Supprimer le justificatif ${payout.number ?? "(brouillon)"} ?`}
              description={`Seront perdus : les ${payout.lines.length} prestation(s), le cours appliqué, les frais et les ajustements. Le net calculé de ${formatMoney(
                payout.netPayable,
                target,
              )} ne sera plus tracé.`}
            />
          </div>
        }
      />

      {/* Décompte figé, tel qu'il est imprimé */}
      <Card>
        <CardHeader
          title="Décompte"
          description="Le calcul tel qu'il figure sur le justificatif remis au sous-traitant."
        />

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[38rem] border-collapse text-sm">
            <tbody>
              {payout.lines.map((line) => (
                <tr key={line.id} className="border-b border-line">
                  <td className="py-2 pr-4">
                    <span className="font-medium text-ink">{line.label}</span>
                    {line.description && (
                      <span className="mt-0.5 block text-[12px] text-muted">
                        {line.description}
                      </span>
                    )}
                  </td>
                  <td className="tnum whitespace-nowrap py-2 pr-4 text-right text-muted">
                    {formatQuantity(line.quantity)} {line.unit}
                  </td>
                  <td className="tnum whitespace-nowrap py-2 pr-4 text-right text-muted">
                    {formatMoney(line.unitPrice, source)}
                  </td>
                  <td className="tnum whitespace-nowrap py-2 text-right font-medium">
                    {formatMoney(line.amount, source)}
                  </td>
                </tr>
              ))}

              <tr className="border-b border-line">
                <td colSpan={3} className="py-2 pr-4 font-semibold text-ink">
                  Total reçu
                </td>
                <td className="tnum whitespace-nowrap py-2 text-right font-semibold">
                  {formatMoney(payout.totalSource, source)}
                </td>
              </tr>

              <tr className="border-b border-line">
                <td colSpan={3} className="py-2 pr-4 text-muted">
                  Cours appliqué par la banque — 1 {source.code} = {payout.exchangeRate}{" "}
                  {target.code}
                </td>
                <td className="tnum whitespace-nowrap py-2 text-right font-medium">
                  {formatMoney(payout.totalConverted, target)}
                </td>
              </tr>

              {payout.bankFees !== 0 && (
                <tr className="border-b border-line">
                  <td colSpan={3} className="py-2 pr-4 text-muted">
                    Frais de banque
                  </td>
                  <td className="tnum whitespace-nowrap py-2 text-right text-muted">
                    − {formatMoney(payout.bankFees, target)}
                  </td>
                </tr>
              )}

              {payout.adjustments.map((adjustment) => (
                <tr key={adjustment.id} className="border-b border-line">
                  <td colSpan={3} className="py-2 pr-4 text-muted">
                    {adjustment.label}
                  </td>
                  <td className="tnum whitespace-nowrap py-2 text-right text-muted">
                    {adjustment.amount < 0 ? "" : "+ "}
                    {formatMoney(adjustment.amount, target)}
                  </td>
                </tr>
              ))}

              <tr>
                <td colSpan={3} className="py-3 pr-4 text-[15px] font-semibold text-accent">
                  Net à reverser
                </td>
                <td className="tnum whitespace-nowrap py-3 text-right text-[15px] font-semibold text-accent">
                  {formatMoney(payout.netPayable, target)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-[13px] text-muted">
          {payout.document && (
            <span>
              Facture d&apos;origine :{" "}
              <Link href={`/documents/${payout.document.id}`} className="text-accent hover:underline">
                {payout.document.number ?? "brouillon"}
              </Link>
            </span>
          )}
          {payout.reference && <span>Référence : {payout.reference}</span>}
          {payout.paidAt && <span>Reversé le {formatDateTime(payout.paidAt)}</span>}
        </div>
      </Card>

      <h2 className="mt-2 text-[15px] font-semibold tracking-tight text-ink">Modifier</h2>

      <PayoutForm
        action={updatePayout}
        values={values}
        beneficiaries={beneficiaries}
        documents={documents}
        currencies={activeCurrencies}
        submitLabel="Enregistrer le justificatif"
      />
    </PageShell>
  );
}
