import { DocumentsListPage, type SearchParams } from "@/components/documents/documents-page";
import { STATUSES_FOR_TYPE } from "@/lib/enums";

export const metadata = { title: "Factures" };

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <DocumentsListPage
      types={["INVOICE", "DEPOSIT", "PROFORMA"]}
      title="Factures"
      description="Factures, acomptes et proformas. Le numéro n'est attribué qu'à la validation, pour une numérotation continue."
      newType="INVOICE"
      statuses={STATUSES_FOR_TYPE.INVOICE}
      showType
      emptyMessage="Aucune facture pour l'instant. Créez-en une, ou convertissez un devis accepté."
      searchParams={await searchParams}
    />
  );
}
