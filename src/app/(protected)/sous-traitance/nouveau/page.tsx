import { PageHeader, PageShell } from "@/components/page-header";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { IconPlus, IconUsers } from "@/components/icons";
import { PayoutForm, type PayoutFormValues } from "@/components/payouts/payout-form";
import { toDateInput, today } from "@/lib/dates";
import { createPayout } from "@/server/actions/payouts";
import { listBeneficiaries, listSourceDocuments } from "@/server/payouts";
import { getPayoutRequest } from "@/server/payout-requests";
import { getActiveCurrencies, getCompany } from "@/server/settings";

export const metadata = { title: "Nouveau justificatif" };

export default async function NouveauJustificatifPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestId = Array.isArray(query.demande) ? query.demande[0] : query.demande;

  const [beneficiaries, documents, currencies, company, request] = await Promise.all([
    listBeneficiaries(),
    listSourceDocuments(),
    getActiveCurrencies(),
    getCompany(),
    requestId ? getPayoutRequest(requestId) : null,
  ]);

  if (beneficiaries.length === 0) {
    return (
      <PageShell>
        <PageHeader
          backHref="/sous-traitance"
          backLabel="Retour à la sous-traitance"
          title="Nouveau justificatif"
          description="Un justificatif de reversement a besoin d'un bénéficiaire."
        />
        <EmptyState
          icon={<IconUsers />}
          title="Créez d'abord un sous-traitant"
          description="Enregistrez la personne à qui vous reversez : son nom figurera sur le justificatif, et ses coordonnées serviront de trace."
          action={
            <ButtonLink href="/sous-traitants/nouveau">
              <IconPlus className="h-4 w-4" />
              Créer un sous-traitant
            </ButtonLink>
          }
        />
      </PageShell>
    );
  }

  // Repris d'une déclaration d'intervenant : ses lignes et sa devise font foi.
  const prefilled = request && request.lines.length > 0;

  const values: PayoutFormValues = {
    beneficiaryId: prefilled ? request.beneficiaryId : beneficiaries[0].id,
    documentId: request?.documentId ?? null,
    date: toDateInput(today()),
    // Reçu dans la devise de facturation, reversé dans la devise de base.
    sourceCurrency: prefilled ? request.currency : company.defaultCurrency,
    targetCurrency: company.baseCurrency,
    exchangeRate: 1,
    bankFees: 0,
    reference: null,
    notes: request?.notes ?? null,
    lines: prefilled
      ? request.lines.map((line) => ({
          label: line.label,
          quantity: line.quantity,
          unit: line.unit,
          unitPrice: line.unitPrice,
        }))
      : [{ label: "", quantity: 1000, unit: "heure", unitPrice: 0 }],
    adjustments: [],
  };

  return (
    <PageShell wide>
      <PageHeader
        backHref={prefilled ? `/sous-traitance/demandes/${request.id}` : "/sous-traitance"}
        backLabel={prefilled ? "Retour à la demande" : "Retour à la sous-traitance"}
        title="Nouveau justificatif de reversement"
        description={
          prefilled
            ? `Prestations reprises de la déclaration de ${request.beneficiary.name}. Ajoutez le cours appliqué par votre banque et les frais : le net à reverser se calcule au fur et à mesure.`
            : "Saisissez les prestations reçues, le cours appliqué par votre banque et les frais : le net à reverser se calcule au fur et à mesure."
        }
      />
      <PayoutForm
        action={createPayout}
        values={values}
        requestId={prefilled ? request.id : undefined}
        beneficiaries={beneficiaries}
        documents={documents}
        currencies={currencies}
        submitLabel="Créer le justificatif"
      />
    </PageShell>
  );
}
