import { DocumentsListPage, type SearchParams } from "@/components/documents/documents-page";
import { STATUSES_FOR_TYPE } from "@/lib/enums";

export const metadata = { title: "Devis" };

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <DocumentsListPage
      types={["QUOTE"]}
      title="Devis"
      description="Propositions commerciales. Un devis accepté se convertit en facture en un clic, acomptes compris."
      newType="QUOTE"
      statuses={STATUSES_FOR_TYPE.QUOTE}
      emptyMessage="Aucun devis pour l'instant."
      searchParams={await searchParams}
    />
  );
}
