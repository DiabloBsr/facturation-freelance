import { PartyNewPage } from "@/components/parties/party-pages";

export const metadata = { title: "Nouveau sous-traitant" };

export default function NouveauSousTraitantPage() {
  return <PartyNewPage kind="SUBCONTRACTOR" />;
}
