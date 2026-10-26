/**
 * Vérification de bout en bout sur un serveur démarré.
 * Crée un jeu de données de test, contrôle chaque écran, les cinq modèles de
 * PDF et les exports, puis efface tout.
 *
 * Usage : node scripts/verify.mjs [baseUrl]
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.argv[2] ?? "http://127.0.0.1:3210";
const MARK = "ZZ-VERIF";

let failures = 0;

function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function get(path) {
  const response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  const buffer = Buffer.from(await response.arrayBuffer());
  return { status: response.status, buffer, text: buffer.toString("utf8") };
}

async function main() {
  console.log(`\n== Jeu de données de test ==`);

  const client = await prisma.party.create({
    data: {
      kind: "CLIENT",
      name: `${MARK} Client`,
      legalName: `${MARK} Client SARL`,
      addressLine1: "Lot II M 12 Bis Ankadifotsy",
      city: "Antananarivo",
      postalCode: "101",
      country: "Madagascar",
      currency: "MGA",
      identifiers: {
        create: [
          { label: "NIF", value: "1234567890", position: 0 },
          { label: "STAT", value: "62020 11 2026 0 12345", position: 1 },
        ],
      },
    },
  });

  const agency = await prisma.party.create({
    data: { kind: "AGENCY", name: `${MARK} Agence`, currency: "EUR", country: "France" },
  });

  const bank = await prisma.bankAccount.create({
    data: {
      kind: "BANK",
      label: `${MARK} BNI`,
      holder: `${MARK} Freelance`,
      bankName: "BNI Madagascar",
      bankCode: "00005",
      branchCode: "00001",
      accountNumber: "12345678901",
      ribKey: "42",
      currency: "MGA",
      showOnPdf: true,
    },
  });

  const mission = await prisma.mission.create({
    data: {
      title: `${MARK} Mission`,
      clientId: client.id,
      agencyId: agency.id,
      billTo: "AGENCY",
      rateType: "DAILY",
      rate: 450_000_000,
      currency: "MGA",
    },
  });

  const invoice = await prisma.document.create({
    data: {
      type: "INVOICE",
      status: "SENT",
      number: `${MARK}-0001`,
      subject: `${MARK} Prestation de développement`,
      billToId: agency.id,
      endClientId: client.id,
      missionId: mission.id,
      issueDate: new Date(Date.UTC(2026, 7, 11, 12)),
      dueDate: new Date(Date.UTC(2026, 8, 10, 12)),
      currency: "MGA",
      vatMode: "EXCLUSIVE",
      paymentTermsDays: 30,
      bankAccountId: bank.id,
      showAmountInWords: true,
      totalNet: 5_805_000_000,
      totalVat: 1_161_000_000,
      totalGross: 6_966_000_000,
      total: 6_966_000_000,
      balanceDue: 6_966_000_000,
      lines: {
        create: [
          {
            position: 0,
            kind: "SERVICE",
            label: "Développement du module facturation",
            description: "Analyse, développement et recette",
            quantity: 12_500,
            unit: "jour",
            unitPrice: 450_000_000,
            vatRate: 2000,
            net: 5_625_000_000,
            vat: 1_125_000_000,
            gross: 6_750_000_000,
          },
          {
            position: 1,
            kind: "SERVICE",
            label: "Hébergement (remise 10 %)",
            quantity: 1000,
            unit: "forfait",
            unitPrice: 200_000_000,
            discountType: "PERCENT",
            discountValue: 1000,
            vatRate: 2000,
            net: 180_000_000,
            vat: 36_000_000,
            gross: 216_000_000,
          },
        ],
      },
    },
  });

  await prisma.payment.create({
    data: {
      documentId: invoice.id,
      amount: 3_000_000_000,
      currency: "MGA",
      method: "MOBILE_MONEY",
      reference: `${MARK} MVola`,
      date: new Date(Date.UTC(2026, 7, 12, 12)),
    },
  });

  await prisma.timeEntry.create({
    data: {
      missionId: mission.id,
      date: new Date(Date.UTC(2026, 7, 10, 12)),
      quantity: 1000,
      unit: "DAY",
      label: `${MARK} journée`,
      billable: true,
    },
  });

  // --- Écrans --------------------------------------------------------------
  console.log(`\n== Écrans ==`);
  const pages = [
    "/",
    "/factures",
    "/devis",
    "/avoirs",
    "/clients",
    `/clients/${client.id}`,
    "/clients/nouveau",
    "/agences",
    `/agences/${agency.id}`,
    "/missions",
    `/missions/${mission.id}`,
    "/missions/nouveau",
    "/temps?mois=2026-08",
    "/encaissements",
    "/relances",
    "/recurrences",
    "/parametres",
    "/parametres/paiements",
    "/parametres/facturation",
    "/parametres/modeles",
    "/parametres/devises",
    "/parametres/numerotation",
    "/documents/nouveau?type=INVOICE",
    "/documents/nouveau?type=QUOTE",
    `/documents/${invoice.id}`,
    `/documents/${invoice.id}/modifier`,
  ];

  for (const path of pages) {
    const response = await get(path);
    check(`GET ${path}`, response.status === 200, `HTTP ${response.status}`);
  }

  // --- Contenu métier attendu sur la fiche --------------------------------
  console.log(`\n== Contenu ==`);
  const detail = await get(`/documents/${invoice.id}`);
  check("le numéro figure sur la fiche", detail.text.includes(`${MARK}-0001`));
  check("l'agence facturée est citée", detail.text.includes(`${MARK} Agence`));
  check("le client final est cité", detail.text.includes(`${MARK} Client`));

  const clientPage = await get(`/clients/${client.id}`);
  check("le NIF du client est affiché", clientPage.text.includes("1234567890"));
  check("le STAT du client est affiché", clientPage.text.includes("62020 11 2026 0 12345"));

  // --- PDF : les cinq modèles ---------------------------------------------
  console.log(`\n== PDF ==`);
  for (const template of ["classique", "moderne", "minimal", "elegant", "compact"]) {
    const response = await get(`/api/documents/${invoice.id}/pdf?modele=${template}`);
    const isPdf = response.buffer.subarray(0, 4).toString("latin1") === "%PDF";
    check(
      `modèle ${template} (${Math.round(response.buffer.length / 1024)} Ko)`,
      response.status === 200 && isPdf && response.buffer.length > 3000,
      `HTTP ${response.status}, ${response.buffer.length} octets`,
    );
  }

  const download = await fetch(`${BASE}/api/documents/${invoice.id}/pdf?dl=1`);
  check(
    "en-tête de téléchargement",
    (download.headers.get("content-disposition") ?? "").startsWith("attachment"),
    download.headers.get("content-disposition") ?? "(absent)",
  );

  // --- Exports -------------------------------------------------------------
  console.log(`\n== Exports comptables ==`);
  const csvDocs = await get("/api/export?type=factures");
  check(
    "export factures",
    csvDocs.status === 200 && csvDocs.text.includes(`${MARK}-0001`),
    `HTTP ${csvDocs.status}`,
  );
  const csvPayments = await get("/api/export?type=encaissements");
  check(
    "export encaissements",
    csvPayments.status === 200 && csvPayments.text.includes(`${MARK} MVola`),
    `HTTP ${csvPayments.status}`,
  );

  // --- 404 ------------------------------------------------------------------
  const missing = await get("/documents/inexistant-xyz");
  check("document inconnu -> 404", missing.status === 404, `HTTP ${missing.status}`);

  // --- Nettoyage -----------------------------------------------------------
  console.log(`\n== Nettoyage ==`);
  // On supprime d'abord tout document rattaché aux tiers créés — y compris
  // ceux d'une exécution précédente — sans quoi la contrainte de clé
  // étrangère bloque la suppression des tiers.
  const partyIds = [client.id, agency.id];
  await prisma.document.deleteMany({
    where: {
      OR: [
        { subject: { contains: MARK } },
        { billToId: { in: partyIds } },
        { endClientId: { in: partyIds } },
      ],
    },
  });
  await prisma.mission.deleteMany({
    where: { OR: [{ title: { contains: MARK } }, { clientId: { in: partyIds } }] },
  });
  await prisma.party.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.bankAccount.deleteMany({ where: { label: { contains: MARK } } });

  const leftovers =
    (await prisma.document.count({ where: { subject: { contains: MARK } } })) +
    (await prisma.mission.count({ where: { title: { contains: MARK } } })) +
    (await prisma.party.count({ where: { name: { contains: MARK } } })) +
    (await prisma.bankAccount.count({ where: { label: { contains: MARK } } }));
  check("données de test effacées", leftovers === 0, `${leftovers} restant(s)`);

  console.log(
    failures === 0 ? `\nRÉSULTAT : tout est vert.\n` : `\nRÉSULTAT : ${failures} échec(s).\n`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
