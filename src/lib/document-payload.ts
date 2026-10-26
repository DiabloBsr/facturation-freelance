/**
 * Contrat d'échange entre l'éditeur (client) et l'action serveur.
 * Partagé par les deux côtés : une seule définition, une seule validation.
 */

import { z } from "zod";
import {
  DISCOUNT_TYPES,
  DOCUMENT_STATUSES,
  DOCUMENT_TYPES,
  LINE_KINDS,
  VAT_MODES,
} from "./enums";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date attendue au format AAAA-MM-JJ");

export const linePayloadSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(LINE_KINDS),
  label: z.string().max(300),
  description: z.string().max(2000).nullable().default(null),
  /** Milli-unités (1,5 -> 1500). */
  quantity: z.number().int().min(-1_000_000_000).max(1_000_000_000),
  unit: z.string().max(40),
  /** Milli-unités. */
  unitPrice: z.number().int().min(-1_000_000_000_000).max(1_000_000_000_000),
  discountType: z.enum(DISCOUNT_TYPES),
  /** Points de base si POURCENT, milli-unités si MONTANT. */
  discountValue: z.number().int().min(0).max(1_000_000_000_000),
  /** Points de base. */
  vatRate: z.number().int().min(0).max(10_000),
});

export type LinePayload = z.infer<typeof linePayloadSchema>;

export const documentPayloadSchema = z.object({
  id: z.string().optional(),
  type: z.enum(DOCUMENT_TYPES),
  status: z.enum(DOCUMENT_STATUSES).optional(),
  subject: z.string().max(300).nullable().default(null),

  billToId: z.string().min(1, "Sélectionnez le destinataire de la facture."),
  endClientId: z.string().nullable().default(null),
  contactId: z.string().nullable().default(null),
  missionId: z.string().nullable().default(null),

  issueDate: dateString,
  dueDate: dateString.nullable().default(null),
  validUntil: dateString.nullable().default(null),
  serviceDate: dateString.nullable().default(null),

  currency: z.string().min(3).max(3),
  exchangeRate: z.number().positive().max(1_000_000),
  vatMode: z.enum(VAT_MODES),
  paymentTermsDays: z.number().int().min(0).max(365),

  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().int().min(0).max(1_000_000_000_000),

  withholdingLabel: z.string().max(120).nullable().default(null),
  withholdingRate: z.number().int().min(0).max(10_000),

  purchaseOrder: z.string().max(120).nullable().default(null),
  notes: z.string().max(4000).nullable().default(null),
  terms: z.string().max(4000).nullable().default(null),
  footer: z.string().max(1000).nullable().default(null),
  internalNotes: z.string().max(4000).nullable().default(null),

  template: z.string().max(40),
  accentColor: z.string().max(20).nullable().default(null),
  showAmountInWords: z.boolean(),

  bankAccountId: z.string().nullable().default(null),
  parentId: z.string().nullable().default(null),

  /** Factures d'acompte à déduire du net à payer. */
  depositIds: z.array(z.string()).default([]),
  /** Lignes de CRA consommées par ce document. */
  timeEntryIds: z.array(z.string()).default([]),
  /** Déclarations d'intervenants reprises dans ce document. */
  payoutRequestIds: z.array(z.string()).max(20).default([]),

  lines: z.array(linePayloadSchema).max(300),
});

export type DocumentPayload = z.infer<typeof documentPayloadSchema>;

/** Ligne vierge ajoutée par l'éditeur. */
export function emptyLine(vatRate = 0): LinePayload {
  return {
    kind: "SERVICE",
    label: "",
    description: null,
    quantity: 1000,
    unit: "unité",
    unitPrice: 0,
    discountType: "NONE",
    discountValue: 0,
    vatRate,
  };
}
