"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero } from "@/lib/money";
import { parseDateInput, today } from "@/lib/dates";
import { recalcDocument } from "../recalc";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Cours saisi ("5 000", "4 980,5") vers nombre, ou null si invalide. */
function parseRate(input: string | null): number | null {
  if (input === null) return null;
  const value = Number(input.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function addPayment(formData: FormData): Promise<void> {
  await requireSession();
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  const document = await prisma.document.findUnique({ where: { id: documentId } });
  if (!document) redirectWithFlash("/factures", "Document introuvable.", "error");

  const amount = parseAmountOrZero(text(formData, "amount"));
  if (amount <= 0) {
    redirectWithFlash(
      `/documents/${documentId}`,
      "Le montant de l'encaissement doit être supérieur à zéro.",
      "error",
    );
  }

  // Cours du jour vers la devise de base, figé sur l'encaissement : celui du
  // formulaire, sinon le cours courant de la devise, sinon celui du document.
  const [company, documentCurrency] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 }, select: { baseCurrency: true } }),
    prisma.currency.findUnique({ where: { code: document.currency } }),
  ]);
  const rateToBase =
    document.currency === company?.baseCurrency
      ? 1
      : (parseRate(text(formData, "rateToBase")) ??
        documentCurrency?.rateToBase ??
        document.exchangeRate);

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        documentId,
        date: parseDateInput(text(formData, "date")) ?? today(),
        amount,
        currency: document.currency,
        rateToBase,
        method: String(formData.get("method") ?? "TRANSFER"),
        reference: text(formData, "reference"),
        bankAccountId: text(formData, "bankAccountId"),
        notes: text(formData, "notes"),
      },
    });
    await recalcDocument(tx, documentId);
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/encaissements");
  revalidatePath("/factures");
  revalidatePath("/relances");
  revalidatePath("/");
  redirectWithFlash(`/documents/${documentId}`, "Encaissement enregistré.");
}

export async function deletePayment(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment) redirectWithFlash("/encaissements", "Encaissement introuvable.", "error");

  const documentId = payment.documentId;

  await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id } });
    await recalcDocument(tx, documentId);
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/encaissements");
  revalidatePath("/factures");
  revalidatePath("/");
  redirectWithFlash(`/documents/${documentId}`, "Encaissement supprimé.");
}
