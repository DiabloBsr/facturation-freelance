"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addDays, parseDateInput, today } from "@/lib/dates";
import {
  DOCUMENT_TYPE_SEQUENCE,
  DOCUMENT_TYPE_LABELS,
  type DocumentType,
} from "@/lib/enums";
import { allocateNumber } from "@/lib/numbering";
import { applyRate } from "@/lib/money";
import {
  documentPayloadSchema,
  type DocumentPayload,
} from "@/lib/document-payload";
import { recalcDocument } from "../recalc";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

export type SaveResult =
  | { ok: true; id: string; number: string | null }
  | { ok: false; error: string };

function refreshDocumentPaths(id?: string) {
  revalidatePath("/");
  revalidatePath("/devis");
  revalidatePath("/factures");
  revalidatePath("/avoirs");
  revalidatePath("/encaissements");
  revalidatePath("/relances");
  if (id) revalidatePath(`/documents/${id}`);
}

/** Échéance : celle saisie, sinon émission + délai de paiement. */
function resolveDueDate(payload: DocumentPayload, issueDate: Date): Date | null {
  if (payload.dueDate) return parseDateInput(payload.dueDate);
  if (payload.type === "QUOTE" || payload.type === "PROFORMA") return null;
  return addDays(issueDate, payload.paymentTermsDays);
}

function documentScalars(
  payload: DocumentPayload,
  issueDate: Date,
): Prisma.DocumentUncheckedCreateInput {
  return {
    type: payload.type,
    subject: payload.subject,
    billToId: payload.billToId,
    endClientId: payload.endClientId,
    contactId: payload.contactId,
    missionId: payload.missionId,
    issueDate,
    dueDate: resolveDueDate(payload, issueDate),
    validUntil: payload.validUntil ? parseDateInput(payload.validUntil) : null,
    serviceDate: payload.serviceDate ? parseDateInput(payload.serviceDate) : null,
    currency: payload.currency,
    exchangeRate: payload.exchangeRate,
    vatMode: payload.vatMode,
    paymentTermsDays: payload.paymentTermsDays,
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    withholdingLabel: payload.withholdingLabel,
    withholdingRate: payload.withholdingRate,
    purchaseOrder: payload.purchaseOrder,
    notes: payload.notes,
    terms: payload.terms,
    footer: payload.footer,
    internalNotes: payload.internalNotes,
    template: payload.template,
    accentColor: payload.accentColor,
    showAmountInWords: payload.showAmountInWords,
    bankAccountId: payload.bankAccountId,
  };
}

/**
 * Crée ou met à jour un document et l'ensemble de ses lignes.
 * Les lignes sont réécrites intégralement : l'éditeur est la source de vérité.
 */
export async function saveDocument(input: DocumentPayload): Promise<SaveResult> {
  await requireSession();
  const parsed = documentPayloadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue?.message ?? "Document invalide." };
  }
  const payload = parsed.data;

  const issueDate = parseDateInput(payload.issueDate);
  if (!issueDate) return { ok: false, error: "Date d'émission invalide." };

  const hasBillable = payload.lines.some(
    (line) => line.kind === "SERVICE" || line.kind === "PRODUCT",
  );
  if (!hasBillable) {
    return { ok: false, error: "Ajoutez au moins une ligne facturable." };
  }
  if (payload.lines.some((line) => !line.label.trim())) {
    return { ok: false, error: "Chaque ligne doit porter une désignation." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      let documentId = payload.id;

      if (documentId) {
        const existing = await tx.document.findUnique({
          where: { id: documentId },
          select: { id: true, status: true, type: true },
        });
        if (!existing) throw new Error("Document introuvable.");
        if (existing.status === "CANCELLED") {
          throw new Error("Ce document est annulé : il ne peut plus être modifié.");
        }

        await tx.document.update({
          where: { id: documentId },
          data: documentScalars(payload, issueDate),
        });
        await tx.documentLine.deleteMany({ where: { documentId } });
      } else {
        const created = await tx.document.create({
          data: { ...documentScalars(payload, issueDate), parentId: payload.parentId },
        });
        documentId = created.id;
      }

      for (const [index, line] of payload.lines.entries()) {
        await tx.documentLine.create({
          data: {
            documentId,
            position: index,
            kind: line.kind,
            label: line.label,
            description: line.description,
            quantity: line.quantity,
            unit: line.unit,
            unitPrice: line.unitPrice,
            discountType: line.discountType,
            discountValue: line.discountValue,
            vatRate: line.vatRate,
          },
        });
      }

      // Acomptes déduits : on les rattache à ce document, on détache les autres.
      await tx.document.updateMany({
        where: { parentId: documentId, type: "DEPOSIT", id: { notIn: payload.depositIds } },
        data: { parentId: null },
      });
      if (payload.depositIds.length > 0) {
        await tx.document.updateMany({
          where: { id: { in: payload.depositIds }, type: "DEPOSIT" },
          data: { parentId: documentId },
        });
      }

      // Déclarations d'intervenants reprises : elles restent rattachées même si
      // les lignes ont été retouchées depuis, c'est la trace de la provenance.
      if (payload.payoutRequestIds.length > 0) {
        await tx.payoutRequest.updateMany({
          where: { id: { in: payload.payoutRequestIds } },
          data: { documentId, status: "CONVERTED" },
        });
      }

      // Lignes de CRA consommées par ce document.
      await tx.timeEntry.updateMany({
        where: { documentId, id: { notIn: payload.timeEntryIds } },
        data: { documentId: null },
      });
      if (payload.timeEntryIds.length > 0) {
        await tx.timeEntry.updateMany({
          where: { id: { in: payload.timeEntryIds } },
          data: { documentId },
        });
      }

      await recalcDocument(tx, documentId);

      return tx.document.findUniqueOrThrow({
        where: { id: documentId },
        select: { id: true, number: true },
      });
    });

    refreshDocumentPaths(result.id);
    revalidatePath("/temps");
    return { ok: true, id: result.id, number: result.number };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Enregistrement impossible.";
    return { ok: false, error: message };
  }
}

/**
 * Valide un document : il reçoit son numéro définitif.
 * Le numéro n'est consommé qu'ici, ce qui garantit une numérotation continue.
 */
export async function issueDocument(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) redirectWithFlash("/factures", "Document introuvable.", "error");

  if (document.number) {
    redirectWithFlash(
      `/documents/${id}`,
      `Ce document porte déjà le numéro ${document.number}.`,
      "info",
    );
  }

  const number = await prisma.$transaction(async (tx) => {
    const allocated = await allocateNumber(
      tx,
      DOCUMENT_TYPE_SEQUENCE[document.type as DocumentType],
      document.issueDate,
    );
    await tx.document.update({
      where: { id },
      data: {
        number: allocated,
        status: document.status === "DRAFT" ? "SENT" : document.status,
        sentAt: document.sentAt ?? new Date(),
      },
    });
    await recalcDocument(tx, id);
    return allocated;
  });

  refreshDocumentPaths(id);
  redirectWithFlash(`/documents/${id}`, `Document validé sous le numéro ${number}.`);
}

/** Applique définitivement le modèle de mise en page prévisualisé. */
export async function setDocumentTemplate(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const template = String(formData.get("template") ?? "");
  if (!id || !template) return;

  const document = await prisma.document.findUnique({
    where: { id },
    select: { template: true },
  });
  if (!document) redirectWithFlash("/factures", "Document introuvable.", "error");

  if (document.template === template) {
    redirectWithFlash(`/documents/${id}`, "Ce modèle est déjà appliqué.", "info");
  }

  await prisma.document.update({ where: { id }, data: { template } });

  revalidatePath(`/documents/${id}`);
  redirectWithFlash(`/documents/${id}`, "Modèle appliqué au document.");
}

export async function setDocumentStatus(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !status) return;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document) redirectWithFlash("/factures", "Document introuvable.", "error");

  // Rien à faire si le statut est déjà celui demandé.
  if (document.status === status) {
    redirectWithFlash(`/documents/${id}`, "Ce statut est déjà appliqué.", "info");
  }

  const now = new Date();
  await prisma.document.update({
    where: { id },
    data: {
      status,
      sentAt: status === "SENT" ? (document.sentAt ?? now) : document.sentAt,
      acceptedAt: status === "ACCEPTED" ? now : document.acceptedAt,
      refusedAt: status === "REFUSED" ? now : document.refusedAt,
      cancelledAt: status === "CANCELLED" ? now : null,
    },
  });

  refreshDocumentPaths(id);
  redirectWithFlash(`/documents/${id}`, "Statut mis à jour.");
}

export async function deleteDocument(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const document = await prisma.document.findUnique({
    where: { id },
    select: { id: true, type: true, number: true, _count: { select: { payments: true } } },
  });
  if (!document) redirectWithFlash("/factures", "Document introuvable.", "error");

  const label = DOCUMENT_TYPE_LABELS[document.type as DocumentType] ?? "Document";
  await prisma.document.delete({ where: { id } });

  refreshDocumentPaths();
  const listPath = listPathForType(document.type);
  redirectWithFlash(
    listPath,
    `${label}${document.number ? ` ${document.number}` : ""} supprimé.`,
  );
}

function listPathForType(type: string): string {
  if (type === "QUOTE") return "/devis";
  if (type === "CREDIT_NOTE") return "/avoirs";
  return "/factures";
}

export async function duplicateDocument(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const source = await prisma.document.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!source) redirectWithFlash("/factures", "Document introuvable.", "error");

  const issueDate = today();
  const copyId = await prisma.$transaction(async (tx) => {
    const copy = await tx.document.create({
      data: {
        type: source.type,
        status: "DRAFT",
        subject: source.subject,
        billToId: source.billToId,
        endClientId: source.endClientId,
        contactId: source.contactId,
        missionId: source.missionId,
        issueDate,
        dueDate:
          source.type === "QUOTE" ? null : addDays(issueDate, source.paymentTermsDays),
        validUntil: source.validUntil ? addDays(issueDate, 30) : null,
        currency: source.currency,
        exchangeRate: source.exchangeRate,
        vatMode: source.vatMode,
        paymentTermsDays: source.paymentTermsDays,
        discountType: source.discountType,
        discountValue: source.discountValue,
        withholdingLabel: source.withholdingLabel,
        withholdingRate: source.withholdingRate,
        purchaseOrder: source.purchaseOrder,
        notes: source.notes,
        terms: source.terms,
        footer: source.footer,
        template: source.template,
        accentColor: source.accentColor,
        showAmountInWords: source.showAmountInWords,
        bankAccountId: source.bankAccountId,
      },
    });

    for (const line of source.lines) {
      await tx.documentLine.create({
        data: {
          documentId: copy.id,
          position: line.position,
          kind: line.kind,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          vatRate: line.vatRate,
        },
      });
    }

    await recalcDocument(tx, copy.id);
    return copy.id;
  });

  refreshDocumentPaths(copyId);
  redirectWithFlash(`/documents/${copyId}/modifier`, "Copie créée en brouillon.");
}

/** Devis accepté -> facture. Les acomptes du devis suivent la facture. */
export async function convertQuoteToInvoice(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const quote = await prisma.document.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!quote) redirectWithFlash("/devis", "Devis introuvable.", "error");
  if (quote.type !== "QUOTE") {
    redirectWithFlash(`/documents/${id}`, "Ce document n'est pas un devis.", "error");
  }

  const existing = await prisma.document.findFirst({
    where: { parentId: id, type: "INVOICE" },
    select: { id: true },
  });
  if (existing) {
    redirectWithFlash(
      `/documents/${existing.id}`,
      "Ce devis a déjà été converti en facture.",
      "info",
    );
  }

  const issueDate = today();
  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoice = await tx.document.create({
      data: {
        type: "INVOICE",
        status: "DRAFT",
        subject: quote.subject,
        billToId: quote.billToId,
        endClientId: quote.endClientId,
        contactId: quote.contactId,
        missionId: quote.missionId,
        issueDate,
        dueDate: addDays(issueDate, quote.paymentTermsDays),
        serviceDate: quote.serviceDate,
        currency: quote.currency,
        exchangeRate: quote.exchangeRate,
        vatMode: quote.vatMode,
        paymentTermsDays: quote.paymentTermsDays,
        discountType: quote.discountType,
        discountValue: quote.discountValue,
        withholdingLabel: quote.withholdingLabel,
        withholdingRate: quote.withholdingRate,
        purchaseOrder: quote.purchaseOrder,
        notes: quote.notes,
        terms: quote.terms,
        footer: quote.footer,
        template: quote.template,
        accentColor: quote.accentColor,
        showAmountInWords: quote.showAmountInWords,
        bankAccountId: quote.bankAccountId,
        parentId: quote.id,
      },
    });

    for (const line of quote.lines) {
      await tx.documentLine.create({
        data: {
          documentId: invoice.id,
          position: line.position,
          kind: line.kind,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          vatRate: line.vatRate,
        },
      });
    }

    // Les acomptes déjà émis sur ce devis se déduisent désormais de la facture.
    await tx.document.updateMany({
      where: { parentId: quote.id, type: "DEPOSIT" },
      data: { parentId: invoice.id },
    });

    await tx.document.update({
      where: { id: quote.id },
      data: { status: quote.status === "ACCEPTED" ? "ACCEPTED" : "ACCEPTED", acceptedAt: quote.acceptedAt ?? new Date() },
    });

    await recalcDocument(tx, invoice.id);
    return invoice.id;
  });

  refreshDocumentPaths(invoiceId);
  redirectWithFlash(`/documents/${invoiceId}/modifier`, "Facture créée à partir du devis.");
}

/** Facture d'acompte : un pourcentage du document source. */
export async function createDeposit(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const percentInput = Number(String(formData.get("percent") ?? "30").replace(",", "."));
  if (!id) return;

  const percent = Number.isFinite(percentInput)
    ? Math.min(Math.max(percentInput, 0.01), 100)
    : 30;
  const basisPoints = Math.round(percent * 100);

  const source = await prisma.document.findUnique({ where: { id } });
  if (!source) redirectWithFlash("/factures", "Document introuvable.", "error");

  const issueDate = today();
  const depositId = await prisma.$transaction(async (tx) => {
    const deposit = await tx.document.create({
      data: {
        type: "DEPOSIT",
        status: "DRAFT",
        subject: `Acompte de ${percent} % — ${source.subject ?? source.number ?? "prestation"}`,
        billToId: source.billToId,
        endClientId: source.endClientId,
        contactId: source.contactId,
        missionId: source.missionId,
        issueDate,
        dueDate: addDays(issueDate, source.paymentTermsDays),
        currency: source.currency,
        exchangeRate: source.exchangeRate,
        vatMode: source.vatMode === "NONE" ? "NONE" : "EXCLUSIVE",
        paymentTermsDays: source.paymentTermsDays,
        discountType: "NONE",
        discountValue: 0,
        withholdingLabel: source.withholdingLabel,
        withholdingRate: source.withholdingRate,
        notes: source.notes,
        terms: source.terms,
        footer: source.footer,
        template: source.template,
        accentColor: source.accentColor,
        showAmountInWords: source.showAmountInWords,
        bankAccountId: source.bankAccountId,
        parentId: source.type === "QUOTE" ? source.id : source.parentId,
      },
    });

    // Une seule ligne, calculée sur le hors taxes du document d'origine.
    const groups = await tx.documentLine.groupBy({
      by: ["vatRate"],
      where: { documentId: source.id },
      _sum: { net: true },
    });
    const dominant = groups.sort((a, b) => (b._sum.net ?? 0) - (a._sum.net ?? 0))[0];

    await tx.documentLine.create({
      data: {
        documentId: deposit.id,
        position: 0,
        kind: "SERVICE",
        label: `Acompte de ${percent} %${source.number ? ` sur ${source.number}` : ""}`,
        description: source.subject,
        quantity: 1000,
        unit: "forfait",
        unitPrice: applyRate(source.totalNet, basisPoints),
        discountType: "NONE",
        discountValue: 0,
        vatRate: dominant?.vatRate ?? 0,
      },
    });

    await recalcDocument(tx, deposit.id);
    return deposit.id;
  });

  refreshDocumentPaths(depositId);
  redirectWithFlash(`/documents/${depositId}/modifier`, "Facture d'acompte créée.");
}

/** Avoir : reprend les lignes de la facture d'origine, à ajuster ensuite. */
export async function createCreditNote(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const source = await prisma.document.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!source) redirectWithFlash("/factures", "Document introuvable.", "error");

  const issueDate = today();
  const creditId = await prisma.$transaction(async (tx) => {
    const credit = await tx.document.create({
      data: {
        type: "CREDIT_NOTE",
        status: "DRAFT",
        subject: `Avoir sur ${source.number ?? "facture"}`,
        billToId: source.billToId,
        endClientId: source.endClientId,
        contactId: source.contactId,
        missionId: source.missionId,
        issueDate,
        currency: source.currency,
        exchangeRate: source.exchangeRate,
        vatMode: source.vatMode,
        paymentTermsDays: 0,
        withholdingLabel: source.withholdingLabel,
        withholdingRate: source.withholdingRate,
        notes: `Avoir émis en rectification de la facture ${source.number ?? ""}.`.trim(),
        terms: source.terms,
        footer: source.footer,
        template: source.template,
        accentColor: source.accentColor,
        showAmountInWords: source.showAmountInWords,
        bankAccountId: source.bankAccountId,
        parentId: source.id,
      },
    });

    for (const line of source.lines) {
      await tx.documentLine.create({
        data: {
          documentId: credit.id,
          position: line.position,
          kind: line.kind,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
          discountType: line.discountType,
          discountValue: line.discountValue,
          vatRate: line.vatRate,
        },
      });
    }

    await recalcDocument(tx, credit.id);
    return credit.id;
  });

  refreshDocumentPaths(creditId);
  redirectWithFlash(`/documents/${creditId}/modifier`, "Avoir créé en brouillon.");
}
