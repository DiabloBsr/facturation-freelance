import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Table, TableEmpty, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import {
  IconArrowRight,
  IconBell,
  IconCheck,
  IconClients,
  IconInvoice,
  IconPlus,
  IconQuote,
  IconSettings,
} from "@/components/icons";
import { prisma } from "@/lib/prisma";
import {
  addMonths,
  daysLate,
  formatDate,
  formatMonth,
  monthKey,
  startOfMonth,
  startOfYear,
  today,
} from "@/lib/dates";
import { convertToBase, formatMoney, formatMoneyCompact, FALLBACK_CURRENCY } from "@/lib/money";
import { DOCUMENT_TYPE_SHORT, type DocumentType } from "@/lib/enums";
import {
  getBankAccounts,
  getBaseCurrencyFormat,
  getCompany,
  getCurrencyMap,
  getLegalIdentifiers,
  getRatesToBase,
} from "@/server/settings";

export default async function DashboardPage() {
  const now = today();
  const yearStart = startOfYear(now);
  const twelveMonthsAgo = startOfMonth(addMonths(now, -11));

  const [
    company,
    identifiers,
    bankAccounts,
    partyCount,
    invoices,
    payments,
    recentDocuments,
    openQuotes,
    baseCurrency,
    currencies,
    rates,
  ] = await Promise.all([
    getCompany(),
    getLegalIdentifiers(),
    getBankAccounts(),
    prisma.party.count(),
    prisma.document.findMany({
      where: {
        type: { in: ["INVOICE", "DEPOSIT"] },
        status: { not: "CANCELLED" },
        number: { not: null },
        issueDate: { gte: twelveMonthsAgo },
      },
      select: {
        id: true,
        issueDate: true,
        total: true,
        balanceDue: true,
        currency: true,
        dueDate: true,
        status: true,
      },
    }),
    prisma.payment.findMany({
      where: { date: { gte: yearStart } },
      select: { amount: true, rateToBase: true },
    }),
    prisma.document.findMany({
      include: {
        billTo: { select: { id: true, name: true, kind: true } },
        endClient: { select: { id: true, name: true } },
        mission: { select: { id: true, title: true } },
        _count: { select: { payments: true, reminders: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.document.findMany({
      where: { type: "QUOTE", status: { in: ["SENT", "DRAFT"] } },
      select: {
        id: true,
        number: true,
        subject: true,
        total: true,
        currency: true,
        validUntil: true,
        status: true,
        billTo: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 6,
    }),
    getBaseCurrencyFormat(),
    getCurrencyMap(),
    getRatesToBase(),
  ]);

  const inBase = (amount: number, code: string) => convertToBase(amount, rates.get(code) ?? 1);

  const invoicedYear = invoices
    .filter((invoice) => invoice.issueDate >= yearStart)
    .reduce((sum, invoice) => sum + inBase(invoice.total, invoice.currency), 0);

  // Encaissé au cours du jour de chaque règlement, pas au cours courant.
  const collectedYear = payments.reduce(
    (sum, payment) => sum + convertToBase(payment.amount, payment.rateToBase),
    0,
  );

  const outstanding = invoices.reduce(
    (sum, invoice) => sum + inBase(invoice.balanceDue, invoice.currency),
    0,
  );

  const overdueInvoices = invoices.filter(
    (invoice) => invoice.balanceDue > 0 && daysLate(invoice.dueDate) > 0,
  );
  const overdue = overdueInvoices.reduce(
    (sum, invoice) => sum + inBase(invoice.balanceDue, invoice.currency),
    0,
  );

  // Chiffre d'affaires facturé, mois par mois, sur douze mois glissants.
  const months = Array.from({ length: 12 }, (_, index) => addMonths(startOfMonth(now), index - 11));
  const byMonth = new Map<string, number>();
  for (const invoice of invoices) {
    const key = monthKey(invoice.issueDate);
    byMonth.set(key, (byMonth.get(key) ?? 0) + inBase(invoice.total, invoice.currency));
  }
  const monthly = months.map((month) => ({
    month,
    key: monthKey(month),
    value: byMonth.get(monthKey(month)) ?? 0,
  }));
  const peak = Math.max(...monthly.map((entry) => entry.value), 1);

  // Mise en route : ce qu'il reste à renseigner pour émettre un document propre.
  const filledIdentifiers = identifiers.filter((identifier) => identifier.value.trim() !== "");
  const steps = [
    {
      done: company.legalName !== "Mon entreprise" && Boolean(company.addressLine1),
      label: "Renseigner l'identité et l'adresse de l'entreprise",
      href: "/parametres",
    },
    {
      done: filledIdentifiers.length > 0,
      label: "Saisir vos identifiants légaux (NIF, STAT, RCS…)",
      href: "/parametres",
    },
    {
      done: bankAccounts.length > 0,
      label: "Ajouter vos coordonnées de paiement (RIB, Mobile Money…)",
      href: "/parametres/paiements",
    },
    { done: partyCount > 0, label: "Créer un premier client", href: "/clients/nouveau" },
  ];
  const remaining = steps.filter((step) => !step.done);

  return (
    <PageShell wide>
      <PageHeader
        title="Tableau de bord"
        description={`${company.tradeName || company.legalName} — activité des douze derniers mois.`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/documents/nouveau?type=INVOICE">
              <IconPlus className="h-4 w-4" />
              Nouvelle facture
            </ButtonLink>
            <ButtonLink href="/documents/nouveau?type=QUOTE" variant="secondary">
              <IconQuote className="h-4 w-4" />
              Nouveau devis
            </ButtonLink>
          </div>
        }
      />

      {remaining.length > 0 && (
        <Card className="border-accent-border bg-accent-soft">
          <CardHeader
            title="Terminer la mise en route"
            description="Ces informations figurent sur chaque document : autant les renseigner avant la première facture."
          />
          <ul className="mt-4 flex flex-col gap-2">
            {steps.map((step) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className={`flex items-center gap-2.5 rounded-[var(--radius)] px-2 py-1.5 text-[13px] transition-colors ${
                    step.done
                      ? "text-muted"
                      : "font-medium text-accent hover:bg-surface"
                  }`}
                >
                  <span
                    className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border ${
                      step.done
                        ? "border-success bg-success text-white"
                        : "border-accent-border bg-surface"
                    }`}
                    style={{ height: 18, width: 18 }}
                  >
                    {step.done && <IconCheck className="h-3 w-3" />}
                  </span>
                  <span className={step.done ? "line-through" : ""}>{step.label}</span>
                  {!step.done && <IconArrowRight className="h-3.5 w-3.5" />}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Facturé cette année"
          value={formatMoney(invoicedYear, baseCurrency)}
          sub={`en ${baseCurrency.code}`}
          icon={<IconInvoice className="h-4 w-4" />}
        />
        <StatCard
          label="Encaissé cette année"
          value={formatMoney(collectedYear, baseCurrency)}
          tone="success"
        />
        <StatCard
          label="Encours"
          value={formatMoney(outstanding, baseCurrency)}
          sub="factures non soldées"
          tone={outstanding > 0 ? "warning" : "neutral"}
        />
        <StatCard
          label="En retard"
          value={formatMoney(overdue, baseCurrency)}
          sub={`${overdueInvoices.length} facture(s)`}
          tone={overdue > 0 ? "danger" : "neutral"}
          icon={<IconBell className="h-4 w-4" />}
        />
      </div>

      {/* Chiffre d'affaires mensuel */}
      <Card>
        <CardHeader
          title="Chiffre d'affaires facturé"
          description="Douze mois glissants, converti en devise de base."
        />
        <div className="mt-6 flex items-end gap-1.5" style={{ height: 160 }}>
          {monthly.map((entry) => {
            const height = entry.value > 0 ? Math.max((entry.value / peak) * 100, 3) : 1.5;
            const isCurrent = entry.key === monthKey(now);
            return (
              <div key={entry.key} className="group flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <span className="tnum text-[10px] font-medium text-muted opacity-0 transition-opacity group-hover:opacity-100">
                  {entry.value > 0 ? formatMoneyCompact(entry.value, baseCurrency) : "—"}
                </span>
                <div
                  className={`w-full rounded-t-[3px] transition-colors ${
                    isCurrent ? "bg-accent" : entry.value > 0 ? "bg-accent/45" : "bg-line"
                  }`}
                  style={{ height: `${height}%` }}
                  title={`${formatMonth(entry.month)} : ${formatMoney(entry.value, baseCurrency)}`}
                />
                <span className="w-full truncate text-center text-[10px] capitalize text-faint">
                  {new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(
                    entry.month,
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Derniers documents */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-ink">
              Derniers documents
            </h2>
            <Link href="/factures" className="text-[13px] font-medium text-accent hover:underline">
              Tout voir
            </Link>
          </div>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Numéro</TH>
                  <TH>Type</TH>
                  <TH>Client</TH>
                  <TH>Statut</TH>
                  <TH align="right">Total</TH>
                </TR>
              </THead>
              <tbody>
                {recentDocuments.length === 0 && (
                  <TableEmpty colSpan={5}>
                    Aucun document. Créez votre première facture ou votre premier devis.
                  </TableEmpty>
                )}
                {recentDocuments.map((doc) => (
                  <TR key={doc.id} interactive>
                    <TD>
                      <Link
                        href={`/documents/${doc.id}`}
                        className="tnum font-medium text-ink transition-colors hover:text-accent"
                      >
                        {doc.number ?? <span className="italic text-faint">brouillon</span>}
                      </Link>
                    </TD>
                    <TD className="text-[13px] text-muted">
                      {DOCUMENT_TYPE_SHORT[doc.type as DocumentType] ?? doc.type}
                    </TD>
                    <TD className="max-w-[18ch] truncate text-[13px] text-muted">
                      {doc.billTo.name}
                    </TD>
                    <TD>
                      <StatusBadge status={doc.status} />
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap font-medium">
                      {formatMoney(
                        doc.total,
                        currencies.get(doc.currency) ?? FALLBACK_CURRENCY,
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </div>

        {/* Devis en attente */}
        <Card>
          <CardHeader
            title="Devis en attente"
            description="Relancez avant la date de validité."
            actions={
              <Link href="/devis" className="text-[13px] font-medium text-accent hover:underline">
                Tout voir
              </Link>
            }
          />
          <div className="mt-3 flex flex-col gap-2">
            {openQuotes.length === 0 && (
              <p className="text-[13px] text-muted">Aucun devis en attente de réponse.</p>
            )}
            {openQuotes.map((quote) => {
              const expiring =
                quote.validUntil !== null && daysLate(quote.validUntil) > 0;
              return (
                <Link
                  key={quote.id}
                  href={`/documents/${quote.id}`}
                  className="flex items-start justify-between gap-2 rounded-[var(--radius)] border border-line px-3 py-2 transition-colors hover:border-accent-border hover:bg-accent-soft"
                >
                  <div className="min-w-0">
                    <p className="tnum text-[13px] font-medium text-ink">
                      {quote.number ?? "brouillon"}
                    </p>
                    <p className="truncate text-[11px] text-muted">
                      {quote.billTo.name}
                      {quote.subject ? ` · ${quote.subject}` : ""}
                    </p>
                    {quote.validUntil && (
                      <p className="text-[11px] text-faint">
                        {expiring ? "expiré le " : "valable jusqu'au "}
                        {formatDate(quote.validUntil)}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="tnum text-[13px] font-medium">
                      {formatMoney(
                        quote.total,
                        currencies.get(quote.currency) ?? FALLBACK_CURRENCY,
                      )}
                    </span>
                    {expiring && <Badge tone="warning">expiré</Badge>}
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Accès rapides */}
      <div className="grid gap-3 sm:grid-cols-3">
        <QuickLink
          href="/clients/nouveau"
          icon={<IconClients />}
          title="Ajouter un client"
          description="Coordonnées, NIF, STAT et conditions de règlement."
        />
        <QuickLink
          href="/relances"
          icon={<IconBell />}
          title="Relancer les impayés"
          description="Texte de relance pré-rédigé, du rappel à la mise en demeure."
        />
        <QuickLink
          href="/parametres"
          icon={<IconSettings />}
          title="Mon entreprise"
          description="Identité, identifiants légaux, RIB, modèles de facture."
        />
      </div>
    </PageShell>
  );
}

function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-[var(--radius-lg)] border border-line bg-surface p-4 shadow-[var(--shadow-sm)] transition-all duration-150 hover:border-accent-border hover:shadow-[var(--shadow-md)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius)] border border-line bg-surface-2 text-muted transition-colors group-hover:border-accent-border group-hover:bg-accent-soft group-hover:text-accent">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-snug text-muted">{description}</span>
      </span>
    </Link>
  );
}
