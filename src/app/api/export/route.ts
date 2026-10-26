import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { milliToNumber } from "@/lib/money";
import { sessionOr401 } from "@/server/session";
import {
  DOCUMENT_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
  type DocumentStatus,
  type DocumentType,
  type PaymentMethod,
} from "@/lib/enums";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Échappement CSV : guillemets doublés, champ encadré si nécessaire. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(rows: (string | number | null)[][]): string {
  // Point-virgule et BOM : Excel en français ouvre le fichier correctement.
  return "﻿" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}

async function documentsCsv(from?: Date, to?: Date): Promise<string> {
  const documents = await prisma.document.findMany({
    where: {
      number: { not: null },
      ...(from || to
        ? { issueDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
        : {}),
    },
    include: {
      billTo: { include: { identifiers: true } },
      endClient: { select: { name: true } },
    },
    orderBy: { issueDate: "asc" },
  });

  const rows: (string | number | null)[][] = [
    [
      "Numéro",
      "Type",
      "Date",
      "Échéance",
      "Client facturé",
      "Client final",
      "Identifiants client",
      "Objet",
      "Devise",
      "Total HT",
      "TVA",
      "Total TTC",
      "Retenue",
      "Acomptes déduits",
      "Net à payer",
      "Encaissé",
      "Reste dû",
      "Statut",
    ],
  ];

  for (const doc of documents) {
    rows.push([
      doc.number,
      DOCUMENT_TYPE_LABELS[doc.type as DocumentType] ?? doc.type,
      formatDate(doc.issueDate),
      doc.dueDate ? formatDate(doc.dueDate) : "",
      doc.billTo.name,
      doc.endClient?.name ?? "",
      doc.billTo.identifiers.map((i) => `${i.label} ${i.value}`).join(" / "),
      doc.subject ?? "",
      doc.currency,
      milliToNumber(doc.totalNet, 3),
      milliToNumber(doc.totalVat, 3),
      milliToNumber(doc.totalGross, 3),
      milliToNumber(doc.totalWithheld, 3),
      milliToNumber(doc.totalDeposits, 3),
      milliToNumber(doc.total, 3),
      milliToNumber(doc.totalPaid, 3),
      milliToNumber(doc.balanceDue, 3),
      DOCUMENT_STATUS_LABELS[doc.status as DocumentStatus] ?? doc.status,
    ]);
  }

  return toCsv(rows);
}

async function paymentsCsv(from?: Date, to?: Date): Promise<string> {
  const payments = await prisma.payment.findMany({
    where: from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
    include: {
      document: { include: { billTo: { select: { name: true } } } },
      bankAccount: { select: { label: true } },
    },
    orderBy: { date: "asc" },
  });

  const rows: (string | number | null)[][] = [
    ["Date", "Facture", "Client", "Moyen", "Référence", "Compte", "Devise", "Montant", "Note"],
  ];

  for (const payment of payments) {
    rows.push([
      formatDate(payment.date),
      payment.document.number ?? "(brouillon)",
      payment.document.billTo.name,
      PAYMENT_METHOD_LABELS[payment.method as PaymentMethod] ?? payment.method,
      payment.reference ?? "",
      payment.bankAccount?.label ?? "",
      payment.currency,
      milliToNumber(payment.amount, 3),
      payment.notes ?? "",
    ]);
  }

  return toCsv(rows);
}

/**
 * Export comptable.
 *   /api/export?type=factures|encaissements&du=2026-01-01&au=2026-12-31
 */
export async function GET(request: Request) {
  const denied = await sessionOr401();
  if (denied) return denied;

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "factures";

  const parse = (value: string | null) => {
    if (!value) return undefined;
    const date = new Date(`${value}T12:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  };

  const from = parse(url.searchParams.get("du"));
  const to = parse(url.searchParams.get("au"));

  const csv = type === "encaissements" ? await paymentsCsv(from, to) : await documentsCsv(from, to);
  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `${type}-${stamp}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
