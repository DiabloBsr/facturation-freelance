/**
 * Modèle de vue du PDF.
 *
 * Toute la logique (calculs, mentions légales, formatage) est résolue ici :
 * les gabarits ne font plus que de la mise en page. Ajouter un modèle ne
 * demande donc aucune connaissance du domaine.
 */

import type { Company, LegalIdentifier } from "@prisma/client";
import { amountToFrenchWords } from "@/lib/amount-in-words";
import { computeDocument, type VatBreakdownRow } from "@/lib/compute";
import { formatDate } from "@/lib/dates";
import {
  BANK_ACCOUNT_KIND_LABELS,
  DOCUMENT_TYPE_PDF_TITLES,
  isBillableLine,
  type BankAccountKind,
  type DocumentType,
} from "@/lib/enums";
import {
  formatMoney,
  formatQuantity,
  formatRate,
  type CurrencyFormat,
} from "@/lib/money";
import type { DocumentDetail } from "@/server/documents";

export type PdfParty = {
  name: string;
  legalName: string | null;
  /** Nom mis en avant : celui sous lequel le tiers est connu. */
  displayName: string;
  /**
   * Raison sociale, imprimée en second lorsqu'elle diffère du nom commercial.
   * Elle reste obligatoire sur la facture, mais ne doit pas effacer le nom
   * que l'on reconnaît.
   */
  legalLine: string | null;
  addressLines: string[];
  email: string | null;
  phone: string | null;
  identifiers: { label: string; value: string }[];
};

export type PdfLine = {
  kind: string;
  label: string;
  description: string | null;
  quantity: string;
  unit: string;
  unitPrice: string;
  discount: string | null;
  vatRate: string;
  total: string;
};

export type PdfTotalRow = { label: string; value: string; emphasis?: boolean };

export type PdfViewModel = {
  title: string;
  number: string;
  isDraft: boolean;
  accent: string;

  dates: { label: string; value: string }[];

  company: {
    name: string;
    tradeName: string | null;
    legalForm: string | null;
    activity: string | null;
    slogan: string | null;
    /**
     * Courte phrase imprimée sous le nom, si et seulement si l'utilisateur en a
     * saisi une. L'activité, elle, est une donnée administrative : elle ne sert
     * pas d'accroche par défaut.
     */
    tagline: string | null;
    addressLines: string[];
    phone: string | null;
    mobile: string | null;
    email: string | null;
    website: string | null;
    logoData: string | null;
    /** Marque vectorielle choisie dans la galerie, à défaut de logo téléversé. */
    logoMark: string | null;
    stampData: string | null;
    signatureData: string | null;
    signatureName: string | null;
    signatureRole: string | null;
    identifiers: { label: string; value: string }[];
  };

  billTo: PdfParty;
  endClient: PdfParty | null;
  contactName: string | null;

  subject: string | null;
  purchaseOrder: string | null;
  missionTitle: string | null;

  showVatColumn: boolean;
  lines: PdfLine[];
  vatBreakdown: (VatBreakdownRow & { netLabel: string; vatLabel: string; rateLabel: string })[];

  totals: PdfTotalRow[];
  grandTotalLabel: string;
  grandTotalValue: string;

  amountInWords: string | null;
  paidSummary: { label: string; value: string }[] | null;

  bank: {
    kind: string;
    kindLabel: string;
    label: string;
    rows: { label: string; value: string }[];
  } | null;

  notes: string | null;
  terms: string | null;
  footer: string | null;
  legalNotes: string[];
};

function addressLines(source: {
  addressLine1?: string | null;
  addressLine2?: string | null;
  postalCode?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string[] {
  const cityLine = [source.postalCode, source.city].filter(Boolean).join(" ");
  return [
    source.addressLine1,
    source.addressLine2,
    cityLine || null,
    source.region,
    source.country,
  ].filter((value): value is string => Boolean(value && value.trim()));
}

function partyView(
  party: {
    name: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    addressLine1: string | null;
    addressLine2: string | null;
    postalCode: string | null;
    city: string | null;
    region: string | null;
    country: string | null;
    identifiers?: { label: string; value: string; showOnPdf: boolean }[];
  } | null,
): PdfParty | null {
  if (!party) return null;

  const legal = party.legalName?.trim() || null;
  const display = party.name.trim();

  return {
    name: party.name,
    legalName: party.legalName,
    displayName: display,
    legalLine: legal && legal !== display ? legal : null,
    addressLines: addressLines(party),
    email: party.email,
    phone: party.phone,
    identifiers: (party.identifiers ?? [])
      .filter((identifier) => identifier.showOnPdf && identifier.value.trim() !== "")
      .map((identifier) => ({ label: identifier.label, value: identifier.value })),
  };
}

/** Coordonnées de paiement, présentées selon leur nature. */
function bankView(account: DocumentDetail["bankAccount"]) {
  if (!account) return null;

  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | null) => {
    if (value && value.trim() !== "") rows.push({ label, value });
  };

  if (account.kind === "MOBILE_MONEY") {
    push("Opérateur", account.provider);
    push("Numéro", account.phoneNumber);
    push("Titulaire", account.holder);
  } else if (account.kind === "PAYPAL" || account.kind === "WISE") {
    push("Compte", account.accountRef);
    push("Titulaire", account.holder);
  } else {
    push("Banque", account.bankName);
    push("Agence", account.branchName);
    push("Titulaire", account.holder);

    // RIB au format malgache : code banque, code guichet, compte, clé.
    const rib = [account.bankCode, account.branchCode, account.accountNumber, account.ribKey]
      .filter(Boolean)
      .join(" ");
    if (rib) push("RIB", rib);

    push("IBAN", account.iban);
    push("Code SWIFT / BIC", account.bic);
  }

  push("Devise", account.currency);

  return {
    kind: account.kind,
    kindLabel: BANK_ACCOUNT_KIND_LABELS[account.kind as BankAccountKind] ?? "Paiement",
    label: account.label,
    rows,
  };
}

export function buildViewModel(params: {
  document: DocumentDetail;
  company: Company;
  identifiers: LegalIdentifier[];
  currency: CurrencyFormat;
  currencyName: string;
  logoMark?: string | null;
}): PdfViewModel {
  const { document, company, identifiers, currency, currencyName } = params;
  const type = document.type as DocumentType;

  const computed = computeDocument({
    lines: document.lines.map((line) => ({
      kind: line.kind,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountType: line.discountType,
      discountValue: line.discountValue,
      vatRate: line.vatRate,
    })),
    vatMode: document.vatMode,
    discountType: document.discountType,
    discountValue: document.discountValue,
    withholdingRate: document.withholdingRate,
    totalDeposits: document.totalDeposits,
    totalPaid: document.totalPaid,
    decimals: currency.decimals,
  });

  // --- Dates affichées en en-tête -----------------------------------------
  const dates: { label: string; value: string }[] = [
    { label: "Date d'émission", value: formatDate(document.issueDate) },
  ];
  if (document.serviceDate) {
    dates.push({ label: "Date de la prestation", value: formatDate(document.serviceDate) });
  }
  if (type === "QUOTE" && document.validUntil) {
    dates.push({ label: "Valable jusqu'au", value: formatDate(document.validUntil) });
  }
  if (type !== "QUOTE" && document.dueDate) {
    dates.push({ label: "Échéance", value: formatDate(document.dueDate) });
  }

  // --- Lignes --------------------------------------------------------------
  const lines: PdfLine[] = document.lines.map((line, index) => {
    const totals = computed.lines[index];
    let discount: string | null = null;
    if (line.discountType === "PERCENT" && line.discountValue > 0) {
      discount = formatRate(line.discountValue);
    } else if (line.discountType === "AMOUNT" && line.discountValue > 0) {
      discount = `− ${formatMoney(line.discountValue, currency)}`;
    }

    return {
      kind: line.kind,
      label: line.label,
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unit: line.unit,
      unitPrice: formatMoney(line.unitPrice, currency),
      discount,
      vatRate: formatRate(line.vatRate),
      total: formatMoney(totals?.net ?? 0, currency),
    };
  });

  // --- Totaux --------------------------------------------------------------
  const noVat = document.vatMode === "NONE";
  const totals: PdfTotalRow[] = [];

  if (computed.lineDiscounts > 0 || computed.globalDiscount > 0) {
    totals.push({
      label: "Sous-total",
      value: formatMoney(computed.subtotal, currency),
    });
    if (computed.lineDiscounts > 0) {
      totals.push({
        label: "Remises de ligne",
        value: `− ${formatMoney(computed.lineDiscounts, currency)}`,
      });
    }
    if (computed.globalDiscount > 0) {
      totals.push({
        label:
          document.discountType === "PERCENT"
            ? `Remise globale (${formatRate(document.discountValue)})`
            : "Remise globale",
        value: `− ${formatMoney(computed.globalDiscount, currency)}`,
      });
    }
  }

  totals.push({
    label: noVat ? "Total" : "Total hors taxes",
    value: formatMoney(computed.totalNet, currency),
    emphasis: true,
  });

  if (!noVat) {
    for (const row of computed.vatBreakdown) {
      totals.push({
        label: `TVA ${formatRate(row.rate)}`,
        value: formatMoney(row.vat, currency),
      });
    }
    totals.push({
      label: "Total TTC",
      value: formatMoney(computed.totalGross, currency),
      emphasis: true,
    });
  }

  if (computed.totalWithheld > 0) {
    totals.push({
      label: document.withholdingLabel || "Retenue à la source",
      value: `− ${formatMoney(computed.totalWithheld, currency)}`,
    });
  }

  if (computed.totalDeposits > 0) {
    totals.push({
      label: "Acomptes déjà facturés",
      value: `− ${formatMoney(computed.totalDeposits, currency)}`,
    });
  }

  // --- Encaissements -------------------------------------------------------
  let paidSummary: { label: string; value: string }[] | null = null;
  if (document.totalPaid > 0) {
    paidSummary = [
      { label: "Déjà réglé", value: formatMoney(document.totalPaid, currency) },
      { label: "Reste à payer", value: formatMoney(computed.balanceDue, currency) },
    ];
  }

  // --- Mentions légales ----------------------------------------------------
  const legalNotes: string[] = [];
  if (noVat && company.vatExemptionText) legalNotes.push(company.vatExemptionText);
  if (company.latePenaltyRate > 0) {
    legalNotes.push(
      `Tout retard de paiement entraîne l'application de pénalités de retard au taux annuel de ${formatRate(
        company.latePenaltyRate,
      )}.`,
    );
  }
  if (company.recoveryFee > 0) {
    legalNotes.push(
      `Indemnité forfaitaire pour frais de recouvrement : ${formatMoney(
        company.recoveryFee,
        currency,
      )}.`,
    );
  }
  if (company.discountText) legalNotes.push(company.discountText);

  const grandTotalLabel =
    type === "CREDIT_NOTE" ? "Montant de l'avoir" : "Net à payer";

  const amountInWords = document.showAmountInWords
    ? amountToFrenchWords(
        Math.abs(computed.total),
        currency.code,
        currency.decimals,
        currencyName,
      )
    : null;

  const contactName = document.contact
    ? [document.contact.firstName, document.contact.lastName].filter(Boolean).join(" ") || null
    : null;

  return {
    title: DOCUMENT_TYPE_PDF_TITLES[type] ?? "DOCUMENT",
    number: document.number ?? "BROUILLON",
    isDraft: document.number === null,
    accent: document.accentColor || company.accentColor || "#1F4D7A",

    dates,

    company: {
      name: company.legalName,
      tradeName: company.tradeName,
      legalForm: company.legalForm,
      activity: company.activity,
      slogan: company.slogan,
      tagline: company.slogan?.trim() || null,
      addressLines: addressLines(company),
      phone: company.phone,
      mobile: company.mobile,
      email: company.email,
      website: company.website,
      logoData: company.logoData,
      // La marque de la galerie ne sert que si aucune image n'a été fournie.
      logoMark: company.logoData ? null : (params.logoMark ?? null),
      stampData: company.showStampOnPdf ? company.stampData : null,
      signatureData: company.showSignatureOnPdf ? company.signatureData : null,
      signatureName: company.signatureName,
      signatureRole: company.signatureRole,
      identifiers: identifiers
        .filter((identifier) => identifier.showOnPdf && identifier.value.trim() !== "")
        .map((identifier) => ({ label: identifier.label, value: identifier.value })),
    },

    billTo: partyView(document.billTo)!,
    // « Pour le compte de » n'a de sens que si le bénéficiaire diffère
    // réellement du destinataire de la facture.
    endClient:
      document.endClientId && document.endClientId !== document.billToId
        ? partyView(document.endClient)
        : null,
    contactName,

    subject: document.subject,
    purchaseOrder: document.purchaseOrder,
    missionTitle: document.mission?.title ?? null,

    showVatColumn: !noVat,
    lines,
    vatBreakdown: computed.vatBreakdown.map((row) => ({
      ...row,
      rateLabel: formatRate(row.rate),
      netLabel: formatMoney(row.net, currency),
      vatLabel: formatMoney(row.vat, currency),
    })),

    totals,
    grandTotalLabel,
    grandTotalValue: formatMoney(computed.total, currency),

    amountInWords,
    paidSummary,

    bank: bankView(document.bankAccount),

    notes: document.notes,
    terms: document.terms,
    footer: document.footer,
    legalNotes,
  };
}

/** Utilisé par les gabarits pour n'afficher que les lignes chiffrées. */
export function isMoneyLine(line: PdfLine): boolean {
  return isBillableLine(line.kind);
}
