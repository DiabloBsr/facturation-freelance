/**
 * Initialisation des référentiels.
 * Idempotent : peut être relancé sans écraser les données saisies.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CURRENCIES = [
  { code: "MGA", name: "Ariary malgache", symbol: "Ar", decimals: 0, symbolAfter: true, isActive: true, position: 0, rateToBase: 1 },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, symbolAfter: true, isActive: true, position: 1, rateToBase: 5000 },
  { code: "USD", name: "Dollar américain", symbol: "$", decimals: 2, symbolAfter: false, isActive: true, position: 2, rateToBase: 4600 },
  { code: "GBP", name: "Livre sterling", symbol: "£", decimals: 2, symbolAfter: false, isActive: false, position: 3, rateToBase: 5800 },
  { code: "CHF", name: "Franc suisse", symbol: "CHF", decimals: 2, symbolAfter: true, isActive: false, position: 4, rateToBase: 5200 },
  { code: "CAD", name: "Dollar canadien", symbol: "$ CA", decimals: 2, symbolAfter: true, isActive: false, position: 5, rateToBase: 3400 },
  { code: "MUR", name: "Roupie mauricienne", symbol: "Rs", decimals: 2, symbolAfter: true, isActive: false, position: 6, rateToBase: 100 },
  { code: "ZAR", name: "Rand sud-africain", symbol: "R", decimals: 2, symbolAfter: false, isActive: false, position: 7, rateToBase: 250 },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "FCFA", decimals: 0, symbolAfter: true, isActive: false, position: 8, rateToBase: 7.6 },
  { code: "AED", name: "Dirham des Émirats", symbol: "AED", decimals: 2, symbolAfter: true, isActive: false, position: 9, rateToBase: 1250 },
];

const VAT_RATES = [
  { id: "vat-0", label: "Exonéré / non applicable", rate: 0, isDefault: true, position: 0 },
  { id: "vat-20", label: "TVA 20 % (Madagascar, France)", rate: 2000, isDefault: false, position: 1 },
  { id: "vat-10", label: "TVA 10 %", rate: 1000, isDefault: false, position: 2 },
  { id: "vat-55", label: "TVA 5,5 %", rate: 550, isDefault: false, position: 3 },
];

const SEQUENCES = [
  { key: "INVOICE", label: "Factures", prefix: "FAC", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
  { key: "QUOTE", label: "Devis", prefix: "DEV", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
  { key: "DEPOSIT", label: "Factures d'acompte", prefix: "ACO", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
  { key: "CREDIT_NOTE", label: "Avoirs", prefix: "AVO", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
  { key: "PROFORMA", label: "Factures proforma", prefix: "PRO", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
  { key: "PAYOUT", label: "Reversements aux sous-traitants", prefix: "REV", pattern: "{PREFIX}-{YYYY}-{SEQ}", padding: 4, resetPolicy: "YEARLY" },
];

const IDENTIFIERS = [
  { id: "id-nif", label: "NIF", position: 0 },
  { id: "id-stat", label: "STAT", position: 1 },
  { id: "id-rcs", label: "RCS", position: 2 },
];

async function main() {
  await prisma.company.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      legalName: "Mon entreprise",
      country: "Madagascar",
      baseCurrency: "MGA",
      defaultCurrency: "MGA",
      vatRegime: "EXEMPT",
      defaultVatRate: 0,
      vatExemptionText:
        "TVA non applicable — entreprise non assujettie à la taxe sur la valeur ajoutée.",
      paymentTermsDays: 30,
      defaultTemplate: "classique",
      accentColor: "#1F4D7A",
      defaultTerms:
        "Règlement à réception de facture, par virement bancaire ou Mobile Money.\nTout retard de paiement entraîne l'application de pénalités de retard.",
      defaultFooter: "Merci de votre confiance.",
      showAmountInWords: true,
    },
  });

  for (const currency of CURRENCIES) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        decimals: currency.decimals,
        symbolAfter: currency.symbolAfter,
      },
      create: currency,
    });
  }

  for (const vat of VAT_RATES) {
    await prisma.vatRate.upsert({
      where: { id: vat.id },
      update: {},
      create: vat,
    });
  }

  for (const sequence of SEQUENCES) {
    await prisma.numberSequence.upsert({
      where: { key: sequence.key },
      update: {},
      create: sequence,
    });
  }

  // Emplacements NIF / STAT / RCS prêts à recevoir les valeurs réelles.
  //
  // Uniquement sur une base vierge : l'écran Paramètres réécrit la liste
  // entière à chaque enregistrement, avec de nouveaux identifiants internes.
  // Un upsert par identifiant recréerait donc des doublons vides à côté des
  // valeurs déjà saisies.
  const existingIdentifiers = await prisma.legalIdentifier.count();
  if (existingIdentifiers === 0) {
    for (const identifier of IDENTIFIERS) {
      await prisma.legalIdentifier.create({ data: { ...identifier, value: "" } });
    }
  }

  console.log("Référentiels initialisés.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
