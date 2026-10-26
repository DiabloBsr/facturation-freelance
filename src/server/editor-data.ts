import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { toDateInput } from "@/lib/dates";
import type {
  EditorCurrency,
  EditorDeposit,
  EditorMission,
  EditorParty,
  EditorPayoutRequest,
} from "@/components/documents/document-editor";

/** Tout ce dont l'éditeur a besoin, en une seule traversée de la base. */
export const getEditorData = cache(async () => {
  const [
    parties,
    missions,
    currencies,
    vatRates,
    bankAccounts,
    deposits,
    payoutRequests,
  ] = await Promise.all([
    prisma.party.findMany({
      where: { isActive: true },
      include: { contacts: { orderBy: [{ isPrimary: "desc" }, { lastName: "asc" }] } },
      orderBy: [{ kind: "asc" }, { name: "asc" }],
    }),
    prisma.mission.findMany({
      where: { status: { in: ["ACTIVE", "PAUSED"] } },
      orderBy: { title: "asc" },
    }),
    prisma.currency.findMany({
      where: { isActive: true },
      orderBy: [{ position: "asc" }, { code: "asc" }],
    }),
    prisma.vatRate.findMany({ orderBy: [{ position: "asc" }, { rate: "asc" }] }),
    prisma.bankAccount.findMany({
      orderBy: [{ isDefault: "desc" }, { position: "asc" }],
    }),
    prisma.document.findMany({
      where: { type: "DEPOSIT", status: { not: "CANCELLED" } },
      select: {
        id: true,
        number: true,
        subject: true,
        issueDate: true,
        total: true,
        currency: true,
        billToId: true,
        parentId: true,
      },
      orderBy: { issueDate: "asc" },
    }),
    // Déclarations reçues et pas encore reprises : celles qu'on peut verser
    // dans une facture. Une fois reprises, elles passent CONVERTED et sortent
    // de la liste — impossible de les importer deux fois par mégarde.
    prisma.payoutRequest.findMany({
      where: { status: "SUBMITTED" },
      include: {
        beneficiary: { select: { name: true } },
        lines: { orderBy: { position: "asc" } },
      },
      orderBy: { submittedAt: "desc" },
      take: 50,
    }),
  ]);

  const editorParties: EditorParty[] = parties.map((party) => ({
    id: party.id,
    name: party.name,
    kind: party.kind,
    currency: party.currency,
    vatRate: party.vatRate,
    paymentTermsDays: party.paymentTermsDays,
    withholdingRate: party.withholdingRate,
    contacts: party.contacts.map((contact) => ({
      id: contact.id,
      label:
        [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
        contact.email ||
        "Contact",
    })),
  }));

  const editorMissions: EditorMission[] = missions.map((mission) => ({
    id: mission.id,
    title: mission.title,
    clientId: mission.clientId,
    agencyId: mission.agencyId,
    billTo: mission.billTo,
    currency: mission.currency,
    vatRate: mission.vatRate,
    purchaseOrder: mission.purchaseOrder,
  }));

  const editorCurrencies: EditorCurrency[] = currencies.map((currency) => ({
    code: currency.code,
    name: currency.name,
    symbol: currency.symbol,
    decimals: currency.decimals,
    symbolAfter: currency.symbolAfter,
    rateToBase: currency.rateToBase,
  }));

  return {
    parties: editorParties,
    missions: editorMissions,
    currencies: editorCurrencies,
    vatRates: vatRates.map((rate) => ({ id: rate.id, label: rate.label, rate: rate.rate })),
    bankAccounts: bankAccounts.map((account) => ({
      id: account.id,
      label: account.label,
      kind: account.kind,
    })),
    payoutRequests: payoutRequests.map(
      (request): EditorPayoutRequest => ({
        id: request.id,
        beneficiaryName: request.beneficiary.name,
        currency: request.currency,
        total: request.lines.reduce((sum, line) => sum + line.amount, 0),
        lines: request.lines.map((line) => ({
          label: line.label,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
        })),
      }),
    ),
    /** Acomptes libres ou déjà rattachés : le filtrage final se fait côté éditeur. */
    deposits: deposits.map(
      (deposit): EditorDeposit & { parentId: string | null } => ({
        id: deposit.id,
        number: deposit.number,
        subject: deposit.subject,
        issueDate: toDateInput(deposit.issueDate),
        total: deposit.total,
        currency: deposit.currency,
        billToId: deposit.billToId,
        parentId: deposit.parentId,
      }),
    ),
  };
});
