import { DocumentsListPage, type SearchParams } from "@/components/documents/documents-page";
import { STATUSES_FOR_TYPE } from "@/lib/enums";

export const metadata = { title: "Avoirs" };

export default async function AvoirsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <DocumentsListPage
      types={["CREDIT_NOTE"]}
      title="Avoirs"
      description="Notes de crédit émises en rectification d'une facture. Un avoir s'ajoute à la facture d'origine, il ne la remplace jamais."
      newType="CREDIT_NOTE"
      statuses={STATUSES_FOR_TYPE.CREDIT_NOTE}
      emptyMessage="Aucun avoir émis."
      searchParams={await searchParams}
    />
  );
}
