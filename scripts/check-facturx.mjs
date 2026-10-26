/**
 * Contrôle de la facture électronique Factur-X.
 *
 * Vérifie que le XML porte les bonnes valeurs, qu'il est bien formé, et qu'il
 * est réellement rattaché au PDF sous son nom normalisé.
 *
 * Nécessite un serveur démarré. Usage :
 *   node scripts/check-facturx.mjs <idDocument> [baseUrl]
 */

import { PDFDocument } from "pdf-lib";

const [id, base = "http://localhost:3001"] = process.argv.slice(2);
if (!id) {
  console.error("Usage : node scripts/check-facturx.mjs <idDocument> [baseUrl]");
  process.exit(1);
}

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  ok    ${label}`);
  } else {
    failures++;
    console.log(`  ÉCHEC ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function tag(xml, name) {
  const match = new RegExp(`<${name}[^>]*>([^<]*)</${name}>`).exec(xml);
  return match ? match[1] : null;
}

/**
 * Contrôle de bonne formation : chaque balise ouvrante doit se refermer,
 * dans le bon ordre.
 */
function wellFormed(xml) {
  const body = xml.replace(/<\?xml[^>]*\?>/g, "");
  const stack = [];
  const re = /<(\/?)([A-Za-z_:][\w.:-]*)[^>]*?(\/?)>/g;
  let match;
  while ((match = re.exec(body)) !== null) {
    const [, closing, name, selfClosing] = match;
    if (selfClosing) continue;
    if (closing) {
      if (stack.pop() !== name) return false;
    } else {
      stack.push(name);
    }
  }
  return stack.length === 0;
}

console.log("\n== XML Factur-X ==");
const xmlResponse = await fetch(`${base}/api/documents/${id}/facturx`);
check("le XML est servi", xmlResponse.status === 200, `HTTP ${xmlResponse.status}`);
const xml = await xmlResponse.text();

check("XML bien formé", wellFormed(xml));
check(
  "profil déclaré",
  xml.includes("urn:factur-x.eu:1p0:basicwl"),
  tag(xml, "ram:ID") ?? "(absent)",
);
check("racine CrossIndustryInvoice", xml.includes("<rsm:CrossIndustryInvoice"));
check("type de document renseigné", /<ram:TypeCode>\d{3}<\/ram:TypeCode>/.test(xml));
check("date d'émission au format 102", /format="102">\d{8}</.test(xml));
check("vendeur présent", xml.includes("<ram:SellerTradeParty>"));
check("acheteur présent", xml.includes("<ram:BuyerTradeParty>"));
check("devise renseignée", tag(xml, "ram:InvoiceCurrencyCode") !== null);
check("ventilation de TVA présente", xml.includes("<ram:ApplicableTradeTax>"));
check("total à payer présent", tag(xml, "ram:DuePayableAmount") !== null);

const grand = tag(xml, "ram:GrandTotalAmount");
const basis = tag(xml, "ram:TaxBasisTotalAmount");
const taxTotal = /<ram:TaxTotalAmount[^>]*>([^<]*)</.exec(xml)?.[1] ?? null;
check(
  "cohérence des totaux (HT + TVA = TTC)",
  grand !== null &&
    basis !== null &&
    taxTotal !== null &&
    Math.abs(Number(basis) + Number(taxTotal) - Number(grand)) < 0.005,
  `HT=${basis} TVA=${taxTotal} TTC=${grand}`,
);
check(
  "montants à deux décimales",
  [grand, basis, taxTotal].every((value) => value !== null && /^-?\d+\.\d{2}$/.test(value)),
  `${basis} / ${taxTotal} / ${grand}`,
);

console.log("\n== PDF avec pièce jointe ==");
const pdfResponse = await fetch(`${base}/api/documents/${id}/pdf?facturx=1`);
check("le PDF est servi", pdfResponse.status === 200, `HTTP ${pdfResponse.status}`);
const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());
check("signature PDF", Buffer.from(pdfBytes.subarray(0, 4)).toString("latin1") === "%PDF");

const doc = await PDFDocument.load(pdfBytes);
const raw = Buffer.from(pdfBytes).toString("latin1");
check("pièce jointe nommée factur-x.xml", raw.includes("factur-x.xml"));
check("relation de fichier associé déclarée", raw.includes("/AFRelationship"));
check("le PDF reste lisible", doc.getPageCount() >= 1, `${doc.getPageCount()} page(s)`);

const plain = await fetch(`${base}/api/documents/${id}/pdf`);
const plainBytes = new Uint8Array(await plain.arrayBuffer());
check(
  "le PDF ordinaire ne contient pas la pièce jointe",
  !Buffer.from(plainBytes).toString("latin1").includes("factur-x.xml"),
);

console.log(
  failures === 0 ? `\nRÉSULTAT : Factur-X conforme aux contrôles.\n` : `\nRÉSULTAT : ${failures} échec(s).\n`,
);
process.exitCode = failures === 0 ? 0 : 1;
