import { PDFDocument, AFRelationship } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { computeDocument } from "@/lib/compute";
import {
  buildFacturXXml,
  FACTURX_FILENAME,
  type FacturXParty,
} from "@/lib/facturx";

/**
 * Assemble le XML Factur-X d'un document, puis permet de le rattacher au PDF.
 *
 * Limite assumée : le PDF produit embarque bien le XML en pièce jointe
 * normalisée (nom, relation AF, type MIME), mais il n'est pas certifié PDF/A-3.
 * La conformité PDF/A-3 complète exige un profil colorimétrique ICC et des
 * métadonnées XMP que @react-pdf ne permet pas d'écrire. Le fichier reste donc
 * exploitable par un lecteur qui va chercher la pièce jointe, sans pouvoir se
 * prévaloir de la certification.
 */

function toFacturXParty(party: {
  name: string;
  legalName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  identifiers?: { label: string; value: string; showOnPdf: boolean }[];
}): FacturXParty {
  return {
    name: party.name,
    legalName: party.legalName,
    addressLine1: party.addressLine1,
    addressLine2: party.addressLine2,
    postalCode: party.postalCode,
    city: party.city,
    country: party.country,
    email: party.email,
    identifiers: (party.identifiers ?? [])
      .filter((identifier) => identifier.value.trim() !== "")
      .map((identifier) => ({ label: identifier.label, value: identifier.value })),
  };
}

export async function buildFacturXXmlForDocument(
  documentId: string,
): Promise<{ xml: string; number: string } | null> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      billTo: { include: { identifiers: { orderBy: { position: "asc" } } } },
      lines: { orderBy: { position: "asc" } },
    },
  });
  if (!document) return null;

  const [company, identifiers, currency] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.legalIdentifier.findMany({ orderBy: { position: "asc" } }),
    prisma.currency.findUnique({ where: { code: document.currency } }),
  ]);
  if (!company) return null;

  const computed = computeDocument({
    lines: document.lines.map((line) => ({
      kind: line.kind,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue,
      vatRate: line.vatRate,
    })),
    vatMode: document.vatMode,
    discountType: document.discountType,
    discountValue: document.discountValue,
    withholdingRate: document.withholdingRate,
    totalDeposits: document.totalDeposits,
    totalPaid: document.totalPaid,
    decimals: currency?.decimals ?? 2,
  });

  const seller: FacturXParty = toFacturXParty({
    name: company.tradeName ?? company.legalName,
    legalName: company.legalName,
    addressLine1: company.addressLine1,
    addressLine2: company.addressLine2,
    postalCode: company.postalCode,
    city: company.city,
    country: company.country,
    email: company.email,
    identifiers: identifiers.map((identifier) => ({
      label: identifier.label,
      value: identifier.value,
      showOnPdf: identifier.showOnPdf,
    })),
  });

  const xml = buildFacturXXml({
    type: document.type,
    // Un brouillon n'a pas encore de numéro : on le signale explicitement
    // plutôt que d'émettre un identifiant vide.
    number: document.number ?? "BROUILLON",
    issueDate: document.issueDate,
    dueDate: document.dueDate,
    currency: document.currency,
    purchaseOrder: document.purchaseOrder,
    seller,
    buyer: toFacturXParty(document.billTo),
    vatBreakdown: computed.vatBreakdown,
    totalNet: computed.totalNet,
    totalVat: computed.totalVat,
    totalGross: computed.totalGross,
    totalPrepaid: document.totalPaid + computed.totalDeposits,
    totalDue: computed.balanceDue,
    vatExemptionReason:
      computed.totalVat === 0 ? (company.vatExemptionText ?? "TVA non applicable") : null,
    paymentTerms: document.terms,
  });

  return { xml, number: document.number ?? "brouillon" };
}

/** Rattache le XML Factur-X au PDF, sous le nom normalisé `factur-x.xml`. */
export async function attachFacturX(pdf: Buffer, xml: string): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(new Uint8Array(pdf));

  pdfDoc.attach(new TextEncoder().encode(xml), FACTURX_FILENAME, {
    mimeType: "text/xml",
    description: "Facture électronique Factur-X (CII, profil BASIC WL)",
    afRelationship: AFRelationship.Data,
    creationDate: new Date(),
    modificationDate: new Date(),
  });

  // Sans flux d'objets : la table des fichiers embarqués reste lisible en
  // clair dans le PDF, ce qu'attendent les lecteurs Factur-X les plus stricts.
  const bytes = await pdfDoc.save({ useObjectStreams: false });
  return Buffer.from(bytes);
}
