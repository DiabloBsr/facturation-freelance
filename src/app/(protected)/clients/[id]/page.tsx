import { PartyDetailPage } from "@/components/parties/party-pages";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PartyDetailPage kind="CLIENT" id={id} />;
}
