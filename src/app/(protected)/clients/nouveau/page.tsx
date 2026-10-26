import { PartyNewPage } from "@/components/parties/party-pages";

export const metadata = { title: "Nouveau client" };

export default function NouveauClientPage() {
  return <PartyNewPage kind="CLIENT" />;
}
