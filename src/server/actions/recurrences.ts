"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseDateInput, today } from "@/lib/dates";
import { redirectWithFlash } from "../flash";
import { generateOne } from "../recurrence-engine";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export async function createRecurrence(formData: FormData): Promise<void> {
  await requireSession();
  const sourceDocumentId = String(formData.get("sourceDocumentId") ?? "");
  if (!sourceDocumentId) return;

  const source = await prisma.document.findUnique({ where: { id: sourceDocumentId } });
  if (!source) redirectWithFlash("/recurrences", "Document introuvable.", "error");

  const nextRunDate = parseDateInput(text(formData, "nextRunDate")) ?? today();
  const limitRaw = text(formData, "occurrencesLimit");
  const limit = limitRaw ? Math.max(1, Math.round(Number(limitRaw))) : null;

  const recurrence = await prisma.recurrence.create({
    data: {
      name: text(formData, "name") ?? source.subject ?? "Abonnement",
      frequency: String(formData.get("frequency") ?? "MONTHLY"),
      interval: Math.max(1, Math.round(Number(formData.get("interval") ?? 1) || 1)),
      nextRunDate,
      endDate: parseDateInput(text(formData, "endDate")),
      occurrencesLimit: Number.isFinite(limit) ? limit : null,
      sourceDocumentId,
      active: true,
    },
  });

  revalidatePath("/recurrences");
  revalidatePath(`/documents/${sourceDocumentId}`);
  redirectWithFlash(`/recurrences`, `Abonnement « ${recurrence.name} » créé.`);
}

export async function updateRecurrence(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const existing = await prisma.recurrence.findUnique({ where: { id } });
  if (!existing) redirectWithFlash("/recurrences", "Abonnement introuvable.", "error");

  const limitRaw = text(formData, "occurrencesLimit");
  await prisma.recurrence.update({
    where: { id },
    data: {
      name: text(formData, "name") ?? existing.name,
      frequency: String(formData.get("frequency") ?? existing.frequency),
      interval: Math.max(1, Math.round(Number(formData.get("interval") ?? 1) || 1)),
      nextRunDate: parseDateInput(text(formData, "nextRunDate")) ?? existing.nextRunDate,
      endDate: parseDateInput(text(formData, "endDate")),
      occurrencesLimit: limitRaw ? Math.max(1, Math.round(Number(limitRaw))) : null,
    },
  });

  revalidatePath("/recurrences");
  redirectWithFlash("/recurrences", "Abonnement mis à jour.");
}

export async function toggleRecurrence(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const recurrence = await prisma.recurrence.findUnique({ where: { id } });
  if (!recurrence) redirectWithFlash("/recurrences", "Abonnement introuvable.", "error");

  await prisma.recurrence.update({ where: { id }, data: { active: !recurrence.active } });

  revalidatePath("/recurrences");
  redirectWithFlash(
    "/recurrences",
    recurrence.active ? "Abonnement mis en pause." : "Abonnement réactivé.",
  );
}

export async function deleteRecurrence(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const recurrence = await prisma.recurrence.findUnique({
    where: { id },
    include: { _count: { select: { generated: true } } },
  });
  if (!recurrence) redirectWithFlash("/recurrences", "Abonnement introuvable.", "error");

  await prisma.recurrence.delete({ where: { id } });

  revalidatePath("/recurrences");
  redirectWithFlash(
    "/recurrences",
    `Abonnement « ${recurrence.name} » supprimé. Les ${recurrence._count.generated} facture(s) déjà générées sont conservées.`,
  );
}

/** Génère la prochaine facture, même si l'échéance n'est pas encore atteinte. */
export async function runRecurrenceNow(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const created = await prisma.$transaction((tx) => generateOne(tx, id));
  if (!created) {
    redirectWithFlash(
      "/recurrences",
      "Abonnement sans document source : impossible de générer.",
      "error",
    );
  }

  revalidatePath("/recurrences");
  revalidatePath("/factures");
  redirectWithFlash(`/documents/${created}/modifier`, "Facture générée en brouillon.");
}

/** Rattrape toutes les échéances arrivées à terme. */
export async function runDueRecurrences(): Promise<void> {
  await requireSession();
  const now = today();
  const due = await prisma.recurrence.findMany({
    where: { active: true, nextRunDate: { lte: now }, sourceDocumentId: { not: null } },
    select: { id: true },
  });

  let generated = 0;
  for (const recurrence of due) {
    // Une échéance peut avoir plusieurs occurrences de retard : on boucle,
    // avec une borne de sécurité pour ne jamais tourner indéfiniment.
    for (let guard = 0; guard < 24; guard++) {
      const current = await prisma.recurrence.findUnique({ where: { id: recurrence.id } });
      if (!current?.active || current.nextRunDate > now) break;
      const created = await prisma.$transaction((tx) => generateOne(tx, recurrence.id));
      if (!created) break;
      generated++;
    }
  }

  revalidatePath("/recurrences");
  revalidatePath("/factures");
  redirectWithFlash(
    "/recurrences",
    generated > 0
      ? `${generated} facture(s) générée(s) en brouillon.`
      : "Aucune échéance à générer aujourd'hui.",
    generated > 0 ? "success" : "info",
  );
}
