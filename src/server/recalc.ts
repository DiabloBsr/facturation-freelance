import type { Prisma } from "@prisma/client";
import { computeDocument, deriveStatus } from "@/lib/compute";

/**
 * Recalcule et fige les totaux d'un document, puis en déduit le statut.
 *
 * Appelée après toute modification qui touche aux montants : lignes,
 * encaissements, rattachement d'un acompte, changement de devise.
 */
export async function recalcDocument(
  tx: Prisma.TransactionClient,
  documentId: string,
): Promise<void> {
  const doc = await tx.document.findUnique({
    where: { id: documentId },
    include: {
      lines: { orderBy: { position: "asc" } },
      payments: true,
      children: { select: { id: true, type: true, status: true, total: true } },
    },
  });
  if (!doc) return;

  const currency = await tx.currency.findUnique({ where: { code: doc.currency } });
  const decimals = currency?.decimals ?? 2;

  const totalDeposits = doc.children
    .filter((child) => child.type === "DEPOSIT" && child.status !== "CANCELLED")
    .reduce((sum, child) => sum + child.total, 0);

  const totalPaid = doc.payments.reduce((sum, payment) => sum + payment.amount, 0);

  const computed = computeDocument({
    lines: doc.lines.map((line) => ({
      kind: line.kind,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue,
      vatRate: line.vatRate,
    })),
    vatMode: doc.vatMode,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    withholdingRate: doc.withholdingRate,
    totalDeposits,
    totalPaid,
    decimals,
  });

  // Totaux ligne à ligne (affichés tels quels sur le PDF).
  await Promise.all(
    doc.lines.map((line, index) =>
      tx.documentLine.update({
        where: { id: line.id },
        data: {
          net: computed.lines[index].net,
          vat: computed.lines[index].vat,
          gross: computed.lines[index].gross,
        },
      }),
    ),
  );

  const status = deriveStatus({
    type: doc.type,
    status: doc.status,
    total: computed.total,
    totalPaid,
    dueDate: doc.dueDate,
  });

  await tx.document.update({
    where: { id: documentId },
    data: {
      subtotal: computed.subtotal,
      totalDiscount: computed.totalDiscount,
      totalNet: computed.totalNet,
      totalVat: computed.totalVat,
      totalGross: computed.totalGross,
      totalWithheld: computed.totalWithheld,
      totalDeposits: computed.totalDeposits,
      total: computed.total,
      totalPaid,
      balanceDue: computed.balanceDue,
      status,
      paidAt: status === "PAID" ? (doc.paidAt ?? new Date()) : null,
    },
  });
}
