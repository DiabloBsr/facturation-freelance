import { PartyDetailPage } from "@/components/parties/party-pages";

export default async function SousTraitantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PartyDetailPage kind="SUBCONTRACTOR" id={id} />;
}
