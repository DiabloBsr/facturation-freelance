/**
 * Attribution des numéros de document.
 *
 * Le numéro est réservé dans la même transaction que la validation du
 * document : deux validations simultanées ne peuvent pas obtenir le même
 * numéro, et un brouillon jamais validé ne consomme aucun numéro (la
 * numérotation reste donc continue, sans trou, comme l'exige une comptabilité).
 */

import type { Prisma } from "@prisma/client";

export type SequenceContext = {
  pattern: string;
  prefix: string;
  padding: number;
  value: number;
  date: Date;
};

/** Remplace les jetons du gabarit : {PREFIX} {YYYY} {YY} {MM} {SEQ}. */
export function renderNumber(ctx: SequenceContext): string {
  const year = ctx.date.getUTCFullYear();
  const month = String(ctx.date.getUTCMonth() + 1).padStart(2, "0");
  return ctx.pattern
    .replace(/\{PREFIX\}/g, ctx.prefix)
    .replace(/\{YYYY\}/g, String(year))
    .replace(/\{YY\}/g, String(year).slice(-2))
    .replace(/\{MM\}/g, month)
    .replace(/\{SEQ\}/g, String(ctx.value).padStart(Math.max(ctx.padding, 1), "0"));
}

/** Clé de période servant à savoir si le compteur doit repartir à 1. */
export function periodKey(resetPolicy: string, date: Date): string {
  if (resetPolicy === "YEARLY") return String(date.getUTCFullYear());
  if (resetPolicy === "MONTHLY") {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  return "ALL";
}

/**
 * Consomme le prochain numéro de la séquence `key`.
 * À appeler à l'intérieur d'une transaction Prisma.
 */
export async function allocateNumber(
  tx: Prisma.TransactionClient,
  key: string,
  date: Date,
): Promise<string> {
  const sequence = await tx.numberSequence.findUnique({ where: { key } });
  if (!sequence) {
    throw new Error(`Séquence de numérotation « ${key} » introuvable.`);
  }

  const period = periodKey(sequence.resetPolicy, date);
  const restart = sequence.resetPolicy !== "NEVER" && sequence.lastPeriod !== period;
  const value = restart ? 1 : sequence.nextValue;

  await tx.numberSequence.update({
    where: { key },
    data: { nextValue: value + 1, lastPeriod: period },
  });

  return renderNumber({
    pattern: sequence.pattern,
    prefix: sequence.prefix,
    padding: sequence.padding,
    value,
    date,
  });
}

/** Aperçu du prochain numéro, sans rien consommer. */
export function previewNumber(
  sequence: {
    pattern: string;
    prefix: string;
    padding: number;
    nextValue: number;
    resetPolicy: string;
    lastPeriod: string | null;
  },
  date: Date,
): string {
  const period = periodKey(sequence.resetPolicy, date);
  const restart = sequence.resetPolicy !== "NEVER" && sequence.lastPeriod !== period;
  return renderNumber({
    pattern: sequence.pattern,
    prefix: sequence.prefix,
    padding: sequence.padding,
    value: restart ? 1 : sequence.nextValue,
    date,
  });
}
