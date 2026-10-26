import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DOCUMENT_TYPE_SEQUENCE, type DocumentType } from "@/lib/enums";
import { previewNumber } from "@/lib/numbering";

export const documentDetailInclude = {
  billTo: { include: { identifiers: { orderBy: { position: "asc" } } } },
  endClient: { include: { identifiers: { orderBy: { position: "asc" } } } },
  contact: true,
  mission: { include: { client: true, agency: true } },
  bankAccount: true,
  lines: { orderBy: { position: "asc" } },
  payments: { orderBy: { date: "desc" }, include: { bankAccount: true } },
  reminders: { orderBy: [{ level: "asc" }, { createdAt: "asc" }] },
  parent: { select: { id: true, type: true, number: true, subject: true, total: true } },
  children: {
    select: {
      id: true,
      type: true,
      number: true,
      status: true,
      total: true,
      issueDate: true,
      currency: true,
    },
    orderBy: { issueDate: "asc" },
  },
  timeEntries: { include: { mission: true }, orderBy: { date: "asc" } },
  recurrence: true,
} satisfies Prisma.DocumentInclude;

export type DocumentDetail = Prisma.DocumentGetPayload<{
  include: typeof documentDetailInclude;
}>;

export const documentRowInclude = {
  billTo: { select: { id: true, name: true, kind: true } },
  endClient: { select: { id: true, name: true } },
  mission: { select: { id: true, title: true } },
  _count: { select: { payments: true, reminders: true } },
} satisfies Prisma.DocumentInclude;

export type DocumentRow = Prisma.DocumentGetPayload<{
  include: typeof documentRowInclude;
}>;

export type DocumentFilters = {
  types?: string[];
  status?: string;
  search?: string;
  partyId?: string;
  missionId?: string;
  from?: Date;
  to?: Date;
  /** Uniquement les documents dont il reste quelque chose à encaisser. */
  unpaidOnly?: boolean;
};

export function buildDocumentWhere(filters: DocumentFilters): Prisma.DocumentWhereInput {
  const where: Prisma.DocumentWhereInput = {};

  if (filters.types?.length) where.type = { in: filters.types };
  if (filters.status) where.status = filters.status;
  if (filters.partyId) {
    where.OR = [{ billToId: filters.partyId }, { endClientId: filters.partyId }];
  }
  if (filters.missionId) where.missionId = filters.missionId;

  if (filters.from || filters.to) {
    where.issueDate = {};
    if (filters.from) where.issueDate.gte = filters.from;
    if (filters.to) where.issueDate.lte = filters.to;
  }

  if (filters.unpaidOnly) {
    where.status = { in: ["SENT", "PARTIALLY_PAID", "LATE"] };
    where.type = { in: ["INVOICE", "DEPOSIT"] };
  }

  if (filters.search?.trim()) {
    const term = filters.search.trim();
    where.AND = [
      {
        OR: [
          { number: { contains: term } },
          { subject: { contains: term } },
          { purchaseOrder: { contains: term } },
          { billTo: { name: { contains: term } } },
          { endClient: { name: { contains: term } } },
        ],
      },
    ];
  }

  return where;
}

export async function listDocuments(filters: DocumentFilters = {}): Promise<DocumentRow[]> {
  return prisma.document.findMany({
    where: buildDocumentWhere(filters),
    include: documentRowInclude,
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 400,
  });
}

export const getDocument = cache(async (id: string): Promise<DocumentDetail | null> =>
  prisma.document.findUnique({ where: { id }, include: documentDetailInclude }),
);

/** Aperçu du prochain numéro, sans consommer la séquence. */
export async function nextNumberPreview(type: DocumentType, date: Date): Promise<string> {
  const key = DOCUMENT_TYPE_SEQUENCE[type];
  const sequence = await prisma.numberSequence.findUnique({ where: { key } });
  if (!sequence) return "—";
  return previewNumber(sequence, date);
}

/** Acomptes rattachables à une facture : même client, non annulés, non déjà rattachés ailleurs. */
export async function listAttachableDeposits(params: {
  billToId: string;
  currency: string;
  documentId?: string;
}) {
  return prisma.document.findMany({
    where: {
      type: "DEPOSIT",
      billToId: params.billToId,
      currency: params.currency,
      status: { not: "CANCELLED" },
      OR: [{ parentId: null }, ...(params.documentId ? [{ parentId: params.documentId }] : [])],
    },
    select: {
      id: true,
      number: true,
      subject: true,
      issueDate: true,
      total: true,
      currency: true,
      parentId: true,
    },
    orderBy: { issueDate: "asc" },
  });
}
