import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink, SubmitButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DocumentPreview } from "@/components/documents/document-preview";
import { buildDocumentViewModel } from "@/pdf/render";
import { TEMPLATES } from "@/lib/templates";
import {
  IconBell,
  IconCheck,
  IconCopy,
  IconDocument,
  IconDownload,
  IconEdit,
  IconTrash,
} from "@/components/icons";
import { buttonClass } from "@/components/ui/button-style";
import { daysLate, formatDate, formatDateTime, toDateInput, today } from "@/lib/dates";
import { formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import {
  DOCUMENT_TYPE_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  REMINDER_LEVEL_LABELS,
  STATUSES_FOR_TYPE,
  DOCUMENT_STATUS_LABELS,
  isReceivable,
  type DocumentType,
  type PaymentMethod,
} from "@/lib/enums";
import { getDocument } from "@/server/documents";
import {
  getBankAccounts,
  getBaseCurrencyFormat,
  getCompany,
  getCurrencyMap,
  getRatesToBase,
} from "@/server/settings";
import {
  convertQuoteToInvoice,
  createCreditNote,
  createDeposit,
  deleteDocument,
  duplicateDocument,
  issueDocument,
  setDocumentStatus,
} from "@/server/actions/documents";
import { addPayment, deletePayment } from "@/server/actions/payments";
import { createReminder, deleteReminder, markReminderSent } from "@/server/actions/reminders";

export default async function DocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;

  const [document, currencies, bankAccounts, built, company, baseCurrency, rates] =
    await Promise.all([
      getDocument(id),
      getCurrencyMap(),
      getBankAccounts(),
      buildDocumentViewModel(id),
      getCompany(),
      getBaseCurrencyFormat(),
      getRatesToBase(),
    ]);

  if (!document || !built) notFound();

  // Modèle essayé depuis l'URL, sinon celui enregistré sur le document.
  const requested = Array.isArray(query.modele) ? query.modele[0] : query.modele;
  const previewTemplate = TEMPLATES.some((t) => t.id === requested)
    ? (requested as string)
    : document.template;

  const type = document.type as DocumentType;
  const currency = currencies.get(document.currency) ?? FALLBACK_CURRENCY;
  const late = daysLate(document.dueDate);
  const receivable = isReceivable(type);
  const backHref =
    type === "QUOTE" ? "/devis" : type === "CREDIT_NOTE" ? "/avoirs" : "/factures";

  return (
    <PageShell wide>
      <PageHeader
        backHref={backHref}
        backLabel="Retour à la liste"
        eyebrow={
          <>
            {DOCUMENT_TYPE_LABELS[type]}
            {document.mission && (
              <>
                <span className="text-line-strong">·</span>
                <Link href={`/missions/${document.mission.id}`} className="hover:text-ink">
                  {document.mission.title}
                </Link>
              </>
            )}
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-3">
            {document.number ?? "Brouillon"}
            <StatusBadge status={document.status} />
            {late > 0 && document.balanceDue > 0 && (
              <Badge tone="danger">{late} jours de retard</Badge>
            )}
          </span>
        }
        description={document.subject ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ButtonLink href={`/documents/${id}/modifier`} variant="secondary" size="sm">
              <IconEdit className="h-4 w-4" />
              Modifier
            </ButtonLink>

            {!document.number && (
              <form action={issueDocument}>
                <input type="hidden" name="id" value={id} />
                <SubmitButton size="sm" pendingLabel="Validation…">
                  <IconCheck className="h-4 w-4" />
                  Valider et numéroter
                </SubmitButton>
              </form>
            )}

            <form action={duplicateDocument}>
              <input type="hidden" name="id" value={id} />
              <SubmitButton variant="ghost" size="sm" pendingLabel="Copie…">
                <IconCopy className="h-4 w-4" />
                Dupliquer
              </SubmitButton>
            </form>

            <ConfirmAction
              action={deleteDocument}
              hidden={{ id }}
              triggerLabel="Supprimer"
              triggerVariant="ghost"
              icon={<IconTrash className="h-4 w-4" />}
              title={`Supprimer ${DOCUMENT_TYPE_LABELS[type].toLowerCase()} ${
                document.number ?? "(brouillon)"
              } ?`}
              description={
                <>
                  Seront définitivement perdus : les {document.lines.length} ligne(s) du document,
                  {document.payments.length > 0
                    ? ` ${document.payments.length} encaissement(s) enregistré(s),`
                    : ""}
                  {document.reminders.length > 0
                    ? ` ${document.reminders.length} relance(s),`
                    : ""}{" "}
                  et son historique.
                  {document.number
                    ? " Le numéro déjà attribué laissera un trou dans la numérotation."
                    : ""}
                </>
              }
            />
          </div>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Aperçu du document */}
        <div className="min-w-0">
          <DocumentPreview
            documentId={id}
            currentTemplate={document.template}
            previewTemplate={previewTemplate}
            vm={built.vm}
          />
        </div>

        {/* Panneau latéral */}
        <div className="flex flex-col gap-5">
          {/* Synthèse */}
          <Card>
            <CardHeader title="Synthèse" />
            <dl className="mt-4 space-y-2.5 text-[13px]">
              <Row label="Destinataire">
                <Link
                  href={`/${document.billTo.kind === "AGENCY" ? "agences" : "clients"}/${document.billTo.id}`}
                  className="font-medium text-ink hover:text-accent"
                >
                  {document.billTo.name}
                </Link>
              </Row>
              {document.endClient && (
                <Row label="Client final">
                  <Link
                    href={`/clients/${document.endClient.id}`}
                    className="text-ink hover:text-accent"
                  >
                    {document.endClient.name}
                  </Link>
                </Row>
              )}
              <Row label="Émission">{formatDate(document.issueDate)}</Row>
              {document.dueDate && <Row label="Échéance">{formatDate(document.dueDate)}</Row>}
              {document.validUntil && (
                <Row label="Valable jusqu'au">{formatDate(document.validUntil)}</Row>
              )}
              <Row label="Devise">{document.currency}</Row>

              <div className="border-t border-line pt-2.5">
                <Row label="Total hors taxes">{formatMoney(document.totalNet, currency)}</Row>
                {document.totalVat > 0 && (
                  <Row label="TVA">{formatMoney(document.totalVat, currency)}</Row>
                )}
                {document.totalDeposits > 0 && (
                  <Row label="Acomptes déduits">
                    − {formatMoney(document.totalDeposits, currency)}
                  </Row>
                )}
                <Row label={type === "CREDIT_NOTE" ? "Montant de l'avoir" : "Net à payer"} strong>
                  {formatMoney(document.total, currency)}
                </Row>
                {receivable && (
                  <>
                    <Row label="Encaissé">{formatMoney(document.totalPaid, currency)}</Row>
                    <Row label="Reste dû" strong tone={document.balanceDue > 0 ? "danger" : "success"}>
                      {formatMoney(document.balanceDue, currency)}
                    </Row>
                  </>
                )}
              </div>
            </dl>

            {document.internalNotes && (
              <p className="mt-4 rounded-[var(--radius)] bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
                <strong className="font-medium text-ink">Note interne :</strong>{" "}
                {document.internalNotes}
              </p>
            )}
          </Card>

          {/* Statut */}
          <Card>
            <CardHeader title="Statut" description="Le statut suit les encaissements automatiquement." />
            <form action={setDocumentStatus} className="mt-4 flex items-end gap-2">
              <input type="hidden" name="id" value={id} />
              <Field label="Modifier manuellement" className="flex-1">
                <Select name="status" defaultValue={document.status}>
                  {STATUSES_FOR_TYPE[type].map((status) => (
                    <option key={status} value={status}>
                      {DOCUMENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </Field>
              <SubmitButton variant="secondary" pendingLabel="…">
                Appliquer
              </SubmitButton>
            </form>
          </Card>

          {/* Facturation électronique */}
          {(type === "INVOICE" || type === "DEPOSIT" || type === "CREDIT_NOTE") && (
            <Card>
              <CardHeader
                title="Facture électronique"
                description="Format Factur-X (CII, profil BASIC WL) : le PDF embarque un XML normalisé que la comptabilité de votre client peut lire automatiquement."
              />
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`/api/documents/${id}/pdf?facturx=1&dl=1`}
                  className={buttonClass("secondary", "sm")}
                >
                  <IconDownload className="h-4 w-4" />
                  PDF Factur-X
                </a>
                <a
                  href={`/api/documents/${id}/facturx`}
                  className={buttonClass("ghost", "sm")}
                >
                  <IconDocument className="h-4 w-4" />
                  Le XML seul
                </a>
              </div>
              {!document.number && (
                <p className="mt-3 text-[12px] leading-relaxed text-warning">
                  Ce document est encore un brouillon : le XML porte la mention
                  « BROUILLON » au lieu d&apos;un numéro. Validez-le avant de l&apos;envoyer.
                </p>
              )}
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                Le XML est bien joint au PDF sous son nom normalisé, mais le fichier
                n&apos;est pas certifié PDF/A-3 : à vérifier si votre client l&apos;exige
                formellement.
              </p>
            </Card>
          )}

          {/* Documents liés / conversions */}
          <Card>
            <CardHeader title="Documents liés" />
            <div className="mt-3 flex flex-col gap-2">
              {document.parent && (
                <LinkedRow
                  href={`/documents/${document.parent.id}`}
                  label={`${DOCUMENT_TYPE_LABELS[document.parent.type as DocumentType]} d'origine`}
                  value={document.parent.number ?? "brouillon"}
                />
              )}
              {document.children.map((child) => (
                <LinkedRow
                  key={child.id}
                  href={`/documents/${child.id}`}
                  label={DOCUMENT_TYPE_LABELS[child.type as DocumentType]}
                  value={`${child.number ?? "brouillon"} — ${formatMoney(
                    child.total,
                    currencies.get(child.currency) ?? currency,
                  )}`}
                />
              ))}
              {!document.parent && document.children.length === 0 && (
                <p className="text-[13px] text-muted">Aucun document lié.</p>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {type === "QUOTE" && (
                <form action={convertQuoteToInvoice}>
                  <input type="hidden" name="id" value={id} />
                  <SubmitButton size="sm" variant="quiet" pendingLabel="Conversion…">
                    Convertir en facture
                  </SubmitButton>
                </form>
              )}

              {(type === "QUOTE" || type === "INVOICE") && (
                <form action={createDeposit} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={id} />
                  <Input
                    name="percent"
                    defaultValue="30"
                    inputMode="decimal"
                    className="tnum h-8 w-16 text-right text-[13px]"
                    aria-label="Pourcentage de l'acompte"
                  />
                  <span className="text-[13px] text-muted">%</span>
                  <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                    Acompte
                  </SubmitButton>
                </form>
              )}

              {(type === "INVOICE" || type === "DEPOSIT") && (
                <form action={createCreditNote}>
                  <input type="hidden" name="id" value={id} />
                  <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                    Créer un avoir
                  </SubmitButton>
                </form>
              )}
            </div>
          </Card>

          {/* Encaissements */}
          {receivable && (
            <Card>
              <CardHeader
                title="Encaissements"
                description={`${document.payments.length} règlement(s) enregistré(s).`}
              />

              <div className="mt-3 flex flex-col gap-2">
                {document.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-start justify-between gap-2 rounded-[var(--radius)] border border-line bg-surface-2 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="tnum text-[13px] font-semibold text-ink">
                        {formatMoney(payment.amount, currency)}
                      </p>
                      <p className="text-[11px] text-muted">
                        {formatDate(payment.date)} ·{" "}
                        {PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method}
                        {payment.reference ? ` · ${payment.reference}` : ""}
                      </p>
                    </div>
                    <ConfirmAction
                      action={deletePayment}
                      hidden={{ id: payment.id }}
                      triggerLabel=""
                      triggerVariant="ghost"
                      triggerSize="icon"
                      icon={<IconTrash className="h-3.5 w-3.5" />}
                      title="Supprimer cet encaissement ?"
                      description={`Le règlement de ${formatMoney(
                        payment.amount,
                        currency,
                      )} du ${formatDate(payment.date)} sera perdu et le reste dû recalculé.`}
                    />
                  </div>
                ))}
              </div>

              {document.balanceDue > 0 && (
                <form action={addPayment} className="mt-4 grid gap-3 border-t border-line pt-4">
                  <input type="hidden" name="documentId" value={id} />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Montant" required>
                      <Input
                        name="amount"
                        inputMode="decimal"
                        defaultValue={String(document.balanceDue / 1000)}
                        className="tnum text-right"
                      />
                    </Field>
                    <Field label="Date">
                      <Input type="date" name="date" defaultValue={toDateInput(today())} />
                    </Field>
                  </div>
                  {document.currency !== company.baseCurrency && (
                    <Field
                      label={`Cours du jour — 1 ${currency.symbol} en ${baseCurrency.symbol}`}
                    >
                      <Input
                        name="rateToBase"
                        inputMode="decimal"
                        defaultValue={String(
                          rates.get(document.currency) ?? document.exchangeRate,
                        )}
                        className="tnum text-right"
                      />
                    </Field>
                  )}
                  <Field label="Moyen de paiement">
                    <Select name="method" defaultValue="TRANSFER">
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method} value={method}>
                          {PAYMENT_METHOD_LABELS[method]}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  {bankAccounts.length > 0 && (
                    <Field label="Compte crédité">
                      <Select name="bankAccountId" defaultValue="">
                        <option value="">— Non précisé —</option>
                        {bankAccounts.map((account) => (
                          <option key={account.id} value={account.id}>
                            {account.label}
                          </option>
                        ))}
                      </Select>
                    </Field>
                  )}
                  <Field label="Référence">
                    <Input name="reference" placeholder="N° de virement, réf. MVola…" />
                  </Field>
                  <SubmitButton pendingLabel="Enregistrement…">
                    Enregistrer l&apos;encaissement
                  </SubmitButton>
                </form>
              )}
            </Card>
          )}

          {/* Relances */}
          {receivable && document.balanceDue > 0 && document.number && (
            <Card>
              <CardHeader
                title="Relances"
                description="Le texte est pré-rédigé selon le niveau, à copier dans votre e-mail."
              />

              <div className="mt-3 flex flex-col gap-3">
                {document.reminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="rounded-[var(--radius)] border border-line bg-surface-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-ink">
                          {REMINDER_LEVEL_LABELS[reminder.level] ?? `Relance ${reminder.level}`}
                        </p>
                        <p className="text-[11px] text-muted">
                          {reminder.sentAt
                            ? `Envoyée le ${formatDateTime(reminder.sentAt)}`
                            : "Non envoyée"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!reminder.sentAt && (
                          <form action={markReminderSent}>
                            <input type="hidden" name="id" value={reminder.id} />
                            <SubmitButton variant="ghost" size="sm" pendingLabel="…">
                              <IconCheck className="h-3.5 w-3.5" />
                              Envoyée
                            </SubmitButton>
                          </form>
                        )}
                        <ConfirmAction
                          action={deleteReminder}
                          hidden={{ id: reminder.id }}
                          triggerLabel=""
                          triggerVariant="ghost"
                          triggerSize="icon"
                          icon={<IconTrash className="h-3.5 w-3.5" />}
                          title="Supprimer cette relance ?"
                          description="Le texte préparé et l'historique de cette relance seront perdus."
                        />
                      </div>
                    </div>

                    <details className="mt-2">
                      <summary className="cursor-pointer text-[12px] font-medium text-accent">
                        Voir le message
                      </summary>
                      <div className="mt-2">
                        <p className="text-[12px] font-medium text-ink">{reminder.subject}</p>
                        <Textarea
                          readOnly
                          defaultValue={reminder.body ?? ""}
                          rows={10}
                          className="mt-2 bg-surface text-[12px]"
                        />
                      </div>
                    </details>
                  </div>
                ))}
              </div>

              <form action={createReminder} className="mt-4 border-t border-line pt-4">
                <input type="hidden" name="documentId" value={id} />
                <SubmitButton variant="secondary" size="sm" pendingLabel="Préparation…">
                  <IconBell className="h-4 w-4" />
                  Préparer la relance suivante
                </SubmitButton>
              </form>
            </Card>
          )}

          {/* Temps facturé */}
          {document.timeEntries.length > 0 && (
            <Card>
              <CardHeader
                title="Temps facturé"
                description={`${document.timeEntries.length} saisie(s) de CRA rattachée(s).`}
              />
              <ul className="mt-3 flex flex-col gap-1 text-[13px] text-muted">
                {document.timeEntries.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-2">
                    <span>{formatDate(entry.date)}</span>
                    <span className="tnum">
                      {entry.quantity / 1000} {entry.unit === "HOUR" ? "h" : "j"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function Row({
  label,
  children,
  strong,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  tone?: "danger" | "success";
}) {
  const toneClass =
    tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-ink";
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd
        className={`tnum text-right ${toneClass} ${strong ? "font-semibold" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

function LinkedRow({ href, label, value }: { href: string; label: string; value: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-[var(--radius)] border border-line px-3 py-2 text-[13px] transition-colors hover:border-accent-border hover:bg-accent-soft"
    >
      <span className="text-muted">{label}</span>
      <span className="font-medium text-ink">{value}</span>
    </Link>
  );
}
