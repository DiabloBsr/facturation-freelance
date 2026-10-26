/**
 * Tests du moteur de calcul, de la numérotation et du montant en toutes lettres.
 * Lancement : npm test
 *
 * Le dernier bloc touche réellement la base (création puis suppression d'un
 * jeu de données préfixé ZZ-TEST) pour vérifier que les totaux figés par
 * recalcDocument correspondent au calcul en mémoire.
 */

import { prisma } from "../src/lib/prisma";
import { computeDocument, computeLine, deriveStatus } from "../src/lib/compute";
import {
  applyRate,
  extractNetFromGross,
  formatMoney,
  mulQuantity,
  parseAmountToMilli,
  parseRateToBp,
  roundToCurrency,
  NBSP,
} from "../src/lib/money";
import { amountToFrenchWords, integerToFrenchWords } from "../src/lib/amount-in-words";
import { previewNumber, renderNumber } from "../src/lib/numbering";
import { buildFacturXXml, countryCode } from "../src/lib/facturx";
import { applyDatePlaceholders } from "../src/lib/placeholders";
import { computePayout } from "../src/lib/payout";
import { addMonths, daysBetween, parseDateInput, toDateInput } from "../src/lib/dates";
import { recalcDocument } from "../src/server/recalc";
import { generateOne } from "../src/server/recurrence-engine";

const MGA = { code: "MGA", symbol: "Ar", decimals: 0, symbolAfter: true };
const EUR = { code: "EUR", symbol: "€", decimals: 2, symbolAfter: true };

let passed = 0;
let failed = 0;

function test(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
  } else {
    failed++;
    console.log(`  FAIL  ${label}`);
    console.log(`        attendu : ${JSON.stringify(expected)}`);
    console.log(`        obtenu  : ${JSON.stringify(actual)}`);
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

// ---------------------------------------------------------------------------
section("Arithmétique monétaire");

test("parse « 12 500,50 »", parseAmountToMilli("12 500,50"), 12_500_500);
test("parse « 1 234 567 Ar »", parseAmountToMilli("1 234 567 Ar"), 1_234_567_000);
test("parse saisie vide", parseAmountToMilli(""), null);
test("parse taux « 1,5 » %", parseRateToBp("1,5"), 150);
test("parse taux « 20 » %", parseRateToBp("20"), 2000);

test("12,5 x 450 000", mulQuantity(450_000_000, 12_500), 5_625_000_000);
test("20 % de 5 805 000", applyRate(5_805_000_000, 2000), 1_161_000_000);
test("HT extrait d'un TTC de 120 à 20 %", extractNetFromGross(120_000, 2000), 100_000);

test("arrondi Ariary (0 décimale)", roundToCurrency(1_234_567, 0), 1_235_000);
test("arrondi euro (2 décimales)", roundToCurrency(1_234_567, 2), 1_234_570);

// Les séparateurs sont des espaces insécables (U+00A0), lisibles par les
// polices standard du PDF — c'est justement ce que l'on veut vérifier.
test("format Ariary", formatMoney(1_234_567_000, MGA), `1${NBSP}234${NBSP}567${NBSP}Ar`);
test("format euro", formatMoney(1_234_560, EUR), `1${NBSP}234,56${NBSP}€`);
test("aucune espace fine insécable ne subsiste", / /.test(formatMoney(1_234_567_000, MGA)), false);

// ---------------------------------------------------------------------------
section("Calcul d'une ligne");

test(
  "ligne simple hors taxes",
  computeLine(
    {
      kind: "SERVICE",
      quantity: 12_500,
      unitPrice: 450_000_000,
      discountType: "NONE",
      discountValue: 0,
      vatRate: 2000,
    },
    "EXCLUSIVE",
    0,
  ),
  { base: 5_625_000_000, discount: 0, net: 5_625_000_000, vat: 1_125_000_000, gross: 6_750_000_000 },
);

test(
  "remise de ligne de 10 %",
  computeLine(
    {
      kind: "SERVICE",
      quantity: 1000,
      unitPrice: 200_000_000,
      discountType: "PERCENT",
      discountValue: 1000,
      vatRate: 2000,
    },
    "EXCLUSIVE",
    0,
  ),
  { base: 200_000_000, discount: 20_000_000, net: 180_000_000, vat: 36_000_000, gross: 216_000_000 },
);

test(
  "prix saisi TTC : la TVA est extraite",
  computeLine(
    {
      kind: "SERVICE",
      quantity: 1000,
      unitPrice: 120_000,
      discountType: "NONE",
      discountValue: 0,
      vatRate: 2000,
    },
    "INCLUSIVE",
    2,
  ),
  { base: 120_000, discount: 0, net: 100_000, vat: 20_000, gross: 120_000 },
);

test(
  "une ligne de titre ne porte aucun montant",
  computeLine(
    {
      kind: "SECTION",
      quantity: 1000,
      unitPrice: 999_000_000,
      discountType: "NONE",
      discountValue: 0,
      vatRate: 2000,
    },
    "EXCLUSIVE",
    0,
  ),
  { base: 0, discount: 0, net: 0, vat: 0, gross: 0 },
);

// ---------------------------------------------------------------------------
section("Totaux d'un document");

const twoLines = [
  {
    kind: "SERVICE",
    quantity: 12_500,
    unitPrice: 450_000_000,
    discountType: "NONE",
    discountValue: 0,
    vatRate: 2000,
  },
  {
    kind: "SERVICE",
    quantity: 1000,
    unitPrice: 200_000_000,
    discountType: "PERCENT",
    discountValue: 1000,
    vatRate: 2000,
  },
];

const simple = computeDocument({
  lines: twoLines,
  vatMode: "EXCLUSIVE",
  discountType: "NONE",
  discountValue: 0,
  withholdingRate: 0,
  decimals: 0,
});

test("sous-total", simple.subtotal, 5_825_000_000);
test("remises de ligne", simple.lineDiscounts, 20_000_000);
test("total hors taxes", simple.totalNet, 5_805_000_000);
test("TVA", simple.totalVat, 1_161_000_000);
test("total TTC", simple.totalGross, 6_966_000_000);
test("net à payer", simple.total, 6_966_000_000);

// Deux taux de TVA : la ventilation doit rester exacte.
const mixed = computeDocument({
  lines: [
    {
      kind: "SERVICE",
      quantity: 1000,
      unitPrice: 1_000_000,
      discountType: "NONE",
      discountValue: 0,
      vatRate: 2000,
    },
    {
      kind: "SERVICE",
      quantity: 1000,
      unitPrice: 1_000_000,
      discountType: "NONE",
      discountValue: 0,
      vatRate: 0,
    },
  ],
  vatMode: "EXCLUSIVE",
  discountType: "PERCENT",
  discountValue: 1000, // 10 % de remise globale
  withholdingRate: 0,
  decimals: 2,
});

test("remise globale répartie", mixed.globalDiscount, 200_000);
test("hors taxes après remise globale", mixed.totalNet, 1_800_000);
test("TVA du seul groupe taxé", mixed.totalVat, 180_000);
test("ventilation sur deux taux", mixed.vatBreakdown.length, 2);
test(
  "somme des tranches = total hors taxes",
  mixed.vatBreakdown.reduce((sum, row) => sum + row.net, 0),
  mixed.totalNet,
);

// Retenue à la source et acompte déduit.
const withDeductions = computeDocument({
  lines: twoLines,
  vatMode: "EXCLUSIVE",
  discountType: "NONE",
  discountValue: 0,
  withholdingRate: 500, // 5 %
  totalDeposits: 1_000_000_000,
  totalPaid: 500_000_000,
  decimals: 0,
});

test("retenue de 5 % sur le HT", withDeductions.totalWithheld, 290_250_000);
test(
  "net à payer après retenue et acompte",
  withDeductions.total,
  6_966_000_000 - 290_250_000 - 1_000_000_000,
);
test("reste dû", withDeductions.balanceDue, withDeductions.total - 500_000_000);

// ---------------------------------------------------------------------------
section("Statuts");

test(
  "un brouillon ne bascule jamais tout seul",
  deriveStatus({
    type: "INVOICE",
    status: "DRAFT",
    total: 1000,
    totalPaid: 1000,
    dueDate: null,
  }),
  "DRAFT",
);
test(
  "soldée -> payée",
  deriveStatus({ type: "INVOICE", status: "SENT", total: 1000, totalPaid: 1000, dueDate: null }),
  "PAID",
);
test(
  "règlement partiel",
  deriveStatus({ type: "INVOICE", status: "SENT", total: 1000, totalPaid: 400, dueDate: null }),
  "PARTIALLY_PAID",
);
test(
  "échéance dépassée -> en retard",
  deriveStatus({
    type: "INVOICE",
    status: "SENT",
    total: 1000,
    totalPaid: 0,
    dueDate: new Date(Date.UTC(2020, 0, 1, 12)),
  }),
  "LATE",
);

// ---------------------------------------------------------------------------
section("Montant en toutes lettres");

test("80", integerToFrenchWords(80), "quatre-vingts");
test("81", integerToFrenchWords(81), "quatre-vingt-un");
test("71", integerToFrenchWords(71), "soixante et onze");
test("91", integerToFrenchWords(91), "quatre-vingt-onze");
test("100", integerToFrenchWords(100), "cent");
test("200", integerToFrenchWords(200), "deux cents");
test("201", integerToFrenchWords(201), "deux cent un");
test("1000", integerToFrenchWords(1000), "mille");
test("21", integerToFrenchWords(21), "vingt et un");
test(
  "1 234 567",
  integerToFrenchWords(1_234_567),
  "un million deux cent trente-quatre mille cinq cent soixante-sept",
);

test(
  "montant en ariary",
  amountToFrenchWords(6_966_000_000, "MGA", 0, "Ariary malgache"),
  "Six millions neuf cent soixante-six mille ariary",
);
test(
  "montant en euros avec centimes",
  amountToFrenchWords(1_250_500, "EUR", 2, "Euro"),
  "Mille deux cent cinquante euros et cinquante centimes",
);

// ---------------------------------------------------------------------------
section("Numérotation");

test(
  "gabarit par défaut",
  renderNumber({
    pattern: "{PREFIX}-{YYYY}-{SEQ}",
    prefix: "FAC",
    padding: 4,
    value: 7,
    date: new Date(Date.UTC(2026, 7, 11, 12)),
  }),
  "FAC-2026-0007",
);
test(
  "gabarit avec mois",
  renderNumber({
    pattern: "{PREFIX}{YY}{MM}-{SEQ}",
    prefix: "F",
    padding: 3,
    value: 42,
    date: new Date(Date.UTC(2026, 7, 11, 12)),
  }),
  "F2608-042",
);
test(
  "remise à zéro annuelle : le compteur repart à 1",
  previewNumber(
    {
      pattern: "{PREFIX}-{YYYY}-{SEQ}",
      prefix: "FAC",
      padding: 4,
      nextValue: 57,
      resetPolicy: "YEARLY",
      lastPeriod: "2025",
    },
    new Date(Date.UTC(2026, 0, 3, 12)),
  ),
  "FAC-2026-0001",
);
test(
  "même période : le compteur continue",
  previewNumber(
    {
      pattern: "{PREFIX}-{YYYY}-{SEQ}",
      prefix: "FAC",
      padding: 4,
      nextValue: 57,
      resetPolicy: "YEARLY",
      lastPeriod: "2026",
    },
    new Date(Date.UTC(2026, 0, 3, 12)),
  ),
  "FAC-2026-0057",
);

// ---------------------------------------------------------------------------
section("Dates");

test("aller-retour de saisie", toDateInput(parseDateInput("2026-08-11")!), "2026-08-11");
test("31 janvier + 1 mois = 28 février", toDateInput(addMonths(parseDateInput("2026-01-31")!, 1)), "2026-02-28");
test("écart en jours", daysBetween(parseDateInput("2026-08-01")!, parseDateInput("2026-08-11")!), 10);

// ---------------------------------------------------------------------------
section("Jetons de période des abonnements");

const juin2026 = new Date(Date.UTC(2026, 5, 30, 12));
const janvier2026 = new Date(Date.UTC(2026, 0, 5, 12));

test(
  "mois et année",
  applyDatePlaceholders("Prestations de développement — {MOIS_ANNEE}", juin2026),
  "Prestations de développement — juin 2026",
);
test("mois seul", applyDatePlaceholders("Forfait {MOIS}", juin2026), "Forfait juin");
test("année seule", applyDatePlaceholders("Exercice {ANNEE}", juin2026), "Exercice 2026");
test("mois sur deux chiffres", applyDatePlaceholders("{MOIS_NUM}", juin2026), "06");
test(
  "mois précédent",
  applyDatePlaceholders("Période : {MOIS_PRECEDENT}", juin2026),
  "Période : mai 2026",
);
// Une facture émise en janvier pour décembre doit changer d'année.
test(
  "mois précédent au passage d'année",
  applyDatePlaceholders("Période : {MOIS_PRECEDENT}", janvier2026),
  "Période : décembre 2025",
);
test(
  "plusieurs jetons dans le même texte",
  applyDatePlaceholders("{MOIS} {ANNEE} — réf. {MOIS_NUM}", juin2026),
  "juin 2026 — réf. 06",
);
test("texte sans jeton inchangé", applyDatePlaceholders("Maintenance", juin2026), "Maintenance");
test("valeur vide", applyDatePlaceholders(null, juin2026), null);

// ---------------------------------------------------------------------------
section("Reversement à un sous-traitant");

// Cas type : deux mois d'assistance payés à l'heure, 5 € de l'heure,
// convertis au cours de la banque, moins les frais.
const ASSISTANCE = [
  { quantity: 35_000, unitPrice: 5_000 }, // 35 h en juin  -> 175 €
  { quantity: 48_000, unitPrice: 5_000 }, // 48 h en juillet -> 240 €
];

const reversement = computePayout({
  lines: ASSISTANCE,
  exchangeRate: 4900, // 1 € = 4 900 Ar, cours de la banque
  bankFees: 25_000_000, // 25 000 Ar de frais
  adjustments: [],
  sourceDecimals: 2,
  targetDecimals: 0,
});

test("montant de juin", reversement.lineAmounts[0], 175_000);
test("montant de juillet", reversement.lineAmounts[1], 240_000);
test("total reçu", reversement.totalSource, 415_000);
test("converti au cours de la banque", reversement.totalConverted, 2_033_500_000);
test("frais retranchés", reversement.totalFees, 25_000_000);
test("net à reverser", reversement.netPayable, 2_008_500_000);

// 415 € x 4 900 = 2 033 500 Ar, moins 25 000 Ar de frais = 2 008 500 Ar.
test(
  "net lisible",
  formatMoney(reversement.netPayable, MGA),
  `2${NBSP}008${NBSP}500${NBSP}Ar`,
);

// Les divers s'ajoutent ou se retranchent selon leur signe.
const avecDivers = computePayout({
  lines: ASSISTANCE,
  exchangeRate: 4900,
  bankFees: 25_000_000,
  adjustments: [
    { amount: -500_000_000 }, // avance déjà versée
    { amount: 12_000_000 }, // complément
  ],
  sourceDecimals: 2,
  targetDecimals: 0,
});

test("somme des divers", avecDivers.totalAdjustments, -488_000_000);
test(
  "net après divers",
  avecDivers.netPayable,
  2_033_500_000 - 25_000_000 - 500_000_000 + 12_000_000,
);

// La conversion s'applique au total, pas ligne à ligne : un cours à décimales
// ne doit pas accumuler d'écart d'arrondi.
const coursDecimal = computePayout({
  lines: [{ quantity: 1000, unitPrice: 100_330 }], // 100,33 €
  exchangeRate: 4912.37,
  bankFees: 0,
  adjustments: [],
  sourceDecimals: 2,
  targetDecimals: 0,
});
test("arrondi à l'ariary entier", coursDecimal.totalConverted % 1000, 0);
// 100,33 x 4 912,37 = 492 858,08 -> 492 858 Ar
test("conversion exacte", coursDecimal.totalConverted, 492_858_000);

// Un cours à zéro ne doit pas produire de montant fantôme.
const sansCours = computePayout({
  lines: ASSISTANCE,
  exchangeRate: 0,
  bankFees: 0,
  adjustments: [],
  sourceDecimals: 2,
  targetDecimals: 0,
});
test("sans cours saisi, rien n'est converti", sansCours.totalConverted, 0);
test("le total reçu reste juste", sansCours.totalSource, 415_000);

// ---------------------------------------------------------------------------
section("Facture électronique (Factur-X)");

const facturxParty = {
  name: "Exemple Conseil SA",
  legalName: "Exemple Conseil SA",
  addressLine1: "Rue de l'Exemple 1",
  addressLine2: null,
  postalCode: "1204",
  city: "Genève",
  country: "Switzerland",
  email: "facturation@example.com",
  identifiers: [{ label: "IDE (UID)", value: "CHE-123.456.789" }],
};

const facturxXml = buildFacturXXml({
  type: "INVOICE",
  number: "FAC-2026-0042",
  issueDate: new Date(Date.UTC(2026, 7, 11, 12)),
  dueDate: new Date(Date.UTC(2026, 8, 10, 12)),
  currency: "EUR",
  purchaseOrder: "BC-2026-0871",
  seller: {
    ...facturxParty,
    name: "Mon entreprise",
    legalName: "Mon entreprise",
    country: "Madagascar",
    identifiers: [{ label: "NIF", value: "5019827096" }],
  },
  buyer: facturxParty,
  vatBreakdown: [{ rate: 2000, net: 1_000_000, vat: 200_000 }],
  totalNet: 1_000_000,
  totalVat: 200_000,
  totalGross: 1_200_000,
  totalPrepaid: 0,
  totalDue: 1_200_000,
  vatExemptionReason: null,
  paymentTerms: "Règlement à 30 jours.",
});

test("profil BASIC WL déclaré", facturxXml.includes("urn:factur-x.eu:1p0:basicwl"), true);
test("code type facture", facturxXml.includes("<ram:TypeCode>380</ram:TypeCode>"), true);
test("date au format 102", facturxXml.includes('format="102">20260811<'), true);
test("échéance au format 102", facturxXml.includes('format="102">20260910<'), true);
test("montant hors taxes", facturxXml.includes("<ram:TaxBasisTotalAmount>1000.00<"), true);
test("montant TTC", facturxXml.includes("<ram:GrandTotalAmount>1200.00<"), true);
test("taux de TVA", facturxXml.includes("<ram:RateApplicablePercent>20.00<"), true);
test("catégorie de TVA au taux normal", facturxXml.includes("<ram:CategoryCode>S<"), true);
test("bon de commande repris", facturxXml.includes("BC-2026-0871"), true);
test("numéro de TVA de l'acheteur", facturxXml.includes('schemeID="VA">CHE-123.456.789<'), true);

// Codes pays : la saisie est libre, la conversion doit rester sûre.
test("code pays Suisse", countryCode("Switzerland"), "CH");
test("code pays Madagascar", countryCode("Madagascar"), "MG");
test("code déjà normalisé", countryCode("fr"), "FR");
test("pays inconnu -> aucun code inventé", countryCode("Sylvanie"), null);
test("pays vide", countryCode(null), null);

// Cas exonéré : la mention doit accompagner la catégorie « E ».
const exemptXml = buildFacturXXml({
  type: "CREDIT_NOTE",
  number: "AVO-2026-0001",
  issueDate: new Date(Date.UTC(2026, 0, 5, 12)),
  dueDate: null,
  currency: "MGA",
  purchaseOrder: null,
  seller: { ...facturxParty, identifiers: [] },
  buyer: { ...facturxParty, identifiers: [] },
  vatBreakdown: [{ rate: 0, net: 500_000, vat: 0 }],
  totalNet: 500_000,
  totalVat: 0,
  totalGross: 500_000,
  totalPrepaid: 0,
  totalDue: 500_000,
  vatExemptionReason: "TVA non applicable",
  paymentTerms: null,
});

test("code type avoir", exemptXml.includes("<ram:TypeCode>381</ram:TypeCode>"), true);
test("catégorie exonérée", exemptXml.includes("<ram:CategoryCode>E<"), true);
test("motif d'exonération", exemptXml.includes("<ram:ExemptionReason>TVA non applicable<"), true);

// Les caractères réservés doivent être échappés, sans quoi le XML est cassé.
const escapedXml = buildFacturXXml({
  type: "INVOICE",
  number: "FAC<2026>&0001",
  issueDate: new Date(Date.UTC(2026, 0, 5, 12)),
  dueDate: null,
  currency: "EUR",
  purchaseOrder: null,
  seller: { ...facturxParty, name: 'Dupont & Fils "SARL"', legalName: 'Dupont & Fils "SARL"' },
  buyer: facturxParty,
  vatBreakdown: [],
  totalNet: 0,
  totalVat: 0,
  totalGross: 0,
  totalPrepaid: 0,
  totalDue: 0,
  vatExemptionReason: null,
  paymentTerms: null,
});

test("numéro échappé", escapedXml.includes("FAC&lt;2026&gt;&amp;0001"), true);
test("esperluette échappée dans un nom", escapedXml.includes("Dupont &amp; Fils"), true);
test("aucune balise parasite", /<ram:ID>FAC<2026>/.test(escapedXml), false);

// ---------------------------------------------------------------------------
// Intégration : les totaux figés en base doivent égaler le calcul en mémoire.
// ---------------------------------------------------------------------------
async function integration() {
  section("Intégration base de données");
  const MARK = "ZZ-TEST";

  const client = await prisma.party.create({
    data: { kind: "CLIENT", name: `${MARK} Client`, currency: "MGA" },
  });

  const document = await prisma.document.create({
    data: {
      type: "INVOICE",
      status: "SENT",
      subject: `${MARK} Document`,
      billToId: client.id,
      issueDate: new Date(Date.UTC(2026, 7, 11, 12)),
      dueDate: new Date(Date.UTC(2026, 8, 10, 12)),
      currency: "MGA",
      vatMode: "EXCLUSIVE",
      withholdingRate: 500,
      lines: {
        create: twoLines.map((line, position) => ({ ...line, position, label: `Ligne ${position + 1}`, unit: "jour" })),
      },
    },
  });

  await prisma.$transaction((tx) => recalcDocument(tx, document.id));
  let stored = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });

  test("HT figé en base", stored.totalNet, 5_805_000_000);
  test("TVA figée en base", stored.totalVat, 1_161_000_000);
  test("retenue figée en base", stored.totalWithheld, 290_250_000);
  test("net à payer figé en base", stored.total, 6_675_750_000);
  // L'échéance est postérieure à la date du test : le document n'est pas en retard.
  test("statut conservé tant que rien n'est encaissé", stored.status, "SENT");

  // Un encaissement partiel doit faire basculer le statut et le reste dû.
  await prisma.payment.create({
    data: {
      documentId: document.id,
      amount: 675_750_000,
      currency: "MGA",
      method: "MOBILE_MONEY",
    },
  });
  await prisma.$transaction((tx) => recalcDocument(tx, document.id));
  stored = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });

  test("encaissement pris en compte", stored.totalPaid, 675_750_000);
  test("reste dû recalculé", stored.balanceDue, 6_000_000_000);
  test("statut : payé en partie", stored.status, "PARTIALLY_PAID");

  // Solde complet.
  await prisma.payment.create({
    data: {
      documentId: document.id,
      amount: 6_000_000_000,
      currency: "MGA",
      method: "TRANSFER",
    },
  });
  await prisma.$transaction((tx) => recalcDocument(tx, document.id));
  stored = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });

  test("solde complet : reste dû nul", stored.balanceDue, 0);
  test("statut : payé", stored.status, "PAID");

  // --- Abonnement mensuel -------------------------------------------------
  // Le cas réel : une facture au forfait, tous les mois, qui doit porter le
  // mois qu'elle couvre et non celui du document modèle.
  const modele = await prisma.document.create({
    data: {
      type: "INVOICE",
      status: "SENT",
      number: `${MARK}-MODELE`,
      subject: `${MARK} Prestations de développement — {MOIS_ANNEE}`,
      billToId: client.id,
      issueDate: new Date(Date.UTC(2026, 5, 30, 12)),
      currency: "EUR",
      vatMode: "NONE",
      paymentTermsDays: 30,
      lines: {
        create: [
          {
            position: 0,
            kind: "SERVICE",
            label: "Développement web — {MOIS_ANNEE}",
            description: "Période : {MOIS_PRECEDENT}",
            quantity: 1000,
            unit: "forfait",
            unitPrice: 400_000,
            vatRate: 0,
          },
        ],
      },
    },
  });

  const abonnement = await prisma.recurrence.create({
    data: {
      name: `${MARK} mensuel`,
      frequency: "MONTHLY",
      interval: 1,
      nextRunDate: new Date(Date.UTC(2026, 6, 1, 12)), // 1er juillet 2026
      sourceDocumentId: modele.id,
      active: true,
    },
  });

  const premiereId = await prisma.$transaction((tx) => generateOne(tx, abonnement.id));
  const premiere = await prisma.document.findUniqueOrThrow({
    where: { id: premiereId! },
    include: { lines: true },
  });

  test("une facture est générée", premiere !== null, true);
  test("elle part en brouillon", premiere.status, "DRAFT");
  test("elle n'a pas encore de numéro", premiere.number, null);
  test(
    "l'objet porte le mois de l'échéance",
    premiere.subject,
    `${MARK} Prestations de développement — juillet 2026`,
  );
  test("la ligne aussi", premiere.lines[0].label, "Développement web — juillet 2026");
  test(
    "la description porte le mois précédent",
    premiere.lines[0].description,
    "Période : juin 2026",
  );
  test("le montant est repris", premiere.total, 400_000);
  test("l'échéance est calculée", toDateInput(premiere.dueDate!), "2026-07-31");

  // La deuxième échéance doit avancer d'un mois, sans retoucher au modèle.
  const deuxiemeId = await prisma.$transaction((tx) => generateOne(tx, abonnement.id));
  const deuxieme = await prisma.document.findUniqueOrThrow({
    where: { id: deuxiemeId! },
    include: { lines: true },
  });

  test(
    "l'échéance suivante porte le mois suivant",
    deuxieme.subject,
    `${MARK} Prestations de développement — août 2026`,
  );
  test("la ligne suit", deuxieme.lines[0].label, "Développement web — août 2026");
  test("date d'émission avancée d'un mois", toDateInput(deuxieme.issueDate), "2026-08-01");

  const suivi = await prisma.recurrence.findUniqueOrThrow({ where: { id: abonnement.id } });
  test("deux échéances comptabilisées", suivi.occurrencesDone, 2);
  test("prochaine échéance planifiée", toDateInput(suivi.nextRunDate), "2026-09-01");
  test("l'abonnement reste actif", suivi.active, true);

  // Le document modèle n'est jamais altéré.
  const modeleRelu = await prisma.document.findUniqueOrThrow({ where: { id: modele.id } });
  test(
    "le modèle conserve ses jetons",
    modeleRelu.subject,
    `${MARK} Prestations de développement — {MOIS_ANNEE}`,
  );

  // Nettoyage. L'abonnement part en premier : il référence le document modèle.
  await prisma.recurrence.deleteMany({ where: { name: { contains: MARK } } });
  await prisma.document.deleteMany({ where: { subject: { contains: MARK } } });
  await prisma.party.deleteMany({ where: { name: { contains: MARK } } });

  const leftovers =
    (await prisma.recurrence.count({ where: { name: { contains: MARK } } })) +
    (await prisma.document.count({ where: { subject: { contains: MARK } } })) +
    (await prisma.party.count({ where: { name: { contains: MARK } } }));
  test("données de test effacées", leftovers, 0);
}

integration()
  .catch((error) => {
    failed++;
    console.error(error);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log(
      `\n${passed} test(s) réussi(s), ${failed} échec(s).\n`,
    );
    process.exit(failed === 0 ? 0 : 1);
  });
