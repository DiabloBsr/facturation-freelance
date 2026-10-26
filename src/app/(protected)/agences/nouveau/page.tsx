import { PartyNewPage } from "@/components/parties/party-pages";

export const metadata = { title: "Nouvelle agence" };

export default function NouvelleAgencePage() {
  return <PartyNewPage kind="AGENCY" />;
}
