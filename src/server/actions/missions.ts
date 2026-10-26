"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero, parseRateToBp } from "@/lib/money";
import { parseDateInput } from "@/lib/dates";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function missionScalars(formData: FormData) {
  const agencyId = text(formData, "agencyId");
  return {
    title: String(formData.get("title") ?? "").trim(),
    reference: text(formData, "reference"),
    description: text(formData, "description"),
    clientId: String(formData.get("clientId") ?? ""),
    agencyId,
    // Sans agence rattachée, la facture part forcément chez le client.
    billTo: agencyId ? String(formData.get("billTo") ?? "CLIENT") : "CLIENT",
    rateType: String(formData.get("rateType") ?? "DAILY"),
    rate: parseAmountOrZero(text(formData, "rate")),
    currency: String(formData.get("currency") ?? "MGA"),
    vatRate: text(formData, "vatRate") ? parseRateToBp(text(formData, "vatRate")) : null,
    budget: text(formData, "budget") ? parseAmountOrZero(text(formData, "budget")) : null,
    purchaseOrder: text(formData, "purchaseOrder"),
    startDate: parseDateInput(text(formData, "startDate")),
    endDate: parseDateInput(text(formData, "endDate")),
    status: String(formData.get("status") ?? "ACTIVE"),
    notes: text(formData, "notes"),
  };
}

export async function createMission(formData: FormData): Promise<void> {
  await requireSession();
  const data = missionScalars(formData);
  if (!data.title) redirectWithFlash("/missions", "L'intitulé est obligatoire.", "error");
  if (!data.clientId) redirectWithFlash("/missions", "Sélectionnez un client.", "error");

  const mission = await prisma.mission.create({ data });

  revalidatePath("/missions");
  redirectWithFlash(`/missions/${mission.id}`, `Mission « ${data.title} » créée.`);
}

export async function updateMission(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const data = missionScalars(formData);
  if (!data.title) redirectWithFlash(`/missions/${id}`, "L'intitulé est obligatoire.", "error");
  if (!data.clientId) redirectWithFlash(`/missions/${id}`, "Sélectionnez un client.", "error");

  await prisma.mission.update({ where: { id }, data });

  revalidatePath("/missions");
  revalidatePath(`/missions/${id}`);
  redirectWithFlash(`/missions/${id}`, "Mission enregistrée.");
}

export async function deleteMission(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const mission = await prisma.mission.findUnique({
    where: { id },
    include: { _count: { select: { documents: true, timeEntries: true } } },
  });
  if (!mission) redirectWithFlash("/missions", "Mission introuvable.", "error");

  if (mission._count.documents > 0) {
    // Des documents s'y rattachent : on archive au lieu de rompre l'historique.
    await prisma.mission.update({ where: { id }, data: { status: "ARCHIVED" } });
    revalidatePath("/missions");
    redirectWithFlash(
      "/missions",
      `« ${mission.title} » est liée à ${mission._count.documents} document(s) : la mission a été archivée.`,
      "info",
    );
  }

  await prisma.mission.delete({ where: { id } });

  revalidatePath("/missions");
  revalidatePath("/temps");
  redirectWithFlash(
    "/missions",
    `Mission « ${mission.title} » supprimée${
      mission._count.timeEntries > 0 ? ` avec ses ${mission._count.timeEntries} saisie(s) de temps` : ""
    }.`,
  );
}
