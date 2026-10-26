import { PartyListPage } from "@/components/parties/party-pages";

export const metadata = { title: "Sous-traitants" };

export default function SousTraitantsPage() {
  return <PartyListPage kind="SUBCONTRACTOR" />;
}
