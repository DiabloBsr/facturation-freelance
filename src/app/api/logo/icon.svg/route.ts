import { prisma } from "@/lib/prisma";
import { fallbackIconSvg, renderLogoSvg } from "@/lib/logo-svg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Favicon de l'application : la marque choisie dans la galerie, servie en SVG.
 *
 * Elle est dessinée à partir de la même description de formes que le logo des
 * factures : l'icône de l'onglet suit donc automatiquement un changement de
 * marque ou de couleur d'accent.
 */
export async function GET() {
  const [company, setting] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.appSetting.findUnique({ where: { key: "logoMark" } }),
  ]);

  const accent = company?.accentColor ?? "#1F4D7A";
  const svg = renderLogoSvg(setting?.value ?? "", accent) ?? fallbackIconSvg(accent);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Pas de cache : l'icône doit suivre un changement de logo sans délai.
      "Cache-Control": "no-store",
    },
  });
}
