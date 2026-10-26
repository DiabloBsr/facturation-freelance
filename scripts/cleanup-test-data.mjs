/**
 * Efface les données de test et d'aperçu, et remet la fiche entreprise
 * dans son état initial.
 *
 * Usage : node scripts/cleanup-test-data.mjs
 */

import { rm } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const marks = ["ZZ-TEST", "ZZ-VERIF"];

const documents = await prisma.document.deleteMany({
  where: {
    OR: [
      ...marks.map((mark) => ({ subject: { contains: mark } })),
      { number: "FAC-2026-0042" }, // document d'aperçu
    ],
  },
});
const missions = await prisma.mission.deleteMany({
  where: { OR: marks.map((mark) => ({ title: { contains: mark } })) },
});
const parties = await prisma.party.deleteMany({
  where: { OR: marks.map((mark) => ({ name: { contains: mark } })) },
});
const banks = await prisma.bankAccount.deleteMany({
  where: { OR: marks.map((mark) => ({ label: { contains: mark } })) },
});

// La génération d'aperçus renseigne l'entreprise : on la remet à blanc pour
// que l'écran « Mon entreprise » reparte d'une fiche vierge.
const company = await prisma.company.findUnique({ where: { id: 1 } });
if (company?.legalName === "Rakoto Consulting") {
  await prisma.company.update({
    where: { id: 1 },
    data: {
      legalName: "Mon entreprise",
      tradeName: null,
      legalForm: null,
      activity: null,
      slogan: null,
      addressLine1: null,
      addressLine2: null,
      postalCode: null,
      city: null,
      region: null,
      country: "Madagascar",
      phone: null,
      mobile: null,
      email: null,
      website: null,
      signatureName: null,
      signatureRole: null,
      latePenaltyRate: 0,
      vatExemptionText:
        "TVA non applicable — entreprise non assujettie à la taxe sur la valeur ajoutée.",
      defaultTerms:
        "Règlement à réception de facture, par virement bancaire ou Mobile Money.\nTout retard de paiement entraîne l'application de pénalités de retard.",
      defaultFooter: "Merci de votre confiance.",
    },
  });

  await prisma.legalIdentifier.deleteMany({});
  await prisma.legalIdentifier.createMany({
    data: [
      { id: "id-nif", label: "NIF", value: "", position: 0 },
      { id: "id-stat", label: "STAT", value: "", position: 1 },
      { id: "id-rcs", label: "RCS", value: "", position: 2 },
    ],
  });
  console.log("Fiche entreprise remise à son état initial.");
}

await rm("./tmp-apercus", { recursive: true, force: true });

console.log(
  `Nettoyage : ${documents.count} document(s), ${missions.count} mission(s), ` +
    `${parties.count} tiers, ${banks.count} compte(s). Dossier tmp-apercus supprimé.`,
);

await prisma.$disconnect();
