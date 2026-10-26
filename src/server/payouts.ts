import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const payoutDetailInclude = {
  beneficiary: { include: { identifiers: { orderBy: { position: "asc" } } } },
  document: {
    select: { id: true, number: true, subject: true, currency: true, total: true },
  },
  lines: { orderBy: { position: "asc" } },
  adjustments: { orderBy: { position: "asc" } },
} satisfies Prisma.PayoutInclude;

export type PayoutDetail = Prisma.PayoutGetPayload<{ include: typeof payoutDetailInclude }>;

export const getPayout = cache(async (id: string): Promise<PayoutDetail | null> =>
  prisma.payout.findUnique({ where: { id }, include: payoutDetailInclude }),
);

export async function listPayouts() {
  return prisma.payout.findMany({
    include: {
      beneficiary: { select: { id: true, name: true } },
      document: { select: { id: true, number: true } },
      _count: { select: { lines: true } },
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 300,
  });
}

/** Sous-traitants sélectionnables, plus tout tiers déjà bénéficiaire. */
export async function listBeneficiaries() {
  return prisma.party.findMany({
    where: {
      OR: [{ kind: "SUBCONTRACTOR" }, { payouts: { some: {} } }],
    },
    select: { id: true, name: true, kind: true },
    orderBy: { name: "asc" },
  });
}

/** Factures encaissables sur lesquelles un reversement peut s'appuyer. */
export async function listSourceDocuments() {
  const documents = await prisma.document.findMany({
    where: { type: { in: ["INVOICE", "DEPOSIT"] } },
    select: {
      id: true,
      number: true,
      subject: true,
      currency: true,
      issueDate: true,
      billTo: { select: { name: true } },
    },
    orderBy: { issueDate: "desc" },
    take: 60,
  });

  return documents.map((document) => ({
    id: document.id,
    label: `${document.number ?? "brouillon"} — ${document.billTo.name}${
      document.subject ? ` — ${document.subject}` : ""
    }`,
  }));
}
