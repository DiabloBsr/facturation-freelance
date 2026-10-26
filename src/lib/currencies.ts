/**
 * Catalogue de devises proposé à l'installation et dans l'écran Paramètres.
 * `rateToBase` est ensuite ajusté à la main par l'utilisateur : l'application
 * n'appelle aucun service de taux de change (elle fonctionne hors ligne).
 */

export type CurrencySeed = {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
  symbolAfter: boolean;
};

export const CURRENCY_CATALOG: CurrencySeed[] = [
  { code: "MGA", name: "Ariary malgache", symbol: "Ar", decimals: 0, symbolAfter: true },
  { code: "EUR", name: "Euro", symbol: "€", decimals: 2, symbolAfter: true },
  { code: "USD", name: "Dollar américain", symbol: "$", decimals: 2, symbolAfter: false },
  { code: "GBP", name: "Livre sterling", symbol: "£", decimals: 2, symbolAfter: false },
  { code: "CHF", name: "Franc suisse", symbol: "CHF", decimals: 2, symbolAfter: true },
  { code: "CAD", name: "Dollar canadien", symbol: "$ CA", decimals: 2, symbolAfter: true },
  { code: "AUD", name: "Dollar australien", symbol: "$ AU", decimals: 2, symbolAfter: true },
  { code: "XOF", name: "Franc CFA (UEMOA)", symbol: "FCFA", decimals: 0, symbolAfter: true },
  { code: "XAF", name: "Franc CFA (CEMAC)", symbol: "FCFA", decimals: 0, symbolAfter: true },
  { code: "MUR", name: "Roupie mauricienne", symbol: "Rs", decimals: 2, symbolAfter: true },
  { code: "ZAR", name: "Rand sud-africain", symbol: "R", decimals: 2, symbolAfter: false },
  { code: "KES", name: "Shilling kényan", symbol: "KSh", decimals: 2, symbolAfter: true },
  { code: "MAD", name: "Dirham marocain", symbol: "DH", decimals: 2, symbolAfter: true },
  { code: "TND", name: "Dinar tunisien", symbol: "DT", decimals: 3, symbolAfter: true },
  { code: "AED", name: "Dirham des Émirats", symbol: "AED", decimals: 2, symbolAfter: true },
  { code: "SAR", name: "Riyal saoudien", symbol: "SAR", decimals: 2, symbolAfter: true },
  { code: "JPY", name: "Yen japonais", symbol: "¥", decimals: 0, symbolAfter: false },
  { code: "CNY", name: "Yuan chinois", symbol: "¥", decimals: 2, symbolAfter: false },
  { code: "INR", name: "Roupie indienne", symbol: "₹", decimals: 2, symbolAfter: false },
  { code: "SGD", name: "Dollar de Singapour", symbol: "S$", decimals: 2, symbolAfter: false },
  { code: "HKD", name: "Dollar de Hong Kong", symbol: "HK$", decimals: 2, symbolAfter: false },
  { code: "SEK", name: "Couronne suédoise", symbol: "kr", decimals: 2, symbolAfter: true },
  { code: "NOK", name: "Couronne norvégienne", symbol: "kr", decimals: 2, symbolAfter: true },
  { code: "DKK", name: "Couronne danoise", symbol: "kr", decimals: 2, symbolAfter: true },
  { code: "PLN", name: "Zloty polonais", symbol: "zł", decimals: 2, symbolAfter: true },
  { code: "CZK", name: "Couronne tchèque", symbol: "Kč", decimals: 2, symbolAfter: true },
  { code: "TRY", name: "Livre turque", symbol: "₺", decimals: 2, symbolAfter: true },
  { code: "BRL", name: "Réal brésilien", symbol: "R$", decimals: 2, symbolAfter: false },
  { code: "MXN", name: "Peso mexicain", symbol: "$ MX", decimals: 2, symbolAfter: true },
  { code: "NGN", name: "Naira nigérian", symbol: "₦", decimals: 2, symbolAfter: false },
  { code: "EGP", name: "Livre égyptienne", symbol: "E£", decimals: 2, symbolAfter: true },
  { code: "KMF", name: "Franc comorien", symbol: "FC", decimals: 0, symbolAfter: true },
  { code: "SCR", name: "Roupie seychelloise", symbol: "SR", decimals: 2, symbolAfter: true },
  { code: "MZN", name: "Metical mozambicain", symbol: "MT", decimals: 2, symbolAfter: true },
];

/** Devises créées automatiquement à la première ouverture. */
export const DEFAULT_ACTIVE_CURRENCIES = ["MGA", "EUR", "USD"];

export function findCurrencySeed(code: string): CurrencySeed | undefined {
  return CURRENCY_CATALOG.find((c) => c.code === code.toUpperCase());
}
