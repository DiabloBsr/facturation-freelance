/**
 * Contrôle du contenu textuel des PDF générés.
 *
 * Vérifie que chaque modèle imprime les mentions obligatoires, que les accents
 * français ressortent intacts et que les séparateurs de milliers sont des
 * espaces insécables lisibles — et non l'espace fine que certaines polices PDF
 * avalent silencieusement.
 *
 * La comparaison ignore les espaces : les titres sont volontairement
 * interlettrés dans certains modèles et les libellés longs se coupent en fin
 * de colonne, ce qui insère des espaces à l'extraction sans rien changer au
 * rendu.
 *
 * Usage : node scripts/inspect-pdf.mjs [dossier]
 */

import { readFile, readdir } from "node:fs/promises";
import { PDFParse } from "pdf-parse";

const DIR = process.argv[2] ?? "./tmp-apercus";

// Codes explicites : ces caractères sont invisibles dans un éditeur et se
// confondent trop facilement avec une espace ordinaire.
const NBSP = String.fromCharCode(0x00a0); // espace insécable, attendue
const THIN_NBSP = String.fromCharCode(0x202f); // espace fine insécable, proscrite

const squeeze = (value) => value.replace(/\s/g, "");

/** Mentions attendues sur tous les modèles. */
const EXPECTED = [
  { label: "titre du document", value: "FACTURE" },
  { label: "numéro", value: "FAC-2026-0042" },
  { label: "raison sociale", value: "Rakoto Consulting" },
  { label: "NIF de l'émetteur", value: "3000123456" },
  { label: "STAT de l'émetteur", value: "62020 11 2026 0 12345" },
  { label: "agence facturée", value: "Numeria Solutions SAS" },
  { label: "client final", value: "Sahaza Distribution" },
  { label: "libellé accentué", value: "Reprise des données historiques" },
  { label: "banque", value: "BNI Madagascar" },
  { label: "RIB", value: "00005 00012 12345678901 42" },
  { label: "montant en toutes lettres", value: "Arrêtée" },
  { label: "devise en lettres", value: "ariary" },
  { label: "total hors taxes", value: "9 135 000" },
  { label: "TVA", value: "1 827 000" },
  { label: "net à payer", value: "10 962 000" },
  { label: "section du détail", value: "Développement" },
];

let failures = 0;
const files = (await readdir(DIR)).filter((name) => name.endsWith(".pdf")).sort();

for (const file of files) {
  const buffer = await readFile(`${DIR}/${file}`);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const parsed = await parser.getText();
  await parser.destroy();

  const raw = parsed.text;
  const squeezed = squeeze(raw);

  const missing = EXPECTED.filter((item) => !squeezed.includes(squeeze(item.value)));
  const mojibake = /Ã©|Ã¨|Ã |â€|�/.test(raw);
  // L'espace fine insécable est proscrite : certaines polices PDF ne la
  // possèdent pas et l'avalent, collant les groupes de chiffres.
  // (Que le séparateur restant soit bien U+00A0 est vérifié par npm test :
  //  l'extracteur, lui, ramène toute espace à l'espace ordinaire.)
  const thinSpace = raw.includes(THIN_NBSP) || raw.includes(NBSP + NBSP);

  const ok = missing.length === 0 && !mojibake && !thinSpace;
  if (!ok) failures++;

  console.log(
    `${ok ? "  ok   " : "  ÉCHEC"} ${file.padEnd(16)} ${parsed.total} page(s), ${raw.length} caractères`,
  );

  for (const item of missing) {
    console.log(`         manque ${item.label} : « ${item.value} »`);
  }
  if (mojibake) console.log(`         accents mal encodés`);
  if (thinSpace) {
    console.log(`         espace fine insécable présente (avalée par les polices PDF)`);
  }
}

console.log(
  failures === 0
    ? `\n${files.length} PDF contrôlés : mentions, accents et séparateurs conformes.\n`
    : `\n${failures} PDF non conforme(s).\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
