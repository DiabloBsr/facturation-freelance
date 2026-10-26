import { PartyListPage } from "@/components/parties/party-pages";

export const metadata = { title: "Agences" };

export default function AgencesPage() {
  return <PartyListPage kind="AGENCY" />;
}
