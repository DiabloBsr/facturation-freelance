import { NextResponse } from "next/server";
import { renderDocumentPdf } from "@/pdf/render";
import { attachFacturX, buildFacturXXmlForDocument } from "@/server/facturx";
import { sessionOr401 } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rend le PDF d'un document.
 *  ?modele=minimal  aperçu dans un autre gabarit, sans rien enregistrer
 *  ?dl=1            force le téléchargement plutôt que l'affichage
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await sessionOr401();
  if (denied) return denied;

  const { id } = await params;
  const url = new URL(request.url);
  const template = url.searchParams.get("modele") ?? undefined;
  const download = url.searchParams.get("dl") === "1";
  const withFacturX = url.searchParams.get("facturx") === "1";

  const result = await renderDocumentPdf(id, template);
  if (!result) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  // Facture électronique : le XML normalisé est rattaché au PDF.
  if (withFacturX) {
    const built = await buildFacturXXmlForDocument(id);
    if (built) {
      result.buffer = await attachFacturX(result.buffer, built.xml);
      result.filename = result.filename.replace(/\.pdf$/i, " (Factur-X).pdf");
    }
  }

  const disposition = download ? "attachment" : "inline";
  // Le nom contient des accents : on fournit aussi la variante RFC 5987.
  const encoded = encodeURIComponent(result.filename);
  const body = new Uint8Array(result.buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="document.pdf"; filename*=UTF-8''${encoded}`,
      // Sans Content-Length la réponse part en « chunked », et plusieurs
      // lecteurs PDF intégrés refusent alors d'afficher quoi que ce soit.
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
