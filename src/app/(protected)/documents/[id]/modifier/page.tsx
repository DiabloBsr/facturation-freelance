import { notFound } from "next/navigation";
import { DocumentEditor } from "@/components/documents/document-editor";
import type { DocumentPayload } from "@/lib/document-payload";
import type { DiscountType, DocumentStatus, DocumentType, LineKind, VatMode } from "@/lib/enums";
import { toDateInput } from "@/lib/dates";
import { getDocument, nextNumberPreview } from "@/server/documents";
import { getEditorData } from "@/server/editor-data";

export const metadata = { title: "Modifier le document" };

export default async function ModifierDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [document, data] = await Promise.all([getDocument(id), getEditorData()]);

  if (!document) notFound();

  const initial: DocumentPayload = {
    id: document.id,
    type: document.type as DocumentType,
    status: document.status as DocumentStatus,
    subject: document.subject,
    billToId: document.billToId,
    endClientId: document.endClientId,
    contactId: document.contactId,
    missionId: document.missionId,
    issueDate: toDateInput(document.issueDate),
    dueDate: document.dueDate ? toDateInput(document.dueDate) : null,
    validUntil: document.validUntil ? toDateInput(document.validUntil) : null,
    serviceDate: document.serviceDate ? toDateInput(document.serviceDate) : null,
    currency: document.currency,
    exchangeRate: document.exchangeRate,
    vatMode: document.vatMode as VatMode,
    paymentTermsDays: document.paymentTermsDays,
    discountType: document.discountType as DiscountType,
    discountValue: document.discountValue,
    withholdingLabel: document.withholdingLabel,
    withholdingRate: document.withholdingRate,
    purchaseOrder: document.purchaseOrder,
    notes: document.notes,
    terms: document.terms,
    footer: document.footer,
    internalNotes: document.internalNotes,
    template: document.template,
    accentColor: document.accentColor,
    showAmountInWords: document.showAmountInWords,
    bankAccountId: document.bankAccountId,
    parentId: document.parentId,
    depositIds: document.children
      .filter((child) => child.type === "DEPOSIT")
      .map((child) => child.id),
    timeEntryIds: document.timeEntries.map((entry) => entry.id),
    // Les déclarations déjà reprises restent rattachées : seules celles
    // importées pendant cette édition sont à rattacher au moment d'enregistrer.
    payoutRequestIds: [],
    lines: document.lines.map((line) => ({
      id: line.id,
      kind: line.kind as LineKind,
      label: line.label,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      unitPrice: line.unitPrice,
      discountType: line.discountType as DiscountType,
      discountValue: line.discountValue,
      vatRate: line.vatRate,
    })),
  };

  const numberPreview =
    document.number ?? (await nextNumberPreview(document.type as DocumentType, document.issueDate));

  return (
    <DocumentEditor
      initial={initial}
      parties={data.parties}
      missions={data.missions}
      currencies={data.currencies}
      vatRates={data.vatRates}
      bankAccounts={data.bankAccounts}
      deposits={data.deposits.filter(
        (deposit) =>
          (deposit.parentId === null || deposit.parentId === document.id) &&
          deposit.id !== document.id,
      )}
      payoutRequests={data.payoutRequests}
      numberPreview={numberPreview}
      isNew={false}
    />
  );
}
