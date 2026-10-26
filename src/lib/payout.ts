/**
 * Calcul d'un reversement à un sous-traitant.
 *
 * La chaîne est celle de la banque, pas celle du marché :
 *
 *   Σ prestations (devise source)
 *     × cours appliqué par la banque      → montant converti
 *     − frais bancaires
 *     ± ajustements divers
 *     = net à reverser
 *
 * Le cours est saisi à la main : celui qu'applique la banque à l'encaissement
 * diffère toujours du cours mondial du jour, et c'est le premier qui fait foi
 * pour ce que le sous-traitant reçoit réellement.
 */

import { mulQuantity, roundHalfAway, roundToCurrency } from "./money";

export type PayoutLineInput = {
  /** Milli-unités (1,5 -> 1500). */
  quantity: number;
  /** Milli-unités, devise source. */
  unitPrice: number;
};

export type PayoutInput = {
  lines: PayoutLineInput[];
  /** 1 unité source = `exchangeRate` unités cible. */
  exchangeRate: number;
  /** Milli-unités, devise cible. */
  bankFees: number;
  /** Milli-unités, devise cible, signés : un montant négatif retranche. */
  adjustments: { amount: number }[];
  /** Précision de la devise source (2 pour l'euro). */
  sourceDecimals: number;
  /** Précision de la devise cible (0 pour l'ariary). */
  targetDecimals: number;
};

export type ComputedPayout = {
  /** Montant de chaque ligne, en devise source. */
  lineAmounts: number[];
  totalSource: number;
  totalConverted: number;
  totalFees: number;
  totalAdjustments: number;
  netPayable: number;
};

/** Montant d'une ligne : quantité × prix unitaire, arrondi à la devise source. */
export function computePayoutLine(line: PayoutLineInput, sourceDecimals: number): number {
  return roundToCurrency(mulQuantity(line.unitPrice, line.quantity), sourceDecimals);
}

export function computePayout(input: PayoutInput): ComputedPayout {
  const lineAmounts = input.lines.map((line) => computePayoutLine(line, input.sourceDecimals));
  const totalSource = lineAmounts.reduce((sum, amount) => sum + amount, 0);

  // La conversion s'applique au total, pas ligne à ligne : c'est un unique
  // virement qui est converti, et l'arrondi doit refléter ce virement-là.
  const totalConverted = roundToCurrency(
    roundHalfAway(totalSource * input.exchangeRate),
    input.targetDecimals,
  );

  const totalFees = roundToCurrency(input.bankFees, input.targetDecimals);
  const totalAdjustments = input.adjustments.reduce(
    (sum, adjustment) => sum + roundToCurrency(adjustment.amount, input.targetDecimals),
    0,
  );

  return {
    lineAmounts,
    totalSource,
    totalConverted,
    totalFees,
    totalAdjustments,
    netPayable: totalConverted - totalFees + totalAdjustments,
  };
}
