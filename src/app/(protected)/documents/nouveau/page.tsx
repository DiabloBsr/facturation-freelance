import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { PageHeader, PageShell } from "@/components/page-header";
import { IconClients, IconPlus } from "@/components/icons";
import { DocumentEditor } from "@/components/documents/document-editor";
import { emptyLine, type DocumentPayload } from "@/lib/document-payload";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/enums";
import { addDays, toDateInput, today } from "@/lib/dates";
import { getEditorData } from "@/server/editor-data";
import { nextNumberPreview } from "@/server/documents";
import { getCompany } from "@/server/settings";

export const metadata = { title: "Nouveau document" };

export default async function NouveauDocumentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = Array.isArray(params.type) ? params.type[0] : params.type;
  const type: DocumentType = DOCUMENT_TYPES.includes(raw as DocumentType)
    ? (raw as DocumentType)
    : "INVOICE";

  const prefilledParty = Array.isArray(params.tiers) ? params.tiers[0] : params.tiers;
  const prefilledMission = Array.isArray(params.mission) ? params.mission[0] : params.mission;

  const [company, data] = await Promise.all([getCompany(), getEditorData()]);

  if (data.parties.length === 0) {
    return (
      <PageShell>
        <PageHeader
          title="Nouveau document"
          description="Un document a besoin d'un destinataire."
        />
        <EmptyState
          icon={<IconClients />}
          title="Commencez par créer un client"
          description="Enregistrez d'abord le client (ou l'agence) à facturer : ses coordonnées et ses identifiants légaux figureront sur le document."
          action={
            <ButtonLink href="/clients/nouveau">
              <IconPlus className="h-4 w-4" />
              Créer un client
            </ButtonLink>
          }
        />
      </PageShell>
    );
  }

  const issueDate = today();
  const defaultBank = data.bankAccounts[0]?.id ?? null;
  const defaultVat = company.defaultVatRate;

  const mission = prefilledMission
    ? data.missions.find((m) => m.id === prefilledMission)
    : undefined;

  const billToId =
    (mission
      ? mission.billTo === "AGENCY" && mission.agencyId
        ? mission.agencyId
        : mission.clientId
      : prefilledParty) ?? data.parties[0].id;

  const party = data.parties.find((p) => p.id === billToId);
  // Un devis part toujours dans la devise de base (l'ariary) ; la facture
  // reprend la devise du tiers ou de la mission, modifiable dans l'éditeur.
  const currency =
    type === "QUOTE"
      ? company.baseCurrency
      : (mission?.currency ?? party?.currency ?? company.defaultCurrency);
  const paymentTermsDays = party?.paymentTermsDays ?? company.paymentTermsDays;

  const initial: DocumentPayload = {
    type,
    subject: mission?.title ?? null,
    billToId,
    endClientId:
      mission && mission.billTo === "AGENCY" && mission.agencyId ? mission.clientId : null,
    contactId: null,
    missionId: mission?.id ?? null,
    issueDate: toDateInput(issueDate),
    dueDate:
      type === "QUOTE" || type === "PROFORMA"
        ? null
        : toDateInput(addDays(issueDate, paymentTermsDays)),
    validUntil: type === "QUOTE" ? toDateInput(addDays(issueDate, 30)) : null,
    serviceDate: null,
    currency,
    exchangeRate: data.currencies.find((c) => c.code === currency)?.rateToBase ?? 1,
    vatMode: company.vatRegime === "SUBJECT" && defaultVat > 0 ? "EXCLUSIVE" : "NONE",
    paymentTermsDays,
    discountType: "NONE",
    discountValue: 0,
    withholdingLabel: company.withholdingLabel,
    withholdingRate: company.withholdingRate,
    purchaseOrder: mission?.purchaseOrder ?? null,
    notes: null,
    terms: company.defaultTerms,
    footer: company.defaultFooter,
    internalNotes: null,
    template: company.defaultTemplate,
    accentColor: company.accentColor,
    showAmountInWords: company.showAmountInWords,
    bankAccountId: defaultBank,
    parentId: null,
    depositIds: [],
    timeEntryIds: [],
    payoutRequestIds: [],
    lines: [emptyLine(mission?.vatRate ?? defaultVat)],
  };

  const numberPreview = await nextNumberPreview(type, issueDate);

  return (
    <DocumentEditor
      initial={initial}
      parties={data.parties}
      missions={data.missions}
      currencies={data.currencies}
      vatRates={data.vatRates}
      bankAccounts={data.bankAccounts}
      deposits={data.deposits.filter((deposit) => deposit.parentId === null)}
      payoutRequests={data.payoutRequests}
      numberPreview={numberPreview}
      isNew
    />
  );
}
