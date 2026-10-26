/**
 * Valeurs contraintes du domaine.
 * SQLite ne supporte pas les enum Prisma : la contrainte vit ici, en TypeScript,
 * et est rejouée par les schémas Zod dans src/lib/validation.ts.
 */

export const DOCUMENT_TYPES = [
  "QUOTE",
  "INVOICE",
  "DEPOSIT",
  "CREDIT_NOTE",
  "PROFORMA",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  QUOTE: "Devis",
  INVOICE: "Facture",
  DEPOSIT: "Facture d'acompte",
  CREDIT_NOTE: "Avoir",
  PROFORMA: "Facture proforma",
};

/** Libellé affiché en gros titre sur le PDF. */
export const DOCUMENT_TYPE_PDF_TITLES: Record<DocumentType, string> = {
  QUOTE: "DEVIS",
  INVOICE: "FACTURE",
  DEPOSIT: "FACTURE D'ACOMPTE",
  CREDIT_NOTE: "AVOIR",
  PROFORMA: "FACTURE PROFORMA",
};

export const DOCUMENT_TYPE_SHORT: Record<DocumentType, string> = {
  QUOTE: "Devis",
  INVOICE: "Facture",
  DEPOSIT: "Acompte",
  CREDIT_NOTE: "Avoir",
  PROFORMA: "Proforma",
};

/** Clé de la séquence de numérotation utilisée par chaque type. */
export const DOCUMENT_TYPE_SEQUENCE: Record<DocumentType, string> = {
  QUOTE: "QUOTE",
  INVOICE: "INVOICE",
  DEPOSIT: "DEPOSIT",
  CREDIT_NOTE: "CREDIT_NOTE",
  PROFORMA: "PROFORMA",
};

export const DOCUMENT_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REFUSED",
  "PARTIALLY_PAID",
  "PAID",
  "LATE",
  "CANCELLED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REFUSED: "Refusé",
  PARTIALLY_PAID: "Payé en partie",
  PAID: "Payé",
  LATE: "En retard",
  CANCELLED: "Annulé",
};

/** Palette de badge par statut (classes utilitaires du design system). */
export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, string> = {
  DRAFT: "neutral",
  SENT: "info",
  ACCEPTED: "success",
  REFUSED: "danger",
  PARTIALLY_PAID: "warning",
  PAID: "success",
  LATE: "danger",
  CANCELLED: "neutral",
};

/** Statuts proposés dans l'interface selon le type de document. */
export const STATUSES_FOR_TYPE: Record<DocumentType, DocumentStatus[]> = {
  QUOTE: ["DRAFT", "SENT", "ACCEPTED", "REFUSED", "CANCELLED"],
  INVOICE: ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "LATE", "CANCELLED"],
  DEPOSIT: ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "LATE", "CANCELLED"],
  CREDIT_NOTE: ["DRAFT", "SENT", "PAID", "CANCELLED"],
  PROFORMA: ["DRAFT", "SENT", "CANCELLED"],
};

/** Un document de ce type engage un encaissement attendu. */
export function isReceivable(type: string): boolean {
  return type === "INVOICE" || type === "DEPOSIT";
}

export const LINE_KINDS = ["SERVICE", "PRODUCT", "TEXT", "SECTION"] as const;
export type LineKind = (typeof LINE_KINDS)[number];

export const LINE_KIND_LABELS: Record<LineKind, string> = {
  SERVICE: "Prestation",
  PRODUCT: "Produit",
  TEXT: "Texte libre",
  SECTION: "Titre de section",
};

/** Les lignes de texte et de section ne portent aucun montant. */
export function isBillableLine(kind: string): boolean {
  return kind === "SERVICE" || kind === "PRODUCT";
}

export const VAT_MODES = ["EXCLUSIVE", "INCLUSIVE", "NONE"] as const;
export type VatMode = (typeof VAT_MODES)[number];

export const VAT_MODE_LABELS: Record<VatMode, string> = {
  EXCLUSIVE: "Prix hors taxes (HT)",
  INCLUSIVE: "Prix taxes comprises (TTC)",
  NONE: "Sans TVA",
};

export const DISCOUNT_TYPES = ["NONE", "PERCENT", "AMOUNT"] as const;
export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export const DISCOUNT_TYPE_LABELS: Record<DiscountType, string> = {
  NONE: "Aucune",
  PERCENT: "Pourcentage",
  AMOUNT: "Montant",
};

export const PARTY_KINDS = ["CLIENT", "AGENCY", "SUBCONTRACTOR"] as const;
export type PartyKind = (typeof PARTY_KINDS)[number];

export const PARTY_KIND_LABELS: Record<PartyKind, string> = {
  CLIENT: "Client",
  AGENCY: "Agence",
  SUBCONTRACTOR: "Sous-traitant",
};

export const PAYOUT_STATUSES = ["DRAFT", "PAID"] as const;
export type PayoutStatus = (typeof PAYOUT_STATUSES)[number];

export const PAYOUT_STATUS_LABELS: Record<PayoutStatus, string> = {
  DRAFT: "À reverser",
  PAID: "Reversé",
};

export const PAYOUT_REQUEST_STATUSES = [
  "PENDING",
  "SUBMITTED",
  "CONVERTED",
  "CANCELLED",
] as const;
export type PayoutRequestStatus = (typeof PAYOUT_REQUEST_STATUSES)[number];

export const PAYOUT_REQUEST_STATUS_LABELS: Record<PayoutRequestStatus, string> = {
  PENDING: "En attente",
  SUBMITTED: "Reçue",
  CONVERTED: "Reprise",
  CANCELLED: "Annulée",
};

export const PARTY_TYPES = ["COMPANY", "INDIVIDUAL", "PUBLIC"] as const;
export type PartyType = (typeof PARTY_TYPES)[number];

export const PARTY_TYPE_LABELS: Record<PartyType, string> = {
  COMPANY: "Entreprise",
  INDIVIDUAL: "Particulier",
  PUBLIC: "Administration / public",
};

export const BANK_ACCOUNT_KINDS = [
  "BANK",
  "MOBILE_MONEY",
  "PAYPAL",
  "WISE",
  "OTHER",
] as const;
export type BankAccountKind = (typeof BANK_ACCOUNT_KINDS)[number];

export const BANK_ACCOUNT_KIND_LABELS: Record<BankAccountKind, string> = {
  BANK: "Compte bancaire",
  MOBILE_MONEY: "Mobile Money",
  PAYPAL: "PayPal",
  WISE: "Wise",
  OTHER: "Autre",
};

export const PAYMENT_METHODS = [
  "TRANSFER",
  "MOBILE_MONEY",
  "CASH",
  "CHECK",
  "CARD",
  "PAYPAL",
  "WISE",
  "OTHER",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFER: "Virement bancaire",
  MOBILE_MONEY: "Mobile Money",
  CASH: "Espèces",
  CHECK: "Chèque",
  CARD: "Carte bancaire",
  PAYPAL: "PayPal",
  WISE: "Wise",
  OTHER: "Autre",
};

export const VAT_REGIMES = ["SUBJECT", "EXEMPT", "NOT_APPLICABLE"] as const;
export type VatRegime = (typeof VAT_REGIMES)[number];

export const VAT_REGIME_LABELS: Record<VatRegime, string> = {
  SUBJECT: "Assujetti à la TVA",
  EXEMPT: "Non assujetti / exonéré",
  NOT_APPLICABLE: "TVA non applicable",
};

export const RATE_TYPES = ["DAILY", "HOURLY", "FIXED"] as const;
export type RateType = (typeof RATE_TYPES)[number];

export const RATE_TYPE_LABELS: Record<RateType, string> = {
  DAILY: "Tarif journalier",
  HOURLY: "Tarif horaire",
  FIXED: "Forfait",
};

/** Unité de facturation induite par le mode de tarification. */
export const RATE_TYPE_UNIT: Record<RateType, string> = {
  DAILY: "jour",
  HOURLY: "heure",
  FIXED: "forfait",
};

export const MISSION_STATUSES = ["ACTIVE", "PAUSED", "DONE", "ARCHIVED"] as const;
export type MissionStatus = (typeof MISSION_STATUSES)[number];

export const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  ACTIVE: "En cours",
  PAUSED: "En pause",
  DONE: "Terminée",
  ARCHIVED: "Archivée",
};

export const TIME_UNITS = ["DAY", "HOUR"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export const TIME_UNIT_LABELS: Record<TimeUnit, string> = {
  DAY: "Jour",
  HOUR: "Heure",
};

export const FREQUENCIES = ["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: "Chaque semaine",
  MONTHLY: "Chaque mois",
  QUARTERLY: "Chaque trimestre",
  YEARLY: "Chaque année",
};

export const REMINDER_CHANNELS = ["EMAIL", "PHONE", "LETTER", "OTHER"] as const;
export type ReminderChannel = (typeof REMINDER_CHANNELS)[number];

export const REMINDER_CHANNEL_LABELS: Record<ReminderChannel, string> = {
  EMAIL: "E-mail",
  PHONE: "Téléphone",
  LETTER: "Courrier",
  OTHER: "Autre",
};

export const REMINDER_LEVEL_LABELS: Record<number, string> = {
  1: "1re relance — rappel courtois",
  2: "2e relance — rappel ferme",
  3: "3e relance — dernier rappel",
  4: "Mise en demeure",
};

export const RESET_POLICIES = ["NEVER", "YEARLY", "MONTHLY"] as const;
export type ResetPolicy = (typeof RESET_POLICIES)[number];

export const RESET_POLICY_LABELS: Record<ResetPolicy, string> = {
  NEVER: "Jamais (compteur continu)",
  YEARLY: "Chaque année",
  MONTHLY: "Chaque mois",
};

export const BILL_TO_OPTIONS = ["CLIENT", "AGENCY"] as const;
export type BillTo = (typeof BILL_TO_OPTIONS)[number];

export const BILL_TO_LABELS: Record<BillTo, string> = {
  CLIENT: "Le client final",
  AGENCY: "L'agence intermédiaire",
};

/** Unités proposées dans l'éditeur de lignes. */
export const LINE_UNITS = [
  "unité",
  "jour",
  "demi-journée",
  "heure",
  "forfait",
  "mois",
  "semaine",
  "page",
  "module",
  "licence",
  "km",
] as const;

/** Identifiants légaux proposés en un clic, par zone géographique. */
export const IDENTIFIER_PRESETS: { label: string; hint: string }[] = [
  { label: "NIF", hint: "Numéro d'Identification Fiscale" },
  { label: "STAT", hint: "Numéro statistique (INSTAT)" },
  { label: "RCS", hint: "Registre du Commerce et des Sociétés" },
  { label: "CIF", hint: "Carte d'Identité Fiscale" },
  { label: "N° TVA", hint: "Numéro de TVA intracommunautaire" },
  { label: "SIRET", hint: "Établissement (France)" },
  { label: "SIREN", hint: "Entreprise (France)" },
  { label: "Code APE", hint: "Activité principale exercée" },
  { label: "IFU", hint: "Identifiant Fiscal Unique" },
  { label: "RC", hint: "Registre du Commerce" },
];
