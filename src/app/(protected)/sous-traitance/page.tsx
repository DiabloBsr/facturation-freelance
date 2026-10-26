import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader, StatCard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { IconHandover, IconPlus, IconUsers } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import {
  PAYOUT_REQUEST_STATUS_LABELS,
  PAYOUT_STATUS_LABELS,
  type PayoutRequestStatus,
  type PayoutStatus,
} from "@/lib/enums";
import { listPayouts } from "@/server/payouts";
import { listPayoutRequests, requestTotal } from "@/server/payout-requests";
import { getCurrencyMap } from "@/server/settings";

export const metadata = { title: "Sous-traitance" };

export default async function SousTraitancePage() {
  const [payouts, requests, currencies] = await Promise.all([
    listPayouts(),
    listPayoutRequests(),
    getCurrencyMap(),
  ]);

  const pending = payouts.filter((payout) => payout.status !== "PAID");
  // Les montants nets sont en devise cible, généralement la même partout.
  const targetOf = (code: string) => currencies.get(code) ?? FALLBACK_CURRENCY;
  const pendingTotal = pending.reduce((sum, payout) => sum + payout.netPayable, 0);
  const paidTotal = payouts
    .filter((payout) => payout.status === "PAID")
    .reduce((sum, payout) => sum + payout.netPayable, 0);

  return (
    <PageShell wide>
      <PageHeader
        title="Sous-traitance"
        description="Les justificatifs de reversement : ce que vous avez reçu pour le compte d'un sous-traitant, le cours appliqué par la banque, les frais, et ce qui lui revient réellement."
        actions={
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/sous-traitance/demandes/nouvelle" variant="secondary">
              <IconUsers className="h-4 w-4" />
              Demander une facture
            </ButtonLink>
            <ButtonLink href="/sous-traitance/nouveau">
              <IconPlus className="h-4 w-4" />
              Nouveau justificatif
            </ButtonLink>
          </div>
        }
      />

      {requests.length > 0 && (
        <Card padded={false}>
          <div className="border-b border-line px-5 py-4">
            <CardHeader
              title="Demandes aux intervenants"
              description="Les liens envoyés à vos sous-traitants pour qu'ils déclarent eux-mêmes leurs prestations."
            />
          </div>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Intervenant</TH>
                  <TH>Envoyée le</TH>
                  <TH>Statut</TH>
                  <TH>Reprise dans</TH>
                  <TH align="right">Total déclaré</TH>
                </TR>
              </THead>
              <tbody>
                {requests.map((request) => {
                  const status = request.status as PayoutRequestStatus;
                  return (
                    <TR key={request.id} interactive>
                      <TD>
                        <Link
                          href={`/sous-traitance/demandes/${request.id}`}
                          className="font-medium text-ink transition-colors hover:text-accent"
                        >
                          {request.beneficiary.name}
                        </Link>
                      </TD>
                      <TD className="tnum whitespace-nowrap text-[13px] text-muted">
                        {formatDate(request.createdAt)}
                      </TD>
                      <TD>
                        <Badge
                          tone={
                            status === "SUBMITTED"
                              ? "success"
                              : status === "CONVERTED"
                                ? "neutral"
                                : "warning"
                          }
                          dot
                        >
                          {PAYOUT_REQUEST_STATUS_LABELS[status] ?? status}
                        </Badge>
                      </TD>
                      <TD className="tnum text-[13px] text-muted">
                        {request.document?.number ?? "—"}
                      </TD>
                      <TD align="right" className="tnum whitespace-nowrap text-[13px]">
                        {request.lines.length === 0
                          ? "—"
                          : formatMoney(requestTotal(request.lines), targetOf(request.currency))}
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>
        </Card>
      )}

      {payouts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label="À reverser"
            value={formatMoney(pendingTotal, targetOf(pending[0]?.targetCurrency ?? "MGA"))}
            sub={`${pending.length} justificatif(s)`}
            tone={pending.length > 0 ? "warning" : "neutral"}
          />
          <StatCard
            label="Déjà reversé"
            value={formatMoney(paidTotal, targetOf(payouts[0]?.targetCurrency ?? "MGA"))}
            tone="success"
          />
          <StatCard label="Justificatifs" value={String(payouts.length)} />
        </div>
      )}

      {payouts.length === 0 ? (
        <EmptyState
          icon={<IconHandover />}
          title="Aucun justificatif de reversement"
          description="Créez-en un pour retracer ce que vous reversez à un sous-traitant : montant reçu, cours de la banque, frais, et net à lui verser."
          action={
            <ButtonLink href="/sous-traitance/nouveau">
              <IconPlus className="h-4 w-4" />
              Créer un justificatif
            </ButtonLink>
          }
        />
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Numéro</TH>
                <TH>Date</TH>
                <TH>Bénéficiaire</TH>
                <TH>Facture</TH>
                <TH align="right">Reçu</TH>
                <TH align="right">Cours</TH>
                <TH align="right">Net à reverser</TH>
                <TH>Statut</TH>
              </TR>
            </THead>
            <tbody>
              {payouts.map((payout) => {
                const source = targetOf(payout.sourceCurrency);
                const target = targetOf(payout.targetCurrency);
                return (
                  <TR key={payout.id} interactive>
                    <TD>
                      <Link
                        href={`/sous-traitance/${payout.id}`}
                        className="tnum font-medium text-ink transition-colors hover:text-accent"
                      >
                        {payout.number ?? <span className="italic text-faint">brouillon</span>}
                      </Link>
                    </TD>
                    <TD className="tnum whitespace-nowrap text-[13px] text-muted">
                      {formatDate(payout.date)}
                    </TD>
                    <TD className="text-[13px]">{payout.beneficiary.name}</TD>
                    <TD className="tnum text-[13px] text-muted">
                      {payout.document?.number ?? "—"}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap text-[13px]">
                      {formatMoney(payout.totalSource, source)}
                    </TD>
                    <TD align="right" className="tnum text-[13px] text-muted">
                      {payout.exchangeRate}
                    </TD>
                    <TD align="right" className="tnum whitespace-nowrap font-medium">
                      {formatMoney(payout.netPayable, target)}
                    </TD>
                    <TD>
                      <Badge tone={payout.status === "PAID" ? "success" : "warning"} dot>
                        {PAYOUT_STATUS_LABELS[payout.status as PayoutStatus] ?? payout.status}
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
