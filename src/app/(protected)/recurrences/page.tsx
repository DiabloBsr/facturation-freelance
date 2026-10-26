import Link from "next/link";
import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/ui/button";
import { ConfirmAction } from "@/components/ui/confirm";
import { Field, Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty";
import { IconRepeat, IconTrash } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatDate, toDateInput, today } from "@/lib/dates";
import { formatMoney, FALLBACK_CURRENCY } from "@/lib/money";
import { FREQUENCIES, FREQUENCY_LABELS, type Frequency } from "@/lib/enums";
import { PLACEHOLDERS } from "@/lib/placeholders";
import { getCurrencyMap } from "@/server/settings";
import {
  createRecurrence,
  deleteRecurrence,
  runDueRecurrences,
  runRecurrenceNow,
  toggleRecurrence,
} from "@/server/actions/recurrences";

export const metadata = { title: "Abonnements" };

export default async function RecurrencesPage() {
  const now = today();

  const [recurrences, candidates, currencies] = await Promise.all([
    prisma.recurrence.findMany({
      include: {
        sourceDocument: {
          select: {
            id: true,
            number: true,
            subject: true,
            total: true,
            currency: true,
            billTo: { select: { name: true } },
          },
        },
        _count: { select: { generated: true } },
      },
      orderBy: [{ active: "desc" }, { nextRunDate: "asc" }],
    }),
    prisma.document.findMany({
      where: { type: { in: ["INVOICE", "QUOTE"] } },
      select: {
        id: true,
        number: true,
        subject: true,
        type: true,
        total: true,
        currency: true,
        billTo: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 60,
    }),
    getCurrencyMap(),
  ]);

  const due = recurrences.filter(
    (recurrence) => recurrence.active && recurrence.nextRunDate <= now,
  );

  return (
    <PageShell wide>
      <PageHeader
        title="Abonnements"
        description="Régénérez automatiquement une facture à intervalle régulier à partir d'un document modèle. Les factures créées restent en brouillon : vous gardez la main avant de les valider."
        actions={
          due.length > 0 ? (
            <form action={runDueRecurrences}>
              <SubmitButton pendingLabel="Génération…">
                Générer les {due.length} échéance(s) dues
              </SubmitButton>
            </form>
          ) : undefined
        }
      />

      {recurrences.length === 0 ? (
        <EmptyState
          icon={<IconRepeat />}
          title="Aucun abonnement"
          description="Choisissez ci-dessous une facture existante comme modèle : elle sera dupliquée à chaque échéance."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {recurrences.map((recurrence) => {
            const source = recurrence.sourceDocument;
            const currency = source
              ? (currencies.get(source.currency) ?? FALLBACK_CURRENCY)
              : FALLBACK_CURRENCY;
            const isDue = recurrence.active && recurrence.nextRunDate <= now;

            return (
              <Card key={recurrence.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
                      {recurrence.name}
                      {recurrence.active ? (
                        <Badge tone={isDue ? "warning" : "success"} dot>
                          {isDue ? "échéance atteinte" : "actif"}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">en pause</Badge>
                      )}
                    </h2>

                    <p className="mt-1 text-[13px] text-muted">
                      {FREQUENCY_LABELS[recurrence.frequency as Frequency]}
                      {recurrence.interval > 1 ? ` (tous les ${recurrence.interval})` : ""} ·
                      prochaine émission le{" "}
                      <strong className="font-medium text-ink">
                        {formatDate(recurrence.nextRunDate)}
                      </strong>
                      {recurrence.endDate && ` · jusqu'au ${formatDate(recurrence.endDate)}`}
                    </p>

                    {source && (
                      <p className="mt-1 text-[13px] text-muted">
                        Modèle :{" "}
                        <Link
                          href={`/documents/${source.id}`}
                          className="text-accent hover:underline"
                        >
                          {source.number ?? "brouillon"}
                        </Link>{" "}
                        — {source.billTo.name} — {formatMoney(source.total, currency)}
                      </p>
                    )}

                    <p className="mt-1 text-[12px] text-faint">
                      {recurrence._count.generated} facture(s) générée(s)
                      {recurrence.occurrencesLimit
                        ? ` sur ${recurrence.occurrencesLimit} prévue(s)`
                        : ""}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <form action={runRecurrenceNow}>
                      <input type="hidden" name="id" value={recurrence.id} />
                      <SubmitButton size="sm" variant="quiet" pendingLabel="Génération…">
                        Générer maintenant
                      </SubmitButton>
                    </form>

                    <form action={toggleRecurrence}>
                      <input type="hidden" name="id" value={recurrence.id} />
                      <SubmitButton size="sm" variant="secondary" pendingLabel="…">
                        {recurrence.active ? "Mettre en pause" : "Réactiver"}
                      </SubmitButton>
                    </form>

                    <ConfirmAction
                      action={deleteRecurrence}
                      hidden={{ id: recurrence.id }}
                      triggerLabel=""
                      triggerVariant="ghost"
                      triggerSize="icon"
                      icon={<IconTrash className="h-4 w-4" />}
                      title={`Supprimer l'abonnement « ${recurrence.name} » ?`}
                      description={`La planification sera perdue. Les ${recurrence._count.generated} facture(s) déjà générées, elles, sont conservées.`}
                    />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Création */}
      <form action={createRecurrence}>
        <Card>
          <CardHeader
            title="Nouvel abonnement"
            description="Le document choisi sert de gabarit : ses lignes, sa devise et ses mentions sont recopiées à chaque échéance."
          />

          {/* Sans ces jetons, chaque facture générée répéterait le mois du
              document modèle. */}
          <div className="mt-4 rounded-[var(--radius)] border border-line bg-surface-2 px-4 py-3">
            <p className="text-[13px] font-medium text-ink">
              Faire apparaître la période sur chaque facture
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Écrivez un de ces jetons dans l&apos;objet, dans une désignation de ligne ou dans
              la note du document modèle : il sera remplacé par la période réelle au moment de
              la génération. Exemple : «&nbsp;Prestations de développement — {"{MOIS_ANNEE}"}&nbsp;».
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {PLACEHOLDERS.map((placeholder) => (
                <span
                  key={placeholder.token}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] text-muted"
                >
                  <code className="font-mono font-semibold text-accent">{placeholder.token}</code>
                  <span>{placeholder.description}</span>
                  <span className="text-faint">→ {placeholder.example}</span>
                </span>
              ))}
            </div>
          </div>

          {candidates.length === 0 ? (
            <p className="mt-3 text-[13px] text-muted">
              Créez d&apos;abord une facture pour pouvoir l&apos;utiliser comme modèle.
            </p>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Document modèle" required className="lg:col-span-3">
                <Select name="sourceDocumentId" required defaultValue="">
                  <option value="" disabled>
                    — Sélectionner —
                  </option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.number ?? "brouillon"} — {candidate.billTo.name}
                      {candidate.subject ? ` — ${candidate.subject}` : ""}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Nom de l'abonnement">
                <Input name="name" placeholder="Maintenance mensuelle" />
              </Field>

              <Field label="Fréquence">
                <Select name="frequency" defaultValue="MONTHLY">
                  {FREQUENCIES.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {FREQUENCY_LABELS[frequency as Frequency]}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Intervalle" hint="1 = chaque période, 2 = une période sur deux.">
                <Input
                  name="interval"
                  inputMode="numeric"
                  defaultValue="1"
                  className="tnum text-right"
                />
              </Field>

              <Field label="Première émission" required>
                <Input type="date" name="nextRunDate" defaultValue={toDateInput(now)} required />
              </Field>

              <Field label="Fin (facultatif)">
                <Input type="date" name="endDate" />
              </Field>

              <Field label="Nombre d'échéances (facultatif)">
                <Input
                  name="occurrencesLimit"
                  inputMode="numeric"
                  placeholder="12"
                  className="tnum text-right"
                />
              </Field>

              <div className="flex items-end lg:col-span-3">
                <SubmitButton pendingLabel="Création…">Créer l&apos;abonnement</SubmitButton>
              </div>
            </div>
          )}
        </Card>
      </form>
    </PageShell>
  );
}
