"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero, MILLI } from "@/lib/money";
import { parseDateInput, today } from "@/lib/dates";
import { allocateNumber } from "@/lib/numbering";
import { computePayout } from "@/lib/payout";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Quantité saisie (heures, jours) vers milli-unités. */
function quantity(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * MILLI) : 0;
}

/** Cours de change : saisi librement, jamais deviné. */
function rate(raw: string | null): number {
  if (!raw) return 1;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Précision des deux devises du reversement. */
async function decimalsOf(source: string, target: string) {
  const currencies = await prisma.currency.findMany({
    where: { code: { in: [source, target] } },
    select: { code: true, decimals: true },
  });
  return {
    sourceDecimals: currencies.find((c) => c.code === source)?.decimals ?? 2,
    targetDecimals: currencies.find((c) => c.code === target)?.decimals ?? 0,
  };
}

/** Lit les lignes de prestation et les ajustements du formulaire. */
function readRows(formData: FormData) {
  const labels = formData.getAll("lineLabel").map((v) => String(v).trim());
  const quantities = formData.getAll("lineQuantity").map((v) => String(v));
  const units = formData.getAll("lineUnit").map((v) => String(v));
  const prices = formData.getAll("lineUnitPrice").map((v) => String(v));

  const lines = labels
    .map((label, index) => ({
      label,
      quantity: quantity(quantities[index] ?? "0"),
      unit: units[index] || "heure",
      unitPrice: parseAmountOrZero(prices[index] ?? "0"),
    }))
    .filter((line) => line.label !== "");

  const adjustmentLabels = formData.getAll("adjustmentLabel").map((v) => String(v).trim());
  const adjustmentAmounts = formData.getAll("adjustmentAmount").map((v) => String(v));

  const adjustments = adjustmentLabels
    .map((label, index) => ({
      label,
      amount: parseAmountOrZero(adjustmentAmounts[index] ?? "0"),
    }))
    .filter((adjustment) => adjustment.label !== "");

  return { lines, adjustments };
}

/** Recalcule et fige les totaux d'un reversement. */
async function recalcPayout(payoutId: string): Promise<void> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: { lines: { orderBy: { position: "asc" } }, adjustments: true },
  });
  if (!payout) return;

  const { sourceDecimals, targetDecimals } = await decimalsOf(
    payout.sourceCurrency,
    payout.targetCurrency,
  );

  const computed = computePayout({
    lines: payout.lines,
    exchangeRate: payout.exchangeRate,
    bankFees: payout.bankFees,
    adjustments: payout.adjustments,
    sourceDecimals,
    targetDecimals,
  });

  await Promise.all(
    payout.lines.map((line, index) =>
      prisma.payoutLine.update({
        where: { id: line.id },
        data: { amount: computed.lineAmounts[index] },
      }),
    ),
  );

  await prisma.payout.update({
    where: { id: payoutId },
    data: {
      totalSource: computed.totalSource,
      totalConverted: computed.totalConverted,
      totalAdjustments: computed.totalAdjustments,
      netPayable: computed.netPayable,
    },
  });
}

function scalars(formData: FormData) {
  return {
    beneficiaryId: String(formData.get("beneficiaryId") ?? ""),
    documentId: text(formData, "documentId"),
    date: parseDateInput(text(formData, "date")) ?? today(),
    sourceCurrency: String(formData.get("sourceCurrency") ?? "EUR"),
    targetCurrency: String(formData.get("targetCurrency") ?? "MGA"),
    exchangeRate: rate(text(formData, "exchangeRate")),
    bankFees: parseAmountOrZero(text(formData, "bankFees")),
    reference: text(formData, "reference"),
    notes: text(formData, "notes"),
  };
}

export async function createPayout(formData: FormData): Promise<void> {
  await requireSession();
  const data = scalars(formData);
  if (!data.beneficiaryId) {
    redirectWithFlash("/sous-traitance/nouveau", "Choisissez un bénéficiaire.", "error");
  }

  const { lines, adjustments } = readRows(formData);
  if (lines.length === 0) {
    redirectWithFlash(
      "/sous-traitance/nouveau",
      "Ajoutez au moins une prestation à reverser.",
      "error",
    );
  }

  const payout = await prisma.payout.create({
    data: {
      ...data,
      lines: {
        create: lines.map((line, position) => ({ ...line, position, amount: 0 })),
      },
      adjustments: {
        create: adjustments.map((adjustment, position) => ({ ...adjustment, position })),
      },
    },
  });

  await recalcPayout(payout.id);

  // Justificatif issu d'une déclaration d'intervenant : on la marque reprise.
  const requestId = text(formData, "requestId");
  if (requestId) {
    await prisma.payoutRequest.updateMany({
      where: { id: requestId },
      data: { payoutId: payout.id, status: "CONVERTED" },
    });
  }

  revalidatePath("/sous-traitance");
  redirectWithFlash(`/sous-traitance/${payout.id}`, "Justificatif créé.");
}

export async function updatePayout(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await prisma.payout.findUnique({ where: { id } });
  if (!existing) redirectWithFlash("/sous-traitance", "Justificatif introuvable.", "error");

  const data = scalars(formData);
  const { lines, adjustments } = readRows(formData);
  if (lines.length === 0) {
    redirectWithFlash(
      `/sous-traitance/${id}`,
      "Ajoutez au moins une prestation à reverser.",
      "error",
    );
  }

  // Les lignes sont réécrites intégralement : le formulaire fait foi.
  await prisma.payoutLine.deleteMany({ where: { payoutId: id } });
  await prisma.payoutAdjustment.deleteMany({ where: { payoutId: id } });

  await prisma.payout.update({
    where: { id },
    data: {
      ...data,
      lines: {
        create: lines.map((line, position) => ({ ...line, position, amount: 0 })),
      },
      adjustments: {
        create: adjustments.map((adjustment, position) => ({ ...adjustment, position })),
      },
    },
  });

  await recalcPayout(id);

  revalidatePath("/sous-traitance");
  revalidatePath(`/sous-traitance/${id}`);
  redirectWithFlash(`/sous-traitance/${id}`, "Justificatif enregistré.");
}

/** Attribue le numéro définitif, comme pour une facture. */
export async function issuePayout(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payout = await prisma.payout.findUnique({ where: { id } });
  if (!payout) redirectWithFlash("/sous-traitance", "Justificatif introuvable.", "error");

  if (payout.number) {
    redirectWithFlash(
      `/sous-traitance/${id}`,
      `Ce justificatif porte déjà le numéro ${payout.number}.`,
      "info",
    );
  }

  const number = await prisma.$transaction(async (tx) => {
    const allocated = await allocateNumber(tx, "PAYOUT", payout.date);
    await tx.payout.update({ where: { id }, data: { number: allocated } });
    return allocated;
  });

  revalidatePath("/sous-traitance");
  redirectWithFlash(`/sous-traitance/${id}`, `Justificatif validé sous le numéro ${number}.`);
}

export async function markPayoutPaid(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payout = await prisma.payout.findUnique({ where: { id } });
  if (!payout) redirectWithFlash("/sous-traitance", "Justificatif introuvable.", "error");

  if (payout.status === "PAID") {
    redirectWithFlash(`/sous-traitance/${id}`, "Ce reversement est déjà marqué payé.", "info");
  }

  await prisma.payout.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });

  revalidatePath("/sous-traitance");
  redirectWithFlash(`/sous-traitance/${id}`, "Reversement marqué comme payé.");
}

export async function deletePayout(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const payout = await prisma.payout.findUnique({
    where: { id },
    include: { beneficiary: { select: { name: true } } },
  });
  if (!payout) redirectWithFlash("/sous-traitance", "Justificatif introuvable.", "error");

  await prisma.payout.delete({ where: { id } });

  revalidatePath("/sous-traitance");
  redirectWithFlash(
    "/sous-traitance",
    `Justificatif ${payout.number ?? "(brouillon)"} — ${payout.beneficiary.name} supprimé.`,
  );
}
