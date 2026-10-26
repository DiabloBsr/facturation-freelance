import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { amountToFrenchWords } from "@/lib/amount-in-words";
import { formatDate, formatDateTime } from "@/lib/dates";
import {
  formatMoney,
  formatQuantity,
  FALLBACK_CURRENCY,
  type CurrencyFormat,
} from "@/lib/money";
import { payoutDetailInclude } from "@/server/payouts";
import { PayoutTemplate, type PayoutPdfModel } from "./payout-template";

function addressLines(source: {
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
}): string[] {
  const cityLine = [source.postalCode, source.city].filter(Boolean).join(" ");
  return [source.addressLine1, source.addressLine2, cityLine || null, source.region, source.country].filter(
    (value): value is string => Boolean(value && value.trim()),
  );
}

/** Rend le justificatif de reversement d'un sous-traitant. */
export async function renderPayoutPdf(
  payoutId: string,
): Promise<{ buffer: Buffer; filename: string } | null> {
  const payout = await prisma.payout.findUnique({
    where: { id: payoutId },
    include: payoutDetailInclude,
  });
  if (!payout) return null;

  const [company, identifiers, logoMark, currencies] = await Promise.all([
    prisma.company.findUnique({ where: { id: 1 } }),
    prisma.legalIdentifier.findMany({ orderBy: { position: "asc" } }),
    prisma.appSetting.findUnique({ where: { key: "logoMark" } }),
    prisma.currency.findMany({
      where: { code: { in: [payout.sourceCurrency, payout.targetCurrency] } },
    }),
  ]);
  if (!company) return null;

  const asFormat = (code: string): CurrencyFormat => {
    const found = currencies.find((currency) => currency.code === code);
    return found
      ? {
          code: found.code,
          symbol: found.symbol,
          decimals: found.decimals,
          symbolAfter: found.symbolAfter,
        }
      : FALLBACK_CURRENCY;
  };

  const source = asFormat(payout.sourceCurrency);
  const target = asFormat(payout.targetCurrency);
  const targetName =
    currencies.find((currency) => currency.code === payout.targetCurrency)?.name ?? target.code;

  const model: PayoutPdfModel = {
    title: "JUSTIFICATIF DE REVERSEMENT",
    number: payout.number ?? "BROUILLON",
    isDraft: payout.number === null,
    accent: company.accentColor,
    date: formatDate(payout.date),
    paidAt: payout.paidAt ? formatDateTime(payout.paidAt) : null,
    reference: payout.reference,
    documentNumber: payout.document?.number ?? null,

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
      logoMark: company.logoData ? null : (logoMark?.value || null),
      stampData: null,
      signatureData: null,
      signatureName: company.signatureName,
      signatureRole: company.signatureRole,
      identifiers: identifiers
        .filter((identifier) => identifier.showOnPdf && identifier.value.trim() !== "")
        .map((identifier) => ({ label: identifier.label, value: identifier.value })),
    },

    beneficiary: {
      name: payout.beneficiary.name,
      legalName: payout.beneficiary.legalName,
      addressLines: addressLines(payout.beneficiary),
      email: payout.beneficiary.email,
      identifiers: payout.beneficiary.identifiers
        .filter((identifier) => identifier.showOnPdf && identifier.value.trim() !== "")
        .map((identifier) => ({ label: identifier.label, value: identifier.value })),
    },

    sourceCode: source.code,
    targetCode: target.code,
    rateLabel: `1 ${source.code} = ${payout.exchangeRate} ${target.code}`,

    lines: payout.lines.map((line) => ({
      label: line.label,
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unit: line.unit,
      unitPrice: formatMoney(line.unitPrice, source),
      amount: formatMoney(line.amount, source),
    })),

    totalSource: formatMoney(payout.totalSource, source),
    totalConverted: formatMoney(payout.totalConverted, target),
    bankFees: payout.bankFees !== 0 ? formatMoney(payout.bankFees, target) : null,
    adjustments: payout.adjustments.map((adjustment) => ({
      label: adjustment.label,
      amount: `${adjustment.amount < 0 ? "" : "+ "}${formatMoney(adjustment.amount, target)}`,
    })),
    netPayable: formatMoney(payout.netPayable, target),
    netInWords: amountToFrenchWords(
      Math.abs(payout.netPayable),
      target.code,
      target.decimals,
      targetName,
    ),

    notes: payout.notes,
    footer: company.defaultFooter,
  };

  const buffer = await renderToBuffer(<PayoutTemplate vm={model} />);
  const safeName = payout.beneficiary.name.replace(/[\\/:*?"<>|]/g, "").slice(0, 40).trim();

  return {
    buffer,
    filename: `Reversement ${payout.number ?? "brouillon"} - ${safeName}.pdf`.replace(/\s+/g, " "),
  };
}
