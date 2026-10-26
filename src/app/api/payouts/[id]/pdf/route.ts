import { NextResponse } from "next/server";
import { renderPayoutPdf } from "@/pdf/payout-render";
import { sessionOr401 } from "@/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Justificatif de reversement en PDF. `?dl=1` force le téléchargement. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await sessionOr401();
  if (denied) return denied;

  const { id } = await params;
  const download = new URL(request.url).searchParams.get("dl") === "1";

  const result = await renderPayoutPdf(id);
  if (!result) {
    return NextResponse.json({ error: "Justificatif introuvable." }, { status: 404 });
  }

  const body = new Uint8Array(result.buffer);
  const encoded = encodeURIComponent(result.filename);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="reversement.pdf"; filename*=UTF-8''${encoded}`,
      "Content-Length": String(body.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
