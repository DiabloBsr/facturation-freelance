/** Affiche le bloc adresse de chaque tiers, champ par champ. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const parties = await prisma.party.findMany({ include: { identifiers: true } });

for (const p of parties) {
  console.log({
    id: p.id,
    kind: p.kind,
    name: p.name,
    legalName: p.legalName,
    addressLine1: p.addressLine1,
    addressLine2: p.addressLine2,
    postalCode: p.postalCode,
    city: p.city,
    region: p.region,
    country: p.country,
    currency: p.currency,
    identifiants: p.identifiers.map((i) => `${i.label}=${i.value}`),
  });
}

await prisma.$disconnect();
