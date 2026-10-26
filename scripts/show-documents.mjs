/** Liste les documents avec leur modèle et leur nombre de lignes. */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const documents = await prisma.document.findMany({
  select: {
    id: true,
    type: true,
    number: true,
    status: true,
    subject: true,
    template: true,
    accentColor: true,
    currency: true,
    total: true,
    billTo: { select: { name: true } },
    _count: { select: { lines: true } },
  },
  orderBy: { createdAt: "desc" },
});

console.log(`${documents.length} document(s)`);
for (const d of documents) console.log(d);

await prisma.$disconnect();
