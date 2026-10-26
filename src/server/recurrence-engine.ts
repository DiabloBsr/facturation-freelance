import type { Prisma } from "@prisma/client";
import { addDays, addMonths } from "@/lib/dates";
import { applyDatePlaceholders } from "@/lib/placeholders";
import { recalcDocument } from "./recalc";

/**
 * Moteur des abonnements.
 *
 * Isolé des actions serveur (qui invalident le cache et redirigent) pour être
 * exerçable directement par les tests : la génération d'une échéance est la
 * partie qu'il faut pouvoir prouver.
 */

/** Échéance suivante selon la fréquence choisie. */
export function advance(date: Date, frequency: string, interval: number): Date {
  const step = Math.max(1, interval);
  if (frequency === "WEEKLY") return addDays(date, 7 * step);
  if (frequency === "QUARTERLY") return addMonths(date, 3 * step);
  if (frequency === "YEARLY") return addMonths(date, 12 * step);
  return addMonths(date, step);
}

/**
 * Duplique le document source à la date d'échéance, résout les jetons de
 * période, puis avance le compteur de l'abonnement.
 * Retourne l'identifiant de la facture créée, ou null si l'abonnement n'a plus
 * de document modèle.
 */
export async function generateOne(
  tx: Prisma.TransactionClient,
  recurrenceId: string,
): Promise<string | null> {
  const recurrence = await tx.recurrence.findUnique({
    where: { id: recurrenceId },
    include: {
      sourceDocument: { include: { lines: { orderBy: { position: "asc" } } } },
    },
  });
  if (!recurrence?.sourceDocument) return null;

  const source = recurrence.sourceDocument;
  const issueDate = recurrence.nextRunDate;

  const invoice = await tx.document.create({
    data: {
      type: "INVOICE",
      status: "DRAFT",
      // Les jetons de période sont résolus ici : sans cela l'abonnement
      // recopierait le mois du document modèle sur toutes les échéances.
      subject: applyDatePlaceholders(source.subject, issueDate),
      billToId: source.billToId,
      endClientId: source.endClientId,
      contactId: source.contactId,
      missionId: source.missionId,
      issueDate,
      dueDate: addDays(issueDate, source.paymentTermsDays),
      currency: source.currency,
      exchangeRate: source.exchangeRate,
      vatMode: source.vatMode,
      paymentTermsDays: source.paymentTermsDays,
      discountType: source.discountType,
      discountValue: source.discountValue,
      withholdingLabel: source.withholdingLabel,
      withholdingRate: source.withholdingRate,
      purchaseOrder: source.purchaseOrder,
      notes: applyDatePlaceholders(source.notes, issueDate),
      terms: source.terms,
      footer: source.footer,
      template: source.template,
      accentColor: source.accentColor,
      showAmountInWords: source.showAmountInWords,
      bankAccountId: source.bankAccountId,
      recurrenceId: recurrence.id,
    },
  });

  for (const line of source.lines) {
    await tx.documentLine.create({
      data: {
        documentId: invoice.id,
        position: line.position,
        kind: line.kind,
        label: applyDatePlaceholders(line.label, issueDate) ?? line.label,
        description: applyDatePlaceholders(line.description, issueDate),
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        discountType: line.discountType,
        discountValue: line.discountValue,
        vatRate: line.vatRate,
      },
    });
  }

  await recalcDocument(tx, invoice.id);

  const occurrencesDone = recurrence.occurrencesDone + 1;
  const nextRunDate = advance(issueDate, recurrence.frequency, recurrence.interval);
  const reachedLimit =
    recurrence.occurrencesLimit !== null && occurrencesDone >= recurrence.occurrencesLimit;
  const pastEnd = recurrence.endDate !== null && nextRunDate > recurrence.endDate;

  await tx.recurrence.update({
    where: { id: recurrence.id },
    data: {
      occurrencesDone,
      nextRunDate,
      lastGeneratedAt: new Date(),
      // L'abonnement s'arrête de lui-même au terme prévu.
      active: !(reachedLimit || pastEnd),
    },
  });

  return invoice.id;
}
