import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { IconClock, IconPlus, IconTrash } from "@/components/icons";
import { MissionForm, type MissionFormValues } from "@/components/missions/mission-form";
import { DocumentTable } from "@/components/documents/document-table";
import { prisma } from "@/lib/prisma";
import { toDateInput } from "@/lib/dates";
import { formatMoney, formatQuantity, mulQuantity, FALLBACK_CURRENCY } from "@/lib/money";
import { RATE_TYPE_UNIT, type RateType } from "@/lib/enums";
import { listDocuments } from "@/server/documents";
import { getActiveCurrencies, getCurrencyMap } from "@/server/settings";
import { deleteMission, updateMission } from "@/server/actions/missions";

export default async function MissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [mission, currencies, currencyMap, clients, agencies, documents] = await Promise.all([
    prisma.mission.findUnique({
      where: { id },
      include: {
        client: true,
        agency: true,
        timeEntries: { orderBy: { date: "desc" } },
        _count: { select: { documents: true } },
      },
    }),
    getActiveCurrencies(),
    getCurrencyMap(),
    prisma.party.findMany({
      where: { kind: "CLIENT", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: { kind: "AGENCY", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    listDocuments({ missionId: id }),
  ]);

  if (!mission) notFound();

  const currency = currencyMap.get(mission.currency) ?? FALLBACK_CURRENCY;
  const unit = RATE_TYPE_UNIT[mission.rateType as RateType] ?? "jour";
  const unitShort = unit === "heure" ? "h" : "j";

  const logged = mission.timeEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingEntries = mission.timeEntries.filter(
    (entry) => entry.billable && !entry.documentId,
  );
  const pending = pendingEntries.reduce((sum, entry) => sum + entry.quantity, 0);
  const pendingAmount = pendingEntries.reduce(
    (sum, entry) => sum + mulQuantity(entry.rate ?? mission.rate, entry.quantity),
    0,
  );

  const invoiced = documents
    .filter((doc) => doc.type === "INVOICE" || doc.type === "DEPOSIT")
    .filter((doc) => doc.status !== "CANCELLED")
    .reduce((sum, doc) => sum + doc.total, 0);

  const values: MissionFormValues = {
    id: mission.id,
    title: mission.title,
    reference: mission.reference,
    description: mission.description,
    clientId: mission.clientId,
    agencyId: mission.agencyId,
    billTo: mission.billTo,
    rateType: mission.rateType,
    rate: mission.rate,
    currency: mission.currency,
    vatRate: mission.vatRate,
    budget: mission.budget,
    purchaseOrder: mission.purchaseOrder,
    startDate: toDateInput(mission.startDate),
    endDate: toDateInput(mission.endDate),
    status: mission.status,
    notes: mission.notes,
  };

  return (
    <PageShell wide>
      <PageHeader
        backHref="/missions"
        backLabel="Retour aux missions"
        eyebrow={
          <>
            Mission
            <span className="text-line-strong">·</span>
            <Link href={`/clients/${mission.client.id}`} className="hover:text-ink">
              {mission.client.name}
            </Link>
            {mission.agency && (
              <>
                <span className="text-line-strong">via</span>
                <Link href={`/agences/${mission.agency.id}`} className="hover:text-ink">
                  {mission.agency.name}
                </Link>
              </>
            )}
          </>
        }
        title={mission.title}
        description={mission.description ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/temps?mission=${mission.id}`} variant="secondary" size="sm">
              <IconClock className="h-4 w-4" />
              Saisir du temps
            </ButtonLink>
            <ButtonLink href={`/documents/nouveau?mission=${mission.id}&type=INVOICE`} size="sm">
              <IconPlus className="h-4 w-4" />
              Facturer
            </ButtonLink>
            <ConfirmAction
              action={deleteMission}
              hidden={{ id: mission.id }}
              triggerLabel="Supprimer"
              triggerVariant="ghost"
              icon={<IconTrash className="h-4 w-4" />}
              title={`Supprimer la mission « ${mission.title} » ?`}
              description={
                mission._count.documents > 0
                  ? `Cette mission porte ${mission._count.documents} document(s) : elle sera archivée plutôt que supprimée.`
                  : `Seront définitivement perdues : la mission et ses ${mission.timeEntries.length} saisie(s) de temps.`
              }
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Temps saisi"
          value={`${formatQuantity(logged)} ${unitShort}`}
          sub={`${mission.timeEntries.length} saisie(s)`}
        />
        <StatCard
          label="À facturer"
          value={`${formatQuantity(pending)} ${unitShort}`}
          sub={formatMoney(pendingAmount, currency)}
          tone={pending > 0 ? "warning" : "neutral"}
        />
        <StatCard label="Déjà facturé" value={formatMoney(invoiced, currency)} tone="success" />
        <StatCard
          label="Tarif"
          value={formatMoney(mission.rate, currency)}
          sub={`par ${unit}`}
          tone="accent"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-5">
          <MissionForm
            action={updateMission}
            values={values}
            clients={clients}
            agencies={agencies}
            currencies={currencies}
            submitLabel="Enregistrer la mission"
          />

          <div>
            <h2 className="mb-3 text-[15px] font-semibold tracking-tight text-ink">
              Documents ({documents.length})
            </h2>
            <DocumentTable
              rows={documents}
              showType
              emptyMessage="Aucun document émis pour cette mission."
            />
          </div>
        </div>

        <Card>
          <CardHeader
            title="Dernières saisies"
            description={`${pendingEntries.length} journée(s) en attente de facturation.`}
            actions={
              <ButtonLink href={`/temps?mission=${mission.id}`} variant="ghost" size="sm">
                Tout voir
              </ButtonLink>
            }
          />
          <ul className="mt-3 flex flex-col gap-1.5">
            {mission.timeEntries.length === 0 && (
              <li className="text-[13px] text-muted">Aucune saisie de temps.</li>
            )}
            {mission.timeEntries.slice(0, 14).map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-line px-3 py-1.5 text-[13px]"
              >
                <span className="text-muted">
                  {new Intl.DateTimeFormat("fr-FR", {
                    day: "2-digit",
                    month: "short",
                    timeZone: "UTC",
                  }).format(entry.date)}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tnum font-medium text-ink">
                    {formatQuantity(entry.quantity)} {unitShort}
                  </span>
                  {entry.documentId ? (
                    <span className="text-[11px] text-success">facturé</span>
                  ) : entry.billable ? (
                    <span className="text-[11px] text-warning">à facturer</span>
                  ) : (
                    <span className="text-[11px] text-faint">non facturable</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
