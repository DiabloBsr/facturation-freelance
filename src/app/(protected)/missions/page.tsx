import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { IconMission, IconPlus } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatQuantity, FALLBACK_CURRENCY } from "@/lib/money";
import {
  MISSION_STATUS_LABELS,
  RATE_TYPE_UNIT,
  type MissionStatus,
  type RateType,
} from "@/lib/enums";
import { getCurrencyMap } from "@/server/settings";

export const metadata = { title: "Missions" };

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "info"> = {
  ACTIVE: "success",
  PAUSED: "warning",
  DONE: "info",
  ARCHIVED: "neutral",
};

export default async function MissionsPage() {
  const [missions, currencies] = await Promise.all([
    prisma.mission.findMany({
      include: {
        client: { select: { id: true, name: true } },
        agency: { select: { id: true, name: true } },
        timeEntries: { select: { quantity: true, documentId: true, billable: true } },
        _count: { select: { documents: true } },
      },
      orderBy: [{ status: "asc" }, { title: "asc" }],
    }),
    getCurrencyMap(),
  ]);

  return (
    <PageShell wide>
      <PageHeader
        title="Missions"
        description="Chaque mission porte son tarif, sa devise et son mode de facturation : les factures et le CRA s'en servent comme base."
        actions={
          <ButtonLink href="/missions/nouveau">
            <IconPlus className="h-4 w-4" />
            Nouvelle mission
          </ButtonLink>
        }
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={<IconMission />}
          title="Aucune mission"
          description="Créez une mission pour suivre vos journées, générer les factures automatiquement et garder la trace du client final derrière une agence."
          action={
            <ButtonLink href="/missions/nouveau">
              <IconPlus className="h-4 w-4" />
              Créer une mission
            </ButtonLink>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Mission</TH>
                <TH>Client</TH>
                <TH>Facturée à</TH>
                <TH align="right">Tarif</TH>
                <TH align="right">Temps saisi</TH>
                <TH align="right">À facturer</TH>
                <TH>Statut</TH>
              </TR>
            </THead>
            <tbody>
              {missions.map((mission) => {
                const currency = currencies.get(mission.currency) ?? FALLBACK_CURRENCY;
                const logged = mission.timeEntries.reduce((sum, e) => sum + e.quantity, 0);
                const pending = mission.timeEntries
                  .filter((entry) => entry.billable && !entry.documentId)
                  .reduce((sum, entry) => sum + entry.quantity, 0);
                const unit = RATE_TYPE_UNIT[mission.rateType as RateType] ?? "jour";

                return (
                  <TR key={mission.id} interactive>
                    <TD>
                      <Link
                        href={`/missions/${mission.id}`}
                        className="font-medium text-ink transition-colors hover:text-accent"
                      >
                        {mission.title}
                      </Link>
                      {mission.reference && (
                        <span className="ml-2 text-[11px] text-faint">{mission.reference}</span>
                      )}
                    </TD>
                    <TD className="text-[13px] text-muted">{mission.client.name}</TD>
                    <TD className="text-[13px] text-muted">
                      {mission.billTo === "AGENCY" && mission.agency
                        ? mission.agency.name
                        : mission.client.name}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap text-[13px]">
                      {formatMoney(mission.rate, currency)}
                      <span className="text-faint"> / {unit}</span>
                    </TD>
                    <TD align="right" className="tnum text-[13px] text-muted">
                      {formatQuantity(logged)} {unit === "heure" ? "h" : "j"}
                    </TD>
                    <TD align="right" className="tnum text-[13px]">
                      {pending > 0 ? (
                        <span className="font-medium text-warning">
                          {formatQuantity(pending)} {unit === "heure" ? "h" : "j"}
                        </span>
                      ) : (
                        <span className="text-faint">—</span>
                      )}
                    </TD>
                    <TD>
                      <Badge tone={STATUS_TONE[mission.status] ?? "neutral"} dot>
                        {MISSION_STATUS_LABELS[mission.status as MissionStatus] ?? mission.status}
                      </Badge>
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
