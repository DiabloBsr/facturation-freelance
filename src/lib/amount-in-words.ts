/**
 * Conversion d'un montant en toutes lettres (français).
 *
 * La mention « Arrêtée la présente facture à la somme de … » est la norme sur
 * les factures malgaches et, plus largement, en zone francophone.
 */

import { MILLI } from "./money";

const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
  "dix-sept",
  "dix-huit",
  "dix-neuf",
];

const TENS: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
  7: "soixante",
  8: "quatre-vingt",
  9: "quatre-vingt",
};

/** 0 → 99 */
function belowHundred(n: number): string {
  if (n < 20) return UNITS[n];

  const tens = Math.floor(n / 10);
  const unit = n % 10;
  const base = TENS[tens];

  // 70-79 et 90-99 se construisent sur dix-sept, dix-huit… (soixante-dix, quatre-vingt-dix)
  if (tens === 7 || tens === 9) {
    const remainder = UNITS[10 + unit];
    // « soixante et onze » garde la conjonction, « quatre-vingt-onze » non.
    if (tens === 7 && unit === 1) return `${base} et ${remainder}`;
    return `${base}-${remainder}`;
  }

  if (unit === 0) {
    // « quatre-vingts » prend un s lorsqu'il n'est suivi de rien.
    return tens === 8 ? "quatre-vingts" : base;
  }
  if (unit === 1 && tens !== 8) return `${base} et un`;
  return `${base}-${UNITS[unit]}`;
}

/** 0 → 999 */
function belowThousand(n: number): string {
  if (n < 100) return belowHundred(n);

  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  let head: string;
  if (hundreds === 1) {
    head = "cent";
  } else {
    // « deux cents » mais « deux cent trois ».
    head = `${UNITS[hundreds]} cent${remainder === 0 ? "s" : ""}`;
  }

  return remainder === 0 ? head : `${head} ${belowHundred(remainder)}`;
}

const SCALES: { value: number; singular: string; plural: string }[] = [
  { value: 1_000_000_000_000, singular: "billion", plural: "billions" },
  { value: 1_000_000_000, singular: "milliard", plural: "milliards" },
  { value: 1_000_000, singular: "million", plural: "millions" },
  { value: 1_000, singular: "mille", plural: "mille" },
];

/** Entier positif en toutes lettres. */
export function integerToFrenchWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return "zéro";
  if (n < 1000) return belowThousand(n);

  const parts: string[] = [];
  let rest = n;

  for (const scale of SCALES) {
    const count = Math.floor(rest / scale.value);
    if (count === 0) continue;
    rest -= count * scale.value;

    if (scale.value === 1_000) {
      // « mille » est invariable et ne prend pas « un » devant.
      parts.push(count === 1 ? "mille" : `${belowThousand(count)} mille`);
    } else {
      const name = count > 1 ? scale.plural : scale.singular;
      parts.push(`${belowThousand(count)} ${name}`);
    }
  }

  if (rest > 0) parts.push(belowThousand(rest));
  return parts.join(" ");
}

/** Noms des devises pour la mention en toutes lettres. */
export type CurrencyWording = {
  /** Unité au singulier : « ariary », « euro ». */
  unit: string;
  /** Unité au pluriel : « ariary » (invariable), « euros ». */
  unitPlural: string;
  /** Sous-unité : « centime ». Absente si la devise n'en utilise pas. */
  subunit?: string;
  subunitPlural?: string;
};

const CURRENCY_WORDS: Record<string, CurrencyWording> = {
  MGA: { unit: "ariary", unitPlural: "ariary" },
  EUR: { unit: "euro", unitPlural: "euros", subunit: "centime", subunitPlural: "centimes" },
  USD: { unit: "dollar", unitPlural: "dollars", subunit: "cent", subunitPlural: "cents" },
  GBP: {
    unit: "livre sterling",
    unitPlural: "livres sterling",
    subunit: "penny",
    subunitPlural: "pence",
  },
  CHF: { unit: "franc suisse", unitPlural: "francs suisses", subunit: "centime", subunitPlural: "centimes" },
  CAD: {
    unit: "dollar canadien",
    unitPlural: "dollars canadiens",
    subunit: "cent",
    subunitPlural: "cents",
  },
  XOF: { unit: "franc CFA", unitPlural: "francs CFA" },
  XAF: { unit: "franc CFA", unitPlural: "francs CFA" },
  MUR: { unit: "roupie", unitPlural: "roupies", subunit: "cent", subunitPlural: "cents" },
  ZAR: { unit: "rand", unitPlural: "rands", subunit: "cent", subunitPlural: "cents" },
  MAD: { unit: "dirham", unitPlural: "dirhams", subunit: "centime", subunitPlural: "centimes" },
  AED: { unit: "dirham", unitPlural: "dirhams", subunit: "fils", subunitPlural: "fils" },
  JPY: { unit: "yen", unitPlural: "yens" },
  CNY: { unit: "yuan", unitPlural: "yuans", subunit: "fen", subunitPlural: "fens" },
  INR: { unit: "roupie", unitPlural: "roupies", subunit: "paisa", subunitPlural: "paise" },
  AUD: {
    unit: "dollar australien",
    unitPlural: "dollars australiens",
    subunit: "cent",
    subunitPlural: "cents",
  },
  SEK: { unit: "couronne", unitPlural: "couronnes", subunit: "öre", subunitPlural: "öre" },
  NOK: { unit: "couronne", unitPlural: "couronnes", subunit: "øre", subunitPlural: "øre" },
  DKK: { unit: "couronne", unitPlural: "couronnes", subunit: "øre", subunitPlural: "øre" },
  KES: { unit: "shilling", unitPlural: "shillings", subunit: "cent", subunitPlural: "cents" },
  TND: { unit: "dinar", unitPlural: "dinars", subunit: "millime", subunitPlural: "millimes" },
};

export function currencyWording(code: string, fallbackName?: string): CurrencyWording {
  const known = CURRENCY_WORDS[code.toUpperCase()];
  if (known) return known;
  const name = (fallbackName ?? code).toLowerCase();
  return { unit: name, unitPlural: name };
}

/**
 * Montant (en milli-unités) en toutes lettres, prêt à être imprimé.
 * Ex. : 1 250 500 milli-unités en EUR -> « mille deux cent cinquante euros et cinquante centimes ».
 */
export function amountToFrenchWords(
  amountMilli: number,
  currencyCode: string,
  decimals: number,
  currencyName?: string,
): string {
  const words = currencyWording(currencyCode, currencyName);
  const negative = amountMilli < 0;
  const abs = Math.abs(amountMilli);

  const wholeUnits = Math.floor(abs / MILLI);
  const fractionMilli = abs - wholeUnits * MILLI;

  const unitLabel = wholeUnits > 1 ? words.unitPlural : words.unit;
  let text = `${integerToFrenchWords(wholeUnits)} ${unitLabel}`;

  if (decimals > 0 && fractionMilli > 0 && words.subunit) {
    // fractionMilli est en millièmes d'unité : on le ramène à la précision réelle.
    const factor = Math.pow(10, decimals);
    const subunits = Math.round((fractionMilli / MILLI) * factor);
    if (subunits > 0) {
      const subLabel = subunits > 1 ? (words.subunitPlural ?? words.subunit) : words.subunit;
      text += ` et ${integerToFrenchWords(subunits)} ${subLabel}`;
    }
  }

  if (negative) text = `moins ${text}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
