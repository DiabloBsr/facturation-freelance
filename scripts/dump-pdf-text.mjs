/**
 * Affiche le texte réellement imprimé sur le PDF d'un document.
 * Pratique pour contrôler un document sans ouvrir de lecteur.
 *
 * Usage : node scripts/dump-pdf-text.mjs <idDocument> [modele] [baseUrl]
 */

import { PDFParse } from "pdf-parse";

const [id, template = "classique", base = "http://localhost:3001"] = process.argv.slice(2);

if (!id) {
  console.error("Usage : node scripts/dump-pdf-text.mjs <idDocument> [modele] [baseUrl]");
  process.exit(1);
}

const response = await fetch(`${base}/api/documents/${id}/pdf?modele=${template}`);
if (!response.ok) {
  console.error(`HTTP ${response.status}`);
  process.exit(1);
}

const buffer = Buffer.from(await response.arrayBuffer());
const parser = new PDFParse({ data: new Uint8Array(buffer) });
const parsed = await parser.getText();
await parser.destroy();

console.log(`--- ${template} · ${parsed.total} page(s) · ${Math.round(buffer.length / 1024)} Ko ---\n`);
console.log(parsed.text);
