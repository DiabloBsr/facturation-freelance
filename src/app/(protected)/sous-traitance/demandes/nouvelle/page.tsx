import { PageHeader, PageShell } from "@/components/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { ButtonLink, SubmitButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Field, Select, Textarea } from "@/components/ui/field";
import { IconPlus, IconUsers } from "@/components/icons";
import { createPayoutRequest } from "@/server/actions/payout-requests";
import { listBeneficiaries } from "@/server/payouts";
import { getActiveCurrencies, getCompany } from "@/server/settings";

export const metadata = { title: "Demander une facture" };

export default async function NouvelleDemandePage() {
  const [beneficiaries, currencies, company] = await Promise.all([
    listBeneficiaries(),
    getActiveCurrencies(),
    getCompany(),
  ]);

  if (beneficiaries.length === 0) {
    return (
      <PageShell>
        <PageHeader
          backHref="/sous-traitance"
          backLabel="Retour à la sous-traitance"
          title="Demander une facture"
          description="Une demande a besoin d'un intervenant."
        />
        <EmptyState
          icon={<IconUsers />}
          title="Créez d'abord un sous-traitant"
          description="Le lien est nominatif : il est rattaché à l'intervenant à qui vous l'envoyez."
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

  return (
    <PageShell>
      <PageHeader
        backHref="/sous-traitance"
        backLabel="Retour à la sous-traitance"
        title="Demander une facture à un intervenant"
        description="Vous obtenez un lien privé à lui transmettre. Il y détaille ses prestations lui-même, et vous n'avez plus qu'à les reprendre dans votre facture ou dans un justificatif de reversement."
      />

      <form action={createPayoutRequest}>
        <Card>
          <CardHeader title="La demande" />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Intervenant" required>
              <Select name="beneficiaryId" defaultValue={beneficiaries[0].id} required>
                {beneficiaries.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Devise imposée"
              hint="Celle de la facture que vous établirez ensuite."
            >
              <Select name="currency" defaultValue={company.defaultCurrency}>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Validité du lien"
              hint="Passé ce délai, le lien cesse de fonctionner."
            >
              <Select name="validityDays" defaultValue="30">
                <option value="7">7 jours</option>
                <option value="15">15 jours</option>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
              </Select>
            </Field>

            <Field
              label="Consigne affichée"
              hint="Ce que vous attendez : période, mission, précisions."
              className="sm:col-span-2"
            >
              <Textarea
                name="subject"
                rows={3}
                placeholder="Merci de détailler vos interventions de juin 2026 (mission client)."
              />
            </Field>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <SubmitButton pendingLabel="Création…">Créer le lien</SubmitButton>
          </div>
        </Card>
      </form>
    </PageShell>
  );
}
