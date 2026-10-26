/**
 * Calcul des totaux d'un document.
 *
 * Règles appliquées :
 *  - la remise de ligne s'applique au total de la ligne ;
 *  - la remise globale s'applique au total hors taxes, répartie au prorata
 *    entre les taux de TVA pour que la ventilation reste juste ;
 *  - la TVA est calculée par groupe de taux (et non ligne à ligne), ce qui
 *    évite l'accumulation d'écarts d'arrondi ;
 *  - la retenue à la source se calcule sur le hors taxes ;
 *  - les acomptes déjà facturés se déduisent du net à payer.
 */

import { isBillableLine } from "./enums";
import {
  applyRate,
  extractNetFromGross,
  mulQuantity,
  roundToCurrency,
} from "./money";

export type ComputableLine = {
  kind: string;
  quantity: number;
  unitPrice: number;
  discountType: string;
  discountValue: number;
  vatRate: number;
};

export type ComputedLine = {
  /** Quantité x prix unitaire, avant remise. */
  base: number;
  discount: number;
  /** Hors taxes de la ligne, après remise de ligne. */
  net: number;
  vat: number;
  gross: number;
};

export type VatBreakdownRow = {
  rate: number;
  net: number;
  vat: number;
};

export type ComputedDocument = {
  lines: ComputedLine[];
  subtotal: number;
  lineDiscounts: number;
  globalDiscount: number;
  totalDiscount: number;
  totalNet: number;
  totalVat: number;
  totalGross: number;
  totalWithheld: number;
  totalDeposits: number;
  total: number;
  totalPaid: number;
  balanceDue: number;
  vatBreakdown: VatBreakdownRow[];
};

export type ComputeInput = {
  lines: ComputableLine[];
  vatMode: string;
  discountType: string;
  discountValue: number;
  withholdingRate: number;
  /** Acomptes déjà facturés, en milli-unités. */
  totalDeposits?: number;
  /** Encaissements déjà enregistrés, en milli-unités. */
  totalPaid?: number;
  /** Précision de la devise du document. */
  decimals: number;
};

/** Total d'une ligne isolée (utilisé aussi pour l'aperçu en direct de l'éditeur). */
export function computeLine(
  line: ComputableLine,
  vatMode: string,
  decimals: number,
): ComputedLine {
  if (!isBillableLine(line.kind)) {
    return { base: 0, discount: 0, net: 0, vat: 0, gross: 0 };
  }

  const base = roundToCurrency(mulQuantity(line.unitPrice, line.quantity), decimals);

  let discount = 0;
  if (line.discountType === "PERCENT") {
    discount = roundToCurrency(applyRate(base, line.discountValue), decimals);
  } else if (line.discountType === "AMOUNT") {
    discount = roundToCurrency(line.discountValue, decimals);
  }
  // Une remise ne peut pas dépasser le montant de la ligne.
  if (Math.abs(discount) > Math.abs(base)) discount = base;

  const afterDiscount = base - discount;
  const rate = vatMode === "NONE" ? 0 : line.vatRate;

  let net: number;
  let vat: number;
  if (vatMode === "INCLUSIVE") {
    // Le prix saisi est TTC : on en extrait la part hors taxes.
    net = roundToCurrency(extractNetFromGross(afterDiscount, rate), decimals);
    vat = afterDiscount - net;
  } else {
    net = afterDiscount;
    vat = roundToCurrency(applyRate(net, rate), decimals);
  }

  return { base, discount, net, vat, gross: net + vat };
}

export function computeDocument(input: ComputeInput): ComputedDocument {
  const { vatMode, decimals } = input;
  const lines = input.lines.map((line) => computeLine(line, vatMode, decimals));

  const subtotal = lines.reduce((sum, l) => sum + l.base, 0);
  const lineDiscounts = lines.reduce((sum, l) => sum + l.discount, 0);
  const netBeforeGlobal = lines.reduce((sum, l) => sum + l.net, 0);

  // --- Remise globale, appliquée au hors taxes -----------------------------
  let globalDiscount = 0;
  if (input.discountType === "PERCENT") {
    globalDiscount = roundToCurrency(applyRate(netBeforeGlobal, input.discountValue), decimals);
  } else if (input.discountType === "AMOUNT") {
    globalDiscount = roundToCurrency(input.discountValue, decimals);
  }
  if (Math.abs(globalDiscount) > Math.abs(netBeforeGlobal)) globalDiscount = netBeforeGlobal;

  // --- Ventilation par taux de TVA ----------------------------------------
  const groups = new Map<number, number>();
  input.lines.forEach((line, index) => {
    if (!isBillableLine(line.kind)) return;
    const rate = vatMode === "NONE" ? 0 : line.vatRate;
    groups.set(rate, (groups.get(rate) ?? 0) + lines[index].net);
  });

  const rates = [...groups.keys()].sort((a, b) => a - b);
  const breakdown: VatBreakdownRow[] = [];
  let distributed = 0;

  rates.forEach((rate, index) => {
    const groupNet = groups.get(rate) ?? 0;

    // La dernière tranche absorbe le reliquat d'arrondi : la somme des parts
    // réparties est ainsi toujours exactement égale à la remise globale.
    let share: number;
    if (index === rates.length - 1) {
      share = globalDiscount - distributed;
    } else if (netBeforeGlobal === 0) {
      share = 0;
    } else {
      share = roundToCurrency(
        Math.round(globalDiscount * (groupNet / netBeforeGlobal)),
        decimals,
      );
    }
    distributed += share;

    const net = groupNet - share;
    const vat = vatMode === "NONE" ? 0 : roundToCurrency(applyRate(net, rate), decimals);
    breakdown.push({ rate, net, vat });
  });

  const totalNet = breakdown.reduce((sum, row) => sum + row.net, 0);
  const totalVat = breakdown.reduce((sum, row) => sum + row.vat, 0);
  const totalGross = totalNet + totalVat;

  const totalWithheld = roundToCurrency(applyRate(totalNet, input.withholdingRate), decimals);
  const totalDeposits = input.totalDeposits ?? 0;
  const total = totalGross - totalWithheld - totalDeposits;
  const totalPaid = input.totalPaid ?? 0;

  return {
    lines,
    subtotal,
    lineDiscounts,
    globalDiscount,
    totalDiscount: lineDiscounts + globalDiscount,
    totalNet,
    totalVat,
    totalGross,
    totalWithheld,
    totalDeposits,
    total,
    totalPaid,
    balanceDue: total - totalPaid,
    vatBreakdown: breakdown.filter((row) => row.net !== 0 || row.vat !== 0),
  };
}

/**
 * Statut déduit des encaissements et de l'échéance.
 * Les statuts « manuels » (brouillon, annulé, accepté, refusé) sont préservés.
 */
export function deriveStatus(params: {
  type: string;
  status: string;
  total: number;
  totalPaid: number;
  dueDate: Date | null;
  now?: Date;
}): string {
  const { type, status, total, totalPaid, dueDate } = params;
  if (status === "DRAFT" || status === "CANCELLED") return status;
  if (type !== "INVOICE" && type !== "DEPOSIT") return status;

  const now = params.now ?? new Date();

  if (total !== 0 && totalPaid >= total) return "PAID";
  if (totalPaid > 0) return "PARTIALLY_PAID";
  if (dueDate && dueDate.getTime() < now.getTime()) return "LATE";
  return status === "LATE" || status === "PAID" || status === "PARTIALLY_PAID"
    ? "SENT"
    : status;
}
