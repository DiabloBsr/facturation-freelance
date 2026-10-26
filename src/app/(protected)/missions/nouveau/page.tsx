import { PageHeader, PageShell } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { IconClients, IconPlus } from "@/components/icons";
import { MissionForm, type MissionFormValues } from "@/components/missions/mission-form";
import { prisma } from "@/lib/prisma";
import { toDateInput, today } from "@/lib/dates";
import { createMission } from "@/server/actions/missions";
import { getActiveCurrencies, getCompany } from "@/server/settings";

export const metadata = { title: "Nouvelle mission" };

export default async function NouvelleMissionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const prefilledClient = Array.isArray(params.client) ? params.client[0] : params.client;

  const [company, currencies, clients, agencies] = await Promise.all([
    getCompany(),
    getActiveCurrencies(),
    prisma.party.findMany({
      where: { kind: "CLIENT", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.party.findMany({
      where: { kind: "AGENCY", isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (clients.length === 0) {
    return (
      <PageShell>
        <PageHeader title="Nouvelle mission" description="Une mission a besoin d'un client." />
        <EmptyState
          icon={<IconClients />}
          title="Créez d'abord un client"
          description="La mission se rattache à un client final ; l'agence intermédiaire reste facultative."
          action={
            <ButtonLink href="/clients/nouveau">
              <IconPlus className="h-4 w-4" />
              Créer un client
            </ButtonLink>
          }
        />
      </PageShell>
    );
  }

  const values: MissionFormValues = {
    title: "",
    reference: null,
    description: null,
    clientId: prefilledClient ?? clients[0].id,
    agencyId: null,
    billTo: "CLIENT",
    rateType: "DAILY",
    rate: 0,
    currency: company.defaultCurrency,
    vatRate: null,
    budget: null,
    purchaseOrder: null,
    startDate: toDateInput(today()),
    endDate: "",
    status: "ACTIVE",
    notes: null,
  };

  return (
    <PageShell>
      <PageHeader
        backHref="/missions"
        backLabel="Retour aux missions"
        title="Nouvelle mission"
      />
      <MissionForm
        action={createMission}
        values={values}
        clients={clients}
        agencies={agencies}
        currencies={currencies}
        submitLabel="Créer la mission"
      />
    </PageShell>
  );
}
