import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { IconBell, IconCheck } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { daysLate, formatDate } from "@/lib/dates";
import { convertToBase, formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import { getBaseCurrencyFormat, getCurrencyMap, getRatesToBase } from "@/server/settings";
import { createReminder } from "@/server/actions/reminders";

export const metadata = { title: "Relances" };

export default async function RelancesPage() {
  const [documents, baseCurrency, currencies, rates] = await Promise.all([
    prisma.document.findMany({
      where: {
        type: { in: ["INVOICE", "DEPOSIT"] },
        status: { in: ["SENT", "PARTIALLY_PAID", "LATE"] },
        number: { not: null },
        balanceDue: { gt: 0 },
      },
      include: {
        billTo: { select: { id: true, name: true, kind: true } },
        reminders: { orderBy: [{ level: "desc" }], take: 1 },
      },
      orderBy: { dueDate: "asc" },
    }),
    getBaseCurrencyFormat(),
    getCurrencyMap(),
    getRatesToBase(),
  ]);

  const overdue = documents.filter((doc) => daysLate(doc.dueDate) > 0);
  const totalOverdue = overdue.reduce(
    (sum, doc) => sum + convertToBase(doc.balanceDue, rates.get(doc.currency) ?? 1),
    0,
  );
  const totalOutstanding = documents.reduce(
    (sum, doc) => sum + convertToBase(doc.balanceDue, rates.get(doc.currency) ?? 1),
    0,
  );
  const neverReminded = overdue.filter((doc) => doc.reminders.length === 0).length;

  return (
    <PageShell wide>
      <PageHeader
        title="Relances"
        description="Les factures encore dues, les plus anciennes d'abord. Préparez la relance suivante : son texte est rédigé selon le niveau, du rappel courtois à la mise en demeure."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="En retard"
          value={formatMoney(totalOverdue, baseCurrency)}
          sub={`${overdue.length} facture(s)`}
          tone={overdue.length > 0 ? "danger" : "neutral"}
        />
        <StatCard
          label="Encours total"
          value={formatMoney(totalOutstanding, baseCurrency)}
          sub={`${documents.length} facture(s) ouverte(s)`}
        />
        <StatCard
          label="Jamais relancées"
          value={String(neverReminded)}
          sub="parmi les factures en retard"
          tone={neverReminded > 0 ? "warning" : "neutral"}
        />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          icon={<IconCheck />}
          title="Rien à relancer"
          description="Toutes vos factures validées sont soldées. "
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Facture</TH>
                <TH>Client</TH>
                <TH>Échéance</TH>
                <TH>Retard</TH>
                <TH>Dernière relance</TH>
                <TH align="right">Reste dû</TH>
                <TH align="right">Action</TH>
              </TR>
            </THead>
            <tbody>
              {documents.map((doc) => {
                const late = daysLate(doc.dueDate);
                const lastReminder = doc.reminders[0];
                const currency = currencies.get(doc.currency) ?? FALLBACK_CURRENCY;

                return (
                  <TR key={doc.id} interactive>
                    <TD>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="tnum font-medium text-ink transition-colors hover:text-accent"
                      >
                        {doc.number}
                      </Link>
                      {doc.subject && (
                        <span className="mt-0.5 block max-w-[24ch] truncate text-[11px] text-faint">
                          {doc.subject}
                        </span>
                      )}
                    </TD>
                    <TD className="text-[13px]">
                      <Link
                        href={`/${doc.billTo.kind === "AGENCY" ? "agences" : "clients"}/${doc.billTo.id}`}
                        className="text-muted transition-colors hover:text-accent"
                      >
                        {doc.billTo.name}
                      </Link>
                    </TD>
                    <TD className="tnum whitespace-nowrap text-[13px] text-muted">
                      {formatDate(doc.dueDate)}
                    </TD>
                    <TD>
                      {late > 0 ? (
                        <Badge tone={late > 30 ? "danger" : "warning"} dot>
                          {late} j
                        </Badge>
                      ) : (
                        <span className="text-[13px] text-faint">à échoir</span>
                      )}
                    </TD>
                    <TD className="text-[13px] text-muted">
                      {lastReminder ? (
                        <>
                          Niveau {lastReminder.level}
                          <span className="block text-[11px] text-faint">
                            {lastReminder.sentAt
                              ? `envoyée le ${formatDate(lastReminder.sentAt)}`
                              : "préparée, non envoyée"}
                          </span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap font-medium text-danger">
                      {formatMoney(doc.balanceDue, currency)}
                    </TD>
                    <TD align="right">
                      <form action={createReminder} className="flex justify-end">
                        <input type="hidden" name="documentId" value={doc.id} />
                        <SubmitButton variant="secondary" size="sm" pendingLabel="…">
                          <IconBell className="h-3.5 w-3.5" />
                          Relancer
                        </SubmitButton>
                      </form>
                    </TD>
                  </TR>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </PageShell>
  );
}
