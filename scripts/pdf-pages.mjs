/**
 * Compte le nombre de pages d'un document dans chacun des cinq modèles.
 * Sert à vérifier qu'une facture courante tient bien sur une seule page.
 *
 * Usage : node scripts/pdf-pages.mjs <idDocument> [baseUrl]
 */

import { PDFParse } from "pdf-parse";

const [id, base = "http://localhost:3001"] = process.argv.slice(2);

if (!id) {
  console.error("Usage : node scripts/pdf-pages.mjs <idDocument> [baseUrl]");
  process.exit(1);
}

const TEMPLATES = ["classique", "moderne", "minimal", "elegant", "compact"];
let multi = 0;

for (const template of TEMPLATES) {
  const response = await fetch(`${base}/api/documents/${id}/pdf?modele=${template}`);
  if (!response.ok) {
    console.log(`  ${template.padEnd(11)} HTTP ${response.status}`);
    continue;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const parsed = await parser.getText();
  await parser.destroy();

  if (parsed.total > 1) multi++;
  console.log(
    `  ${parsed.total === 1 ? "ok   " : "     "} ${template.padEnd(11)} ${parsed.total} page(s)  ${Math.round(buffer.length / 1024)} Ko`,
  );
}

console.log(
  multi === 0
    ? "\nTous les modèles tiennent sur une page.\n"
    : `\n${multi} modèle(s) débordent sur une seconde page.\n`,
);
