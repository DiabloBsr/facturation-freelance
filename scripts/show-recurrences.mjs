/** Liste les abonnements et leur état. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const recurrences = await prisma.recurrence.findMany({
  include: {
    sourceDocument: { select: { number: true, subject: true } },
    _count: { select: { generated: true } },
  },
  orderBy: { nextRunDate: "asc" },
});

console.log(`${recurrences.length} abonnement(s)`);
for (const r of recurrences) {
  console.log({
    nom: r.name,
    actif: r.active,
    frequence: r.frequency,
    prochaineEcheance: r.nextRunDate.toISOString().slice(0, 10),
    echeancesFaites: r.occurrencesDone,
    facturesGenerees: r._count.generated,
    modele: r.sourceDocument?.number ?? "(aucun)",
  });
}

await prisma.$disconnect();
