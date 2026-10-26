/**
 * Facture de démonstration pour la galerie de modèles.
 *
 * Elle n'est jamais enregistrée : l'objet est fabriqué en mémoire puis passé
 * au même constructeur de vue que les vraies factures. Ce que vous voyez dans
 * la galerie est donc rendu par exactement le même code que vos documents,
 * avec votre propre identité d'entreprise.
 */

import { prisma } from "@/lib/prisma";
import { FALLBACK_CURRENCY } from "@/lib/money";
import { buildViewModel, type PdfViewModel } from "./view-model";
import type { DocumentDetail } from "@/server/documents";

const ISSUE = new Date(Date.UTC(2026, 7, 11, 12));
const DUE = new Date(Date.UTC(2026, 8, 10, 12));

/** Lignes représentatives : une section, des prestations, une remise, un texte libre. */
const DEMO_LINES = [
  {
    kind: "SECTION",
    label: "Conception et développement",
    description: null,
    quantity: 1000,
    unit: "unité",
    unitPrice: 0,
    discountType: "NONE",
    discountValue: 0,
    vatRate: 0,
    net: 0,
    vat: 0,
    gross: 0,
  },
  {
    kind: "SERVICE",
    label: "Développement du module de facturation",
    description: "Analyse fonctionnelle, développement, tests et recette",
    quantity: 12_500,
    unit: "jour",
    unitPrice: 450_000,
    discountType: "NONE",
    discountValue: 0,
    vatRate: 0,
    net: 5_625_000,
    vat: 0,
    gross: 5_625_000,
  },
  {
    kind: "SERVICE",
    label: "Reprise des données historiques",
    description: "Migration de 42 000 enregistrements",
    quantity: 3000,
    unit: "jour",
    unitPrice: 450_000,
    discountType: "NONE",
    discountValue: 0,
    vatRate: 0,
    net: 1_350_000,
    vat: 0,
    gross: 1_350_000,
  },
  {
    kind: "SERVICE",
    label: "Hébergement et supervision (12 mois)",
    description: null,
    quantity: 1000,
    unit: "forfait",
    unitPrice: 2_400_000,
    discountType: "PERCENT",
    discountValue: 1000,
    vatRate: 0,
    net: 2_160_000,
    vat: 0,
    gross: 2_160_000,
  },
  {
    kind: "TEXT",
    label: "La maintenance corrective est incluse pendant les trois premiers mois.",
    description: null,
    quantity: 0,
    unit: "unité",
    unitPrice: 0,
    discountType: "NONE",
    discountValue: 0,
    vatRate: 0,
    net: 0,
    vat: 0,
    gross: 0,
  },
];

/**
 * Assemble le modèle de vue de la facture de démonstration à partir de la
 * véritable fiche entreprise, de ses identifiants légaux et de son compte de
 * paiement par défaut.
 */
export async function buildDemoViewModel(
  accentOverride?: string,
  logoMarkOverride?: string | null,
): Promise<PdfViewModel> {
  const [company, identifiers, bank, currencies, logoMark] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.legalIdentifier.findMany({ orderBy: { position: "asc" } }),
    prisma.bankAccount.findFirst({ orderBy: [{ isDefault: "desc" }, { position: "asc" }] }),
    prisma.currency.findMany({ where: { isActive: true }, orderBy: { position: "asc" } }),
    prisma.appSetting.findUnique({ where: { key: "logoMark" } }),
  ]);
  if (!company) throw new Error("Fiche entreprise introuvable.");

  const currency = currencies.find((c) => c.code === company.defaultCurrency) ?? currencies[0];
  const format = currency
    ? {
        code: currency.code,
        symbol: currency.symbol,
        decimals: currency.decimals,
        symbolAfter: currency.symbolAfter,
      }
    : FALLBACK_CURRENCY;

  // Un compte de paiement fictif tant que l'utilisateur n'en a pas saisi,
  // pour que la galerie montre bien le bloc « coordonnées de paiement ».
  const demoBank =
    bank ??
    ({
      id: "demo",
      kind: "BANK",
      label: "Compte principal",
      holder: company.legalName,
      bankName: "Votre banque",
      branchName: "Votre agence",
      bankCode: "00000",
      branchCode: "00000",
      accountNumber: "00000000000",
      ribKey: "00",
      iban: null,
      bic: null,
      provider: null,
      phoneNumber: null,
      accountRef: null,
      currency: format.code,
      isDefault: true,
      showOnPdf: true,
      position: 0,
      notes: null,
      createdAt: ISSUE,
      updatedAt: ISSUE,
    } as DocumentDetail["bankAccount"]);

  const demoParty = {
    id: "demo-client",
    kind: "CLIENT",
    type: "COMPANY",
    name: "Société Exemple",
    legalName: "Société Exemple SARL",
    legalForm: "SARL",
    addressLine1: "12 rue de la Prospérité",
    addressLine2: null,
    postalCode: "101",
    city: "Antananarivo",
    region: null,
    country: company.country,
    email: "comptabilite@exemple.mg",
    phone: null,
    website: null,
    currency: format.code,
    vatRate: null,
    paymentTermsDays: 30,
    commissionRate: 0,
    withholdingRate: 0,
    notes: null,
    isActive: true,
    createdAt: ISSUE,
    updatedAt: ISSUE,
    identifiers: [
      { id: "d1", partyId: "demo-client", label: "NIF", value: "1234567890", position: 0, showOnPdf: true },
      { id: "d2", partyId: "demo-client", label: "STAT", value: "62020 11 2026 0 12345", position: 1, showOnPdf: true },
    ],
  };

  const subtotal = 9_375_000;
  const totalDiscount = 240_000;
  const totalNet = 9_135_000;

  // L'objet reprend la forme d'un document réel : seuls les champs lus par
  // buildViewModel sont renseignés, d'où la conversion explicite.
  const document = {
    id: "demo",
    type: "INVOICE",
    number: "FAC-2026-0042",
    status: "SENT",
    subject: "Refonte de la plateforme de gestion — juillet 2026",
    billToId: demoParty.id,
    billTo: demoParty,
    endClientId: null,
    endClient: null,
    contactId: null,
    contact: null,
    missionId: null,
    mission: null,
    issueDate: ISSUE,
    dueDate: DUE,
    validUntil: null,
    serviceDate: new Date(Date.UTC(2026, 6, 31, 12)),
    sentAt: ISSUE,
    paidAt: null,
    acceptedAt: null,
    refusedAt: null,
    cancelledAt: null,
    currency: format.code,
    exchangeRate: 1,
    vatMode: company.defaultVatRate > 0 ? "EXCLUSIVE" : "NONE",
    paymentTermsDays: company.paymentTermsDays,
    discountType: "NONE",
    discountValue: 0,
    withholdingLabel: null,
    withholdingRate: 0,
    subtotal,
    totalDiscount,
    totalNet,
    totalVat: 0,
    totalGross: totalNet,
    totalWithheld: 0,
    totalDeposits: 0,
    total: totalNet,
    totalPaid: 0,
    balanceDue: totalNet,
    purchaseOrder: "BC-2026-0871",
    notes: null,
    terms: company.defaultTerms,
    footer: company.defaultFooter,
    internalNotes: null,
    template: company.defaultTemplate,
    accentColor: accentOverride ?? company.accentColor,
    showAmountInWords: company.showAmountInWords,
    bankAccountId: demoBank?.id ?? null,
    bankAccount: demoBank,
    parentId: null,
    parent: null,
    children: [],
    recurrenceId: null,
    recurrence: null,
    lines: DEMO_LINES.map((line, index) => ({
      ...line,
      id: `demo-line-${index}`,
      documentId: "demo",
      position: index,
    })),
    payments: [],
    reminders: [],
    timeEntries: [],
    createdAt: ISSUE,
    updatedAt: ISSUE,
  } as unknown as DocumentDetail;

  return buildViewModel({
    document,
    company,
    identifiers,
    currency: format,
    currencyName: currency?.name ?? format.code,
    logoMark: logoMarkOverride !== undefined ? logoMarkOverride : (logoMark?.value || null),
  });
}
