"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero, MILLI } from "@/lib/money";
import { addDays, formatDate, parseDateInput, today } from "@/lib/dates";
import { RATE_TYPE_UNIT, type RateType } from "@/lib/enums";
import { recalcDocument } from "../recalc";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Quantité saisie en jours/heures -> milli-unités. */
function quantityToMilli(raw: string | null): number {
  if (!raw) return 0;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed * MILLI) : 0;
}

export async function upsertTimeEntry(formData: FormData): Promise<void> {
  await requireSession();
  const id = text(formData, "id");
  const missionId = String(formData.get("missionId") ?? "");
  const backTo = String(formData.get("backTo") ?? "/temps");
  if (!missionId) return;

  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) redirectWithFlash("/temps", "Mission introuvable.", "error");

  const date = parseDateInput(text(formData, "date")) ?? today();
  const quantity = quantityToMilli(text(formData, "quantity"));
  if (quantity <= 0) {
    redirectWithFlash(backTo, "La quantité doit être supérieure à zéro.", "error");
  }

  const data = {
    missionId,
    date,
    quantity,
    unit: String(formData.get("unit") ?? (mission.rateType === "HOURLY" ? "HOUR" : "DAY")),
    label: text(formData, "label"),
    description: text(formData, "description"),
    // Une case décochée n'est pas transmise : l'absence vaut « non facturable ».
    billable: formData.get("billable") === "on",
    rate: text(formData, "rate") ? parseAmountOrZero(text(formData, "rate")) : null,
  };

  if (id) {
    const existing = await prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) redirectWithFlash(backTo, "Saisie introuvable.", "error");
    if (existing.documentId) {
      redirectWithFlash(
        backTo,
        "Cette saisie est déjà facturée : détachez-la de la facture avant de la modifier.",
        "error",
      );
    }
    await prisma.timeEntry.update({ where: { id }, data });
  } else {
    await prisma.timeEntry.create({ data });
  }

  revalidatePath("/temps");
  revalidatePath(`/missions/${missionId}`);
  redirectWithFlash(backTo, id ? "Saisie modifiée." : "Temps enregistré.");
}

export async function deleteTimeEntry(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  const backTo = String(formData.get("backTo") ?? "/temps");
  if (!id) return;

  const entry = await prisma.timeEntry.findUnique({ where: { id } });
  if (!entry) redirectWithFlash(backTo, "Saisie introuvable.", "error");

  if (entry.documentId) {
    redirectWithFlash(
      backTo,
      "Cette saisie est rattachée à une facture : détachez-la d'abord.",
      "error",
    );
  }

  await prisma.timeEntry.delete({ where: { id } });

  revalidatePath("/temps");
  revalidatePath(`/missions/${entry.missionId}`);
  redirectWithFlash(backTo, "Saisie supprimée.");
}

/**
 * Transforme des jours de CRA en facture brouillon.
 * Une ligne par tarif appliqué ; le détail des dates part en description.
 */
export async function invoiceTimeEntries(formData: FormData): Promise<void> {
  await requireSession();
  const missionId = String(formData.get("missionId") ?? "");
  const ids = formData.getAll("entryId").map((v) => String(v));
  const backTo = String(formData.get("backTo") ?? "/temps");
  if (!missionId) return;

  if (ids.length === 0) {
    redirectWithFlash(backTo, "Sélectionnez au moins une journée à facturer.", "error");
  }

  const mission = await prisma.mission.findUnique({
    where: { id: missionId },
    include: { client: true, agency: true },
  });
  if (!mission) redirectWithFlash("/temps", "Mission introuvable.", "error");

  const entries = await prisma.timeEntry.findMany({
    where: { id: { in: ids }, missionId, billable: true, documentId: null },
    orderBy: { date: "asc" },
  });
  if (entries.length === 0) {
    redirectWithFlash(
      backTo,
      "Aucune journée facturable dans la sélection (déjà facturée ou non facturable).",
      "error",
    );
  }

  const billToId = mission.billTo === "AGENCY" && mission.agencyId ? mission.agencyId : mission.clientId;
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  const vatRate = mission.vatRate ?? company?.defaultVatRate ?? 0;
  const paymentTermsDays = company?.paymentTermsDays ?? 30;
  const issueDate = today();

  // Regroupement par tarif : un tarif = une ligne de facture.
  const groups = new Map<number, typeof entries>();
  for (const entry of entries) {
    const rate = entry.rate ?? mission.rate;
    const bucket = groups.get(rate);
    if (bucket) bucket.push(entry);
    else groups.set(rate, [entry]);
  }

  const invoiceId = await prisma.$transaction(async (tx) => {
    const invoice = await tx.document.create({
      data: {
        type: "INVOICE",
        status: "DRAFT",
        subject: mission.title,
        billToId,
        endClientId: mission.billTo === "AGENCY" && mission.agencyId ? mission.clientId : null,
        missionId: mission.id,
        issueDate,
        dueDate: addDays(issueDate, paymentTermsDays),
        currency: mission.currency,
        vatMode: vatRate > 0 ? "EXCLUSIVE" : "NONE",
        paymentTermsDays,
        withholdingLabel: company?.withholdingLabel ?? null,
        withholdingRate: company?.withholdingRate ?? 0,
        purchaseOrder: mission.purchaseOrder,
        terms: company?.defaultTerms ?? null,
        footer: company?.defaultFooter ?? null,
        template: company?.defaultTemplate ?? "classique",
        showAmountInWords: company?.showAmountInWords ?? true,
        bankAccountId:
          (await tx.bankAccount.findFirst({ where: { isDefault: true }, select: { id: true } }))
            ?.id ?? null,
      },
    });

    let position = 0;
    for (const [rate, groupEntries] of groups) {
      const quantity = groupEntries.reduce((sum, entry) => sum + entry.quantity, 0);
      const unit = RATE_TYPE_UNIT[mission.rateType as RateType] ?? "jour";
      const dates = groupEntries.map((entry) => formatDate(entry.date)).join(", ");

      await tx.documentLine.create({
        data: {
          documentId: invoice.id,
          position: position++,
          kind: "SERVICE",
          label: mission.title,
          description: `Période facturée : ${dates}`,
          quantity,
          unit,
          unitPrice: rate,
          discountType: "NONE",
          discountValue: 0,
          vatRate,
        },
      });
    }

    await tx.timeEntry.updateMany({
      where: { id: { in: entries.map((entry) => entry.id) } },
      data: { documentId: invoice.id },
    });

    await recalcDocument(tx, invoice.id);
    return invoice.id;
  });

  revalidatePath("/temps");
  revalidatePath("/factures");
  revalidatePath(`/missions/${missionId}`);
  redirectWithFlash(
    `/documents/${invoiceId}/modifier`,
    `Facture créée à partir de ${entries.length} saisie(s).`,
  );
}
