/**
 * Facturation électronique — Factur-X / ZUGFeRD, profil BASIC WL.
 *
 * Produit le XML « Cross Industry Invoice » (CII, norme EN 16931) qui
 * accompagne la facture. Le profil BASIC WL porte tout l'en-tête — parties,
 * dates, ventilation de TVA, totaux, échéance — sans le détail des lignes ;
 * c'est le profil que retiennent la plupart des plateformes pour les échanges
 * courants, et de loin le plus simple à produire correctement.
 *
 * Le XML est construit ici à partir des montants entiers, jamais depuis les
 * chaînes formatées : les valeurs transmises sont donc exactes.
 */

import { MILLI } from "./money";

export const FACTURX_PROFILE = "urn:factur-x.eu:1p0:basicwl";
export const FACTURX_FILENAME = "factur-x.xml";

/** Code de type de document, au sens UNTDID 1001. */
const TYPE_CODES: Record<string, string> = {
  INVOICE: "380", // facture commerciale
  DEPOSIT: "386", // facture d'acompte
  CREDIT_NOTE: "381", // avoir
  PROFORMA: "325", // facture proforma
  QUOTE: "325",
};

export type FacturXParty = {
  name: string;
  legalName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  postalCode: string | null;
  city: string | null;
  country: string | null;
  email: string | null;
  /** Identifiants légaux : NIF, STAT, SIRET, n° TVA… */
  identifiers: { label: string; value: string }[];
};

export type FacturXInput = {
  type: string;
  number: string;
  issueDate: Date;
  dueDate: Date | null;
  currency: string;
  purchaseOrder: string | null;
  seller: FacturXParty;
  buyer: FacturXParty;
  /** Ventilation par taux : montants en milli-unités, taux en points de base. */
  vatBreakdown: { rate: number; net: number; vat: number }[];
  totalNet: number;
  totalVat: number;
  totalGross: number;
  totalPrepaid: number;
  totalDue: number;
  /** Mention imprimée lorsque la TVA ne s'applique pas. */
  vatExemptionReason: string | null;
  paymentTerms: string | null;
};

/** Échappe le texte destiné à un nœud XML. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Milli-unités -> décimal à deux chiffres, séparateur point. */
export function amount(milli: number): string {
  return (milli / MILLI).toFixed(2);
}

/** Points de base -> pourcentage décimal. */
function rate(basisPoints: number): string {
  return (basisPoints / 100).toFixed(2);
}

/** AAAAMMJJ, format 102 de la norme. */
export function formatDate102(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Code pays ISO 3166-1 alpha-2.
 * La saisie est libre dans l'application : on reconnaît les libellés courants,
 * et l'on accepte un code déjà normalisé.
 */
const COUNTRY_CODES: Record<string, string> = {
  madagascar: "MG",
  france: "FR",
  suisse: "CH",
  switzerland: "CH",
  schweiz: "CH",
  belgique: "BE",
  belgium: "BE",
  luxembourg: "LU",
  allemagne: "DE",
  germany: "DE",
  deutschland: "DE",
  espagne: "ES",
  spain: "ES",
  italie: "IT",
  italy: "IT",
  "pays-bas": "NL",
  netherlands: "NL",
  portugal: "PT",
  canada: "CA",
  "états-unis": "US",
  "etats-unis": "US",
  "united states": "US",
  maroc: "MA",
  morocco: "MA",
  tunisie: "TN",
  tunisia: "TN",
  senegal: "SN",
  sénégal: "SN",
  maurice: "MU",
  mauritius: "MU",
  "afrique du sud": "ZA",
  "south africa": "ZA",
  comores: "KM",
  "royaume-uni": "GB",
  "united kingdom": "GB",
};

export function countryCode(country: string | null | undefined): string | null {
  if (!country) return null;
  const trimmed = country.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) return trimmed.toUpperCase();
  return COUNTRY_CODES[trimmed.toLowerCase()] ?? null;
}

/**
 * Numéro de TVA du tiers, s'il en déclare un.
 * On reconnaît les libellés usuels ; le reste part en identifiant générique.
 */
function vatNumber(party: FacturXParty): string | null {
  // Bornes de mot : « Identifiant interne » ne doit pas passer pour un IDE.
  const found = party.identifiers.find((identifier) =>
    /\b(tva|vat|ide|uid|mwst)\b/i.test(identifier.label),
  );
  return found?.value.trim() || null;
}

/** Identifiant d'entreprise (SIRET, NIF, RCS…), à défaut de numéro de TVA. */
function legalId(party: FacturXParty): string | null {
  const found = party.identifiers.find((identifier) =>
    /\b(siret|siren|nif|rcs|ide|uid|stat)\b/i.test(identifier.label),
  );
  return found?.value.trim() || null;
}

function partyXml(tag: string, party: FacturXParty): string {
  const name = party.legalName?.trim() || party.name;
  const id = legalId(party);
  const vat = vatNumber(party);
  const code = countryCode(party.country);

  const lines: string[] = [`      <ram:${tag}>`];
  lines.push(`        <ram:Name>${esc(name)}</ram:Name>`);

  if (id) {
    lines.push(`        <ram:SpecifiedLegalOrganization>`);
    lines.push(`          <ram:ID>${esc(id)}</ram:ID>`);
    lines.push(`        </ram:SpecifiedLegalOrganization>`);
  }

  lines.push(`        <ram:PostalTradeAddress>`);
  if (party.postalCode) lines.push(`          <ram:PostcodeCode>${esc(party.postalCode)}</ram:PostcodeCode>`);
  if (party.addressLine1) lines.push(`          <ram:LineOne>${esc(party.addressLine1)}</ram:LineOne>`);
  if (party.addressLine2) lines.push(`          <ram:LineTwo>${esc(party.addressLine2)}</ram:LineTwo>`);
  if (party.city) lines.push(`          <ram:CityName>${esc(party.city)}</ram:CityName>`);
  // Le code pays est obligatoire : à défaut de correspondance, on ne l'invente pas.
  if (code) lines.push(`          <ram:CountryID>${code}</ram:CountryID>`);
  lines.push(`        </ram:PostalTradeAddress>`);

  if (party.email) {
    lines.push(`        <ram:URIUniversalCommunication>`);
    lines.push(`          <ram:URIID schemeID="EM">${esc(party.email)}</ram:URIID>`);
    lines.push(`        </ram:URIUniversalCommunication>`);
  }

  if (vat) {
    lines.push(`        <ram:SpecifiedTaxRegistration>`);
    lines.push(`          <ram:ID schemeID="VA">${esc(vat)}</ram:ID>`);
    lines.push(`        </ram:SpecifiedTaxRegistration>`);
  }

  lines.push(`      </ram:${tag}>`);
  return lines.join("\n");
}

/** Construit le XML Factur-X, profil BASIC WL. */
export function buildFacturXXml(input: FacturXInput): string {
  const typeCode = TYPE_CODES[input.type] ?? "380";
  const currency = input.currency;

  const taxes = (input.vatBreakdown.length > 0
    ? input.vatBreakdown
    : [{ rate: 0, net: input.totalNet, vat: 0 }]
  )
    .map((row) => {
      // « E » : exonéré ; « S » : taux normal.
      const category = row.rate === 0 ? "E" : "S";
      const parts = [
        `      <ram:ApplicableTradeTax>`,
        `        <ram:CalculatedAmount>${amount(row.vat)}</ram:CalculatedAmount>`,
        `        <ram:TypeCode>VAT</ram:TypeCode>`,
      ];
      if (category === "E" && input.vatExemptionReason) {
        parts.push(`        <ram:ExemptionReason>${esc(input.vatExemptionReason)}</ram:ExemptionReason>`);
      }
      parts.push(
        `        <ram:BasisAmount>${amount(row.net)}</ram:BasisAmount>`,
        `        <ram:CategoryCode>${category}</ram:CategoryCode>`,
        `        <ram:RateApplicablePercent>${rate(row.rate)}</ram:RateApplicablePercent>`,
        `      </ram:ApplicableTradeTax>`,
      );
      return parts.join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>${FACTURX_PROFILE}</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  <rsm:ExchangedDocument>
    <ram:ID>${esc(input.number)}</ram:ID>
    <ram:TypeCode>${typeCode}</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDate102(input.issueDate)}</udt:DateTimeString>
    </ram:IssueDateTime>
  </rsm:ExchangedDocument>
  <rsm:SupplyChainTradeTransaction>
    <ram:ApplicableHeaderTradeAgreement>
${partyXml("SellerTradeParty", input.seller)}
${partyXml("BuyerTradeParty", input.buyer)}${
    input.purchaseOrder
      ? `
      <ram:BuyerOrderReferencedDocument>
        <ram:IssuerAssignedID>${esc(input.purchaseOrder)}</ram:IssuerAssignedID>
      </ram:BuyerOrderReferencedDocument>`
      : ""
  }
    </ram:ApplicableHeaderTradeAgreement>
    <ram:ApplicableHeaderTradeDelivery/>
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${esc(currency)}</ram:InvoiceCurrencyCode>
${taxes}${
    input.dueDate || input.paymentTerms
      ? `
      <ram:SpecifiedTradePaymentTerms>${
        input.paymentTerms
          ? `
        <ram:Description>${esc(input.paymentTerms)}</ram:Description>`
          : ""
      }${
          input.dueDate
            ? `
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDate102(input.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>`
            : ""
        }
      </ram:SpecifiedTradePaymentTerms>`
      : ""
  }
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${amount(input.totalNet)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${amount(input.totalNet)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${esc(currency)}">${amount(input.totalVat)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${amount(input.totalGross)}</ram:GrandTotalAmount>
        <ram:TotalPrepaidAmount>${amount(input.totalPrepaid)}</ram:TotalPrepaidAmount>
        <ram:DuePayableAmount>${amount(input.totalDue)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>
`;
}
