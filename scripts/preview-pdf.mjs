/**
 * Génère un exemplaire de chaque modèle de PDF à partir d'un jeu de données
 * réaliste, pour contrôle visuel. Les fichiers sortent dans ./tmp-apercus/.
 *
 * Usage : node scripts/preview-pdf.mjs [baseUrl]
 * Nettoyage ensuite : node scripts/cleanup-test-data.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.argv[2] ?? "http://127.0.0.1:3210";
const MARK = "ZZ-VERIF";
const OUT = "./tmp-apercus";

// Rejouable : on efface l'aperçu précédent avant d'en créer un nouveau.
await prisma.document.deleteMany({ where: { number: "FAC-2026-0042" } });
await prisma.party.deleteMany({ where: { name: { contains: MARK } } });
await prisma.bankAccount.deleteMany({ where: { label: { contains: MARK } } });

// Coordonnées de l'émetteur, le temps de l'aperçu.
const company = await prisma.company.update({
  where: { id: 1 },
  data: {
    legalName: "Rakoto Consulting",
    tradeName: "Rakoto Consulting",
    legalForm: "Entreprise individuelle",
    activity: "Développement logiciel et conseil",
    addressLine1: "Lot II M 12 Bis Ankadifotsy",
    postalCode: "101",
    city: "Antananarivo",
    country: "Madagascar",
    phone: "+261 20 22 123 45",
    mobile: "+261 34 12 345 67",
    email: "contact@rakoto-consulting.mg",
    website: "www.rakoto-consulting.mg",
    signatureName: "Jean Rakoto",
    signatureRole: "Gérant",
    latePenaltyRate: 1200,
    vatExemptionText: null,
    defaultTerms:
      "Règlement par virement bancaire ou Mobile Money sous 30 jours à réception de facture.",
    defaultFooter: "Rakoto Consulting — Antananarivo, Madagascar",
  },
});

await prisma.legalIdentifier.deleteMany({});
await prisma.legalIdentifier.createMany({
  data: [
    { label: "NIF", value: "3000123456", position: 0, showOnPdf: true },
    { label: "STAT", value: "62020 11 2026 0 12345", position: 1, showOnPdf: true },
    { label: "RCS", value: "2026 B 00123", position: 2, showOnPdf: true },
  ],
});

const agency = await prisma.party.create({
  data: {
    kind: "AGENCY",
    name: `${MARK} Numeria`,
    legalName: "Numeria Solutions SAS",
    addressLine1: "18 rue de la Paix",
    postalCode: "75002",
    city: "Paris",
    country: "France",
    currency: "MGA",
    identifiers: {
      create: [
        { label: "SIRET", value: "812 345 678 00021", position: 0 },
        { label: "N° TVA", value: "FR40812345678", position: 1 },
      ],
    },
  },
});

const client = await prisma.party.create({
  data: {
    kind: "CLIENT",
    name: `${MARK} Sahaza Distribution`,
    legalName: "Sahaza Distribution SARL",
    addressLine1: "Immeuble Fiaro, Ampefiloha",
    postalCode: "101",
    city: "Antananarivo",
    country: "Madagascar",
    currency: "MGA",
  },
});

const bank = await prisma.bankAccount.create({
  data: {
    kind: "BANK",
    label: `${MARK} BNI`,
    holder: "Rakoto Consulting",
    bankName: "BNI Madagascar",
    branchName: "Agence Analakely",
    bankCode: "00005",
    branchCode: "00012",
    accountNumber: "12345678901",
    ribKey: "42",
    bic: "BNMDMGMG",
    currency: "MGA",
    showOnPdf: true,
  },
});

const invoice = await prisma.document.create({
  data: {
    type: "INVOICE",
    status: "SENT",
    number: "FAC-2026-0042",
    subject: "Refonte de la plateforme de gestion — juillet 2026",
    billToId: agency.id,
    endClientId: client.id,
    issueDate: new Date(Date.UTC(2026, 7, 11, 12)),
    dueDate: new Date(Date.UTC(2026, 8, 10, 12)),
    serviceDate: new Date(Date.UTC(2026, 6, 31, 12)),
    purchaseOrder: "BC-2026-0871",
    currency: "MGA",
    vatMode: "EXCLUSIVE",
    paymentTermsDays: 30,
    bankAccountId: bank.id,
    showAmountInWords: true,
    accentColor: "#1F4D7A",
    notes:
      "Prestation réalisée dans le cadre du marché de refonte applicative. Recette contradictoire signée le 31 juillet 2026.",
    terms:
      "Règlement par virement bancaire ou Mobile Money sous 30 jours à réception de facture.",
    footer: "Rakoto Consulting — Antananarivo, Madagascar",
    lines: {
      create: [
        {
          position: 0,
          kind: "SECTION",
          label: "Développement",
        },
        {
          position: 1,
          kind: "SERVICE",
          label: "Développement du module de facturation",
          description: "Analyse fonctionnelle, développement, tests et recette",
          quantity: 12_500,
          unit: "jour",
          unitPrice: 450_000_000,
          vatRate: 2000,
          net: 5_625_000_000,
          vat: 1_125_000_000,
          gross: 6_750_000_000,
        },
        {
          position: 2,
          kind: "SERVICE",
          label: "Reprise des données historiques",
          description: "Migration de 42 000 enregistrements",
          quantity: 3000,
          unit: "jour",
          unitPrice: 450_000_000,
          vatRate: 2000,
          net: 1_350_000_000,
          vat: 270_000_000,
          gross: 1_620_000_000,
        },
        {
          position: 3,
          kind: "SECTION",
          label: "Exploitation",
        },
        {
          position: 4,
          kind: "SERVICE",
          label: "Hébergement et supervision (12 mois)",
          quantity: 1000,
          unit: "forfait",
          unitPrice: 2_400_000_000,
          discountType: "PERCENT",
          discountValue: 1000,
          vatRate: 2000,
          net: 2_160_000_000,
          vat: 432_000_000,
          gross: 2_592_000_000,
        },
        {
          position: 5,
          kind: "TEXT",
          label: "La maintenance corrective est incluse pendant les trois premiers mois.",
        },
      ],
    },
  },
});

// Totaux figés cohérents avec les lignes ci-dessus.
await prisma.document.update({
  where: { id: invoice.id },
  data: {
    subtotal: 9_375_000_000,
    totalDiscount: 240_000_000,
    totalNet: 9_135_000_000,
    totalVat: 1_827_000_000,
    totalGross: 10_962_000_000,
    total: 10_962_000_000,
    totalPaid: 3_000_000_000,
    balanceDue: 7_962_000_000,
  },
});

await prisma.payment.create({
  data: {
    documentId: invoice.id,
    amount: 3_000_000_000,
    currency: "MGA",
    method: "TRANSFER",
    reference: "VIR-88213",
    date: new Date(Date.UTC(2026, 7, 20, 12)),
  },
});

await mkdir(OUT, { recursive: true });

for (const template of ["classique", "moderne", "minimal", "elegant", "compact"]) {
  const response = await fetch(`${BASE}/api/documents/${invoice.id}/pdf?modele=${template}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = `${OUT}/${template}.pdf`;
  await writeFile(path, buffer);
  console.log(`${path} — ${Math.round(buffer.length / 1024)} Ko`);
}

console.log(`\nDocument d'aperçu : ${invoice.id} (${company.legalName})`);
await prisma.$disconnect();
