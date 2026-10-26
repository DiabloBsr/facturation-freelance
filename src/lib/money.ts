/**
 * Arithmétique monétaire exacte.
 *
 * Aucun montant n'est stocké en flottant décimal : tout est un entier de
 * "milli-unités" (x1000). 12 500,50 € -> 12_500_500.  Les taux sont en points
 * de base (x100) : 20 % -> 2000.
 *
 * Trois décimales suffisent à couvrir toutes les devises (l'Ariary en utilise 0,
 * l'euro 2, le dinar 3) tout en gardant des quantités fractionnaires exactes
 * (0,5 jour -> 500).
 *
 * Côté base, ces entiers sont rangés dans des colonnes REAL : SQLite (via
 * Prisma) plafonne le type Int à 32 bits, ce qui déborderait dès 2 147 483 Ar
 * une fois converti en milli-unités. Un double représente exactement tout
 * entier jusqu'à 2^53, soit très au-delà de tout montant réel.
 */

export const MILLI = 1000;
export const BP = 10000;

/** Espace insécable : U+00A0, présente dans l'encodage des polices PDF. */
export const NBSP = " ";

/** Devise telle qu'utilisée par le formatage (sous-ensemble du modèle Prisma). */
export type CurrencyFormat = {
  code: string;
  symbol: string;
  decimals: number;
  symbolAfter: boolean;
};

export const FALLBACK_CURRENCY: CurrencyFormat = {
  code: "MGA",
  symbol: "Ar",
  decimals: 0,
  symbolAfter: true,
};

/** Arrondi commercial : 0,5 s'éloigne toujours de zéro (-2,5 -> -3). */
export function roundHalfAway(value: number): number {
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

/**
 * Multiplie un montant par une quantité, toutes deux en milli-unités.
 * On divise la quantité avant de multiplier pour rester loin de
 * Number.MAX_SAFE_INTEGER sur les gros montants en Ariary.
 */
export function mulQuantity(amountMilli: number, quantityMilli: number): number {
  return roundHalfAway(amountMilli * (quantityMilli / MILLI));
}

/** Applique un taux exprimé en points de base (2000 = 20 %). */
export function applyRate(amountMilli: number, basisPoints: number): number {
  return roundHalfAway(amountMilli * (basisPoints / BP));
}

/**
 * Extrait la part hors taxes d'un montant TTC.
 * net = ttc / (1 + taux)
 */
export function extractNetFromGross(grossMilli: number, basisPoints: number): number {
  if (basisPoints === 0) return grossMilli;
  return roundHalfAway(grossMilli * (BP / (BP + basisPoints)));
}

/** Aligne un montant sur la précision réelle de la devise (0 décimale = Ariary entier). */
export function roundToCurrency(amountMilli: number, decimals: number): number {
  const step = MILLI / Math.pow(10, Math.min(Math.max(decimals, 0), 3));
  return roundHalfAway(amountMilli / step) * step;
}

/** Convertit un montant d'une devise vers la devise de base de l'entreprise. */
export function convertToBase(amountMilli: number, rateToBase: number): number {
  return roundHalfAway(amountMilli * rateToBase);
}

// ---------------------------------------------------------------------------
// Saisie / affichage
// ---------------------------------------------------------------------------

/**
 * Analyse une saisie humaine : "12 500,50", "12500.5", "1 234 567 Ar".
 * Retourne des milli-unités, ou null si la saisie n'est pas un nombre.
 */
export function parseAmountToMilli(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") {
    return Number.isFinite(input) ? roundHalfAway(input * MILLI) : null;
  }
  const cleaned = input
    .replace(/\s/g, "")
    .replace(/[^0-9,.\-]/g, "")
    .replace(/,/g, ".");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  // Plusieurs points : on ne garde que le dernier comme séparateur décimal.
  const parts = cleaned.split(".");
  const normalized =
    parts.length > 2 ? parts.slice(0, -1).join("") + "." + parts[parts.length - 1] : cleaned;
  const value = Number(normalized);
  if (!Number.isFinite(value)) return null;
  return roundHalfAway(value * MILLI);
}

/** Idem, mais renvoie 0 plutôt que null (formulaires). */
export function parseAmountOrZero(input: string | number | null | undefined): number {
  return parseAmountToMilli(input) ?? 0;
}

/** Analyse un taux saisi en pourcentage ("20", "1,5") vers des points de base. */
export function parseRateToBp(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const raw = typeof input === "number" ? input : Number(String(input).replace(",", "."));
  if (!Number.isFinite(raw)) return 0;
  return roundHalfAway(raw * 100);
}

/** Nombre brut (pour les champs de saisie contrôlés). */
export function milliToNumber(amountMilli: number, decimals = 3): number {
  const factor = Math.pow(10, decimals);
  return roundHalfAway((amountMilli / MILLI) * factor) / factor;
}

/** Valeur d'un <input type="number"> à partir de milli-unités. */
export function milliToInputValue(amountMilli: number, decimals = 2): string {
  if (amountMilli === 0) return "0";
  const value = milliToNumber(amountMilli, Math.max(decimals, 0));
  return String(value);
}

/** "20" pour 2000 points de base, "1.5" pour 150. */
export function bpToInputValue(basisPoints: number): string {
  return String(roundHalfAway(basisPoints) / 100);
}

const frFormatters = new Map<string, Intl.NumberFormat>();

function formatter(decimals: number): Intl.NumberFormat {
  const key = String(decimals);
  let found = frFormatters.get(key);
  if (!found) {
    found = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    frFormatters.set(key, found);
  }
  return found;
}

/**
 * Normalise les séparateurs produits par Intl.
 * Le français moderne emploie une espace fine insécable (U+202F) absente de
 * l'encodage WinAnsi des polices standard du PDF : elle y disparaîtrait
 * silencieusement. On lui substitue l'espace insécable classique, qui empêche
 * toujours la coupure d'un montant en fin de ligne.
 */
function normalizeSpaces(value: string): string {
  return value.replace(/[     ]/g, NBSP);
}

/** "1 234 567" — nombre seul, sans devise. */
export function formatMilliNumber(amountMilli: number, decimals: number): string {
  return normalizeSpaces(formatter(decimals).format(milliToNumber(amountMilli, decimals)));
}

/** "1 234 567 Ar" ou "1 234,50 €" selon la devise. */
export function formatMoney(amountMilli: number, currency: CurrencyFormat): string {
  const body = formatMilliNumber(amountMilli, currency.decimals);
  return currency.symbolAfter
    ? `${body}${NBSP}${currency.symbol}`
    : `${currency.symbol}${NBSP}${body}`;
}

/** Variante compacte pour les tableaux de bord : "1,2 M Ar". */
export function formatMoneyCompact(amountMilli: number, currency: CurrencyFormat): string {
  const value = amountMilli / MILLI;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  const render = (n: number, suffix: string) => {
    const digits = n < 10 ? 1 : 0;
    const formatted = new Intl.NumberFormat("fr-FR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits,
    }).format(n);
    return `${sign}${normalizeSpaces(formatted)}${NBSP}${suffix}`;
  };

  let body: string;
  if (abs >= 1_000_000_000) body = render(abs / 1_000_000_000, "Md");
  else if (abs >= 1_000_000) body = render(abs / 1_000_000, "M");
  else if (abs >= 10_000) body = render(abs / 1_000, "k");
  else body = `${sign}${normalizeSpaces(formatter(currency.decimals).format(abs))}`;

  return currency.symbolAfter
    ? `${body}${NBSP}${currency.symbol}`
    : `${currency.symbol}${NBSP}${body}`;
}

/** "20 %", "1,5 %". */
export function formatRate(basisPoints: number): string {
  const value = basisPoints / 100;
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(value);
  return `${normalizeSpaces(formatted)}${NBSP}%`;
}

/** "1,5" jour — quantité en milli-unités vers texte lisible. */
export function formatQuantity(quantityMilli: number): string {
  return normalizeSpaces(
    new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 3 }).format(quantityMilli / MILLI),
  );
}
