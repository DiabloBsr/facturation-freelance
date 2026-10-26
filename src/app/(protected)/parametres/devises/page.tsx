import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/button";
import { Table, TableWrap, TD, TH, THead, TR } from "@/components/ui/table";
import { CURRENCY_CATALOG } from "@/lib/currencies";
import { getCompany, getCurrencies } from "@/server/settings";
import { addCurrency, saveCurrencies } from "@/server/actions/settings";

export const metadata = { title: "Devises" };

export default async function ParametresDevisesPage() {
  const [company, currencies] = await Promise.all([getCompany(), getCurrencies()]);
  const known = new Set(currencies.map((currency) => currency.code));
  const available = CURRENCY_CATALOG.filter((currency) => !known.has(currency.code));

  return (
    <div className="flex flex-col gap-5">
      <form action={saveCurrencies}>
        <Card padded={false}>
          <div className="p-5">
            <CardHeader
              title="Devises de facturation"
              description={`Cochez celles que vous utilisez. Le taux convertit vers votre devise de base (${company.baseCurrency}) pour les totaux du tableau de bord — l'application ne consulte aucun service en ligne, vous saisissez le taux qui vous arrange.`}
            />
          </div>

          <TableWrap className="rounded-none border-x-0 border-b-0 shadow-none">
            <Table>
              <THead>
                <TR>
                  <TH>Active</TH>
                  <TH>Code</TH>
                  <TH>Devise</TH>
                  <TH align="center">Symbole</TH>
                  <TH align="center">Décimales</TH>
                  <TH align="right">1 unité = … {company.baseCurrency}</TH>
                </TR>
              </THead>
              <tbody>
                {currencies.map((currency) => {
                  const isBase = currency.code === company.baseCurrency;
                  return (
                    <TR key={currency.code}>
                      <TD>
                        <input type="hidden" name="currencyCode" value={currency.code} />
                        <input
                          type="checkbox"
                          name="currencyActive"
                          value={currency.code}
                          defaultChecked={currency.isActive || isBase}
                          disabled={isBase}
                          className="h-4 w-4 accent-[var(--accent)]"
                          aria-label={`Activer ${currency.code}`}
                        />
                        {isBase && (
                          <input type="hidden" name="currencyActive" value={currency.code} />
                        )}
                      </TD>
                      <TD className="font-mono text-[13px] font-medium">{currency.code}</TD>
                      <TD className="text-[13px] text-muted">
                        {currency.name}
                        {isBase && (
                          <span className="ml-2 text-[11px] text-accent">devise de base</span>
                        )}
                      </TD>
                      <TD align="center" className="text-[13px]">
                        {currency.symbol}
                      </TD>
                      <TD align="center" className="tnum text-[13px] text-muted">
                        {currency.decimals}
                      </TD>
                      <TD align="right">
                        {/* readOnly et non disabled : un champ désactivé n'est pas
                            transmis, ce qui décalerait les colonnes du formulaire. */}
                        <Input
                          name="currencyRate"
                          defaultValue={String(isBase ? 1 : currency.rateToBase)}
                          inputMode="decimal"
                          readOnly={isBase}
                          className="tnum ml-auto h-9 w-32 text-right"
                          aria-label={`Taux de ${currency.code}`}
                        />
                      </TD>
                    </TR>
                  );
                })}
              </tbody>
            </Table>
          </TableWrap>

          <div className="flex justify-end border-t border-line p-5">
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer les devises</SubmitButton>
          </div>
        </Card>
      </form>

      <form action={addCurrency}>
        <Card>
          <CardHeader
            title="Ajouter une devise"
            description="Saisissez un code ISO à trois lettres. Les devises courantes sont reconnues automatiquement (nom, symbole, décimales)."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-[8rem_minmax(0,1fr)_8rem_auto] sm:items-end">
            <Field label="Code" required>
              <Input
                name="code"
                maxLength={3}
                placeholder="GBP"
                className="font-mono uppercase"
                list="currency-catalog"
                required
              />
            </Field>
            <Field label="Nom" hint="Facultatif si le code est reconnu.">
              <Input name="name" placeholder="Livre sterling" />
            </Field>
            <Field label="Symbole">
              <Input name="symbol" placeholder="£" />
            </Field>
            <SubmitButton pendingLabel="Ajout…">Ajouter</SubmitButton>
          </div>

          <datalist id="currency-catalog">
            {available.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.name}
              </option>
            ))}
          </datalist>
        </Card>
      </form>
    </div>
  );
}
