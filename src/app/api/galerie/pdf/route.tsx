import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { buildDemoViewModel } from "@/pdf/demo";
import { TEMPLATE_RENDERERS } from "@/pdf/renderers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Facture de démonstration, rendue dans le modèle demandé.
 *   /api/galerie/pdf?modele=elegant&couleur=%231F4D7A
 *
 * Rien n'est enregistré : le document n'existe qu'en mémoire, le temps du rendu.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const template = url.searchParams.get("modele") ?? "classique";
  const accent = url.searchParams.get("couleur") ?? undefined;
  const download = url.searchParams.get("dl") === "1";
  // `?logo=` permet d'essayer une marque sans l'appliquer aux documents.
  const logo = url.searchParams.has("logo") ? url.searchParams.get("logo") : undefined;

  const Template = TEMPLATE_RENDERERS[template];
  if (!Template) {
    return NextResponse.json({ error: "Modèle inconnu." }, { status: 404 });
  }

  const vm = await buildDemoViewModel(accent, logo);
  const buffer = await renderToBuffer(<Template vm={vm} />);
  const body = new Uint8Array(buffer);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="apercu-${template}.pdf"`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
