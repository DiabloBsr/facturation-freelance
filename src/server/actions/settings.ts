"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { parseAmountOrZero, parseRateToBp } from "@/lib/money";
import { findCurrencySeed } from "@/lib/currencies";
import { redirectWithFlash } from "../flash";
import { requireSession } from "../session";

const MAX_IMAGE_BYTES = 1_500_000;

function text(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function integer(formData: FormData, key: string, fallback = 0): number {
  const value = text(formData, key);
  if (value === null) return fallback;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

function checkbox(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/**
 * Convertit une image envoyée par le formulaire en data URI.
 * Retourne `undefined` si aucun fichier n'a été choisi (champ inchangé).
 */
async function readImage(formData: FormData, key: string): Promise<string | null | undefined> {
  if (checkbox(formData, `${key}Remove`)) return null;

  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) return undefined;

  if (!file.type.startsWith("image/")) {
    throw new Error("Le fichier doit être une image (PNG, JPEG ou WebP).");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image trop lourde : 1,5 Mo maximum.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type};base64,${buffer.toString("base64")}`;
}

export async function updateCompany(formData: FormData): Promise<void> {
  await requireSession();
  let logoData: string | null | undefined;
  let stampData: string | null | undefined;
  let signatureData: string | null | undefined;

  try {
    logoData = await readImage(formData, "logo");
    stampData = await readImage(formData, "stamp");
    signatureData = await readImage(formData, "signature");
  } catch (error) {
    redirectWithFlash(
      "/parametres",
      error instanceof Error ? error.message : "Image invalide.",
      "error",
    );
  }

  const legalName = String(formData.get("legalName") ?? "").trim();
  if (!legalName) {
    redirectWithFlash("/parametres", "La raison sociale est obligatoire.", "error");
  }

  await prisma.company.update({
    where: { id: 1 },
    data: {
      legalName,
      tradeName: text(formData, "tradeName"),
      legalForm: text(formData, "legalForm"),
      activity: text(formData, "activity"),
      slogan: text(formData, "slogan"),
      addressLine1: text(formData, "addressLine1"),
      addressLine2: text(formData, "addressLine2"),
      postalCode: text(formData, "postalCode"),
      city: text(formData, "city"),
      region: text(formData, "region"),
      // Vider le champ doit vider le champ, pas restaurer une valeur d'usine.
      country: text(formData, "country") ?? "",
      phone: text(formData, "phone"),
      mobile: text(formData, "mobile"),
      email: text(formData, "email"),
      website: text(formData, "website"),
      ...(logoData !== undefined ? { logoData } : {}),
      ...(stampData !== undefined ? { stampData } : {}),
      ...(signatureData !== undefined ? { signatureData } : {}),
      signatureName: text(formData, "signatureName"),
      signatureRole: text(formData, "signatureRole"),
    },
  });

  revalidatePath("/parametres");
  revalidatePath("/", "layout");
  redirectWithFlash("/parametres", "Identité de l'entreprise enregistrée.");
}

export async function updateBilling(formData: FormData): Promise<void> {
  await requireSession();
  const baseCurrency = String(formData.get("baseCurrency") ?? "MGA");

  // Changer de devise de base rebase tous les cours (taux des devises, cours
  // figés sur les documents et encaissements) : ils sont exprimés « vers la
  // base », les garder tels quels fausserait tous les agrégats.
  const company = await prisma.company.findUnique({ where: { id: 1 } });
  if (company && baseCurrency !== company.baseCurrency) {
    const pivot = (
      await prisma.currency.findUnique({ where: { code: baseCurrency } })
    )?.rateToBase;
    if (pivot && pivot > 0) {
      await prisma.$transaction(async (tx) => {
        const currencies = await tx.currency.findMany();
        for (const item of currencies) {
          await tx.currency.update({
            where: { code: item.code },
            data: { rateToBase: item.code === baseCurrency ? 1 : item.rateToBase / pivot },
          });
        }
        await tx.document.updateMany({ data: { exchangeRate: { divide: pivot } } });
        await tx.payment.updateMany({ data: { rateToBase: { divide: pivot } } });
      });
    }
  }

  await prisma.company.update({
    where: { id: 1 },
    data: {
      baseCurrency,
      defaultCurrency: String(formData.get("defaultCurrency") ?? baseCurrency),
      vatRegime: String(formData.get("vatRegime") ?? "EXEMPT"),
      defaultVatRate: parseRateToBp(text(formData, "defaultVatRate") ?? "0"),
      vatExemptionText: text(formData, "vatExemptionText"),
      withholdingLabel: text(formData, "withholdingLabel"),
      withholdingRate: parseRateToBp(text(formData, "withholdingRate") ?? "0"),
      paymentTermsDays: integer(formData, "paymentTermsDays", 30),
      latePenaltyRate: parseRateToBp(text(formData, "latePenaltyRate") ?? "0"),
      recoveryFee: parseAmountOrZero(text(formData, "recoveryFee")),
      discountText: text(formData, "discountText"),
    },
  });

  revalidatePath("/parametres/facturation");
  redirectWithFlash("/parametres/facturation", "Règles de facturation enregistrées.");
}

export async function updateAppearance(formData: FormData): Promise<void> {
  await requireSession();
  await prisma.company.update({
    where: { id: 1 },
    data: {
      defaultTemplate: String(formData.get("defaultTemplate") ?? "classique"),
      accentColor: String(formData.get("accentColor") ?? "#1F4D7A"),
      defaultTerms: text(formData, "defaultTerms"),
      defaultFooter: text(formData, "defaultFooter"),
      showAmountInWords: checkbox(formData, "showAmountInWords"),
      showStampOnPdf: checkbox(formData, "showStampOnPdf"),
      showSignatureOnPdf: checkbox(formData, "showSignatureOnPdf"),
    },
  });

  revalidatePath("/parametres/modeles");
  redirectWithFlash("/parametres/modeles", "Modèle et mentions enregistrés.");
}

/**
 * Retient la marque choisie dans la galerie. Elle sert de logo tant qu'aucune
 * image n'a été téléversée ; « aucune » la retire.
 */
export async function chooseLogoMark(formData: FormData): Promise<void> {
  await requireSession();
  const mark = String(formData.get("mark") ?? "").trim();
  // Certaines marques portent leur propre couleur : on ne l'applique à toute
  // la facture que si l'utilisateur le demande explicitement.
  const applyColor = checkbox(formData, "applyColor");
  const palette = text(formData, "palette");

  const current = await prisma.appSetting.findUnique({ where: { key: "logoMark" } });
  const sameMark = (current?.value ?? "") === mark;

  if (sameMark && !applyColor) {
    redirectWithFlash("/galerie", "Ce logo est déjà celui de vos documents.", "info");
  }

  await prisma.appSetting.upsert({
    where: { key: "logoMark" },
    update: { value: mark },
    create: { key: "logoMark", value: mark },
  });

  if (applyColor && palette) {
    await prisma.company.update({ where: { id: 1 }, data: { accentColor: palette } });
  }

  revalidatePath("/galerie");
  revalidatePath("/parametres");
  revalidatePath("/parametres/modeles");

  const message = !mark
    ? "Logo retiré des documents."
    : applyColor && palette
      ? "Logo et couleur appliqués à vos documents."
      : "Logo appliqué à vos documents.";
  redirectWithFlash("/galerie", message);
}

// ---------------------------------------------------------------------------
// Identifiants légaux (NIF, STAT, RCS…)
// ---------------------------------------------------------------------------

export async function saveIdentifiers(formData: FormData): Promise<void> {
  await requireSession();
  const ids = formData.getAll("identifierId").map((v) => String(v));
  const labels = formData.getAll("identifierLabel").map((v) => String(v).trim());
  const values = formData.getAll("identifierValue").map((v) => String(v).trim());
  const shown = formData.getAll("identifierShow").map((v) => String(v));

  const rows = labels
    .map((label, index) => ({
      id: ids[index] ?? "",
      label,
      value: values[index] ?? "",
      showOnPdf: shown[index] !== "0",
      position: index,
    }))
    .filter((row) => row.label !== "");

  await prisma.$transaction(async (tx) => {
    await tx.legalIdentifier.deleteMany({});
    for (const row of rows) {
      await tx.legalIdentifier.create({
        data: {
          label: row.label,
          value: row.value,
          showOnPdf: row.showOnPdf,
          position: row.position,
        },
      });
    }
  });

  revalidatePath("/parametres");
  redirectWithFlash("/parametres", "Identifiants légaux enregistrés.");
}

// ---------------------------------------------------------------------------
// Coordonnées de paiement
// ---------------------------------------------------------------------------

export async function upsertBankAccount(formData: FormData): Promise<void> {
  await requireSession();
  const id = text(formData, "id");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) {
    redirectWithFlash("/parametres/paiements", "Donnez un intitulé au compte.", "error");
  }

  const isDefault = checkbox(formData, "isDefault");
  const data = {
    kind: String(formData.get("kind") ?? "BANK"),
    label,
    holder: text(formData, "holder"),
    bankName: text(formData, "bankName"),
    branchName: text(formData, "branchName"),
    bankCode: text(formData, "bankCode"),
    branchCode: text(formData, "branchCode"),
    accountNumber: text(formData, "accountNumber"),
    ribKey: text(formData, "ribKey"),
    iban: text(formData, "iban"),
    bic: text(formData, "bic"),
    provider: text(formData, "provider"),
    phoneNumber: text(formData, "phoneNumber"),
    accountRef: text(formData, "accountRef"),
    currency: String(formData.get("currency") ?? "MGA"),
    isDefault,
    showOnPdf: checkbox(formData, "showOnPdf"),
    notes: text(formData, "notes"),
  };

  await prisma.$transaction(async (tx) => {
    // Un seul compte par défaut à la fois.
    if (isDefault) {
      await tx.bankAccount.updateMany({ data: { isDefault: false } });
    }
    if (id) {
      await tx.bankAccount.update({ where: { id }, data });
    } else {
      const count = await tx.bankAccount.count();
      await tx.bankAccount.create({ data: { ...data, position: count } });
    }
  });

  revalidatePath("/parametres/paiements");
  redirectWithFlash("/parametres/paiements", "Coordonnées de paiement enregistrées.");
}

export async function deleteBankAccount(formData: FormData): Promise<void> {
  await requireSession();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const account = await prisma.bankAccount.findUnique({
    where: { id },
    include: { _count: { select: { documents: true, payments: true } } },
  });
  if (!account) {
    redirectWithFlash("/parametres/paiements", "Compte introuvable.", "error");
  }

  await prisma.bankAccount.delete({ where: { id } });

  revalidatePath("/parametres/paiements");
  redirectWithFlash(
    "/parametres/paiements",
    `« ${account.label} » supprimé.${
      account._count.documents > 0
        ? " Les documents concernés n'affichent plus ces coordonnées."
        : ""
    }`,
  );
}

// ---------------------------------------------------------------------------
// Devises
// ---------------------------------------------------------------------------

export async function saveCurrencies(formData: FormData): Promise<void> {
  await requireSession();
  const codes = formData.getAll("currencyCode").map((v) => String(v));
  const rates = formData.getAll("currencyRate").map((v) => String(v));
  const actives = new Set(formData.getAll("currencyActive").map((v) => String(v)));

  await prisma.$transaction(async (tx) => {
    for (const [index, code] of codes.entries()) {
      const rate = Number(String(rates[index] ?? "1").replace(",", "."));
      await tx.currency.update({
        where: { code },
        data: {
          rateToBase: Number.isFinite(rate) && rate > 0 ? rate : 1,
          isActive: actives.has(code),
        },
      });
    }
  });

  revalidatePath("/parametres/devises");
  redirectWithFlash("/parametres/devises", "Devises mises à jour.");
}

export async function addCurrency(formData: FormData): Promise<void> {
  await requireSession();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (code.length !== 3) {
    redirectWithFlash("/parametres/devises", "Le code devise fait 3 lettres (ex. GBP).", "error");
  }

  const existing = await prisma.currency.findUnique({ where: { code } });
  if (existing) {
    if (existing.isActive) {
      redirectWithFlash("/parametres/devises", `${code} est déjà activée.`, "info");
    }
    await prisma.currency.update({ where: { code }, data: { isActive: true } });
    revalidatePath("/parametres/devises");
    redirectWithFlash("/parametres/devises", `${code} activée.`);
  }

  const seed = findCurrencySeed(code);
  const count = await prisma.currency.count();

  await prisma.currency.create({
    data: {
      code,
      name: text(formData, "name") ?? seed?.name ?? code,
      symbol: text(formData, "symbol") ?? seed?.symbol ?? code,
      decimals: seed?.decimals ?? integer(formData, "decimals", 2),
      symbolAfter: seed?.symbolAfter ?? true,
      rateToBase: 1,
      isActive: true,
      position: count,
    },
  });

  revalidatePath("/parametres/devises");
  redirectWithFlash("/parametres/devises", `Devise ${code} ajoutée.`);
}

// ---------------------------------------------------------------------------
// Taux de TVA et numérotation
// ---------------------------------------------------------------------------

export async function saveVatRates(formData: FormData): Promise<void> {
  await requireSession();
  const ids = formData.getAll("vatId").map((v) => String(v));
  const labels = formData.getAll("vatLabel").map((v) => String(v).trim());
  const rates = formData.getAll("vatRate").map((v) => String(v));
  const defaultId = String(formData.get("defaultVatId") ?? "");

  const rows = labels
    .map((label, index) => ({
      id: ids[index] ?? "",
      label,
      rate: parseRateToBp(rates[index] ?? "0"),
      position: index,
    }))
    .filter((row) => row.label !== "");

  await prisma.$transaction(async (tx) => {
    await tx.vatRate.deleteMany({});
    for (const row of rows) {
      await tx.vatRate.create({
        data: {
          id: row.id || undefined,
          label: row.label,
          rate: row.rate,
          position: row.position,
          isDefault: row.id !== "" && row.id === defaultId,
        },
      });
    }
  });

  revalidatePath("/parametres/facturation");
  redirectWithFlash("/parametres/facturation", "Taux de TVA enregistrés.");
}

export async function saveSequences(formData: FormData): Promise<void> {
  await requireSession();
  const keys = formData.getAll("sequenceKey").map((v) => String(v));
  const prefixes = formData.getAll("sequencePrefix").map((v) => String(v).trim());
  const patterns = formData.getAll("sequencePattern").map((v) => String(v).trim());
  const paddings = formData.getAll("sequencePadding").map((v) => String(v));
  const nextValues = formData.getAll("sequenceNext").map((v) => String(v));
  const policies = formData.getAll("sequencePolicy").map((v) => String(v));

  await prisma.$transaction(async (tx) => {
    for (const [index, key] of keys.entries()) {
      const nextValue = Math.max(1, Math.round(Number(nextValues[index] ?? "1") || 1));
      const padding = Math.min(8, Math.max(1, Math.round(Number(paddings[index] ?? "4") || 4)));
      await tx.numberSequence.update({
        where: { key },
        data: {
          prefix: prefixes[index] || key.slice(0, 3),
          pattern: patterns[index] || "{PREFIX}-{YYYY}-{SEQ}",
          padding,
          nextValue,
          resetPolicy: policies[index] || "YEARLY",
        },
      });
    }
  });

  revalidatePath("/parametres/numerotation");
  redirectWithFlash("/parametres/numerotation", "Numérotation enregistrée.");
}
