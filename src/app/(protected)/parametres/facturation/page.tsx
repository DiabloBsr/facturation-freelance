import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { VatRatesForm } from "@/components/settings/vat-rates-form";
import { VAT_REGIMES, VAT_REGIME_LABELS, type VatRegime } from "@/lib/enums";
import { bpToInputValue, milliToInputValue } from "@/lib/money";
import { getActiveCurrencies, getCompany, getVatRates } from "@/server/settings";
import { saveVatRates, updateBilling } from "@/server/actions/settings";

export const metadata = { title: "Règles de facturation" };

export default async function ParametresFacturationPage() {
  const [company, currencies, vatRates] = await Promise.all([
    getCompany(),
    getActiveCurrencies(),
    getVatRates(),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <form action={updateBilling} className="flex flex-col gap-5">
        <Card>
          <CardHeader
            title="Régime de TVA"
            description="Détermine le mode de calcul par défaut et la mention légale imprimée quand vous ne facturez pas de TVA."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Régime">
              <Select name="vatRegime" defaultValue={company.vatRegime}>
                {VAT_REGIMES.map((regime) => (
                  <option key={regime} value={regime}>
                    {VAT_REGIME_LABELS[regime as VatRegime]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Taux de TVA par défaut" hint="Appliqué aux nouvelles lignes.">
              <div className="relative">
                <Input
                  name="defaultVatRate"
                  inputMode="decimal"
                  defaultValue={bpToInputValue(company.defaultVatRate)}
                  className="tnum pr-7 text-right"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
                  %
                </span>
              </div>
            </Field>

            <Field
              label="Mention d'exonération"
              hint="Imprimée sur les documents sans TVA."
              className="sm:col-span-2"
            >
              <Textarea
                name="vatExemptionText"
                defaultValue={company.vatExemptionText ?? ""}
                rows={2}
                placeholder="TVA non applicable — entreprise non assujettie."
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Devises"
            description="La devise de base sert aux totaux du tableau de bord ; la devise par défaut pré-remplit les nouveaux documents."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Devise de base (comptabilité)">
              <Select name="baseCurrency" defaultValue={company.baseCurrency}>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Devise par défaut des documents">
              <Select name="defaultCurrency" defaultValue={company.defaultCurrency}>
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.code} — {currency.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Paiement et retard"
            description="Valeurs reprises par défaut sur chaque document, modifiables au cas par cas."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Délai de paiement" hint="En jours à compter de l'émission.">
              <Input
                name="paymentTermsDays"
                inputMode="numeric"
                defaultValue={String(company.paymentTermsDays)}
                className="tnum"
              />
            </Field>

            <Field label="Pénalités de retard" hint="Taux annuel, en %.">
              <div className="relative">
                <Input
                  name="latePenaltyRate"
                  inputMode="decimal"
                  defaultValue={bpToInputValue(company.latePenaltyRate)}
                  className="tnum pr-7 text-right"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
                  %
                </span>
              </div>
            </Field>

            <Field
              label="Indemnité de recouvrement"
              hint="Montant forfaitaire mentionné en cas de retard."
            >
              <Input
                name="recoveryFee"
                inputMode="decimal"
                defaultValue={milliToInputValue(company.recoveryFee, 2)}
                className="tnum text-right"
              />
            </Field>

            <Field label="Escompte" hint="Mention sur l'escompte pour paiement anticipé.">
              <Input
                name="discountText"
                defaultValue={company.discountText ?? ""}
                placeholder="Pas d'escompte pour paiement anticipé."
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Retenue à la source"
            description="Certaines administrations et grands comptes retiennent un pourcentage à la source. Il sera déduit du net à payer."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Libellé">
              <Input
                name="withholdingLabel"
                defaultValue={company.withholdingLabel ?? ""}
                placeholder="Retenue à la source"
              />
            </Field>
            <Field label="Taux par défaut">
              <div className="relative">
                <Input
                  name="withholdingRate"
                  inputMode="decimal"
                  defaultValue={bpToInputValue(company.withholdingRate)}
                  className="tnum pr-7 text-right"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-faint">
                  %
                </span>
              </div>
            </Field>
          </div>
        </Card>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Enregistrement…">
            Enregistrer les règles de facturation
          </SubmitButton>
        </div>
      </form>

      <VatRatesForm action={saveVatRates} rates={vatRates} />
    </div>
  );
}
