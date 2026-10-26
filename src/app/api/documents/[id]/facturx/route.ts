import { NextResponse } from "next/server";
import { buildFacturXXmlForDocument } from "@/server/facturx";
import { FACTURX_FILENAME } from "@/lib/facturx";
import { sessionOr401 } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Le XML Factur-X seul, tel qu'il est joint au PDF. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await sessionOr401();
  if (denied) return denied;

  const { id } = await params;
  const built = await buildFacturXXmlForDocument(id);

  if (!built) {
    return NextResponse.json({ error: "Document introuvable." }, { status: 404 });
  }

  return new NextResponse(built.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${FACTURX_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}
