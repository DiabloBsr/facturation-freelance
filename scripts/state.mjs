/** État de la base, en un coup d'œil. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const company = await prisma.company.findUnique({ where: { id: 1 } });

console.log({
  entreprise: company?.legalName,
  identifiantsLegaux: await prisma.legalIdentifier.count(),
  devises: await prisma.currency.count(),
  tauxTVA: await prisma.vatRate.count(),
  sequences: await prisma.numberSequence.count(),
  tiers: await prisma.party.count(),
  missions: await prisma.mission.count(),
  documents: await prisma.document.count(),
  comptesDePaiement: await prisma.bankAccount.count(),
  encaissements: await prisma.payment.count(),
  saisiesDeTemps: await prisma.timeEntry.count(),
});

await prisma.$disconnect();
