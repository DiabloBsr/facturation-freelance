import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { IconDownload, IconPayment } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatDate, startOfMonth, startOfYear, today } from "@/lib/dates";
import { convertToBase, formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/enums";
import { getBaseCurrencyFormat, getCurrencyMap } from "@/server/settings";

export const metadata = { title: "Encaissements" };

export default async function EncaissementsPage() {
  const now = today();

  const [payments, baseCurrency, currencies] = await Promise.all([
    prisma.payment.findMany({
      include: {
        document: {
          select: {
            id: true,
            number: true,
            type: true,
            billTo: { select: { id: true, name: true, kind: true } },
          },
        },
        bankAccount: { select: { label: true } },
      },
      orderBy: { date: "desc" },
      take: 300,
    }),
    getBaseCurrencyFormat(),
    getCurrencyMap(),
  ]);

  // Chaque règlement porte le cours du jour de son encaissement.
  const inBase = (payment: { amount: number; rateToBase: number }) =>
    convertToBase(payment.amount, payment.rateToBase);

  const monthStart = startOfMonth(now);
  const yearStart = startOfYear(now);

  const totalMonth = payments
    .filter((payment) => payment.date >= monthStart)
    .reduce((sum, payment) => sum + inBase(payment), 0);
  const totalYear = payments
    .filter((payment) => payment.date >= yearStart)
    .reduce((sum, payment) => sum + inBase(payment), 0);
  const totalAll = payments.reduce((sum, payment) => sum + inBase(payment), 0);

  return (
    <PageShell wide>
      <PageHeader
        title="Encaissements"
        description="Tous les règlements reçus, toutes devises confondues. Les totaux sont convertis dans votre devise de base au cours du jour de chaque encaissement."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/api/export?type=encaissements" variant="secondary" size="sm">
              <IconDownload className="h-4 w-4" />
              Export encaissements
            </ButtonLink>
            <ButtonLink href="/api/export?type=factures" variant="secondary" size="sm">
              <IconDownload className="h-4 w-4" />
              Export factures
            </ButtonLink>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Ce mois-ci" value={formatMoney(totalMonth, baseCurrency)} tone="success" />
        <StatCard label="Cette année" value={formatMoney(totalYear, baseCurrency)} />
        <StatCard
          label="Total enregistré"
          value={formatMoney(totalAll, baseCurrency)}
          sub={`${payments.length} règlement(s)`}
        />
      </div>

      {payments.length === 0 ? (
        <EmptyState
          icon={<IconPayment />}
          title="Aucun encaissement"
          description="Les règlements s'enregistrent depuis la fiche d'une facture. Le statut et le reste dû se mettent alors à jour automatiquement."
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Date</TH>
                <TH>Facture</TH>
                <TH>Client</TH>
                <TH>Moyen</TH>
                <TH>Référence</TH>
                <TH>Compte</TH>
                <TH align="right">Montant</TH>
              </TR>
            </THead>
            <tbody>
              {payments.map((payment) => (
                <TR key={payment.id} interactive>
                  <TD className="tnum whitespace-nowrap text-[13px] text-muted">
                    {formatDate(payment.date)}
                  </TD>
                  <TD>
                    <Link
                      href={`/documents/${payment.document.id}`}
                      className="tnum font-medium text-ink transition-colors hover:text-accent"
                    >
                      {payment.document.number ?? "brouillon"}
                    </Link>
                  </TD>
                  <TD className="text-[13px]">
                    <Link
                      href={`/${payment.document.billTo.kind === "AGENCY" ? "agences" : "clients"}/${payment.document.billTo.id}`}
                      className="text-muted transition-colors hover:text-accent"
                    >
                      {payment.document.billTo.name}
                    </Link>
                  </TD>
                  <TD className="text-[13px] text-muted">
                    {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method}
                  </TD>
                  <TD className="text-[13px] text-muted">{payment.reference ?? "—"}</TD>
                  <TD className="text-[13px] text-muted">{payment.bankAccount?.label ?? "—"}</TD>
                  <TD align="right" className="tnum whitespace-nowrap font-medium text-success">
                    {formatMoney(
                      payment.amount,
                      currencies.get(payment.currency) ?? FALLBACK_CURRENCY,
                    )}
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </PageShell>
  );
}
