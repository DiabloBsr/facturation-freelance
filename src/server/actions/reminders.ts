"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { daysLate, parseDateInput } from "@/lib/dates";
import { FALLBACK_CURRENCY } from "@/lib/money";
import { reminderBody, reminderSubject } from "@/lib/reminder-template";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Prépare une relance : le texte est pré-rédigé selon le niveau. */
export async function createReminder(formData: FormData): Promise<void> {
  await requireSession();
  const documentId = String(formData.get("documentId") ?? "");
  if (!documentId) return;

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      billTo: true,
      contact: true,
      reminders: { orderBy: { level: "desc" }, take: 1 },
    },
  });
  if (!document) redirectWithFlash("/relances", "Document introuvable.", "error");

  const requested = Number(formData.get("level") ?? 0);
  const level =
    Number.isFinite(requested) && requested > 0
      ? Math.min(Math.round(requested), 4)
      : Math.min((document.reminders[0]?.level ?? 0) + 1, 4);

  const [company, currency] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.currency.findUnique({ where: { code: document.currency } }),
  ]);

  const contactName = document.contact
    ? [document.contact.firstName, document.contact.lastName].filter(Boolean).join(" ") || null
    : null;

  const ctx = {
    level,
    number: document.number,
    subject: document.subject,
    clientName: document.billTo.name,
    contactName,
    issueDate: document.issueDate,
    dueDate: document.dueDate,
    balanceDue: document.balanceDue,
    currency: currency
      ? {
          code: currency.code,
          symbol: currency.symbol,
          decimals: currency.decimals,
          symbolAfter: currency.symbolAfter,
        }
      : FALLBACK_CURRENCY,
    companyName: company?.legalName ?? "",
    companyEmail: company?.email ?? null,
    companyPhone: company?.phone ?? company?.mobile ?? null,
    daysLate: daysLate(document.dueDate),
    latePenaltyRate: company?.latePenaltyRate ?? 0,
  };

  await prisma.reminder.create({
    data: {
      documentId,
      level,
      channel: String(formData.get("channel") ?? "EMAIL"),
      plannedFor: parseDateInput(text(formData, "plannedFor")),
      subject: reminderSubject(ctx),
      body: reminderBody(ctx),
    },
  });

  revalidatePath(`/documents/${documentId}`);
  revalidatePath("/relances");
  redirectWithFlash(`/documents/${documentId}`, `Relance de niveau ${level} préparée.`);
}

export async function updateReminder(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) redirectWithFlash("/relances", "Relance introuvable.", "error");

  await prisma.reminder.update({
    where: { id },
    data: {
      subject: text(formData, "subject"),
      body: text(formData, "body"),
      channel: String(formData.get("channel") ?? reminder.channel),
      notes: text(formData, "notes"),
    },
  });

  revalidatePath(`/documents/${reminder.documentId}`);
  revalidatePath("/relances");
  redirectWithFlash(`/documents/${reminder.documentId}`, "Relance mise à jour.");
}

export async function markReminderSent(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) redirectWithFlash("/relances", "Relance introuvable.", "error");

  if (reminder.sentAt) {
    redirectWithFlash(
      `/documents/${reminder.documentId}`,
      "Cette relance est déjà marquée comme envoyée.",
      "info",
    );
  }

  await prisma.reminder.update({ where: { id }, data: { sentAt: new Date() } });

  revalidatePath(`/documents/${reminder.documentId}`);
  revalidatePath("/relances");
  redirectWithFlash(`/documents/${reminder.documentId}`, "Relance marquée comme envoyée.");
}

export async function deleteReminder(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const reminder = await prisma.reminder.findUnique({ where: { id } });
  if (!reminder) redirectWithFlash("/relances", "Relance introuvable.", "error");

  await prisma.reminder.delete({ where: { id } });

  revalidatePath(`/documents/${reminder.documentId}`);
  revalidatePath("/relances");
  redirectWithFlash(`/documents/${reminder.documentId}`, "Relance supprimée.");
}
