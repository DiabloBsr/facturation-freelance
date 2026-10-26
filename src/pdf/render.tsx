import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { FALLBACK_CURRENCY } from "@/lib/money";
import { DOCUMENT_TYPE_SHORT, type DocumentType } from "@/lib/enums";
import { documentDetailInclude } from "@/server/documents";
import { buildViewModel, type PdfViewModel } from "./view-model";
import { TEMPLATE_RENDERERS } from "./renderers";
import { ClassiqueTemplate } from "./templates/classique";

/** Nom de fichier lisible : « Facture FAC-2026-0001 - Client.pdf ». */
function fileName(type: string, number: string | null, partyName: string): string {
  const label = DOCUMENT_TYPE_SHORT[type as DocumentType] ?? "Document";
  const safeParty = partyName.replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim();
  return `${label} ${number ?? "brouillon"} - ${safeParty}.pdf`.replace(/\s+/g, " ");
}

/**
 * Modèle de vue d'un document réel.
 * Partagé par le rendu PDF et par l'aperçu HTML, pour que les deux affichent
 * rigoureusement le même contenu.
 */
export async function buildDocumentViewModel(
  documentId: string,
): Promise<{ vm: PdfViewModel; template: string; filename: string } | null> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: documentDetailInclude,
  });
  if (!document) return null;

  const [company, identifiers, currency, logoMark] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.legalIdentifier.findMany({ orderBy: { position: "asc" } }),
    prisma.currency.findUnique({ where: { code: document.currency } }),
    prisma.appSetting.findUnique({ where: { key: "logoMark" } }),
  ]);
  if (!company) return null;

  const currencyFormat = currency
    ? {
        code: currency.code,
        symbol: currency.symbol,
        decimals: currency.decimals,
        symbolAfter: currency.symbolAfter,
      }
    : FALLBACK_CURRENCY;

  return {
    vm: buildViewModel({
      document,
      company,
      identifiers,
      currency: currencyFormat,
      currencyName: currency?.name ?? currencyFormat.code,
      logoMark: logoMark?.value || null,
    }),
    template: document.template,
    filename: fileName(document.type, document.number, document.billTo.name),
  };
}

export async function renderDocumentPdf(
  documentId: string,
  templateOverride?: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const built = await buildDocumentViewModel(documentId);
  if (!built) return null;

  const Template = TEMPLATE_RENDERERS[templateOverride ?? built.template] ?? ClassiqueTemplate;
  const buffer = await renderToBuffer(<Template vm={built.vm} />);

  return { buffer, filename: built.filename };
}
