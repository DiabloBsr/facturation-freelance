import { PartyListPage } from "@/components/parties/party-pages";

export const metadata = { title: "Clients" };

export default function ClientsPage() {
  return <PartyListPage kind="CLIENT" />;
}
