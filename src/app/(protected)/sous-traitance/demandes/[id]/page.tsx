import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink, SubmitButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Field, Select } from "@/components/ui/field";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { CopyLink } from "@/components/payouts/copy-link";
import { IconHandover, IconTrash } from "@/components/icons";
import { formatDate } from "@/lib/dates";
import { formatMoney, formatQuantity } from "@/lib/money";
import {
  PAYMENT_METHOD_LABELS,
  PAYOUT_REQUEST_STATUS_LABELS,
  type PaymentMethod,
  type PayoutRequestStatus,
} from "@/lib/enums";
import {
  cancelPayoutRequest,
  deletePayoutRequest,
  importRequestIntoDocument,
  regeneratePayoutRequestLink,
} from "@/server/actions/payout-requests";
import { getPayoutRequest, requestTotal } from "@/server/payout-requests";
import { listSourceDocuments } from "@/server/payouts";
import { getCurrencyFormat } from "@/server/settings";

export const metadata = { title: "Demande de facture" };

export default async function DemandePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const request = await getPayoutRequest(id);
  if (!request) notFound();

  const [currency, documents, headerList] = await Promise.all([
    getCurrencyFormat(request.currency),
    listSourceDocuments(),
    headers(),
  ]);

  // Le jeton n'arrive qu'au retour de la création : il n'est pas relisible.
  const token = Array.isArray(query.jeton) ? query.jeton[0] : query.jeton;
  const host = headerList.get("host") ?? "";
  const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
  const link = token ? `${protocol}://${host}/reversement/${token}` : null;

  const status = request.status as PayoutRequestStatus;
  const total = requestTotal(request.lines);
  const submitted = request.lines.length > 0;
  const expired = request.expiresAt.getTime() <= Date.now();

  return (
    <PageShell>
      <PageHeader
        backHref="/sous-traitance"
        backLabel="Retour à la sous-traitance"
        title={`Demande — ${request.beneficiary.name}`}
        description={
          submitted
            ? "Ce que l'intervenant a déclaré. Reprenez-le dans votre facture client ou dans un justificatif de reversement."
            : "En attente de la déclaration de l'intervenant."
        }
        actions={
          <Badge
            tone={
              status === "SUBMITTED" ? "success" : status === "CONVERTED" ? "neutral" : "warning"
            }
            dot
          >
            {PAYOUT_REQUEST_STATUS_LABELS[status] ?? status}
          </Badge>
        }
      />

      {link && <CopyLink url={link} />}

      <Card>
        <CardHeader title="La demande" />
        <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
          <Row label="Intervenant" value={request.beneficiary.name} />
          <Row label="Devise imposée" value={request.currency} />
          <Row
            label="Lien valable jusqu'au"
            value={`${formatDate(request.expiresAt)}${expired ? " (expiré)" : ""}`}
          />
          <Row
            label="Reçue le"
            value={request.submittedAt ? formatDate(request.submittedAt) : "—"}
          />
          {request.subject && (
            <div className="sm:col-span-2">
              <dt className="text-muted">Consigne</dt>
              <dd className="mt-0.5 whitespace-pre-line text-ink">{request.subject}</dd>
            </div>
          )}
        </dl>
      </Card>

      {submitted ? (
        <>
          <Card padded={false}>
            <div className="border-b border-line px-5 py-4">
              <CardHeader
                title="Prestations déclarées"
                description={`${request.lines.length} ligne(s), en ${request.currency}.`}
              />
            </div>
            <TableWrap>
              <Table>
                <THead>
                  <TR>
                    <TH>Désignation</TH>
                    <TH align="right">Quantité</TH>
                    <TH align="right">Prix unitaire</TH>
                    <TH align="right">Montant</TH>
                  </TR>
                </THead>
                <tbody>
                  {request.lines.map((line) => (
                    <TR key={line.id}>
                      <TD className="text-[13px]">{line.label}</TD>
                      <TD align="right" className="tnum whitespace-nowrap text-[13px] text-muted">
                        {formatQuantity(line.quantity)} {line.unit}
                      </TD>
                      <TD align="right" className="tnum whitespace-nowrap text-[13px] text-muted">
                        {formatMoney(line.unitPrice, currency)}
                      </TD>
                      <TD align="right" className="tnum whitespace-nowrap font-medium">
                        {formatMoney(line.amount, currency)}
                      </TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
            <div className="flex items-baseline justify-between gap-3 border-t border-line px-5 py-3">
              <span className="text-[13px] font-semibold text-ink">Total déclaré</span>
              <span className="tnum text-base font-semibold text-ink">
                {formatMoney(total, currency)}
              </span>
            </div>
          </Card>

          <Card>
            <CardHeader title="Ses informations" />
            <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
              <Row label="E-mail" value={request.contactEmail ?? "—"} />
              <Row
                label="Moyen de paiement souhaité"
                value={
                  request.paymentMethod
                    ? (PAYMENT_METHOD_LABELS[request.paymentMethod as PaymentMethod] ??
                      request.paymentMethod)
                    : "—"
                }
              />
              <Row label="Coordonnées" value={request.paymentDetails ?? "—"} />
              {request.notes && (
                <div className="sm:col-span-2">
                  <dt className="text-muted">Remarque</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-ink">{request.notes}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Reprendre cette déclaration"
              description="Les lignes s'ajoutent à la suite de la facture choisie et les totaux se recalculent. La facture doit être dans la même devise."
            />

            <form action={importRequestIntoDocument} className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <input type="hidden" name="id" value={request.id} />
              <Field label="Ajouter à la facture">
                <Select name="documentId" defaultValue="">
                  <option value="">— Choisir —</option>
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton pendingLabel="Ajout…">Ajouter à la facture</SubmitButton>
            </form>

            <div className="mt-5 border-t border-line pt-4">
              <p className="text-[13px] text-muted">
                Ou tracez ce que vous lui reversez, avec le cours de votre banque et les frais :
              </p>
              <div className="mt-2">
                <ButtonLink
                  href={`/sous-traitance/nouveau?demande=${request.id}`}
                  variant="secondary"
                >
                  <IconHandover className="h-4 w-4" />
                  Créer le justificatif de reversement
                </ButtonLink>
              </div>
            </div>

            {request.document && (
              <p className="mt-4 text-[12px] text-muted">
                Déjà repris dans la facture {request.document.number ?? "(brouillon)"}.
              </p>
            )}
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader
            title="En attente"
            description="L'intervenant n'a pas encore envoyé sa déclaration. Vous pouvez régénérer le lien s'il l'a perdu — l'ancien cessera alors de fonctionner."
          />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <form action={regeneratePayoutRequestLink}>
              <input type="hidden" name="id" value={request.id} />
              <SubmitButton variant="secondary" pendingLabel="Génération…">
                Régénérer le lien
              </SubmitButton>
            </form>
            <ConfirmAction
              action={cancelPayoutRequest}
              hidden={{ id: request.id }}
              triggerLabel="Annuler la demande"
              triggerVariant="secondary"
              confirmLabel="Annuler la demande"
              cancelLabel="Revenir"
              title="Annuler cette demande ?"
              description="Le lien cessera immédiatement de fonctionner. L'intervenant ne pourra plus rien envoyer."
            />
          </div>
        </Card>
      )}

      <div className="flex justify-end">
        <ConfirmAction
          action={deletePayoutRequest}
          hidden={{ id: request.id }}
          triggerLabel="Supprimer la demande"
          triggerVariant="ghost"
          icon={<IconTrash className="h-4 w-4" />}
          title="Supprimer cette demande ?"
          description="La déclaration de l'intervenant sera perdue. Les lignes déjà reprises dans une facture, elles, restent en place."
        />
      </div>
    </PageShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 break-words text-ink">{value}</dd>
    </div>
  );
}
