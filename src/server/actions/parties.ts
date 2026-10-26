"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseRateToBp } from "@/lib/money";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function integer(formData: FormData, key: string): number | null {
  const value = text(formData, key);
  if (value === null) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function listPath(kind: string): string {
  if (kind === "AGENCY") return "/agences";
  if (kind === "SUBCONTRACTOR") return "/sous-traitants";
  return "/clients";
}

function partyScalars(formData: FormData) {
  return {
    kind: String(formData.get("kind") ?? "CLIENT"),
    type: String(formData.get("type") ?? "COMPANY"),
    name: String(formData.get("name") ?? "").trim(),
    legalName: text(formData, "legalName"),
    legalForm: text(formData, "legalForm"),
    addressLine1: text(formData, "addressLine1"),
    addressLine2: text(formData, "addressLine2"),
    postalCode: text(formData, "postalCode"),
    city: text(formData, "city"),
    region: text(formData, "region"),
    // Jamais de pays par défaut sur un tiers : ce serait affirmer sur un
    // document légal une domiciliation que l'utilisateur n'a pas saisie.
    // Une valeur vide n'est simplement pas imprimée.
    country: text(formData, "country") ?? "",
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    website: text(formData, "website"),
    currency: String(formData.get("currency") ?? "MGA"),
    vatRate: text(formData, "vatRate") ? parseRateToBp(text(formData, "vatRate")) : null,
    paymentTermsDays: integer(formData, "paymentTermsDays"),
    commissionRate: parseRateToBp(text(formData, "commissionRate") ?? "0"),
    withholdingRate: parseRateToBp(text(formData, "withholdingRate") ?? "0"),
    notes: text(formData, "notes"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

/** Les identifiants légaux arrivent sous forme de deux listes parallèles. */
async function syncIdentifiers(partyId: string, formData: FormData) {
  const labels = formData.getAll("identifierLabel").map((v) => String(v).trim());
  const values = formData.getAll("identifierValue").map((v) => String(v).trim());

  // Un identifiant sans numéro n'apprend rien sur un tiers : on ne conserve
  // que les lignes réellement renseignées (contrairement à la fiche de
  // l'entreprise, où les libellés vides servent de pense-bête).
  const rows = labels
    .map((label, index) => ({ label, value: values[index] ?? "" }))
    .filter((row) => row.label !== "" && row.value !== "");

  await prisma.partyIdentifier.deleteMany({ where: { partyId } });
  for (const [index, row] of rows.entries()) {
    await prisma.partyIdentifier.create({
      data: { partyId, label: row.label, value: row.value, position: index },
    });
  }
}

export async function createParty(formData: FormData): Promise<void> {
  await requireSession();
  const data = partyScalars(formData);
  if (!data.name) {
    redirectWithFlash(listPath(data.kind), "Le nom est obligatoire.", "error");
  }

  const party = await prisma.party.create({ data });
  await syncIdentifiers(party.id, formData);

  revalidatePath(listPath(data.kind));
  redirectWithFlash(
    `${listPath(data.kind)}/${party.id}`,
    `${data.kind === "AGENCY" ? "Agence" : "Client"} « ${data.name} » créé.`,
  );
}

export async function updateParty(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const data = partyScalars(formData);
  if (!data.name) {
    redirectWithFlash(`${listPath(data.kind)}/${id}`, "Le nom est obligatoire.", "error");
  }

  const existing = await prisma.party.findUnique({ where: { id } });
  if (!existing) redirectWithFlash(listPath(data.kind), "Fiche introuvable.", "error");

  await prisma.party.update({ where: { id }, data });
  await syncIdentifiers(id, formData);

  revalidatePath(listPath(data.kind));
  revalidatePath(`${listPath(data.kind)}/${id}`);
  redirectWithFlash(`${listPath(data.kind)}/${id}`, "Fiche enregistrée.");
}

export async function deleteParty(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const party = await prisma.party.findUnique({
    where: { id },
    include: {
      _count: {
        select: { documentsBilled: true, documentsEndClient: true, missionsAsClient: true },
      },
    },
  });
  if (!party) redirectWithFlash("/clients", "Fiche introuvable.", "error");

  const path = listPath(party.kind);
  const linked =
    party._count.documentsBilled +
    party._count.documentsEndClient +
    party._count.missionsAsClient;

  // Une fiche rattachée à des documents ne peut pas disparaître sans casser
  // l'historique comptable : on la désactive à la place.
  if (linked > 0) {
    await prisma.party.update({ where: { id }, data: { isActive: false } });
    revalidatePath(path);
    redirectWithFlash(
      path,
      `« ${party.name} » est rattaché à ${linked} élément(s) : la fiche a été archivée plutôt que supprimée.`,
      "info",
    );
  }

  await prisma.party.delete({ where: { id } });
  revalidatePath(path);
  redirectWithFlash(path, `« ${party.name} » supprimé.`);
}

export async function upsertContact(formData: FormData): Promise<void> {
  await requireSession();
  const partyId = String(formData.get("partyId") ?? "");
  const id = text(formData, "id");
  if (!partyId) return;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) redirectWithFlash("/clients", "Fiche introuvable.", "error");

  const data = {
    partyId,
    firstName: text(formData, "firstName"),
    lastName: text(formData, "lastName"),
    role: text(formData, "role"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    isPrimary: formData.get("isPrimary") === "on",
    notes: text(formData, "notes"),
  };

  if (!data.firstName && !data.lastName) {
    redirectWithFlash(
      `${listPath(party.kind)}/${partyId}`,
      "Indiquez au moins un nom ou un prénom.",
      "error",
    );
  }

  if (data.isPrimary) {
    await prisma.contact.updateMany({ where: { partyId }, data: { isPrimary: false } });
  }

  if (id) {
    await prisma.contact.update({ where: { id }, data });
  } else {
    await prisma.contact.create({ data });
  }

  revalidatePath(`${listPath(party.kind)}/${partyId}`);
  redirectWithFlash(`${listPath(party.kind)}/${partyId}`, "Contact enregistré.");
}

export async function deleteContact(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const contact = await prisma.contact.findUnique({
    where: { id },
    include: { party: { select: { id: true, kind: true } } },
  });
  if (!contact) redirectWithFlash("/clients", "Contact introuvable.", "error");

  await prisma.contact.delete({ where: { id } });

  const path = `${listPath(contact.party.kind)}/${contact.party.id}`;
  revalidatePath(path);
  redirectWithFlash(path, "Contact supprimé.");
}
