import { cache } from "react";
import type { Currency } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { FALLBACK_CURRENCY, type CurrencyFormat } from "@/lib/money";

/**
 * L'entreprise émettrice est un singleton. On la crée à la volée si la base
 * n'a jamais été initialisée, pour que l'application ne tombe jamais en panne
 * sur une base fraîche.
 */
export const getCompany = cache(async () => {
  const existing = await prisma.company.findUnique({ where: { id: 1 } });
  if (existing) return existing;

  return prisma.company.create({
    data: {
      id: 1,
      legalName: "Mon entreprise",
      country: "Madagascar",
      baseCurrency: "MGA",
      defaultCurrency: "MGA",
    },
  });
});

export const getLegalIdentifiers = cache(async () =>
  prisma.legalIdentifier.findMany({ orderBy: [{ position: "asc" }, { label: "asc" }] }),
);

export const getBankAccounts = cache(async () =>
  prisma.bankAccount.findMany({
    orderBy: [{ isDefault: "desc" }, { position: "asc" }, { label: "asc" }],
  }),
);

export const getCurrencies = cache(async () =>
  prisma.currency.findMany({ orderBy: [{ position: "asc" }, { code: "asc" }] }),
);

export const getActiveCurrencies = cache(async () =>
  prisma.currency.findMany({
    where: { isActive: true },
    orderBy: [{ position: "asc" }, { code: "asc" }],
  }),
);

export const getVatRates = cache(async () =>
  prisma.vatRate.findMany({ orderBy: [{ position: "asc" }, { rate: "asc" }] }),
);

export const getSequences = cache(async () =>
  prisma.numberSequence.findMany({ orderBy: { key: "asc" } }),
);

/**
 * Marque choisie dans la galerie, utilisée à défaut de logo téléversé.
 * Rangée dans les réglages libres : aucune colonne dédiée n'est nécessaire.
 */
export const getLogoMark = cache(async (): Promise<string | null> => {
  const setting = await prisma.appSetting.findUnique({ where: { key: "logoMark" } });
  return setting?.value || null;
});

/** Table de correspondance code -> format d'affichage. */
export const getCurrencyMap = cache(async () => {
  const currencies = await getCurrencies();
  const map = new Map<string, CurrencyFormat>();
  for (const currency of currencies) {
    map.set(currency.code, {
      code: currency.code,
      symbol: currency.symbol,
      decimals: currency.decimals,
      symbolAfter: currency.symbolAfter,
    });
  }
  return map;
});

export function toCurrencyFormat(currency: Currency | null | undefined): CurrencyFormat {
  if (!currency) return FALLBACK_CURRENCY;
  return {
    code: currency.code,
    symbol: currency.symbol,
    decimals: currency.decimals,
    symbolAfter: currency.symbolAfter,
  };
}

/** Format d'une devise donnée, avec repli sûr si le code est inconnu. */
export async function getCurrencyFormat(code: string): Promise<CurrencyFormat> {
  const map = await getCurrencyMap();
  return map.get(code) ?? FALLBACK_CURRENCY;
}

/** Devise de base de l'entreprise, utilisée par les agrégats du tableau de bord. */
export const getBaseCurrencyFormat = cache(async (): Promise<CurrencyFormat> => {
  const company = await getCompany();
  return getCurrencyFormat(company.baseCurrency);
});

/** Taux de conversion vers la devise de base, par code devise. */
export const getRatesToBase = cache(async () => {
  const currencies = await getCurrencies();
  const rates = new Map<string, number>();
  for (const currency of currencies) rates.set(currency.code, currency.rateToBase);
  return rates;
});
