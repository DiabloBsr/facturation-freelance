/** Affiche la fiche entreprise, champ par champ. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const c = await prisma.company.findUnique({ where: { id: 1 } });

console.log({
  legalName: c?.legalName,
  tradeName: c?.tradeName,
  legalForm: c?.legalForm,
  activity: c?.activity,
  slogan: c?.slogan,
  addressLine1: c?.addressLine1,
  addressLine2: c?.addressLine2,
  postalCode: c?.postalCode,
  city: c?.city,
  region: c?.region,
  country: c?.country,
  showActivityOnPdf: c?.showActivityOnPdf,
});

await prisma.$disconnect();
