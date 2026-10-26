"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero, MILLI } from "@/lib/money";
import { computePayoutLine } from "@/lib/payout";
import { recalcDocument } from "../recalc";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";
import { createRequestToken, findRequestByToken, isRequestOpen } from "../payout-requests";

/**
 * Demandes de facture aux intervenants.
 *
 * `submitPayoutRequest` est la seule action de l'application ouverte sans
 * session : elle n'est atteignable qu'avec un jeton valide, et toute donnée qui
 * engage l'entreprise (bénéficiaire, devise) provient de la demande en base,
 * jamais du formulaire.
 */

// Bornes de ce qu'un formulaire public peut écrire en base.
const MAX_LINES = 40;
const MAX_SHORT = 200;
const MAX_LONG = 2000;
/** 1 milliard d'unités : au-delà, c'est une saisie erronée, pas une prestation. */
const MAX_AMOUNT = 1_000_000_000 * MILLI;

function text(formData: FormData, key: string, max = MAX_SHORT): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed === "" ? null : trimmed;
}

function clamp(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.min(Math.round(value), max);
}

/** Quantité saisie (heures, jours) vers milli-unités. */
function quantity(raw: string | null): number {
  if (!raw) return 0;
  return clamp(Number(raw.replace(",", ".")) * MILLI, MAX_AMOUNT);
}

/**
 * Lignes déclarées par l'intervenant.
 * Tout est borné : nombre de lignes, longueur des textes, montants.
 */
function readDeclaredLines(formData: FormData, decimals: number) {
  const labels = formData.getAll("lineLabel").slice(0, MAX_LINES);
  const quantities = formData.getAll("lineQuantity");
  const units = formData.getAll("lineUnit");
  const prices = formData.getAll("lineUnitPrice");

  return labels
    .map((raw, index) => {
      const label = String(raw).trim().slice(0, MAX_SHORT);
      const line = {
        label,
        quantity: quantity(String(quantities[index] ?? "")),
        unit: String(units[index] ?? "heure").trim().slice(0, 40) || "heure",
        unitPrice: clamp(parseAmountOrZero(String(prices[index] ?? "")), MAX_AMOUNT),
      };
      return { ...line, amount: computePayoutLine(line, decimals) };
    })
    .filter((line) => line.label !== "");
}

// ---------------------------------------------------------------------------
// Côté public : l'intervenant remplit et envoie
// ---------------------------------------------------------------------------

export async function submitPayoutRequest(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const request = await findRequestByToken(token);

  // Jeton inconnu : rien à révéler, la page publique dira simplement que le
  // lien n'est plus valable.
  if (!request) redirectWithFlash("/reversement/invalide", "Lien invalide.", "error");

  const back = `/reversement/${encodeURIComponent(token)}`;
  if (!isRequestOpen(request)) {
    redirectWithFlash(back, "Cette demande n'accepte plus d'envoi.", "error");
  }

  const currency = await prisma.currency.findUnique({
    where: { code: request.currency },
    select: { decimals: true },
  });
  const lines = readDeclaredLines(formData, currency?.decimals ?? 2);

  if (lines.length === 0) {
    redirectWithFlash(back, "Ajoutez au moins une prestation avant d'envoyer.", "error");
  }

  const declared = {
    contactEmail: text(formData, "contactEmail"),
    paymentMethod: text(formData, "paymentMethod", 40),
    paymentDetails: text(formData, "paymentDetails", MAX_LONG),
    notes: text(formData, "notes", MAX_LONG),
  };

  try {
    await prisma.$transaction(async (tx) => {
      // Le passage à SUBMITTED est conditionnel : deux envois simultanés ne
      // peuvent pas se marcher dessus, le second ne verra plus PENDING.
      const claimed = await tx.payoutRequest.updateMany({
        where: { id: request.id, status: "PENDING", expiresAt: { gt: new Date() } },
        data: { ...declared, status: "SUBMITTED", submittedAt: new Date() },
      });
      if (claimed.count === 0) throw new Error("ALREADY_SUBMITTED");

      await tx.payoutRequestLine.deleteMany({ where: { requestId: request.id } });
      await tx.payoutRequestLine.createMany({
        data: lines.map((line, position) => ({ ...line, requestId: request.id, position })),
      });
    });
  } catch {
    redirectWithFlash(back, "Cette demande a déjà été envoyée.", "error");
  }

  revalidatePath("/sous-traitance");
  redirectWithFlash(back, "Votre facture a bien été transmise.");
}

// ---------------------------------------------------------------------------
// Côté admin
// ---------------------------------------------------------------------------

export async function createPayoutRequest(formData: FormData): Promise<void> {
  await requireSession();

  const beneficiaryId = String(formData.get("beneficiaryId") ?? "");
  const beneficiary = beneficiaryId
    ? await prisma.party.findUnique({ where: { id: beneficiaryId } })
    : null;
  if (!beneficiary) {
    redirectWithFlash("/sous-traitance/demandes/nouvelle", "Choisissez un intervenant.", "error");
  }

  const days = Number(formData.get("validityDays") ?? 30);
  const validityDays = Number.isFinite(days) ? Math.min(Math.max(Math.round(days), 1), 365) : 30;

  const { token, tokenHash } = createRequestToken();

  const request = await prisma.payoutRequest.create({
    data: {
      tokenHash,
      beneficiaryId,
      subject: text(formData, "subject", MAX_LONG),
      currency: String(formData.get("currency") ?? "EUR").slice(0, 10),
      expiresAt: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000),
    },
  });

  revalidatePath("/sous-traitance");
  // Le jeton n'est stocké que haché : c'est le seul moment où le lien complet
  // peut être affiché.
  redirectWithFlash(
    `/sous-traitance/demandes/${request.id}?jeton=${token}`,
    "Lien créé : transmettez-le à l'intervenant.",
  );
}

/** Referme une demande sans la supprimer : le lien cesse de fonctionner. */
export async function cancelPayoutRequest(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.payoutRequest.update({ where: { id }, data: { status: "CANCELLED" } });

  revalidatePath("/sous-traitance");
  redirectWithFlash("/sous-traitance", "Demande annulée : le lien ne fonctionne plus.");
}

export async function deletePayoutRequest(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.payoutRequest.delete({ where: { id } });

  revalidatePath("/sous-traitance");
  redirectWithFlash("/sous-traitance", "Demande supprimée.");
}

/** Nouveau jeton : l'ancien lien est révoqué du même coup. */
export async function regeneratePayoutRequestLink(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await prisma.payoutRequest.findUnique({ where: { id } });
  if (!existing) redirectWithFlash("/sous-traitance", "Demande introuvable.", "error");
  if (existing.status === "SUBMITTED" || existing.status === "CONVERTED") {
    redirectWithFlash(
      `/sous-traitance/demandes/${id}`,
      "Cette demande a déjà été renvoyée par l'intervenant.",
      "info",
    );
  }

  const { token, tokenHash } = createRequestToken();
  await prisma.payoutRequest.update({
    where: { id },
    data: { tokenHash, status: "PENDING" },
  });

  redirectWithFlash(
    `/sous-traitance/demandes/${id}?jeton=${token}`,
    "Nouveau lien généré : l'ancien ne fonctionne plus.",
  );
}

/**
 * Reprend les prestations déclarées dans une facture client existante.
 * Les lignes s'ajoutent à la suite et les totaux se recalculent.
 */
export async function importRequestIntoDocument(formData: FormData): Promise<void> {
  await requireSession();

  const id = String(formData.get("id") ?? "");
  const documentId = String(formData.get("documentId") ?? "");
  if (!id) return;

  const request = await prisma.payoutRequest.findUnique({
    where: { id },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!request) redirectWithFlash("/sous-traitance", "Demande introuvable.", "error");

  const back = `/sous-traitance/demandes/${id}`;
  if (!documentId) redirectWithFlash(back, "Choisissez la facture à compléter.", "error");
  if (request.lines.length === 0) {
    redirectWithFlash(back, "Cette demande ne contient aucune prestation.", "error");
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: { lines: { orderBy: { position: "asc" } } },
  });
  if (!document) redirectWithFlash(back, "Facture introuvable.", "error");

  // Additionner des devises différentes fausserait tous les totaux.
  if (document.currency !== request.currency) {
    redirectWithFlash(
      back,
      `La facture est en ${document.currency}, la déclaration en ${request.currency}. Reprenez-la dans une facture de même devise.`,
      "error",
    );
  }

  // La TVA suit celle de la dernière ligne facturable, à défaut celle par défaut.
  const lastBillable = [...document.lines]
    .reverse()
    .find((line) => line.kind === "SERVICE" || line.kind === "PRODUCT");
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  const vatRate = lastBillable?.vatRate ?? company?.defaultVatRate ?? 0;
  const offset = document.lines.length;

  await prisma.$transaction(async (tx) => {
    await tx.documentLine.createMany({
      data: request.lines.map((line, index) => ({
        documentId,
        position: offset + index,
        kind: "SERVICE",
        label: line.label,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        vatRate,
      })),
    });
    await tx.payoutRequest.update({
      where: { id },
      data: { documentId, status: "CONVERTED" },
    });
    await recalcDocument(tx, documentId);
  });

  revalidatePath("/sous-traitance");
  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/factures");
  redirectWithFlash(
    `/documents/${documentId}`,
    `${request.lines.length} prestation(s) ajoutée(s) à la facture.`,
  );
}
